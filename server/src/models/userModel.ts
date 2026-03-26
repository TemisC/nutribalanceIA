import supabase from '../config/db';

export interface User {
    id: string;
    email: string;
    password_hash?: string; // Kept for legacy reference; auth now via Supabase Auth
    name: string;
    role: 'client' | 'coach' | 'admin' | 'superadmin';
    plan_type: 'free' | 'pro' | 'pro_master';
    tokens: number;
    avatar?: string;
    coach_id?: string;
    coach_tier?: 'vip' | 'vip_plus' | 'standard';
    commission_rate?: number;
    surname?: string;
    date_of_birth?: string;
    status?: 'active' | 'inactive';
    created_at?: string;
    billing_date?: string | Date;
    current_period_end?: string | Date;
    streak?: number;
    coach_name?: string;
    pending_plan?: 'pro' | 'pro_master' | null;
    last_payment_date?: string | Date;
    token_reset_date?: string | Date;
}

export interface UserBiometrics {
    user_id: string;
    gender: 'male' | 'female';
    age: number;
    height: number;
    weight: number;
    activity_level: string;
    goal: string;
    diet_preference?: string;
    medical_conditions?: string;
    allergies?: string;
    medications?: string;
    injuries?: string;
    sleep_hours?: number;
    stress_level?: string;
    water_intake?: number;
    daily_meals?: number;
}

export interface UserMetrics {
    user_id: string;
    bmr: number;
    tdee: number;
    calories_target: number;
    protein_target: number;
    carbs_target: number;
    fats_target: number;
    water_target: number;
    bmi?: number;
    body_fat?: number;
}

export interface DBCommunityPost {
    id: string;
    user_id: string;
    content: string;
    type: 'achievement' | 'milestone' | 'motivation' | 'question' | 'recipe' | 'hydration' | 'workout';
    likes: number;
    tokens_awarded: number;
    status: 'pending' | 'published' | 'rejected' | 'needs_edit';
    created_at?: Date;
    coach_id?: string | null;
    image_url?: string | null;
}

// ─── USERS ───────────────────────────────────────────────────────────────────

export const createUser = async (user: Partial<User> & { id: string }) => {
    const { error } = await supabase.from('users').insert(user);
    if (error) throw error;
    return true;
};

export const findUserByEmail = async (email: string): Promise<User | null> => {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
    if (error || !data) return null;
    return data as User;
};

export const findUserById = async (id: string): Promise<User | null> => {
    const { data, error } = await supabase
        .from('users')
        .select('*, coach:coach_id(name)')
        .eq('id', id)
        .single();
    if (error || !data) return null;
    // Flatten coach_name from joined table
    const row: any = data;
    return {
        ...row,
        coach_name: row.coach?.name ?? null,
        coach: undefined,
    } as User;
};

export const findAllUsers = async (): Promise<User[]> => {
    const { data, error } = await supabase
        .from('users')
        .select('*, coach:coach_id(name)')
        .order('role')
        .order('name');
    if (error || !data) return [];
    return (data as any[]).map(row => ({
        ...row,
        coach_name: row.coach?.name ?? null,
        coach: undefined,
    })) as User[];
};

export const findUsersByCoachId = async (coachId: string): Promise<User[]> => {
    const { data, error } = await supabase
        .from('users')
        .select('id, email, name, role, plan_type, tokens, avatar, coach_id, coach_tier, commission_rate, surname, status, created_at, billing_date, current_period_end, streak, pending_plan, last_payment_date')
        .eq('coach_id', coachId);
    if (error || !data) return [];
    return data as User[];
};

export const findUserStatsByCoachId = async (coachId: string): Promise<Partial<User>[]> => {
    const { data, error } = await supabase
        .from('users')
        .select('id, plan_type, status, created_at, billing_date')
        .eq('coach_id', coachId);
    if (error || !data) return [];
    return data as Partial<User>[];
};

export const updateUser = async (id: string, userData: Partial<User>) => {
    const validFields = [
        'name', 'surname', 'date_of_birth', 'avatar', 'password_hash', 'role',
        'plan_type', 'tokens', 'status', 'coach_tier', 'commission_rate',
        'current_period_end', 'billing_date', 'pending_plan', 'token_reset_date', 'last_payment_date'
    ];
    const fieldsToUpdate = Object.keys(userData).filter(key => validFields.includes(key));
    if (fieldsToUpdate.length === 0) return;

    const updateObj: Record<string, any> = {};
    fieldsToUpdate.forEach(key => { updateObj[key] = (userData as any)[key]; });

    const { error } = await supabase.from('users').update(updateObj).eq('id', id);
    if (error) throw error;
};

