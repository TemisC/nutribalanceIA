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
exports.calculateCoachCommissions = exports.startMonthlyJobs = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const db_1 = __importDefault(require("../config/db"));
/**
 * Monthly Job: Calculate Coach Commissions and Tiers
 * Runs at Midnight on the 1st of every month.
 */
const startMonthlyJobs = () => {
    // Cron Syntax: 0 0 1 * * (At 00:00 on day-of-month 1)
    node_cron_1.default.schedule('0 0 1 * *', () => __awaiter(void 0, void 0, void 0, function* () {
        console.log('📅 [Monthly Job] Starting Commission & Tier Calculation...');
        yield (0, exports.calculateCoachCommissions)();
    }));
};
exports.startMonthlyJobs = startMonthlyJobs;
const calculateCoachCommissions = () => __awaiter(void 0, void 0, void 0, function* () {
    const connection = yield db_1.default.getConnection();
    try {
        console.log('🔄 [Commission Job] Fetching active coaches...');
        // 1. Get all coaches
        const [coaches] = yield connection.execute("SELECT id, email, name, coach_tier FROM users WHERE role = 'coach'");
        console.log(`📊 [Commission Job] Processing ${coaches.length} coaches.`);
        for (const coach of coaches) {
            // 2. Count ACTIVE Paying Clients (PRO or PRO_MASTER) for this coach
            // Note: We check 'status' is active (or similar) if you have that implemented.
            // Assuming default status is 'active' for now or strictly checking subscription.
            // For now, valid clients are those with plan_type IN ('pro', 'pro_master')
            const [clientRows] = yield connection.execute(`SELECT COUNT(*) as count FROM users 
                 WHERE coach_id = ? 
                 AND plan_type IN ('pro', 'pro_master')
                 AND role = 'client'`, [coach.id]);
            const clientCount = clientRows[0].count;
            let newCommissionRate = 0.0; // Default 0%
            let newTier = 'standard'; // Base tier
            // 3. Apply Tier Rules (Simplified Logic 2026-01-30)
            if (clientCount >= 50) {
                newCommissionRate = 0.50; // 50%
                newTier = 'vip_plus';
            }
            else if (clientCount >= 30) {
                newCommissionRate = 0.30; // 30%
                newTier = 'vip_plus'; // >30 Total usually triggers Level 2, here we track generally
            }
            else {
                newCommissionRate = 0.0; // 0-29 Clients: 0%
                newTier = 'standard';
            }
            // Logic Adjustment: Don't downgrade coach_tier purely on count if they paid for it?
            // Actually, the requirement says: "30+ Clients = Level 2 ($10)".
            // Let's update commission_rate primarily. 
            // We'll update tier if it promotes them.
            // For now, let's just update commission_rate explicitly as per the graph.
            yield connection.execute("UPDATE users SET commission_rate = ? WHERE id = ?", [newCommissionRate, coach.id]);
            console.log(`✅ [Commission Job] Coach ${coach.email}: ${clientCount} Clients -> ${newCommissionRate * 100}% Commission.`);
        }
        console.log('🏁 [Monthly Job] Commission Calculation Completed.');
    }
    catch (error) {
        console.error('❌ [Monthly Job] Failed:', error);
    }
    finally {
        connection.release();
    }
});
exports.calculateCoachCommissions = calculateCoachCommissions;
