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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePostStatus = exports.addComment = exports.toggleLike = exports.createPost = exports.getCommunityFeed = void 0;
const uuid_1 = require("uuid");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const userModel = __importStar(require("../models/userModel"));
const userModel_1 = require("../models/userModel");
const getCommunityFeed = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const user = yield (0, userModel_1.findUserById)(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Determine which community feed to show
        let coachIdForFeed = undefined;
        if (user.role === 'client') {
            // Clients see their Coach's community
            if (user.coach_id) {
                coachIdForFeed = user.coach_id;
            }
            else {
                // If no coach, maybe show global or empty? 
                // Let's show Global for now (undefined) or maybe restrict? 
                // "Comunidades exclusivas" implies isolation.
                // If no coach, maybe they see nothing or "NutriFit Global".
            }
        }
        else if (user.role === 'coach') {
            // Coaches see their OWN community
            coachIdForFeed = user.id;
        }
        else if (user.role === 'admin' || user.role === 'superadmin') {
            // Admins see everything (Global)
            coachIdForFeed = undefined;
        }
        const isModerator = user.role === 'admin' || user.role === 'superadmin' || user.role === 'coach';
        const posts = yield userModel.getCommunityPosts(coachIdForFeed, userId, isModerator);
        // Map to frontend format
        const formattedPosts = posts.map(p => ({
            id: p.id,
            userId: p.user_id,
            userName: p.user_name,
            userAvatar: p.user_avatar,
            content: p.content,
            type: p.type,
            timestamp: p.created_at, // Helper to format relative time? Frontend does it usually
            likes: p.likes,
            tokensAwarded: p.tokens_awarded,
            status: p.status,
            isCoachPost: p.user_id === coachIdForFeed, // Flag if it's the coach posting
            comments: p.comments, // Pass comments through
            isLiked: p.isLiked, // Pass isLiked status
            imageUrl: p.image_url // Add image url
        }));
        res.json({ posts: formattedPosts });
    }
    catch (error) {
        console.error('Get Feed Error:', error);
        res.status(500).json({ message: 'Error fetching community feed' });
    }
});
exports.getCommunityFeed = getCommunityFeed;
const createPost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const { content, type, image } = req.body; // image can be base64 or URL
        if (!userId)
            return res.status(401).json({ message: 'Unauthorized' });
        if (!content && !image)
            return res.status(400).json({ message: 'Content or Image required' });
        const user = yield (0, userModel_1.findUserById)(userId);
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        // Logic for auto-approval and coach_id assignment
        let status = 'pending';
        let coachId = null;
        let tokensAwarded = 0; // Default 0
        // Define Token Rules based on Type
        if (type === 'hydration') {
            tokensAwarded = 1;
            status = 'published'; // Auto-approve hydration
        }
        else if (type === 'workout') {
            tokensAwarded = 1; // Or custom logic
            status = 'published'; // Auto-approve workout as requested
        }
        else if (type === 'presentation') {
            tokensAwarded = 20;
            status = 'pending';
        }
        else if (type === 'progress') {
            tokensAwarded = 20;
            status = 'pending';
        }
        else {
            // Standard post (motivation, etc)
            if (image) {
                tokensAwarded = 1; // Require approval for image
                status = 'pending';
            }
        }
        // Role-based overrides
        if (user.role === 'coach') {
            status = 'published';
            coachId = user.id;
            tokensAwarded = 0; // Coaches don't earn
        }
        else if (user.role === 'client') {
            coachId = user.coach_id || null;
            // Ensure system events are always published for clients if that was the rule
            if (type === 'hydration' || type === 'workout') {
                status = 'published';
            }
        }
        else if (user.role === 'admin' || user.role === 'superadmin') {
            status = 'published';
        }
        // Handle Image: If Base64, save to file
        let finalImageUrl = image || null;
        if (image && image.startsWith('data:image')) {
            try {
                // Extract base64 data
                const matches = image.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
                if (matches && matches.length === 3) {
                    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1]; // normalize jpeg
                    const base64Data = matches[2];
                    const filename = `${(0, uuid_1.v4)()}.${ext}`;
                    const uploadPath = path_1.default.join(__dirname, '../../public/uploads', filename); // relative to compiled src/controllers
                    // Ensure directory exists (redundant check but safe)
                    const dir = path_1.default.dirname(uploadPath);
                    if (!fs_1.default.existsSync(dir))
                        fs_1.default.mkdirSync(dir, { recursive: true });
                    fs_1.default.writeFileSync(uploadPath, Buffer.from(base64Data, 'base64'));
                    // Set URL for DB
                    finalImageUrl = `/uploads/${filename}`;
                    console.log(`[Upload] Image saved to ${uploadPath}, URL: ${finalImageUrl}`);
                }
            }
            catch (err) {
                console.error("Failed to save image file", err);
                // Fallback? If we fail to save, maybe don't post or post without image?
                // Let's post without image to avoid crashing, but log error.
                finalImageUrl = null;
            }
        }
        const newPost = {
            id: (0, uuid_1.v4)(),
            user_id: user.id,
            content: content || (finalImageUrl ? '📷 Imagen compartida' : ''),
            type: type || 'motivation',
            likes: 0,
            tokens_awarded: tokensAwarded,
            status: status,
            coach_id: coachId,
            image_url: finalImageUrl
        };
        yield userModel.createCommunityPost(newPost);
        // If auto-published (like hydration), award tokens IMMEDIATELY
        if (status === 'published' && tokensAwarded > 0) {
            yield userModel.addTokens(user.id, tokensAwarded);
        }
        res.status(201).json({ message: 'Post created', post: newPost });
    }
    catch (error) {
        console.error('Create Post Error:', error);
        res.status(500).json({ message: 'Error creating post' });
    }
});
exports.createPost = createPost;
const toggleLike = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const postId = req.params.postId;
        if (!userId)
            return res.status(401).json({ message: 'Unauthorized' });
        const result = yield userModel.toggleLike(postId, userId);
        res.json({ status: result }); // 'liked' or 'unliked'
    }
    catch (error) {
        console.error('Toggle Like Error:', error);
        res.status(500).json({ message: 'Error toggling like' });
    }
});
exports.toggleLike = toggleLike;
const addComment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const postId = req.params.postId;
        const { content } = req.body;
        if (!userId)
            return res.status(401).json({ message: 'Unauthorized' });
        if (!content)
            return res.status(400).json({ message: 'Content required' });
        const commentId = (0, uuid_1.v4)();
        yield userModel.createComment(commentId, postId, userId, content);
        // Return the created comment for immediate display
        const user = yield userModel.findUserById(userId);
        const newComment = {
            id: commentId,
            userId,
            userName: (user === null || user === void 0 ? void 0 : user.name) || 'Usuario',
            userAvatar: user === null || user === void 0 ? void 0 : user.avatar,
            content,
            timestamp: new Date()
        };
        res.status(201).json({ comment: newComment });
    }
    catch (error) {
        console.error('Add Comment Error:', error);
        res.status(500).json({ message: 'Error adding comment' });
    }
});
exports.addComment = addComment;
const updatePostStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const postId = req.params.postId;
        const { status } = req.body;
        if (!userId)
            return res.status(401).json({ message: 'Unauthorized' });
        const user = yield userModel.findUserById(userId);
        const isModerator = user && (user.role === 'admin' || user.role === 'superadmin' || user.role === 'coach');
        if (!isModerator) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        const validStatuses = ['published', 'rejected', 'needs_edit', 'pending'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }
        // Fetch post to check eligibility for tokens
        const targetPost = yield userModel.findPostById(postId);
        if (!targetPost) {
            return res.status(404).json({ message: 'Post not found' });
        }
        const success = yield userModel.updateCommunityPostStatus(postId, status);
        if (success) {
            // Award tokens if publishing for the first time
            if (status === 'published' && targetPost.status !== 'published' && targetPost.tokens_awarded > 0) {
                yield userModel.addTokens(targetPost.user_id, targetPost.tokens_awarded);
                console.log(`Awarded ${targetPost.tokens_awarded} tokens to ${targetPost.user_id}`);
            }
            res.json({ message: 'Status updated' });
        }
        else {
            res.status(404).json({ message: 'Post not found' });
        }
    }
    catch (error) {
        console.error('Update Status Error:', error);
        res.status(500).json({ message: 'Error updating status' });
    }
});
exports.updatePostStatus = updatePostStatus;
