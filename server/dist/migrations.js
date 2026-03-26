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
exports.checkMigrations = void 0;
const db_1 = __importDefault(require("./config/db"));
const checkMigrations = () => __awaiter(void 0, void 0, void 0, function* () {
    console.log('🔄 Checking database migrations...');
    try {
        const connection = yield db_1.default.getConnection();
        try {
            // Check coach_tier
            const [cols1] = yield connection.query(`SHOW COLUMNS FROM users LIKE 'coach_tier'`);
            if (cols1.length === 0) {
                console.log('⚠️ Missing coach_tier column. Adding...');
                yield connection.query(`ALTER TABLE users ADD COLUMN coach_tier ENUM('standard', 'vip') DEFAULT 'standard' AFTER coach_id`);
                console.log('✅ Added coach_tier column.');
            }
            // Check commission_rate
            const [cols2] = yield connection.query(`SHOW COLUMNS FROM users LIKE 'commission_rate'`);
            if (cols2.length === 0) {
                console.log('⚠️ Missing commission_rate column. Adding...');
                yield connection.query(`ALTER TABLE users ADD COLUMN commission_rate DECIMAL(5,2) DEFAULT 0.15 AFTER coach_tier`);
                console.log('✅ Added commission_rate column.');
            }
            console.log('✅ Migrations verified.');
        }
        catch (err) {
            console.error('❌ Migration check failed:', err);
        }
        finally {
            connection.release();
        }
    }
    catch (error) {
        console.error('❌ Failed to connect for migrations:', error);
    }
});
exports.checkMigrations = checkMigrations;
