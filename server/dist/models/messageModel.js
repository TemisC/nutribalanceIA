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
exports.getConversation = exports.markMessageAsRead = exports.getMessagesForUser = exports.initMessageTable = exports.sendMessage = void 0;
const db_1 = __importDefault(require("../config/db"));
const sendMessage = (message) => __awaiter(void 0, void 0, void 0, function* () {
    const sql = `INSERT INTO messages (id, sender_id, receiver_id, content, is_read, type) VALUES (?, ?, ?, ?, ?, ?)`;
    // created_at auto defaults
    return db_1.default.execute(sql, [
        message.id,
        message.sender_id,
        message.receiver_id,
        message.content,
        message.is_read || false,
        message.type || 'chat' // Default to chat
    ]);
});
exports.sendMessage = sendMessage;
const initMessageTable = () => __awaiter(void 0, void 0, void 0, function* () {
    const sql = `
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(36) PRIMARY KEY,
        sender_id VARCHAR(36) NOT NULL,
        receiver_id VARCHAR(36) NOT NULL,
        content TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        type ENUM('chat', 'system') DEFAULT 'chat',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_sender (sender_id),
        INDEX idx_receiver (receiver_id)
      );
    `;
    yield db_1.default.execute(sql);
    console.log("Messages table initialized");
});
exports.initMessageTable = initMessageTable;
const getMessagesForUser = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    // Get messages where user is receiver OR sender (to show full history)
    const sql = `
        SELECT * FROM messages 
        WHERE receiver_id = ? OR sender_id = ?
        ORDER BY created_at DESC
    `;
    const [rows] = yield db_1.default.execute(sql, [userId, userId]);
    return rows;
});
exports.getMessagesForUser = getMessagesForUser;
const markMessageAsRead = (messageId) => __awaiter(void 0, void 0, void 0, function* () {
    const sql = `UPDATE messages SET is_read = TRUE WHERE id = ?`;
    return db_1.default.execute(sql, [messageId]);
});
exports.markMessageAsRead = markMessageAsRead;
const getConversation = (user1, user2) => __awaiter(void 0, void 0, void 0, function* () {
    // For chat view if needed later
    const sql = `
        SELECT * FROM messages 
        WHERE (sender_id = ? AND receiver_id = ?) 
           OR (sender_id = ? AND receiver_id = ?)
        ORDER BY created_at ASC
    `;
    const [rows] = yield db_1.default.execute(sql, [user1, user2, user2, user1]);
    return rows;
});
exports.getConversation = getConversation;
