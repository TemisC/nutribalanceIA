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
const addColumn = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("Adding current_period_end to users table...");
        // Check if column exists logic is hard in raw SQL without describing.
        // We'll just try to add it and catch duplicate column error, or use logic.
        // Simplest: Try ADD COLUMN.
        try {
            yield db_1.default.execute("ALTER TABLE users ADD COLUMN current_period_end DATETIME NULL");
            console.log("Column added.");
        }
        catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log("Column already exists.");
            }
            else {
                throw e;
            }
        }
        console.log("Schema update complete.");
        process.exit(0);
    }
    catch (error) {
        console.error("Schema update failed:", error);
        process.exit(1);
    }
});
addColumn();
