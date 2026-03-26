"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMeal = exports.getMealHistory = exports.logMeal = exports.initMealTable = exports.getAdminAnalytics = exports.approveUserPlan = exports.getPendingPlanUsers = exports.getCommunityPosts = exports.toggleLike = exports.getCommentsForPost = exports.createComment = exports.createCommunityPost = exports.updateCommunityPostStatus = exports.findPostById = exports.getProgressHistory = exports.logDailyProgress = exports.upsertMetrics = exports.getMetrics = exports.upsertBiometrics = exports.getBiometrics = exports.addTokens = exports.logTokenUsage = exports.deductUserTokens = exports.bulkUpdateStatus = exports.deleteUser = exports.findDefaultAdmin = exports.updateUser = exports.findUsersByCoachId = exports.findAllUsers = exports.findUserById = exports.getCommunityStats = exports.getLeaderboard = exports.findUserByEmail = exports.createUser = void 0;
const db_1 = __importDefault(require("../config/db"));
const createUser = (user) => __awaiter(void 0, void 0, void 0, function* () {
    const [result] = yield db_1.default.execute(`INSERT INTO users (id, email, password_hash, name, role, plan_type, tokens, avatar, coach_id, coach_tier, commission_rate, status, streak, pending_plan, last_payment_date, token_reset_date, current_period_end) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        user.id, user.email, user.password_hash, user.name, user.role, user.plan_type,
        user.tokens, user.avatar || null, user.coach_id || null, user.coach_tier || 'standard',
        user.commission_rate || 0.15, 'active', 0,
        user.pending_plan || null, user.last_payment_date || null,
        user.token_reset_date || null, user.current_period_end || null
    ]);
    return result;
});
exports.createUser = createUser;
const findUserByEmail = (email) => __awaiter(void 0, void 0, void 0, function* () {
    const [rows] = yield db_1.default.execute('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0] || null;
});
exports.findUserByEmail = findUserByEmail;
// ... Biometrics and Metrics interfaces ...
// Helper for Community Stats
const getLeaderboard = () => __awaiter(void 0, void 0, void 0, function* () {
    const [rows] = yield db_1.default.execute('SELECT id, name, avatar, tokens, streak FROM users WHERE role = "client" ORDER BY tokens DESC LIMIT 3');
    return rows;
});
exports.getLeaderboard = getLeaderboard;
const getCommunityStats = () => __awaiter(void 0, void 0, void 0, function* () {
    const [streakRows] = yield db_1.default.execute('SELECT AVG(streak) as avgStreak FROM users WHERE role = "client"');
    const [postRows] = yield db_1.default.execute('SELECT COUNT(*) as totalPosts FROM community_posts WHERE status = "published"');
    return {
        avgStreak: Math.round(streakRows[0].avgStreak || 0),
        totalPosts: postRows[0].totalPosts || 0
    };
});
exports.getCommunityStats = getCommunityStats;
const findUserById = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const [rows] = yield db_1.default.execute(`SELECT u.*, c.name as coach_name 
         FROM users u 
         LEFT JOIN users c ON u.coach_id = c.id 
         WHERE u.id = ?`, [id]);
    return rows[0] || null;
});
exports.findUserById = findUserById;
const findAllUsers = () => __awaiter(void 0, void 0, void 0, function* () {
    const [rows] = yield db_1.default.execute(`
        SELECT u.*, c.name as coach_name 
        FROM users u 
        LEFT JOIN users c ON u.coach_id = c.id 
        ORDER BY u.role, u.name
    `);
    return rows;
});
exports.findAllUsers = findAllUsers;
const findUsersByCoachId = (coachId) => __awaiter(void 0, void 0, void 0, function* () {
    // Select only necessary columns to avoid fetching heavy blobs like unexpected base64 images in unrelated columns
    const [rows] = yield db_1.default.execute(`SELECT id, email, name, role, plan_type, tokens, avatar, coach_id, coach_tier, 
                commission_rate, surname, status, created_at, billing_date, current_period_end, 
                streak, pending_plan, last_payment_date 
         FROM users WHERE coach_id = ?`, [coachId]);
    return rows;
});
exports.findUsersByCoachId = findUsersByCoachId;
const updateUser = (id, userData) => __awaiter(void 0, void 0, void 0, function* () {
    const validFields = ['name', 'surname', 'date_of_birth', 'avatar', 'password_hash', 'role', 'plan_type', 'tokens', 'status', 'coach_tier', 'commission_rate', 'current_period_end', 'billing_date', 'pending_plan', 'token_reset_date'];
    const fieldsToUpdate = Object.keys(userData).filter(key => validFields.includes(key));
    if (fieldsToUpdate.length === 0)
        return;
    const setClause = fieldsToUpdate.map(field => `${field} = ?`).join(', ');
    const values = fieldsToUpdate.map(field => userData[field]);
    const sql = `UPDATE users SET ${setClause} WHERE id = ?`;
    return db_1.default.execute(sql, [...values, id]);
});
exports.updateUser = updateUser;
const findDefaultAdmin = () => __awaiter(void 0, void 0, void 0, function* () {
    // Prioritize SuperAdmin, then Admin
    const [rows] = yield db_1.default.execute("SELECT * FROM users WHERE role IN ('superadmin', 'admin') ORDER BY FIELD(role, 'superadmin', 'admin') LIMIT 1");
    return rows[0] || null;
});
exports.findDefaultAdmin = findDefaultAdmin;
// Comprehensive Delete User (Cascading manually to ensure cleanup)
const deleteUser = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const connection = yield db_1.default.getConnection();
    try {
        yield connection.beginTransaction();
        // 1. Delete Biometrics
        yield connection.execute('DELETE FROM user_biometrics WHERE user_id = ?', [id]);
        // 2. Delete Progress Logs
        yield connection.execute('DELETE FROM progress_logs WHERE user_id = ?', [id]);
        // 3. Delete Meal Plans
        yield connection.execute('DELETE FROM meal_plans WHERE user_id = ?', [id]);
        // 4. Delete Community Interactions (Likes, Comments)
        yield connection.execute('DELETE FROM community_post_likes WHERE user_id = ?', [id]);
        yield connection.execute('DELETE FROM community_post_comments WHERE user_id = ?', [id]);
        // 5. Delete Community Posts (and their related likes/comments first? cascading usually handles this if defined, but let's be safe)
        // If we delete post, dependent likes/comments might fail if no Cascade DB Constraint.
        // Assuming strict mode, we should delete likes/comments ON user's posts first.
        // But simpler: just delete posts. SQLite/MySQL defaults vary.
        // Let's rely on cleaning user's ownership.
        yield connection.execute('DELETE FROM community_posts WHERE user_id = ?', [id]);
        // 6. Delete Messages (Sent or Received)
        yield connection.execute('DELETE FROM messages WHERE sender_id = ? OR receiver_id = ?', [id, id]);
        // 7. Delete Shopping Lists
        yield connection.execute('DELETE FROM shopping_items WHERE user_id = ?', [id]);
        // 8. Delete Subscription Requests
        yield connection.execute('DELETE FROM subscription_requests WHERE user_id = ?', [id]);
        // 9. Finally, Delete User
        yield connection.execute('DELETE FROM users WHERE id = ?', [id]);
        yield connection.commit();
        return true;
    }
    catch (error) {
        yield connection.rollback();
        console.error("Delete User Failed (Rollback):", error);
        throw error;
    }
    finally {
        connection.release();
    }
});
exports.deleteUser = deleteUser;
const bulkUpdateStatus = (coachId, status) => __awaiter(void 0, void 0, void 0, function* () {
    const sql = `UPDATE users SET status = ? WHERE coach_id = ? AND role = 'client'`;
    return db_1.default.execute(sql, [status, coachId]);
});
exports.bulkUpdateStatus = bulkUpdateStatus;
const deductUserTokens = (userId, amount) => __awaiter(void 0, void 0, void 0, function* () {
    const [rows] = yield db_1.default.execute('SELECT tokens FROM users WHERE id = ?', [userId]);
    const user = rows[0];
    if (!user || user.tokens < amount) {
        return false;
    }
    yield db_1.default.execute('UPDATE users SET tokens = tokens - ? WHERE id = ?', [amount, userId]);
    // Log usage
    yield (0, exports.logTokenUsage)(userId, amount, 'usage_deduction');
    return true;
});
exports.deductUserTokens = deductUserTokens;
const logTokenUsage = (userId, amount, purpose) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield db_1.default.execute('INSERT INTO token_usage_logs (user_id, amount, purpose) VALUES (?, ?, ?)', [userId, amount, purpose]);
    }
    catch (error) {
        console.error("Failed to log token usage:", error);
        // non-blocking
    }
});
exports.logTokenUsage = logTokenUsage;
const addTokens = (userId, amount) => __awaiter(void 0, void 0, void 0, function* () {
    yield db_1.default.execute('UPDATE users SET tokens = tokens + ? WHERE id = ?', [amount, userId]);
    return true;
});
exports.addTokens = addTokens;
const getBiometrics = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const [rows] = yield db_1.default.execute('SELECT * FROM user_biometrics WHERE user_id = ?', [userId]);
    return rows[0] || null;
});
exports.getBiometrics = getBiometrics;
const upsertBiometrics = (biometrics) => __awaiter(void 0, void 0, void 0, function* () {
    const sql = `
        INSERT INTO user_biometrics (user_id, gender, age, height, weight, activity_level, goal, diet_preference, medical_conditions, allergies, medications, injuries, sleep_hours, stress_level, water_intake, daily_meals)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        gender = VALUES(gender),
        age = VALUES(age),
        height = VALUES(height),
        weight = VALUES(weight),
        activity_level = VALUES(activity_level),
        goal = VALUES(goal),
        diet_preference = VALUES(diet_preference),
        medical_conditions = VALUES(medical_conditions),
        allergies = VALUES(allergies),
        medications = VALUES(medications),
        injuries = VALUES(injuries),
        sleep_hours = VALUES(sleep_hours),
        stress_level = VALUES(stress_level),
        water_intake = VALUES(water_intake),
        daily_meals = VALUES(daily_meals)
    `;
    const params = [
        biometrics.user_id, biometrics.gender, biometrics.age, biometrics.height,
        biometrics.weight, biometrics.activity_level, biometrics.goal, biometrics.diet_preference || null,
        biometrics.medical_conditions || null, biometrics.allergies || null, biometrics.medications || null,
        biometrics.injuries || null, biometrics.sleep_hours || null, biometrics.stress_level || null,
        biometrics.water_intake || null, biometrics.daily_meals || null
    ];
    return db_1.default.execute(sql, params);
});
exports.upsertBiometrics = upsertBiometrics;
const getMetrics = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const [rows] = yield db_1.default.execute('SELECT * FROM user_metrics WHERE user_id = ?', [userId]);
    return rows[0] || null;
});
exports.getMetrics = getMetrics;
const upsertMetrics = (metrics) => __awaiter(void 0, void 0, void 0, function* () {
    const sql = `
        INSERT INTO user_metrics (user_id, bmr, tdee, calories_target, protein_target, carbs_target, fats_target, water_target, bmi, body_fat)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        bmr = VALUES(bmr),
        tdee = VALUES(tdee),
        calories_target = VALUES(calories_target),
        protein_target = VALUES(protein_target),
        carbs_target = VALUES(carbs_target),
        fats_target = VALUES(fats_target),
        water_target = VALUES(water_target),
        bmi = VALUES(bmi),
        body_fat = VALUES(body_fat)
    `;
    const params = [
        metrics.user_id, metrics.bmr, metrics.tdee, metrics.calories_target,
        metrics.protein_target, metrics.carbs_target, metrics.fats_target, metrics.water_target,
        metrics.bmi || null, metrics.body_fat || null
    ];
    return db_1.default.execute(sql, params);
});
exports.upsertMetrics = upsertMetrics;
const logDailyProgress = (userId_1, date_1, weight_1, ...args_1) => __awaiter(void 0, [userId_1, date_1, weight_1, ...args_1], void 0, function* (userId, date, weight, calories = 0, measurements = {}) {
    const sql = `
        INSERT INTO progress_logs (user_id, date, weight, calories_consumed, measurements_json)
        VALUES (?, ?, ?, ?, ?)
    `;
    // Removed duplicate key update for now or simplify
    // Actually reusing logic from before
    const sql2 = `
        INSERT INTO progress_logs (user_id, date, weight, calories_consumed, measurements_json)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        weight = VALUES(weight),
        calories_consumed = calories_consumed + VALUES(calories_consumed),
        measurements_json = VALUES(measurements_json)
    `;
    return db_1.default.execute(sql2, [userId, date, weight, calories, JSON.stringify(measurements)]);
});
exports.logDailyProgress = logDailyProgress;
const getProgressHistory = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const [rows] = yield db_1.default.execute('SELECT * FROM progress_logs WHERE user_id = ? ORDER BY date DESC', [userId]);
    return rows;
});
exports.getProgressHistory = getProgressHistory;
// --- Community Model ---
// Find post by ID
const findPostById = (postId) => __awaiter(void 0, void 0, void 0, function* () {
    const [rows] = yield db_1.default.execute('SELECT * FROM community_posts WHERE id = ?', [postId]);
    return rows[0] || null;
});
exports.findPostById = findPostById;
// Update post status
const updateCommunityPostStatus = (postId, status) => __awaiter(void 0, void 0, void 0, function* () {
    const [result] = yield db_1.default.execute('UPDATE community_posts SET status = ? WHERE id = ?', [status, postId]);
    return result.affectedRows > 0;
});
exports.updateCommunityPostStatus = updateCommunityPostStatus;
const createCommunityPost = (post) => __awaiter(void 0, void 0, void 0, function* () {
    const sql = `
        INSERT INTO community_posts (id, user_id, content, type, likes, tokens_awarded, status, coach_id, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    return db_1.default.execute(sql, [
        post.id, post.user_id, post.content, post.type,
        post.likes || 0, post.tokens_awarded || 0, post.status, post.coach_id || null, post.image_url || null
    ]);
});
exports.createCommunityPost = createCommunityPost;
// --- Interactions ---
const createComment = (id, postId, userId, content) => __awaiter(void 0, void 0, void 0, function* () {
    return db_1.default.execute('INSERT INTO community_post_comments (id, post_id, user_id, content) VALUES (?, ?, ?, ?)', [id, postId, userId, content]);
});
exports.createComment = createComment;
const getCommentsForPost = (postId) => __awaiter(void 0, void 0, void 0, function* () {
    const [rows] = yield db_1.default.execute(`
        SELECT c.*, u.name as user_name, u.avatar as user_avatar, c.created_at as timestamp
        FROM community_post_comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.post_id = ?
        ORDER BY c.created_at ASC
    `, [postId]);
    return rows;
});
exports.getCommentsForPost = getCommentsForPost;
const toggleLike = (postId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    // Check if exists
    const [rows] = yield db_1.default.execute('SELECT * FROM community_post_likes WHERE post_id = ? AND user_id = ?', [postId, userId]);
    if (rows.length > 0) {
        // Unlike
        yield db_1.default.execute('DELETE FROM community_post_likes WHERE post_id = ? AND user_id = ?', [postId, userId]);
        // Decrement count
        yield db_1.default.execute('UPDATE community_posts SET likes = GREATEST(likes - 1, 0) WHERE id = ?', [postId]);
        return 'unliked';
    }
    else {
        // Like
        yield db_1.default.execute('INSERT INTO community_post_likes (post_id, user_id) VALUES (?, ?)', [postId, userId]);
        // Increment count
        yield db_1.default.execute('UPDATE community_posts SET likes = likes + 1 WHERE id = ?', [postId]);
        return 'liked';
    }
});
exports.toggleLike = toggleLike;
const getCommunityPosts = (coachId_1, currentUserId_1, ...args_1) => __awaiter(void 0, [coachId_1, currentUserId_1, ...args_1], void 0, function* (coachId, currentUserId, includePending = false) {
    let sql = `
        SELECT p.*, u.name as user_name, u.avatar as user_avatar,
        (SELECT COUNT(*) FROM community_post_likes l WHERE l.post_id = p.id AND l.user_id = ?) as is_liked
        FROM community_posts p
        JOIN users u ON p.user_id = u.id
    `;
    // Params management
    const params = [currentUserId || ''];
    let statusCondition = "p.status = 'published'";
    if (includePending) {
        statusCondition = "(p.status = 'published' OR p.status = 'pending')";
    }
    if (coachId) {
        sql += ` WHERE ${statusCondition} AND (p.coach_id = ? OR u.coach_id = ? OR p.user_id = ?) ORDER BY p.created_at DESC`;
        params.push(coachId, coachId, coachId);
    }
    else {
        sql += ` WHERE ${statusCondition} ORDER BY p.created_at DESC`;
    }
    const [rows] = yield db_1.default.execute(sql, params);
    if (rows.length === 0)
        return [];
    // Optimize: Batch fetch comments
    const postIds = rows.map((r) => r.id);
    const placeholders = postIds.map(() => '?').join(',');
    // Fetch all comments for these posts ordered by date
    const [allComments] = yield db_1.default.execute(`SELECT c.*, u.name as user_name, u.avatar as user_avatar, c.created_at as timestamp
         FROM community_post_comments c
         JOIN users u ON c.user_id = u.id
         WHERE c.post_id IN (${placeholders})
         ORDER BY c.created_at ASC`, postIds);
    // Group comments by post_id
    const commentsByPost = {};
    allComments.forEach(c => {
        if (!commentsByPost[c.post_id])
            commentsByPost[c.post_id] = [];
        commentsByPost[c.post_id].push(c);
    });
    // Map comments to posts
    return rows.map((row) => (Object.assign(Object.assign({}, row), { isLiked: !!row.is_liked, comments: commentsByPost[row.id] || [] })));
});
exports.getCommunityPosts = getCommunityPosts;
const getPendingPlanUsers = () => __awaiter(void 0, void 0, void 0, function* () {
    const [rows] = yield db_1.default.execute('SELECT * FROM users WHERE pending_plan IS NOT NULL ORDER BY created_at DESC');
    return rows;
});
exports.getPendingPlanUsers = getPendingPlanUsers;
const approveUserPlan = (userId, plan) => __awaiter(void 0, void 0, void 0, function* () {
    const tokens = plan === 'pro_master' ? 1500 : 750;
    const now = new Date();
    // 30 days expiry
    const expiry = new Date(now);
    expiry.setDate(expiry.getDate() + 30);
    // Convert to MySQL DATETIME format
    const lastPaymentDate = now.toISOString().slice(0, 19).replace('T', ' ');
    const currentPeriodEnd = expiry.toISOString().slice(0, 19).replace('T', ' ');
    const sql = `
        UPDATE users 
        SET plan_type = ?, 
            tokens = tokens + ?, 
            pending_plan = NULL, 
            last_payment_date = ?,
            current_period_end = ?
        WHERE id = ?
    `;
    // Log the transaction for Income Analytics
    const amount = plan === 'pro' ? 6.99 : 9.99;
    yield db_1.default.execute('INSERT INTO subscription_requests (user_id, requested_role, amount, status, updated_at) VALUES (?, ?, ?, "approved", NOW())', [userId, plan, amount]);
    return db_1.default.execute(sql, [plan, tokens, lastPaymentDate, currentPeriodEnd, userId]);
});
exports.approveUserPlan = approveUserPlan;
const getAdminAnalytics = () => __awaiter(void 0, void 0, void 0, function* () {
    // 1. Income (Last 6 months) for Chart
    const [incomeRows] = yield db_1.default.execute(`
        SELECT DATE_FORMAT(updated_at, '%b') as name, SUM(amount) as income 
        FROM subscription_requests 
        WHERE status = 'approved' 
        AND updated_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH) 
        GROUP BY YEAR(updated_at), MONTH(updated_at) 
        ORDER BY updated_at ASC
    `);
    // 2. New Clients (Last 6 months) for Chart
    const [userRows] = yield db_1.default.execute(`
        SELECT DATE_FORMAT(created_at, '%b') as name, COUNT(*) as users 
        FROM users 
        WHERE role NOT IN ('coach', 'admin', 'superadmin') 
        AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH) 
        GROUP BY YEAR(created_at), MONTH(created_at) 
        ORDER BY created_at ASC
    `);
    // 3. New Coaches (Last 6 months) for Chart
    const [coachRows] = yield db_1.default.execute(`
        SELECT DATE_FORMAT(created_at, '%b') as name, COUNT(*) as coaches 
        FROM users 
        WHERE role = 'coach' 
        AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH) 
        GROUP BY YEAR(created_at), MONTH(created_at) 
        ORDER BY created_at ASC
    `);
    // 4. Token Consumption (Last 30 days) for Chart
    // FIX: Convert UTC to Local (approx UTC-3) for correct day grouping
    const [tokenRows] = yield db_1.default.execute(`
        SELECT DATE_FORMAT(DATE_SUB(created_at, INTERVAL 3 HOUR), '%d %b') as name, SUM(amount) as tokens 
        FROM token_usage_logs 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) 
        GROUP BY DATE(DATE_SUB(created_at, INTERVAL 3 HOUR)) 
        ORDER BY DATE(DATE_SUB(created_at, INTERVAL 3 HOUR)) ASC
    `);
    // --- GLOBAL KPI CARDS ---
    // A. Global User Count (Total non-admin users)
    const [totalUsersRow] = yield db_1.default.execute(`
        SELECT COUNT(*) as total 
        FROM users 
        WHERE role IN ('client', 'coach')
    `);
    const totalUsers = totalUsersRow[0].total || 0;
    // B. Users Last Month for Growth %
    const [lastMonthUsersRow] = yield db_1.default.execute(`
        SELECT COUNT(*) as total 
        FROM users 
        WHERE role IN ('client', 'coach') 
        AND created_at < DATE_SUB(NOW(), INTERVAL 1 MONTH)
    `);
    const lastMonthUsers = lastMonthUsersRow[0].total || 1; // Avoid divide by zero
    const userGrowth = Math.round(((totalUsers - lastMonthUsers) / lastMonthUsers) * 100);
    // C. Active Revenue Estimate (MRR) - Simple approximation: Income last 30 days
    const [mrrRow] = yield db_1.default.execute(`
        SELECT SUM(amount) as mrr 
        FROM subscription_requests 
        WHERE status = 'approved' 
        AND updated_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);
    const mrr = mrrRow[0].mrr || 0;
    // D. Total Tokens Consumed (All Time or YTD? Dashboard says "Tokens Consumed / IA Usage")
    // Let's do All Time for "Tokens Generados" global counter
    const [totalTokensRow] = yield db_1.default.execute(`
        SELECT SUM(amount) as total 
        FROM token_usage_logs
    `);
    const totalTokens = totalTokensRow[0].total || 0;
    // --- ALERTS SYSTEM ---
    // Generate dynamic alerts from recent activity
    const alerts = [];
    // Alert 1: Recent High Token Usage (Last 24h)
    const [highUsageRow] = yield db_1.default.execute(`
        SELECT SUM(amount) as amount 
        FROM token_usage_logs 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `);
    if ((highUsageRow[0].amount || 0) > 10000) {
        alerts.push({
            type: 'warning',
            msg: `Alto consumo de tokens de IA detectado (${highUsageRow[0].amount}) en las últimas 24h`,
            time: 'Hace poco'
        });
    }
    // Alert 2: Recent New User (Last registered)
    const [lastUserRow] = yield db_1.default.execute(`
        SELECT name, role, created_at FROM users 
        ORDER BY created_at DESC LIMIT 1
    `);
    if (lastUserRow.length > 0) {
        alerts.push({
            type: 'success',
            msg: `Nuevo usuario registrado: ${lastUserRow[0].name} (${lastUserRow[0].role})`,
            time: 'Reciente'
        });
    }
    // Alert 3: Recent Subscription (Last approved)
    const [lastSubRow] = yield db_1.default.execute(`
        SELECT requested_role, amount, updated_at FROM subscription_requests 
        WHERE status = 'approved' 
        ORDER BY updated_at DESC LIMIT 1
    `);
    if (lastSubRow.length > 0) {
        alerts.push({
            type: 'info',
            msg: `Nueva suscripción ${lastSubRow[0].requested_role} aprobada ($${lastSubRow[0].amount})`,
            time: 'Reciente'
        });
    }
    // Fill with generic if empty
    if (alerts.length === 0) {
        alerts.push({ type: 'success', msg: 'Sistema operando normalmente', time: 'Ahora' });
    }
    return {
        incomeData: incomeRows,
        userData: userRows,
        coachData: coachRows,
        tokenData: tokenRows,
        globalStats: {
            totalUsers,
            userGrowth,
            mrr,
            totalTokens
        },
        alerts
    };
});
exports.getAdminAnalytics = getAdminAnalytics;
const initMealTable = () => __awaiter(void 0, void 0, void 0, function* () {
    const sql = `
      CREATE TABLE IF NOT EXISTS meal_logs (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        food_name VARCHAR(255) NOT NULL,
        calories INT NOT NULL,
        protein INT,
        carbs INT,
        fats INT,
        image_base64 LONGTEXT, 
        analysis_text TEXT,
        suggestions_json JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_meal (user_id)
      );
    `;
    yield db_1.default.execute(sql);
    console.log("Meal Logs table initialized");
});
exports.initMealTable = initMealTable;
const logMeal = (meal) => __awaiter(void 0, void 0, void 0, function* () {
    // meal object matches LoggedMeal interface but flattened for DB
    const sql = `INSERT INTO meal_logs (id, user_id, food_name, calories, protein, carbs, fats, image_base64, analysis_text, suggestions_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    return db_1.default.execute(sql, [
        meal.id,
        meal.userId,
        meal.foodName,
        meal.calories,
        meal.protein,
        meal.carbs,
        meal.fats,
        meal.image || null, // Allow null if no image
        meal.analysisText || null, // Updated schema
        meal.suggestions ? JSON.stringify(meal.suggestions) : null, // Updated schema
        new Date(meal.timestamp || Date.now())
    ]);
});
exports.logMeal = logMeal;
const getMealHistory = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const sql = `SELECT * FROM meal_logs WHERE user_id = ? ORDER BY created_at DESC`;
    const [rows] = yield db_1.default.execute(sql, [userId]);
    return rows;
});
exports.getMealHistory = getMealHistory;
const deleteMeal = (mealId) => __awaiter(void 0, void 0, void 0, function* () {
    const sql = `DELETE FROM meal_logs WHERE id = ?`;
    return db_1.default.execute(sql, [mealId]);
});
exports.deleteMeal = deleteMeal;
