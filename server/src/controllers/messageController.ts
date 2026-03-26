import { Request, Response } from 'express';
import * as messageModel from '../models/messageModel';
import supabase from '../config/db';

export const sendMessage = async (req: Request, res: Response) => {
    try {
        const { senderId, receiverId, content, type } = req.body;

        if (!senderId || !receiverId || !content) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const newMessage: messageModel.DBMessage = {
            id: Date.now().toString(),
            sender_id: senderId,
            receiver_id: receiverId,
            content,
            is_read: false,
            created_at: new Date(),
            type: type || 'chat',
        };

        await messageModel.sendMessage(newMessage);
        res.status(201).json({ message: 'Message sent', data: newMessage });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getInbox = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        // Use the model's Supabase-backed query (avoids direct pool usage)
        const messages = await messageModel.getMessagesForUser(userId);

        const enrichedMessages = messages.map((msg: any) => ({
            id: msg.id,
            from: msg.sender_name || 'Unknown',
            text: msg.content,
            timestamp: msg.created_at,
            read: !!msg.is_read,
            senderId: msg.sender_id,
            receiverId: msg.receiver_id,
            type: msg.type || 'chat',
        }));

        res.json(enrichedMessages);
    } catch (error) {
        console.error('Error fetching inbox:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const markRead = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await messageModel.markMessageAsRead(id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error marking message read:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