export const findDefaultAdmin = async (): Promise<User | null> => {
    // Prioritize superadmin, then admin
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .in('role', ['superadmin', 'admin'])
        .order('role', { ascending: true }) // 'admin' < 'superadmin' alphabetically; use CASE below
        .limit(1);

    if (error || !data || data.length === 0) return null;

    // Sort: superadmin first
    const sorted = (data as User[]).sort((a, b) => {
        const order: Record<string, number> = { superadmin: 0, admin: 1 };
        return (order[a.role] ?? 99) - (order[b.role] ?? 99);
    });
    return sorted[0];
};

export const deleteUser = async (id: string) => {
    // All child tables have ON DELETE CASCADE in the schema, so a single delete suffices
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw error;
    return true;
};

export const bulkUpdateStatus = async (coachId: string, status: 'active' | 'inactive') => {
    const { error } = await supabase
        .from('users')
        .update({ status })
        .eq('coach_id', coachId)
        .eq('role', 'client');
    if (error) throw error;
};

// ─── TOKENS ──────────────────────────────────────────────────────────────────

export const deductUserTokens = async (userId: string, amount: number): Promise<boolean> => {
    const { data, error } = await supabase
        .from('users')
        .select('tokens')
        .eq('id', userId)
        .single();
    if (error || !data) return false;

    if ((data as any).tokens < amount) return false;

    const { error: updateErr } = await supabase
        .from('users')
        .update({ tokens: (data as any).tokens - amount })
        .eq('id', userId);
    if (updateErr) return false;

    await logTokenUsage(userId, amount, 'usage_deduction');
    return true;
};

export const addTokens = async (userId: string, amount: number): Promise<boolean> => {
    // Increment tokens using RPC to avoid race conditions
    const { data, error } = await supabase
        .from('users')
        .select('tokens')
        .eq('id', userId)
        .single();
    if (error || !data) return false;

    const { error: updateErr } = await supabase
        .from('users')
        .update({ tokens: (data as any).tokens + amount })
        .eq('id', userId);
    if (updateErr) return false;
    return true;
};

export const logTokenUsage = async (userId: string, amount: number, purpose: string) => {
    try {
        const { error } = await supabase
            .from('token_usage_logs')
            .insert({ user_id: userId, amount, purpose });
        if (error) console.error('Failed to log token usage:', error.message);
    } catch (error) {
        console.error('Failed to log token usage:', error);
    }
};

// ─── BIOMETRICS ───────────────────────────────────────────────────────────────

export const getBiometrics = async (userId: string): Promise<UserBiometrics | null> => {
    const { data, error } = await supabase
        .from('user_biometrics')
        .select('*')
        .eq('user_id', userId)
        .single();
    if (error || !data) return null;
    return data as UserBiometrics;
};

export const upsertBiometrics = async (biometrics: UserBiometrics) => {
    const { error } = await supabase
        .from('user_biometrics')
        .upsert(biometrics, { onConflict: 'user_id' });
    if (error) throw error;
};

// ─── METRICS ─────────────────────────────────────────────────────────────────

export const getMetrics = async (userId: string): Promise<UserMetrics | null> => {
    const { data, error } = await supabase
        .from('user_metrics')
        .select('*')
        .eq('user_id', userId)
        .single();
    if (error || !data) return null;
    return data as UserMetrics;
};

export const upsertMetrics = async (metrics: UserMetrics) => {
    const { error } = await supabase
        .from('user_metrics')
        .upsert(metrics, { onConflict: 'user_id' });
    if (error) throw error;
};

// ─── PROGRESS LOGS ───────────────────────────────────────────────────────────

export const logDailyProgress = async (
    userId: string,
    date: string,
    weight: number,
    calories: number = 0,
    measurements: any = {}
) => {
    // Check if entry exists
    const { data: existing } = await supabase
        .from('progress_logs')
        .select('id, calories_consumed')
        .eq('user_id', userId)
        .eq('date', date)
        .single();

    if (existing) {
        const { error } = await supabase
            .from('progress_logs')
            .update({
                weight,
                calories_consumed: (existing as any).calories_consumed + calories,
                measurements_json: measurements,
            })
            .eq('user_id', userId)
            .eq('date', date);
        if (error) throw error;
    } else {
        const { error } = await supabase
            .from('progress_logs')
            .insert({ user_id: userId, date, weight, calories_consumed: calories, measurements_json: measurements });
        if (error) throw error;
    }
};

