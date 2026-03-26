"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const userModel_1 = require("../models/userModel");
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password, name, role, planType, coachId } = req.body;
        if (!email || !password || !name) {
            return res.status(400).json({ message: 'Faltan campos obligatorios' });
        }
        const existingUser = yield (0, userModel_1.findUserByEmail)(email);
        if (existingUser) {
            return res.status(400).json({ message: 'El usuario ya está registrado' });
        }
        // Validate Coach ID if provided, otherwise assign Default Admin
        let finalCoachId = coachId;
        if (coachId) {
            const coach = yield (0, userModel_1.findUserById)(coachId);
            if (!coach) {
                return res.status(400).json({ message: 'El ID del Coach no es válido. Verifica el código.' });
            }
        }
        else {
            // New Logic: If no coachId, assign to Default Admin
            const defaultAdmin = yield (0, userModel_1.findDefaultAdmin)();
            if (defaultAdmin) {
                finalCoachId = defaultAdmin.id;
            }
        }
        const salt = yield bcryptjs_1.default.genSalt(10);
        const passwordHash = yield bcryptjs_1.default.hash(password, salt);
        // Initialize tokens based on plan/role
        let initialTokens = 100; // Default Free
        let currentPeriodEnd = undefined;
        if (role === 'pro' || planType === 'pro')
            initialTokens = 750;
        if (role === 'pro_master' || planType === 'pro_master')
            initialTokens = 1500;
        if (role === 'coach') {
            // COACH BUSINESS LOGIC
            // 1. 500 Base Tokens
            initialTokens = 500;
            // 2. 10 Days Free Trial
            const trialEnd = new Date();
            trialEnd.setDate(trialEnd.getDate() + 10);
            currentPeriodEnd = trialEnd;
        }
        // Coach Tier Logic (Store preference, but tokens are fixed 500 for trial)
        const coachTier = req.body.coachTier || 'vip';
        const commissionRate = coachTier === 'vip_plus' ? 0.50 : 0.15;
        // Pending Plan Logic (Freemium with Upgrade Intent)
        // If user registers as PRO or PRO_MASTER, we create them as FREE and set pending_plan
        let finalRole = role || 'free';
        let finalPlanType = planType || 'free';
        let pendingPlan = null;
        const isPaidClient = finalRole === 'pro' || finalRole === 'pro_master' || finalPlanType === 'pro' || finalPlanType === 'pro_master';
        if (isPaidClient) {
            console.log(`📝 Registering user with Pending Plan: ${finalRole}`);
            // Save the INTENDED plan
            pendingPlan = (finalRole === 'pro' || finalRole === 'pro_master') ? finalRole : finalPlanType;
            // Downgrade to FREE
            finalRole = 'free';
            finalPlanType = 'free';
            initialTokens = 100; // Reset tokens to free level
        }
        else if (req.body.pendingPlan) {
            // Case 2: Frontend already intercepted and sent role='free' + pendingPlan='pro'
            console.log(`📝 Registering user with Explicit Pending Plan: ${req.body.pendingPlan}`);
            pendingPlan = req.body.pendingPlan;
            finalRole = 'free'; // Ensure it's free
            initialTokens = 100;
        }
        const newUser = {
            id: (0, uuid_1.v4)(),
            email,
            password_hash: passwordHash,
            name,
            role: finalRole,
            plan_type: finalPlanType,
            tokens: initialTokens,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
            coach_id: finalCoachId || null,
            coach_tier: role === 'coach' ? coachTier : undefined, // Keep preference for future
            commission_rate: role === 'coach' ? commissionRate : undefined,
            pending_plan: pendingPlan,
            token_reset_date: new Date(), // Initialize reset date
            current_period_end: currentPeriodEnd // Set Trial End
        };
        yield (0, userModel_1.createUser)(newUser);
        // Create JWT
        const token = jsonwebtoken_1.default.sign({ id: newUser.id, email: newUser.email, role: newUser.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '30d' });
        // Return user without password
        const { password_hash, plan_type, date_of_birth } = newUser, userProps = __rest(newUser, ["password_hash", "plan_type", "date_of_birth"]);
        // Format Date to YYYY-MM-DD
        const formattedDate = date_of_birth ? new Date(date_of_birth).toISOString().split('T')[0] : undefined;
        const userForFrontend = Object.assign(Object.assign({}, userProps), { planType: plan_type, dateOfBirth: formattedDate, biometrics: {}, metrics: {}, 
            // Map flat DB structure to Frontend Nested Object
            pendingPlan: newUser.pending_plan, coachProfile: role === 'coach' ? {
                planTier: coachTier,
                commissionRate: commissionRate || 0.15,
                subscriptionStatus: 'active'
            } : undefined });
        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: userForFrontend
        });
    }
    catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
});
exports.register = register;
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        const user = yield (0, userModel_1.findUserByEmail)(email);
        if (!user) {
            return res.status(401).json({ message: 'Credenciales incorrectas' });
        }
        if (user.password_hash) {
            const isMatch = yield bcryptjs_1.default.compare(password, user.password_hash);
            if (!isMatch) {
                return res.status(401).json({ message: 'Credenciales incorrectas' });
            }
        }
        else {
            return res.status(401).json({ message: 'Credenciales incorrectas (sin contraseña establecida)' });
        }
        // --- LAZY TOKEN RESET LOGIC FOR COACHES ---
        // --- LAZY TOKEN RESET LOGIC (COACHES & CLIENTS) ---
        const now = new Date();
        const lastReset = user.token_reset_date ? new Date(user.token_reset_date) : null;
        // Check if reset needed (Different Month or Never Reset)
        const shouldReset = !lastReset ||
            (lastReset.getMonth() !== now.getMonth()) ||
            (lastReset.getFullYear() !== now.getFullYear());
        if (shouldReset) {
            console.log(`[Token Reset] Resetting tokens for User ${user.email} (${user.role})`);
            let targetTokens = user.tokens;
            let shouldUpdate = false;
            let newTier = undefined;
            if (user.role === 'coach') {
                // Coach Logic: Dynamic Tier Calculation based on Client Count
                // Rule: 0-30 Clients = Level 1 (VIP) -> 1000 Tokens
                // Rule: >30 Clients = Level 2 (VIP_PLUS) -> 2000 Tokens
                // We need to count clients. Since findUsersByCoachId exists in userModel, we can use it.
                // Note: We might need to import findUsersByCoachId if not already imported.
                const clients = yield Promise.resolve().then(() => __importStar(require('../models/userModel'))).then(m => m.findUsersByCoachId(user.id));
                const clientCount = clients.length;
                if (clientCount > 30) {
                    targetTokens = 2000;
                    newTier = 'vip_plus';
                }
                else {
                    targetTokens = 1000;
                    newTier = 'vip';
                }
                // If tier changed, we should update it to keep DB consistent
                if (user.coach_tier !== newTier) {
                    console.log(`[Tier Update] Coach ${user.email} moved to ${newTier} (${clientCount} clients)`);
                }
                shouldUpdate = true;
            }
            else if (user.role === 'client') {
                // Client Logic: Reset to Plan Limit based on plan_type
                if (user.plan_type === 'pro_master') {
                    targetTokens = 1500;
                }
                else if (user.plan_type === 'pro') {
                    targetTokens = 750;
                }
                else {
                    // Free or undefined
                    targetTokens = 100;
                }
                shouldUpdate = true;
            }
            if (shouldUpdate) {
                // Update User Object in Memory
                user.tokens = targetTokens;
                user.token_reset_date = now;
                if (newTier)
                    user.coach_tier = newTier;
                // Persist to DB
                yield (0, userModel_1.updateUser)(user.id, {
                    tokens: targetTokens,
                    token_reset_date: now,
                    coach_tier: newTier // Auto-update tier if changed
                });
            }
        }
        // ------------------------------------------
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '30d' });
        // Fetch extra data
        const biometrics = yield (0, userModel_1.getBiometrics)(user.id);
        const metrics = yield (0, userModel_1.getMetrics)(user.id); // Returns snake_case UserMetrics
        // Map metrics to Frontend camelCase
        const safeMetrics = metrics ? Object.assign(Object.assign({}, metrics), { bodyFat: metrics.body_fat }) : {};
        const { password_hash, plan_type, date_of_birth } = user, userProps = __rest(user, ["password_hash", "plan_type", "date_of_birth"]);
        // Format Date to YYYY-MM-DD
        const formattedDate = date_of_birth ? new Date(date_of_birth).toISOString().split('T')[0] : undefined;
        const userForFrontend = Object.assign(Object.assign({}, userProps), { planType: plan_type, dateOfBirth: formattedDate, biometrics: biometrics || {}, metrics: safeMetrics, status: user.status || 'active', 
            // Map flat DB structure to Frontend Nested Object
            coachProfile: user.role === 'coach' ? {
                planTier: user.coach_tier || 'standard',
                commissionRate: user.commission_rate || 0.15,
                subscriptionStatus: 'active'
            } : undefined });
        res.json({
            message: 'Login successful',
            token,
            user: userForFrontend
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
});
exports.login = login;
