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
exports.testConnection = void 0;
const promise_1 = __importDefault(require("mysql2/promise"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load env vars
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 3, // Reduced to prevent Hostinger 'User Limit' blocks
    maxIdle: 3,
    idleTimeout: 60000,
    queueLimit: 0,
};
const pool = promise_1.default.createPool(dbConfig);
console.log(`🔌 DB Pool Created. Limit: ${dbConfig.connectionLimit}`);
const testConnection = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const connection = yield pool.getConnection();
        console.log('✅ Connected to MySQL Database!');
        connection.release();
        return true;
    }
    catch (error) {
        console.error('❌ Database connection failed:', error);
        return false;
    }
});
exports.testConnection = testConnection;
exports.default = pool;