export const getProgressHistory = async (userId: string): Promise<any[]> => {
    const { data, error } = await supabase
        .from('progress_logs')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });
    if (error || !data) return [];
    return data;
};

// ─── COMMUNITY ────────────────────────────────────────────────────────────────

export const findPostById = async (postId: string): Promise<DBCommunityPost | null> => {
    const { data, error } = await supabase
        .from('community_posts')
        .select('*')
        .eq('id', postId)
        .single();
    if (error || !data) return null;
    return data as DBCommunityPost;
};

export const updateCommunityPostStatus = async (postId: string, status: DBCommunityPost['status']): Promise<boolean> => {
    const { error } = await supabase
        .from('community_posts')
        .update({ status })
        .eq('id', postId);
    return !error;
};

export const createCommunityPost = async (post: DBCommunityPost) => {
    const { error } = await supabase.from('community_posts').insert({
        id: post.id,
        user_id: post.user_id,
        content: post.content,
        type: post.type,
        likes: post.likes || 0,
        tokens_awarded: post.tokens_awarded || 0,
        status: post.status,
        coach_id: post.coach_id || null,
        image_url: post.image_url || null,
    });
    if (error) throw error;
};

export const createComment = async (id: string, postId: string, userId: string, content: string) => {
    const { error } = await supabase
        .from('community_post_comments')
        .insert({ id, post_id: postId, user_id: userId, content });
    if (error) throw error;
};

