import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { testConnection } from './config/db';

import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import chatRoutes from './routes/chatRoutes';
import mealPlanRoutes from './routes/mealPlanRoutes';
import messageRoutes from './routes/messageRoutes';
import subscriptionRoutes from './routes/subscriptionRoutes';
import communityRoutes from './routes/communityRoutes';
import debugRoutes from './routes/debugRoutes';
import { startMonthlyJobs } from './cron/monthlyJobs';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/meal-plans', mealPlanRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/debug', debugRoutes);

// Ensure uploads directory exists (for avatar/image file storage)
const uploadsDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`[Init] Created uploads directory at: ${uploadsDir}`);
}
app.use('/uploads', express.static(uploadsDir));

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'NutrBalanceIA API is running' });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(__dirname, '../../dist');
    console.log(`[Static] Serving files from: ${distPath}`);
    app.use(express.static(distPath));

    app.get('*', (req, res) => {
        const indexPath = path.join(distPath, 'index.html');
        res.sendFile(indexPath);
    });
}

// Start Server
const startServer = async () => {
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.error('❌ Failed to connect to Supabase. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
            process.exit(1);
        }

        // NOTE: All database schema is managed in Supabase SQL Editor.
        // No runtime migrations run here.

        // Start Cron Jobs
        startMonthlyJobs();

        const server = app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        });

        // Increase timeout to 10 minutes for slow AI/N8N processing
        server.setTimeout(600000);

    } catch (error) {
        console.error('❌ Server failed to start:', error);
        process.exit(1);
    }
};

startServer();
