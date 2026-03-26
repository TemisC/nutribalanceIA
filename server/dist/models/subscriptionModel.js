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
exports.getRequestById = exports.updateSubscriptionStatus = exports.getPendingSubscriptions = exports.createSubscriptionRequest = void 0;
const db_1 = __importDefault(require("../config/db"));
const createSubscriptionRequest = (userId, requestedRole, amount, coachId) => __awaiter(void 0, void 0, void 0, function* () {
    const [result] = yield db_1.default.execute('INSERT INTO subscription_requests (user_id, requested_role, amount, coach_id) VALUES (?, ?, ?, ?)', [userId, requestedRole, amount || 0.00, coachId || null]);
    return result.insertId;
});
exports.createSubscriptionRequest = createSubscriptionRequest;
const getPendingSubscriptions = () => __awaiter(void 0, void 0, void 0, function* () {
    // We join with users to get names associated
    const query = `
        SELECT 
            sr.*, 
            u.name as user_name,
            c.name as coach_name
        FROM subscription_requests sr
        JOIN users u ON sr.user_id = u.id
        LEFT JOIN users c ON sr.coach_id = c.id
        WHERE sr.status = 'pending'
        ORDER BY sr.created_at DESC
    `;
    const [rows] = yield db_1.default.execute(query);
    return rows;
});
exports.getPendingSubscriptions = getPendingSubscriptions;
const updateSubscriptionStatus = (id, status, adminNotes) => __awaiter(void 0, void 0, void 0, function* () {
    const [result] = yield db_1.default.execute('UPDATE subscription_requests SET status = ?, admin_notes = ? WHERE id = ?', [status, adminNotes || null, id]);
    return result.affectedRows > 0;
});
exports.updateSubscriptionStatus = updateSubscriptionStatus;
const getRequestById = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const [rows] = yield db_1.default.execute('SELECT * FROM subscription_requests WHERE id = ?', [id]);
    return rows[0] || null;
});
exports.getRequestById = getRequestById;