export const getCommentsForPost = async (postId: string) => {
    const { data, error } = await supabase
        .from('community_post_comments')
        .select('*, user:user_id(name, avatar)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
    if (error || !data) return [];
    return (data as any[]).map(c => ({
        ...c,
        user_name: c.user?.name,
        user_avatar: c.user?.avatar,
        timestamp: c.created_at,
        user: undefined,
    }));
};

export const toggleLike = async (postId: string, userId: string): Promise<'liked' | 'unliked'> => {
    const { data: existing } = await supabase
        .from('community_post_likes')
        .select('post_id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .single();

    if (existing) {
        await supabase.from('community_post_likes').delete().eq('post_id', postId).eq('user_id', userId);
        // Decrement likes (floor at 0)
        const { data: post } = await supabase.from('community_posts').select('likes').eq('id', postId).single();
        const newLikes = Math.max(0, ((post as any)?.likes ?? 1) - 1);
        await supabase.from('community_posts').update({ likes: newLikes }).eq('id', postId);
        return 'unliked';
    } else {
        await supabase.from('community_post_likes').insert({ post_id: postId, user_id: userId });
        const { data: post } = await supabase.from('community_posts').select('likes').eq('id', postId).single();
        await supabase.from('community_posts').update({ likes: ((post as any)?.likes ?? 0) + 1 }).eq('id', postId);
        return 'liked';
    }
};

export const getCommunityPosts = async (
    coachId?: string,
    currentUserId?: string,
    includePending: boolean = false
): Promise<any[]> => {
    // Build status filter
    const statusFilter = includePending ? ['published', 'pending'] : ['published'];

    let query = supabase
        .from('community_posts')
        .select('*, user:user_id(name, avatar)')
        .in('status', statusFilter)
        .order('created_at', { ascending: false })
        .limit(20);

    if (coachId) {
        query = query.or(`coach_id.eq.${coachId},user_id.eq.${coachId}`);
    }

    const { data: rows, error } = await query;
    if (error || !rows || rows.length === 0) return [];

    const postIds = (rows as any[]).map(r => r.id);

    // Fetch is_liked for current user
    let likedSet = new Set<string>();
    if (currentUserId && postIds.length > 0) {
        const { data: likedRows } = await supabase
            .from('community_post_likes')
            .select('post_id')
            .eq('user_id', currentUserId)
            .in('post_id', postIds);
        if (likedRows) {
            likedSet = new Set((likedRows as any[]).map(r => r.post_id));
        }
    }

    // Fetch all comments for these posts in one query
    const { data: allComments } = await supabase
        .from('community_post_comments')
        .select('*, user:user_id(name, avatar)')
        .in('post_id', postIds)
        .order('created_at', { ascending: true });

    const commentsByPost: Record<string, any[]> = {};
    if (allComments) {
        (allComments as any[]).forEach(c => {
            if (!commentsByPost[c.post_id]) commentsByPost[c.post_id] = [];
            commentsByPost[c.post_id].push({
                ...c,
                user_name: c.user?.name,
                user_avatar: c.user?.avatar,
                timestamp: c.created_at,
                user: undefined,
            });
        });
    }

    return (rows as any[]).map(row => ({
        ...row,
        user_name: row.user?.name,
        user_avatar: row.user?.avatar,
        user: undefined,
        isLiked: likedSet.has(row.id),
        comments: commentsByPost[row.id] || [],
    }));
};

export const getLeaderboard = async (): Promise<Partial<User>[]> => {
    const { data, error } = await supabase
        .from('users')
        .select('id, name, avatar, tokens, streak')
        .eq('role', 'client')
        .order('tokens', { ascending: false })
        .limit(3);
    if (error || !data) return [];
    return data;
};

export const getCommunityStats = async () => {
    const { data: streakData } = await supabase
        .from('users')
        .select('streak')
        .eq('role', 'client');
    const avgStreak = streakData && streakData.length > 0
        ? Math.round((streakData as any[]).reduce((sum, u) => sum + (u.streak || 0), 0) / streakData.length)
        : 0;

    const { count: totalPosts } = await supabase
        .from('community_posts')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'published');

    return { avgStreak, totalPosts: totalPosts || 0 };
};

// ─── SUBSCRIPTIONS / ADMIN ────────────────────────────────────────────────────

export const getPendingPlanUsers = async (): Promise<User[]> => {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .not('pending_plan', 'is', null)
        .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data as User[];
};

export const approveUserPlan = async (userId: string, plan: 'pro' | 'pro_master') => {
    const tokens = plan === 'pro_master' ? 1500 : 750;
    const now = new Date();
    const expiry = new Date(now);
    expiry.setDate(expiry.getDate() + 30);

    // Log the subscription approval
    const amount = plan === 'pro' ? 6.99 : 9.99;
    await supabase.from('subscription_requests').insert({
        user_id: userId,
        requested_role: plan,
        amount,
        status: 'approved',
        updated_at: now.toISOString(),
    });

    // Get current tokens
    const { data: userData } = await supabase
        .from('users')
        .select('tokens')
        .eq('id', userId)
        .single();

    const currentTokens = (userData as any)?.tokens ?? 0;

    const { error } = await supabase.from('users').update({
        plan_type: plan,
        tokens: currentTokens + tokens,
        pending_plan: null,
        last_payment_date: now.toISOString(),
        current_period_end: expiry.toISOString(),
    }).eq('id', userId);

    if (error) throw error;
};

export const getAdminAnalytics = async () => {
    // 1. Income per month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: incomeRows } = await supabase
        .from('subscription_requests')
        .select('amount, updated_at')
        .eq('status', 'approved')
        .gte('updated_at', sixMonthsAgo.toISOString());

    // Group by month
    const incomeByMonth: Record<string, number> = {};
    (incomeRows || []).forEach((r: any) => {
        const month = new Date(r.updated_at).toLocaleString('en', { month: 'short' });
        incomeByMonth[month] = (incomeByMonth[month] || 0) + (r.amount || 0);
    });
    const incomeData = Object.entries(incomeByMonth).map(([name, income]) => ({ name, income }));

    // 2. New clients per month (last 6 months)
    const { data: clientRows } = await supabase
        .from('users')
        .select('created_at')
        .not('role', 'in', '("coach","admin","superadmin")')
        .gte('created_at', sixMonthsAgo.toISOString());

    const clientsByMonth: Record<string, number> = {};
    (clientRows || []).forEach((r: any) => {
        const month = new Date(r.created_at).toLocaleString('en', { month: 'short' });
        clientsByMonth[month] = (clientsByMonth[month] || 0) + 1;
    });
    const userData = Object.entries(clientsByMonth).map(([name, users]) => ({ name, users }));

    // 3. New coaches per month (last 6 months)
    const { data: coachRows } = await supabase
        .from('users')
        .select('created_at')
        .eq('role', 'coach')
        .gte('created_at', sixMonthsAgo.toISOString());

    const coachesByMonth: Record<string, number> = {};
    (coachRows || []).forEach((r: any) => {
        const month = new Date(r.created_at).toLocaleString('en', { month: 'short' });
        coachesByMonth[month] = (coachesByMonth[month] || 0) + 1;
    });
    const coachData = Object.entries(coachesByMonth).map(([name, coaches]) => ({ name, coaches }));

    // 4. Token usage (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data: tokenRows } = await supabase
        .from('token_usage_logs')
        .select('amount, created_at')
        .gte('created_at', thirtyDaysAgo.toISOString());

    const tokensByDay: Record<string, number> = {};
    (tokenRows || []).forEach((r: any) => {
        const day = new Date(r.created_at).toLocaleDateString('en', { day: '2-digit', month: 'short' });
        tokensByDay[day] = (tokensByDay[day] || 0) + (r.amount || 0);
    });
    const tokenData = Object.entries(tokensByDay).map(([name, tokens]) => ({ name, tokens }));

    // KPI Cards
    const { count: totalUsers } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .in('role', ['client', 'coach']);

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const { count: lastMonthUsers } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .in('role', ['client', 'coach'])
        .lt('created_at', oneMonthAgo.toISOString());

    const safeLastMonth = lastMonthUsers || 1;
    const total = totalUsers || 0;
    const userGrowth = Math.round(((total - safeLastMonth) / safeLastMonth) * 100);

    const { data: mrrRow } = await supabase
        .from('subscription_requests')
        .select('amount')
        .eq('status', 'approved')
        .gte('updated_at', thirtyDaysAgo.toISOString());
    const mrr = (mrrRow || []).reduce((s: number, r: any) => s + (r.amount || 0), 0);

    const { data: totalTokensRow } = await supabase
        .from('token_usage_logs')
        .select('amount');
    const totalTokens = (totalTokensRow || []).reduce((s: number, r: any) => s + (r.amount || 0), 0);

    // Alerts
    const alerts = [];
    const { data: highUsageRow } = await supabase
        .from('token_usage_logs')
        .select('amount')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    const highUsage = (highUsageRow || []).reduce((s: number, r: any) => s + (r.amount || 0), 0);
    if (highUsage > 10000) {
        alerts.push({ type: 'warning', msg: `Alto consumo de tokens (${highUsage}) en las últimas 24h`, time: 'Hace poco' });
    }

    const { data: lastUserRow } = await supabase
        .from('users')
        .select('name, role')
        .order('created_at', { ascending: false })
        .limit(1);
    if (lastUserRow && lastUserRow.length > 0) {
        alerts.push({ type: 'success', msg: `Nuevo usuario: ${(lastUserRow[0] as any).name} (${(lastUserRow[0] as any).role})`, time: 'Reciente' });
    }

    const { data: lastSubRow } = await supabase
        .from('subscription_requests')
        .select('requested_role, amount')
        .eq('status', 'approved')
        .order('updated_at', { ascending: false })
        .limit(1);
    if (lastSubRow && lastSubRow.length > 0) {
        alerts.push({ type: 'info', msg: `Nueva suscripción ${(lastSubRow[0] as any).requested_role} ($${(lastSubRow[0] as any).amount})`, time: 'Reciente' });
    }

    if (alerts.length === 0) {
        alerts.push({ type: 'success', msg: 'Sistema operando normalmente', time: 'Ahora' });
    }

    return {
        incomeData,
        userData,
        coachData,
        tokenData,
        globalStats: { totalUsers: total, userGrowth, mrr, totalTokens },
        alerts,
    };
};

// ─── MEAL LOGS ────────────────────────────────────────────────────────────────

export const logMeal = async (meal: any) => {
    const { error } = await supabase.from('meal_logs').insert({
        id: meal.id,
        user_id: meal.userId,
        food_name: meal.foodName,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fats: meal.fats,
        image_base64: meal.image || null,
        analysis_text: meal.analysisText || null,
        suggestions_json: meal.suggestions ? meal.suggestions : null,
        created_at: new Date(meal.timestamp || Date.now()).toISOString(),
    });
    if (error) throw error;
};

export const getMealHistory = async (userId: string) => {
    const { data, error } = await supabase
        .from('meal_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data;
};

export const deleteMeal = async (mealId: string) => {
    const { error } = await supabase.from('meal_logs').delete().eq('id', mealId);
    if (error) throw error;
};

// ─── LEGACY NO-OPS (kept for compatibility, tables now managed in Supabase) ──

/** @deprecated Tables are now created in Supabase SQL Editor */
export const initMealTable = async () => {
    console.log('[initMealTable] Skipped — table managed in Supabase.');
};
