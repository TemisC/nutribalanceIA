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
const db_1 = __importDefault(require("./config/db"));
const addStreakColumn = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("Checking if 'streak' column exists...");
        const [rows] = yield db_1.default.execute("SHOW COLUMNS FROM users LIKE 'streak'");
        if (rows.length === 0) {
            console.log("Adding 'streak' column...");
            yield db_1.default.execute("ALTER TABLE users ADD COLUMN streak INT DEFAULT 0");
            console.log("Column 'streak' added successfully.");
        }
        else {
            console.log("Column 'streak' already exists.");
        }
    }
    catch (error) {
        console.error("Error adding column:", error);
    }
    finally {
        process.exit();
    }
});
addStreakColumn();
