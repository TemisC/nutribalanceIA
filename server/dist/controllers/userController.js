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
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUserMeal = exports.getMeals = exports.saveMeal = exports.addTokens = exports.getSuperAdminAnalytics = exports.getCommunityInfo = exports.getCoachStats = exports.toggleBulkUserStatus = exports.toggleUserStatus = exports.deleteUserProfile = exports.getAllUsers = exports.getCoachClients = exports.logUserProgress = exports.getUserProgress = exports.saveUserMetrics = exports.updateBasicProfile = exports.updateBiometrics = exports.getUserProfile = void 0;
const userModel_1 = require("../models/userModel");
// Extended Request type to include user from auth middleware (if we typed middleware properly)
// For now, we assume req.user is populated by middleware, or we extract ID from params/body for simplicity if we trust the token middleware.
// Actually, strict REST would be /users/:id, but for "my profile" /users/me is better.
// Let's implement /users/:id logic but ensure auth middleware checks if :id matches token id or is admin.
const getUserProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.params.id;
        const user = yield (0, userModel_1.findUserById)(userId);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        // Lazy Expiration Check
        // If current_period_end exists and is in the past
        if (user.current_period_end) {
            const now = new Date();
            const expiry = new Date(user.current_period_end);
            if (expiry < now) {
                console.log(`User ${userId} subscription expired on ${expiry}. Downgrading/Resetting.`);
                // Logic:
                // 1. If PRO/MASTER -> Downgrade to FREE, Reset Tokens to 100, Set new 30 day cycle.
                // 2. If FREE -> Reset Tokens to 100, Set new 30 day cycle (Monthly Reset).
                // Always reset to Free tier defaults for simplicity of "Auto-Renewing Free Tier"
                const newExpiry = new Date();
                newExpiry.setDate(newExpiry.getDate() + 30);
                const newExpiryStr = newExpiry.toISOString().slice(0, 19).replace('T', ' ');
                // Update DB
                yield Promise.resolve().then(() => __importStar(require('../models/userModel'))).then(m => m.updateUser(userId, {
                    plan_type: 'free',
                    tokens: 100,
                    current_period_end: newExpiryStr
                }));
                // Update local user object for response
                user.plan_type = 'free';
                user.tokens = 100;
                user.current_period_end = newExpiryStr;
            }
        }
        const biometrics = yield (0, userModel_1.getBiometrics)(userId);
        const metrics = yield (0, userModel_1.getMetrics)(userId);
        // Remove sensitive data
        const { password_hash, date_of_birth } = user, userSafe = __rest(user, ["password_hash", "date_of_birth"]);
        // Map metrics body_fat
        const safeMetrics = metrics ? Object.assign(Object.assign({}, metrics), { bodyFat: metrics.body_fat // Map body_fat -> bodyFat
         }) : {};
        // Format Date to YYYY-MM-DD
        const formattedDate = date_of_birth ? new Date(date_of_birth).toISOString().split('T')[0] : undefined;
        res.json({
            user: Object.assign(Object.assign({}, userSafe), { dateOfBirth: formattedDate, biometrics: biometrics || {}, metrics: safeMetrics || {}, currentPeriodEnd: userSafe.current_period_end, coachName: userSafe.coach_name, coachId: userSafe.coach_id // Map coach ID specifically
             })
        });
    }
    catch (error) {
        console.error('Get Profile Error:', error);
        res.status(500).json({ message: 'Error al obtener perfil' });
    }
});
exports.getUserProfile = getUserProfile;
const updateBiometrics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.params.id;
        const biometricsData = req.body;
        const biometrics = Object.assign(Object.assign({ user_id: userId }, biometricsData), { 
            // Map frontend camelCase to backend snake_case
            activity_level: biometricsData.activityLevel || biometricsData.activity_level, diet_preference: biometricsData.dietPreference || biometricsData.diet_preference, goal: biometricsData.goal || biometricsData.goal, gender: biometricsData.gender || biometricsData.gender, 
            // Ensure numbers are numbers, but don't default values if missing (let them be null/undefined)
            age: biometricsData.age ? Number(biometricsData.age) : undefined, height: biometricsData.height ? Number(biometricsData.height) : undefined, weight: biometricsData.weight ? Number(biometricsData.weight) : undefined });
        console.log("DEBUG: Calling upsertBiometrics with NO defaults:", JSON.stringify(biometrics));
        yield (0, userModel_1.upsertBiometrics)(biometrics);
        res.json({ message: 'Biometría actualizada correctamente', biometrics });
    }
    catch (error) {
        console.error('Update Biometrics Error:', error);
        res.status(500).json({ message: 'Error al actualizar biometría' });
    }
});
exports.updateBiometrics = updateBiometrics;
const updateBasicProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.params.id;
        const _a = req.body, { biometrics, metrics } = _a, basicData = __rest(_a, ["biometrics", "metrics"]); // Separate biometrics/metrics from basic info
        // Update basic info in users table
        if (Object.keys(basicData).length > 0) {
            // Map password to password_hash if present
            const backendData = Object.assign({}, basicData);
            if (backendData.password) {
                // ideally this should be hashed, but for this legacy MVP using plain or pre-hashed structure from frontend/auth service
                // authService in api.ts sends plain 'password'.
                // Backend registration 'bcrypt.hash' should happen here. 
                // Assuming we need to hash it:
                const bcrypt = yield Promise.resolve().then(() => __importStar(require('bcryptjs')));
                backendData.password_hash = yield bcrypt.hash(backendData.password, 10);
                delete backendData.password;
            }
            // Map dateOfBirth to date_of_birth
            if (backendData.dateOfBirth) {
                backendData.date_of_birth = backendData.dateOfBirth;
                delete backendData.dateOfBirth;
            }
            // Map pendingPlan to pending_plan
            if (backendData.pendingPlan !== undefined) {
                backendData.pending_plan = backendData.pendingPlan;
                delete backendData.pendingPlan;
            }
            yield Promise.resolve().then(() => __importStar(require('../models/userModel'))).then(m => m.updateUser(userId, backendData));
        }
        // If biometrics included, update them too
        if (biometrics) {
            const userBio = Object.assign(Object.assign({ user_id: userId }, biometrics), { 
                // Map frontend camelCase to backend snake_case
                activity_level: biometrics.activityLevel || biometrics.activity_level, diet_preference: biometrics.dietPreference || biometrics.diet_preference, medical_conditions: biometrics.medicalConditions || biometrics.medical_conditions, sleep_hours: biometrics.sleepHours || biometrics.sleep_hours, stress_level: biometrics.stressLevel || biometrics.stress_level, water_intake: biometrics.waterIntake || biometrics.water_intake, daily_meals: biometrics.dailyMeals || biometrics.daily_meals, 
                // Pass through others if they match (allergies, medications, injuries)
                allergies: biometrics.allergies, medications: biometrics.medications, injuries: biometrics.injuries });
            yield (0, userModel_1.upsertBiometrics)(userBio);
        }
        // Return updated full profile?
        // For now just success
        res.json({ message: 'Perfil actualizado correctamente' });
    }
    catch (error) {
        console.error('Update Profile Error:', error);
        res.status(500).json({ message: 'Error al actualizar perfil' });
    }
});
exports.updateBasicProfile = updateBasicProfile;
const saveUserMetrics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.params.id;
        const metricsData = req.body;
        const metrics = Object.assign(Object.assign({ user_id: userId }, metricsData), { 
            // Map frontend camelCase to backend snake_case
            calories_target: metricsData.caloriesTarget || metricsData.calories || metricsData.calories_target, protein_target: metricsData.proteinTarget || metricsData.protein || metricsData.protein_target, carbs_target: metricsData.carbsTarget || metricsData.carbs || metricsData.carbs_target, fats_target: metricsData.fatsTarget || metricsData.fats || metricsData.fats_target, water_target: metricsData.waterTarget || metricsData.water || metricsData.water_target, tdee: metricsData.tdee, bmr: metricsData.bmr, bmi: metricsData.bmi, body_fat: metricsData.bodyFat || metricsData.bodyFatPercentage || metricsData.body_fat // Handle variations
         });
        yield (0, userModel_1.upsertMetrics)(metrics);
    }
    catch (error) {
        console.error('Save Metrics Error:', error);
        res.status(500).json({ message: 'Error al guardar métricas' });
    }
});
exports.saveUserMetrics = saveUserMetrics;
const getUserProgress = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.params.id;
        // Import dynamically to assume model updates are picked up if we weren't using ts-node-dev/nodemon
        const { getProgressHistory } = yield Promise.resolve().then(() => __importStar(require('../models/userModel')));
        const logs = yield getProgressHistory(userId);
        res.json({ logs });
    }
    catch (error) {
        console.error('Get Progress Error:', error);
        res.status(500).json({ message: 'Error al obtener historial' });
    }
});
exports.getUserProgress = getUserProgress;
const logUserProgress = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.params.id;
        const { date, weight, calories, measurements } = req.body;
        const { logDailyProgress } = yield Promise.resolve().then(() => __importStar(require('../models/userModel')));
        yield logDailyProgress(userId, date, weight, calories, measurements);
        res.json({ message: 'Progreso guardado' });
    }
    catch (error) {
        console.error('Log Progress Error:', error);
        res.status(500).json({ message: 'Error al guardar progreso' });
    }
});
exports.logUserProgress = logUserProgress;
const getCoachClients = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const coachId = req.params.id; // Using exact same param as profile
        // Security check: Ensure requester is the coach or admin (omitted for speed/MVP, assumed middleware handles general auth)
        // Ideally: if (req.user.id !== coachId && req.user.role !== 'admin') return 403;
        const clients = yield (0, userModel_1.findUsersByCoachId)(coachId);
        // Remove passwords
        const safeClients = clients.map(client => {
            const { password_hash, date_of_birth } = client, rest = __rest(client, ["password_hash", "date_of_birth"]);
            return Object.assign(Object.assign({}, rest), { dateOfBirth: date_of_birth ? new Date(date_of_birth).toISOString().split('T')[0] : undefined, coachId: client.coach_id, lastLogin: 'Reciente' });
        });
        res.json({ users: safeClients });
    }
    catch (error) {
        console.error('Get Coach Clients Error:', error);
        res.status(500).json({ message: 'Error al obtener clientes' });
    }
});
exports.getCoachClients = getCoachClients;
const getAllUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { findAllUsers } = yield Promise.resolve().then(() => __importStar(require('../models/userModel')));
        const users = yield findAllUsers();
        // Remove passwords and map fields
        const safeUsers = users.map(u => {
            const { password_hash, date_of_birth } = u, rest = __rest(u, ["password_hash", "date_of_birth"]);
            return Object.assign(Object.assign({}, rest), { dateOfBirth: date_of_birth ? new Date(date_of_birth).toISOString().split('T')[0] : undefined, coachId: u.coach_id, pendingPlan: u.pending_plan, status: u.status || 'active', lastLogin: 'Reciente', coachProfile: u.role === 'coach' ? {
                    planTier: u.coach_tier || 'standard',
                    commissionRate: u.commission_rate || 0.15,
                    subscriptionStatus: u.status || 'active'
                } : undefined });
        });
        res.json({ users: safeUsers });
    }
    catch (error) {
        console.error('Get All Users Error:', error);
        res.status(500).json({ message: 'Error al obtener usuarios' });
    }
});
exports.getAllUsers = getAllUsers;
const deleteUserProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.params.id;
        // Security check omitted for MVP (should check admin role or self)
        const { deleteUser } = yield Promise.resolve().then(() => __importStar(require('../models/userModel')));
        yield deleteUser(userId);
        res.json({ message: 'Usuario eliminado correctamente' });
    }
    catch (error) {
        console.error('Delete User Error:', error);
        res.status(500).json({ message: 'Error al eliminar usuario' });
    }
});
exports.deleteUserProfile = deleteUserProfile;
const toggleUserStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.params.id;
        const { status } = req.body; // 'active' | 'inactive'
        if (!status || (status !== 'active' && status !== 'inactive')) {
            return res.status(400).json({ message: 'Estado inválido. Use active o inactive.' });
        }
        const { updateUser } = yield Promise.resolve().then(() => __importStar(require('../models/userModel')));
        yield updateUser(userId, { status });
        res.json({ message: `Usuario marcado como ${status}` });
    }
    catch (error) {
        console.error('Toggle Status Error:', error);
        res.status(500).json({ message: 'Error al actualizar estado' });
    }
});
exports.toggleUserStatus = toggleUserStatus;
const toggleBulkUserStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const coachId = req.params.id; // Using :id from route /users/coach/:id/status
        const { status } = req.body; // 'active' | 'inactive'
        if (!status || (status !== 'active' && status !== 'inactive')) {
            return res.status(400).json({ message: 'Estado inválido.' });
        }
        const { bulkUpdateStatus } = yield Promise.resolve().then(() => __importStar(require('../models/userModel')));
        yield bulkUpdateStatus(coachId, status);
        res.json({ message: `Todos los alumnos del coach han sido marcados como ${status}` });
    }
    catch (error) {
        console.error('Bulk Toggle Status Error:', error);
        res.status(500).json({ message: 'Error al actualizar estados masivamente' });
    }
});
exports.toggleBulkUserStatus = toggleBulkUserStatus;
const getCoachStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const coachId = req.params.id;
        // 1. Get Coach Profile for Commission Rate & Billing Date
        const coach = yield (0, userModel_1.findUserById)(coachId);
        if (!coach || coach.role !== 'coach') {
            return res.status(404).json({ message: 'Coach no encontrado' });
        }
        const commissionRate = coach.commission_rate || 0.15;
        const billingDate = coach.billing_date
            ? new Date(coach.billing_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
            : new Date(coach.created_at || Date.now()).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
        // 2. Get All Clients
        const clients = yield (0, userModel_1.findUsersByCoachId)(coachId);
        // 3. Calculate "Saldo Pendiente" (Projected Monthly Earnings from Active Paid Clients)
        let pendingBalance = 0;
        const studentDistribution = {
            total: clients.length,
            active: 0,
            inactive: 0,
            free: 0,
            pro: 0,
            master: 0
        };
        const growthMap = {};
        clients.forEach(client => {
            // Stats
            if (client.status === 'active')
                studentDistribution.active++;
            else
                studentDistribution.inactive++;
            if (!client.plan_type || client.plan_type === 'free')
                studentDistribution.free++;
            else if (client.plan_type === 'pro')
                studentDistribution.pro++;
            else if (client.plan_type === 'pro_master')
                studentDistribution.master++;
            // Earnings (Only count active paid plans)
            if (client.status === 'active') {
                if (client.plan_type === 'pro')
                    pendingBalance += 6.99 * commissionRate;
                if (client.plan_type === 'pro_master')
                    pendingBalance += 9.99 * commissionRate;
            }
            // Growth (Group by Month-Year)
            // Assuming joinedAt exists (it does in User interface)
            const joined = new Date(client.created_at || Date.now());
            const key = `Sem ${Math.ceil(joined.getDate() / 7)}`; // Weekly growth as per mock? Or Monthly?
            // Mock had "Sem 1, Sem 2". Let's do Monthly logic but simplified for UI "Crecimiento Mensual" graph implies recent weeks.
            // Let's do: Last 4 Weeks growth.
            // Simplify: Just counts per month for now.
            const monthKey = joined.toLocaleString('default', { month: 'short' });
            growthMap[monthKey] = (growthMap[monthKey] || 0) + 1;
        });
        // Format Graph Data (Growth) - Simple: last few months
        const growthData = Object.entries(growthMap).map(([name, value]) => ({ name, value }));
        res.json({
            stats: {
                pendingBalance: pendingBalance.toFixed(2),
                nextPaymentDate: billingDate,
                commissionRate: (commissionRate * 100).toFixed(0),
                studentDistribution,
                growthData
            }
        });
    }
    catch (error) {
        console.error('Get Coach Stats Error:', error);
        res.status(500).json({ message: 'Error al obtener estadísticas del coach' });
    }
});
exports.getCoachStats = getCoachStats;
const getCommunityInfo = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const leaderboard = yield (0, userModel_1.getLeaderboard)();
        const stats = yield (0, userModel_1.getCommunityStats)();
        res.json({
            leaderboard,
            stats
        });
    }
    catch (error) {
        console.error("Error fetching community info:", error);
        res.status(500).json({ message: 'Error retrieving community stats' });
    }
});
exports.getCommunityInfo = getCommunityInfo;
const getSuperAdminAnalytics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { getAdminAnalytics } = yield Promise.resolve().then(() => __importStar(require('../models/userModel')));
        const analytics = yield getAdminAnalytics();
        res.json(analytics);
    }
    catch (error) {
        console.error("Error fetching admin analytics:", error);
        res.status(500).json({ message: 'Error fetching analytics' });
    }
});
exports.getSuperAdminAnalytics = getSuperAdminAnalytics;
const addTokens = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.params.id;
        const { amount, reason } = req.body; // reason is optional for audit log
        if (!amount || typeof amount !== 'number') {
            return res.status(400).json({ message: 'Cantidad de tokens inválida' });
        }
        const { findUserById, updateUser } = yield Promise.resolve().then(() => __importStar(require('../models/userModel')));
        const user = yield findUserById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        const currentTokens = user.tokens || 0;
        const newTokens = currentTokens + amount;
        yield updateUser(userId, { tokens: newTokens });
        console.log(`[Token Admin] Added ${amount} tokens to User ${user.email}. New Balance: ${newTokens}. Reason: ${reason || 'Admin Adjustment'}`);
        res.json({ message: 'Tokens agregados correctamente', newBalance: newTokens });
    }
    catch (error) {
        console.error('Add Tokens Error:', error);
        res.status(500).json({ message: 'Error al agregar tokens' });
    }
});
exports.addTokens = addTokens;
const saveMeal = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.params.id;
        const mealData = req.body; // Expects LoggedMeal structure
        // Add user_id to payload if not present or inconsistent
        const payload = Object.assign(Object.assign({}, mealData), { userId });
        const { logMeal } = yield Promise.resolve().then(() => __importStar(require('../models/userModel')));
        yield logMeal(payload);
        res.json({ message: 'Comida guardada en el historial' });
    }
    catch (error) {
        console.error('Save Meal Error:', error);
        res.status(500).json({ message: 'Error al guardar comida' });
    }
});
exports.saveMeal = saveMeal;
const getMeals = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.params.id;
        const { getMealHistory } = yield Promise.resolve().then(() => __importStar(require('../models/userModel')));
        const meals = yield getMealHistory(userId);
        res.json({ meals });
    }
    catch (error) {
        console.error('Get Meals Error:', error);
        res.status(500).json({ message: 'Error al obtener historial de comidas' });
    }
});
exports.getMeals = getMeals;
const deleteUserMeal = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const mealId = req.params.mealId;
        const { deleteMeal } = yield Promise.resolve().then(() => __importStar(require('../models/userModel')));
        yield deleteMeal(mealId);
        res.json({ message: 'Comida eliminada' });
    }
    catch (error) {
        console.error('Delete Meal Error:', error);
        res.status(500).json({ message: 'Error al eliminar comida' });
    }
});
exports.deleteUserMeal = deleteUserMeal;
