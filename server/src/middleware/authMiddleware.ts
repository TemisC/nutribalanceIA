import { Request, Response, NextFunction } from 'express';
import supabase from '../config/db';

interface DecodedToken {
    id: string;
    email: string;
    role: string;
}

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: DecodedToken;
        }
    }
}

export const protect = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }

    const token = authHeader.split(' ')[1];

    try {
        // Verify token using Supabase Auth — this validates the JWT signature and expiry
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }

        // User metadata (role) is stored in user_metadata during registration
        req.user = {
            id: user.id,
            email: user.email || '',
            role: user.user_metadata?.role || 'client',
        };

        next();
    } catch (error) {
        console.error('Auth Middleware Error:', error);
        res.status(401).json({ message: 'Not authorized, token failed' });
    }
};

export const checkActive = async (req: Request, res: Response, next: NextFunction) => {
    if (req.user) {
        const { findUserById } = await import('../models/userModel');
        const user = await findUserById(req.user.id);

        if (user && user.status === 'inactive') {
            return res.status(403).json({ message: 'Account is inactive. Please contact your coach.' });
        }
    }
    next();
};
