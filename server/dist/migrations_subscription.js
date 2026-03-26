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
exports.checkSubscriptionMigrations = void 0;
const db_1 = __importDefault(require("./config/db"));
const checkSubscriptionMigrations = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('🔄 Checking Subscription migrations...');
        // 1. Add pending_plan column
        const [columns] = yield db_1.default.execute(`
            SHOW COLUMNS FROM users LIKE 'pending_plan'
        `);
        if (columns.length === 0) {
            console.log('⚠️ Adding pending_plan column to users table...');
            yield db_1.default.execute(`
                ALTER TABLE users 
                ADD COLUMN pending_plan ENUM('pro', 'pro_master') NULL AFTER plan_type;
            `);
            console.log('✅ pending_plan column added.');
        }
        // 2. Add last_payment_date column (for renewal tracking)
        const [columnsPayment] = yield db_1.default.execute(`
            SHOW COLUMNS FROM users LIKE 'last_payment_date'
        `);
        if (columnsPayment.length === 0) {
            console.log('⚠️ Adding last_payment_date column to users table...');
            yield db_1.default.execute(`
                ALTER TABLE users 
                ADD COLUMN last_payment_date DATETIME NULL AFTER pending_plan;
            `);
            console.log('✅ last_payment_date column added.');
        }
        console.log('✅ Subscription migrations check complete.');
    }
    catch (error) {
        console.error('❌ Error checking subscription migrations:', error);
    }
});
exports.checkSubscriptionMigrations = checkSubscriptionMigrations;
