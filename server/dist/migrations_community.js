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
exports.checkCommunityMigrations = void 0;
const db_1 = __importDefault(require("./config/db"));
const checkCommunityMigrations = () => __awaiter(void 0, void 0, void 0, function* () {
    console.log('🔄 Checking community migrations...');
    try {
        const connection = yield db_1.default.getConnection();
        try {
            // Check coach_id in community_posts
            const [cols] = yield connection.query(`SHOW COLUMNS FROM community_posts LIKE 'coach_id'`);
            if (cols.length === 0) {
                console.log('⚠️ Missing coach_id column in community_posts. Adding...');
                yield connection.query(`ALTER TABLE community_posts ADD COLUMN coach_id VARCHAR(36) NULL AFTER user_id`);
                yield connection.query(`CREATE INDEX idx_community_coach ON community_posts(coach_id)`);
                console.log('✅ Added coach_id column to community_posts.');
            }
            console.log('✅ Community migrations verified.');
        }
        catch (err) {
            console.error('❌ Community migration check failed:', err);
        }
        finally {
            connection.release();
        }
    }
    catch (error) {
        console.error('❌ Failed to connect for community migrations:', error);
    }
});
exports.checkCommunityMigrations = checkCommunityMigrations;
