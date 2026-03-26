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
exports.markRead = exports.getInbox = exports.sendMessage = void 0;
const messageModel = __importStar(require("../models/messageModel"));
const userModel = __importStar(require("../models/userModel"));
const sendMessage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { senderId, receiverId, content, type } = req.body;
        if (!senderId || !receiverId || !content) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        const newMessage = {
            id: Date.now().toString(), // Simple ID or UUID
            sender_id: senderId,
            receiver_id: receiverId,
            content,
            is_read: false,
            created_at: new Date(),
            type: type || 'chat'
        };
        yield messageModel.sendMessage(newMessage);
        res.status(201).json({ message: 'Message sent', data: newMessage });
    }
    catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.sendMessage = sendMessage;
const getInbox = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const messages = yield messageModel.getMessagesForUser(userId);
        // Enrich with sender names if needed?
        // Frontend expects "from: string".
        // We can join in SQL or fetch names here.
        // Let's do a quick map Promise.all for MVP or simple SQL join in model.
        // SQL Join is better.
        // Updating model to include sender name would be optimal, but let's just map for now.
        const enrichedMessages = yield Promise.all(messages.map((msg) => __awaiter(void 0, void 0, void 0, function* () {
            const sender = yield userModel.findUserById(msg.sender_id);
            return {
                id: msg.id,
                from: sender ? sender.name : 'Unknown', // Or 'NutriFit Coach'
                text: msg.content,
                timestamp: msg.created_at, // Helper to format?
                read: !!msg.is_read,
                senderId: msg.sender_id,
                receiverId: msg.receiver_id,
                type: msg.type || 'chat'
            };
        })));
        res.json(enrichedMessages);
    }
    catch (error) {
        console.error('Error fetching inbox:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getInbox = getInbox;
const markRead = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield messageModel.markMessageAsRead(id);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error marking message read:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.markRead = markRead;
