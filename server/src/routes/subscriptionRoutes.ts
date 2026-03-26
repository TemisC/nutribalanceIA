import express from 'express';
import * as subscriptionController from '../controllers/subscriptionController';

const router = express.Router();

// Create a new subscription request
router.post('/', subscriptionController.createRequest);

// Get all pending requests (Admin only ideally, but for now open or secured by middleware in index)
router.get('/', subscriptionController.getPendingRequests);

// Respond to a request (Approve/Reject)
router.patch('/:id/status', subscriptionController.respondToRequest);

// --- New Registration Approval Routes ---
router.get('/registrations', subscriptionController.getPendingRegistrations);
router.post('/approve-registration', subscriptionController.approveRegistration);

export default router;
