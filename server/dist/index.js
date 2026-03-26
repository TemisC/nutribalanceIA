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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const db_1 = __importStar(require("./config/db"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const chatRoutes_1 = __importDefault(require("./routes/chatRoutes"));
const mealPlanRoutes_1 = __importDefault(require("./routes/mealPlanRoutes"));
const messageRoutes_1 = __importDefault(require("./routes/messageRoutes"));
const subscriptionRoutes_1 = __importDefault(require("./routes/subscriptionRoutes"));
const communityRoutes_1 = __importDefault(require("./routes/communityRoutes"));
const debugRoutes_1 = __importDefault(require("./routes/debugRoutes"));
const messageModel_1 = require("./models/messageModel");
const userModel_1 = require("./models/userModel");
const migrations_1 = require("./migrations");
const monthlyJobs_1 = require("./cron/monthlyJobs");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ limit: '50mb', extended: true }));
// Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/users', userRoutes_1.default);
app.use('/api/chat', chatRoutes_1.default);
app.use('/api/meal-plans', mealPlanRoutes_1.default);
app.use('/api/messages', messageRoutes_1.default);
app.use('/api/subscriptions', subscriptionRoutes_1.default);
app.use('/api/community', communityRoutes_1.default);
app.use('/api/debug', debugRoutes_1.default);
// Database Init
(0, messageModel_1.initMessageTable)().catch(console.error);
(0, userModel_1.initMealTable)().catch(console.error);
// Ensure uploads directory exists
const uploadsDir = path_1.default.join(__dirname, '../public/uploads'); // Adjust path relative to src/index.ts or dist/index.js
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
    console.log(`[Init] Created uploads directory at: ${uploadsDir}`);
}
// Serve Uploads (Static)
app.use('/uploads', express_1.default.static(uploadsDir));
// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'NutriFit API is running' });
});
// Serve static files in production
if (process.env.NODE_ENV === 'production') {
    // Current working directory is /server when running via pm2 or npm start
    const distPath = path_1.default.join(process.cwd(), '../dist');
    console.log(`[Static] Serving files from: ${distPath}`);
    app.use(express_1.default.static(distPath));
    // Handle React routing, return all requests to React app
    app.get('*', (req, res) => {
        console.log(`[Router] 404 Fallback for: ${req.url}`);
        const indexPath = path_1.default.join(distPath, 'index.html');
        console.log(`[Router] Serving index.html from: ${indexPath}`);
        res.sendFile(indexPath);
    });
}
// Start Server
const startServer = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const isConnected = yield (0, db_1.testConnection)();
        if (!isConnected) {
            console.error('❌ Failed to connect to DB. Exiting...');
            process.exit(1);
        }
        // --- MIGRATION FIX START ---
        // Fix for "Error sharing post" due to missing ENUM values
        try {
            const connection = yield db_1.default.getConnection();
            console.log("🛠️ Running Emergency Migration: Fixing 'type' column...");
            yield connection.query("ALTER TABLE community_posts MODIFY COLUMN type VARCHAR(50) NOT NULL DEFAULT 'motivation'");
            console.log("✅ 'type' column modified to VARCHAR(50).");
            connection.release();
        }
        catch (migErr) {
            console.error("⚠️ Migration Error (Ignored if already fixed):", migErr.message);
        }
        // Fix 2: Add missing 'image_url' column
        try {
            const connection = yield db_1.default.getConnection();
            yield connection.query("ALTER TABLE community_posts ADD COLUMN image_url VARCHAR(255) NULL");
            console.log("✅ 'image_url' column added.");
            connection.release();
        }
        catch (colErr) {
            // Ignore if already exists (ER_DUP_FIELDNAME = 1060)
            if (colErr.errno === 1060 || colErr.code === 'ER_DUP_FIELDNAME') {
                console.log("ℹ️ 'image_url' column already exists.");
            }
            else {
                console.error("⚠️ Error adding 'image_url':", colErr.message);
            }
        }
        // Fix 3: Add 'type' column to messages table
        try {
            const connection = yield db_1.default.getConnection();
            yield connection.query("ALTER TABLE messages ADD COLUMN type ENUM('chat', 'system') DEFAULT 'chat'");
            console.log("✅ 'type' column added to messages.");
            connection.release();
        }
        catch (msgErr) {
            if (msgErr.errno === 1060 || msgErr.code === 'ER_DUP_FIELDNAME') {
                console.log("ℹ️ 'type' column already exists in messages.");
            }
            else {
                console.error("⚠️ Error adding 'type' to messages:", msgErr.message);
            }
        }
        // --- MIGRATION FIX END ---
        yield (0, migrations_1.checkMigrations)();
        // Start Cron Jobs
        (0, monthlyJobs_1.startMonthlyJobs)();
        // Community Migration Check
        const { checkCommunityMigrations } = yield Promise.resolve().then(() => __importStar(require('./migrations_community')));
        yield checkCommunityMigrations();
        const { checkCommunityInteractionMigrations } = yield Promise.resolve().then(() => __importStar(require('./migrations_community_interactions')));
        yield checkCommunityInteractionMigrations();
        const { checkSubscriptionMigrations } = yield Promise.resolve().then(() => __importStar(require('./migrations_subscription')));
        yield checkSubscriptionMigrations();
        const { checkMealPlanMigrations } = yield Promise.resolve().then(() => __importStar(require('./migrations_meal_plans')));
        yield checkMealPlanMigrations();
        const server = app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        });
        // Increase timeout to 10 minutes (600000ms) to handle slow AI/N8N processing
        server.setTimeout(600000);
    }
    catch (error) {
        console.error('❌ Server failed to start:', error);
        process.exit(1);
    }
});
startServer();
