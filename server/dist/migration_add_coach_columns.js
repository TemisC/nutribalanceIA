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
const promise_1 = __importDefault(require("mysql2/promise"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load env vars
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../.env') });
const dbConfig = {
    host: 'srv1621.hstgr.io',
    user: 'u238228052_admintemis',
    password: 'LOratadina..10',
    database: 'u238228052_nutriproaisaas'
};
const runMigration = () => __awaiter(void 0, void 0, void 0, function* () {
    let connection;
    console.log('DB Config Host:', dbConfig.host);
    console.log('DB Config User:', dbConfig.user);
    // console.log('DB Config Pass:', dbConfig.password ? '****' : 'EMPTY'); // Do not log password
    console.log('DB Config Name:', dbConfig.database);
    try {
        console.log('Connecting to database...');
        connection = yield promise_1.default.createConnection(dbConfig);
        console.log('Connected.');
        // Add coach_tier column
        try {
            yield connection.query(`
                ALTER TABLE users 
                ADD COLUMN coach_tier ENUM('standard', 'vip') DEFAULT 'standard' AFTER coach_id;
            `);
            console.log('Added coach_tier column.');
        }
        catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('coach_tier column already exists.');
            }
            else {
                throw error;
            }
        }
        // Add commission_rate column
        try {
            yield connection.query(`
                ALTER TABLE users 
                ADD COLUMN commission_rate DECIMAL(5,2) DEFAULT 0.15 AFTER coach_tier;
            `);
            console.log('Added commission_rate column.');
        }
        catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('commission_rate column already exists.');
            }
            else {
                throw error;
            }
        }
        console.log('Migration completed successfully.');
    }
    catch (error) {
        console.error('Migration failed:', error);
    }
    finally {
        if (connection)
            yield connection.end();
    }
});
runMigration();
