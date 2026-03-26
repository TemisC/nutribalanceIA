import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import supabase from '../config/db';
import {
    createUser, findUserByEmail, findUserById, findDefaultAdmin,
    getBiometrics, getMetrics, findUsersByCoachId, updateUser, User
} from '../models/userModel';

export const register = async (req: Request, res: Response) => {
    try {
        const { email, password, name, role, planType, coachId } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ message: 'Faltan campos obligatorios' });
        }

        // Check if user already exists in our users table
        const existingUser = await findUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({ message: 'El usuario ya está registrado' });
        }

        // Validate Coach ID or assign Default Admin
        let finalCoachId = coachId;
        if (coachId) {
            const coach = await findUserById(coachId);
            if (!coach) {
                return res.status(400).json({ message: 'El ID del Coach no es válido. Verifica el código.' });
            }
        } else {
            const defaultAdmin = await findDefaultAdmin();
            if (defaultAdmin) {
                finalCoachId = defaultAdmin.id;
            }
        }

        // Determine tokens & plan
        let initialTokens = 100;
        let currentPeriodEnd: Date | undefined;

        if (role === 'pro' || planType === 'pro') initialTokens = 750;
        if (role === 'pro_master' || planType === 'pro_master') initialTokens = 1500;

        const coachTier = req.body.coachTier || 'vip';
        const commissionRate = coachTier === 'vip_plus' ? 0.50 : 0.15;

        if (role === 'coach') {
            initialTokens = 500;
            const trialEnd = new Date();
            trialEnd.setDate(trialEnd.getDate() + 10);
            currentPeriodEnd = trialEnd;
        }

        // Pending plan logic (freemium)
        let finalRole = role || 'client';
        let finalPlanType = planType || 'free';
        let pendingPlan: string | null = null;

        const isPaidClient = finalRole === 'pro' || finalRole === 'pro_master' || finalPlanType === 'pro' || finalPlanType === 'pro_master';
        if (isPaidClient) {
            pendingPlan = (finalRole === 'pro' || finalRole === 'pro_master') ? finalRole : finalPlanType;
            finalRole = 'client';
            finalPlanType = 'free';
            initialTokens = 100;
        } else if (req.body.pendingPlan) {
            pendingPlan = req.body.pendingPlan;
            finalRole = 'client';
            initialTokens = 100;
        }

        const userId = uuidv4();

        // 1. Create user in Supabase Auth (handles password hashing)
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm so users can log in immediately
            user_metadata: {
                name,
                role: finalRole,
                plan_type: finalPlanType,
            },
        });

        if (authError) {
            console.error('Supabase Auth createUser error:', authError);
            return res.status(400).json({ message: authError.message });
        }

        // Use Supabase Auth UUID as user id for consistency
        const authUserId = authData.user.id;

        // 2. Insert into our custom users table with the same UUID
        const newUser: Partial<User> & { id: string } = {
            id: authUserId,
            email,
            name,
            role: finalRole as User['role'],
            plan_type: finalPlanType as User['plan_type'],
            tokens: initialTokens,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
            coach_id: finalCoachId || null,
            coach_tier: finalRole === 'coach' ? coachTier : 'standard',
            commission_rate: finalRole === 'coach' ? commissionRate : 0.15,
            pending_plan: pendingPlan as User['pending_plan'],
            token_reset_date: new Date().toISOString(),
            current_period_end: currentPeriodEnd?.toISOString(),
            status: 'active',
            streak: 0,
        };

        await createUser(newUser);

        // 3. Sign in to get a session token for the newly created user
        const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (signInError || !sessionData.session) {
            console.error('Post-registration sign-in error:', signInError);
            return res.status(500).json({ message: 'Usuario creado, pero error al iniciar sesión automáticamente' });
        }

        const token = sessionData.session.access_token;

        const { plan_type, ...userProps } = newUser as any;
        const userForFrontend = {
            ...userProps,
            planType: finalPlanType,
            biometrics: {},
            metrics: {},
            pendingPlan: pendingPlan,
            coachProfile: finalRole === 'coach' ? {
                planTier: coachTier,
                commissionRate,
                subscriptionStatus: 'active'
            } : undefined,
        };

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: userForFrontend,
        });

    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        // 1. Authenticate via Supabase Auth
        const { data: sessionData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (authError || !sessionData.session) {
            return res.status(401).json({ message: 'Credenciales incorrectas' });
        }

        const token = sessionData.session.access_token;
        const authUserId = sessionData.user.id;

        // 2. Load full user profile from our users table
        const user = await findUserById(authUserId);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado en la base de datos' });
        }

        // 3. Lazy token reset logic
        const now = new Date();
        const lastReset = user.token_reset_date ? new Date(user.token_reset_date) : null;
        const shouldReset = !lastReset ||
            lastReset.getMonth() !== now.getMonth() ||
            lastReset.getFullYear() !== now.getFullYear();

        if (shouldReset) {
            console.log(`[Token Reset] Resetting tokens for ${user.email} (${user.role})`);
            let targetTokens = user.tokens;
            let shouldUpdate = false;
            let newTier: 'vip' | 'vip_plus' | undefined;

            if (user.role === 'coach') {
                const clients = await findUsersByCoachId(user.id);
                const clientCount = clients.length;
                if (clientCount > 30) {
                    targetTokens = 2000;
                    newTier = 'vip_plus';
                } else {
                    targetTokens = 1000;
                    newTier = 'vip';
                }
                shouldUpdate = true;
            } else if (user.role === 'client') {
                if (user.plan_type === 'pro_master') targetTokens = 1500;
                else if (user.plan_type === 'pro') targetTokens = 750;
                else targetTokens = 100;
                shouldUpdate = true;
            }

            if (shouldUpdate) {
                user.tokens = targetTokens;
                user.token_reset_date = now;
                if (newTier) user.coach_tier = newTier;
                await updateUser(user.id, {
                    tokens: targetTokens,
                    token_reset_date: now,
                    ...(newTier ? { coach_tier: newTier } : {}),
                });
            }
        }

        // 4. Fetch biometrics & metrics
        const biometrics = await getBiometrics(user.id);
        const metrics = await getMetrics(user.id);
        const safeMetrics = metrics ? {
            ...metrics,
            bodyFat: metrics.body_fat,
        } : {};

        const { plan_type, date_of_birth, ...userProps } = user as any;
        const formattedDate = date_of_birth ? new Date(date_of_birth).toISOString().split('T')[0] : undefined;

        const userForFrontend = {
            ...userProps,
            planType: plan_type,
            dateOfBirth: formattedDate,
            biometrics: biometrics || {},
            metrics: safeMetrics,
            status: user.status || 'active',
            coachProfile: user.role === 'coach' ? {
                planTier: user.coach_tier || 'standard',
                commissionRate: user.commission_rate || 0.15,
                subscriptionStatus: 'active',
            } : undefined,
        };

        res.json({
            message: 'Login successful',
            token,
            user: userForFrontend,
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};
