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
exports.checkCommunityInteractionMigrations = void 0;
const db_1 = __importDefault(require("./config/db"));
const checkCommunityInteractionMigrations = () => __awaiter(void 0, void 0, void 0, function* () {
    console.log('🔄 Checking community interaction migrations...');
    try {
        const connection = yield db_1.default.getConnection();
        try {
            // 1. Comments Table
            const [tables1] = yield connection.query(`SHOW TABLES LIKE 'community_post_comments'`);
            if (tables1.length === 0) {
                console.log('⚠️ Creating community_post_comments table...');
                yield connection.query(`
                    CREATE TABLE community_post_comments (
                        id VARCHAR(36) PRIMARY KEY,
                        post_id VARCHAR(36) NOT NULL,
                        user_id VARCHAR(36) NOT NULL,
                        content TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        INDEX idx_post_comments (post_id),
                        INDEX idx_user_comments (user_id)
                    )
                `);
                console.log('✅ Created community_post_comments table.');
            }
            // 2. Likes Table
            const [tables2] = yield connection.query(`SHOW TABLES LIKE 'community_post_likes'`);
            if (tables2.length === 0) {
                console.log('⚠️ Creating community_post_likes table...');
                yield connection.query(`
                    CREATE TABLE community_post_likes (
                        post_id VARCHAR(36) NOT NULL,
                        user_id VARCHAR(36) NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        PRIMARY KEY (post_id, user_id),
                        INDEX idx_post_likes (post_id)
                    )
                `);
                console.log('✅ Created community_post_likes table.');
            }
            console.log('✅ Community interactions verified.');
        }
        catch (err) {
            console.error('❌ Community interaction migration check failed:', err);
        }
        finally {
            connection.release();
        }
    }
    catch (error) {
        console.error('❌ Failed to connect for interaction migrations:', error);
    }
});
exports.checkCommunityInteractionMigrations = checkCommunityInteractionMigrations;
