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
Object.defineProperty(exports, "__esModule", { value: true });
exports.approveRegistration = exports.getPendingRegistrations = exports.respondToRequest = exports.getPendingRequests = exports.createRequest = void 0;
const subscriptionModel = __importStar(require("../models/subscriptionModel"));
const userModel = __importStar(require("../models/userModel"));
const createRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, requestedRole, amount, coachId } = req.body;
        if (!userId || !requestedRole) {
            return res.status(400).json({ message: 'User ID and Role are required' });
        }
        const id = yield subscriptionModel.createSubscriptionRequest(userId, requestedRole, amount, coachId);
        res.status(201).json({ message: 'Request created', id });
    }
    catch (error) {
        console.error('Error creating subscription request:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.createRequest = createRequest;
const getPendingRequests = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const requests = yield subscriptionModel.getPendingSubscriptions();
        res.json({ requests });
    }
    catch (error) {
        console.error('Error fetching subscription requests:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getPendingRequests = getPendingRequests;
const respondToRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { status, adminNotes } = req.body;
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }
        const numericId = parseInt(id);
        const request = yield subscriptionModel.getRequestById(numericId);
        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }
        const success = yield subscriptionModel.updateSubscriptionStatus(numericId, status, adminNotes);
        if (success && status === 'approved') {
            if (request.requested_role === 'vip') {
                // Coach VIP Upgrade
                const user = yield userModel.findUserById(request.user_id.toString());
                if (user) {
                    // Update flattened coach fields in DB
                    yield userModel.updateUser(request.user_id.toString(), {
                        coach_tier: 'vip',
                        commission_rate: 0.5
                    });
                }
            }
            else {
                // Client Upgrade
                // Validate role against UserRole type or cast it
                const validRoles = ['client', 'coach', 'admin', 'superadmin'];
                // Mapping: 'pro' -> 'client' (role) + 'pro' (plan_type)
                // 'pro_master' -> 'client' (role) + 'pro_master' (plan_type)
                // Wait, request.requested_role comes from frontend 'pro', 'pro_master'.
                // Ideally we should update plan_type, not role (role remains 'client').
                let planType = 'free';
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
                yield userModel.updateUser(request.user_id.toString(), {
                    plan_type: planType,
                    tokens: tokens,
                    current_period_end: expiryStr
                });
            }
        }
        res.json({ message: 'Request updated' });
    }
    catch (error) {
        console.error('Error responding to request:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.respondToRequest = respondToRequest;
// --- New Registration Approval Flow ---
const getPendingRegistrations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield userModel.getPendingPlanUsers();
        res.json({ users });
    }
    catch (error) {
        console.error('Error fetching pending registrations:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getPendingRegistrations = getPendingRegistrations;
const approveRegistration = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, plan } = req.body; // plan IS 'pro' | 'pro_master'
        if (!userId || !plan) {
            return res.status(400).json({ message: 'Missing userId or plan' });
        }
        yield userModel.approveUserPlan(userId, plan);
        res.json({ message: 'User plan approved successfully' });
    }
    catch (error) {
        console.error('Error approving registration:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.approveRegistration = approveRegistration;
