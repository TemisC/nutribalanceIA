import { Request, Response } from 'express';
import * as subscriptionModel from '../models/subscriptionModel';
import * as userModel from '../models/userModel';

export const createRequest = async (req: Request, res: Response) => {
    try {
        const { userId, requestedRole, amount, coachId } = req.body;

        if (!userId || !requestedRole) {
            return res.status(400).json({ message: 'User ID and Role are required' });
        }

        const id = await subscriptionModel.createSubscriptionRequest(userId, requestedRole, amount, coachId);
        res.status(201).json({ message: 'Request created', id });
    } catch (error) {
        console.error('Error creating subscription request:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getPendingRequests = async (req: Request, res: Response) => {
    try {
        const requests = await subscriptionModel.getPendingSubscriptions();
        res.json({ requests });
    } catch (error) {
        console.error('Error fetching subscription requests:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const respondToRequest = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status, adminNotes } = req.body;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const numericId = parseInt(id);
        const request = await subscriptionModel.getRequestById(numericId);

        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }

        const success = await subscriptionModel.updateSubscriptionStatus(numericId, status, adminNotes);

        if (success && status === 'approved') {

            // Client Upgrade Only
            // Validate role against UserRole type or cast it
            const validRoles = ['client', 'coach', 'admin', 'superadmin'];
            // Mapping: 'pro' -> 'client' (role) + 'pro' (plan_type)
            // 'pro_master' -> 'client' (role) + 'pro_master' (plan_type)

            // Wait, request.requested_role comes from frontend 'pro', 'pro_master'.
            // Ideally we should update plan_type, not role (role remains 'client').

            let planType: 'free' | 'pro' | 'pro_master' = 'free';
            let tokens = 100; // Default/Free

            if (request.requested_role === 'pro') {
                planType = 'pro';
                tokens = 750;
            }
            if (request.requested_role === 'pro_master') {
                planType = 'pro_master';
                tokens = 1500;
            }

            // Calculate Date + 30 Days
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 30);
            const expiryStr = expiryDate.toISOString().slice(0, 19).replace('T', ' ');

            await userModel.updateUser(request.user_id.toString(), {
                plan_type: planType,
                tokens: tokens,
                current_period_end: expiryStr
            });
        }


        res.json({ message: 'Request updated' });
    } catch (error) {
        console.error('Error responding to request:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// --- New Registration Approval Flow ---

export const getPendingRegistrations = async (req: Request, res: Response) => {
    try {
        const users = await userModel.getPendingPlanUsers();
        res.json({ users });
    } catch (error) {
        console.error('Error fetching pending registrations:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const approveRegistration = async (req: Request, res: Response) => {
    try {
        const { userId, plan } = req.body; // plan IS 'pro' | 'pro_master'

        if (!userId || !plan) {
            return res.status(400).json({ message: 'Missing userId or plan' });
        }

        await userModel.approveUserPlan(userId, plan);
        res.json({ message: 'User plan approved successfully' });

    } catch (error) {
        console.error('Error approving registration:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
