"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const communityController_1 = require("../controllers/communityController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// All routes protected
router.use(authMiddleware_1.protect);
router.get('/', communityController_1.getCommunityFeed);
router.post('/', communityController_1.createPost);
router.post('/:postId/like', communityController_1.toggleLike);
router.post('/:postId/comments', communityController_1.addComment);
const communityController_2 = require("../controllers/communityController");
router.patch('/:postId/status', communityController_2.updatePostStatus);
exports.default = router;
