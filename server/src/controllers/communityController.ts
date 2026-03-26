
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import * as userModel from '../models/userModel';
import { DBCommunityPost } from '../models/userModel'; // Assuming exported
import { findUserById } from '../models/userModel';

export const getCommunityFeed = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const user = await findUserById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Determine which community feed to show
        let coachIdForFeed: string | undefined = undefined;

        if (user.role === 'client') {
            // Clients see their Coach's community
            if (user.coach_id) {
                coachIdForFeed = user.coach_id;
            } else {
                // If no coach, maybe show global or empty? 
                // Let's show Global for now (undefined) or maybe restrict? 
                // "Comunidades exclusivas" implies isolation.
                // If no coach, maybe they see nothing or "NutriFit Global".
            }
        } else if (user.role === 'coach') {
            // Coaches see their OWN community
            coachIdForFeed = user.id;
        } else if (user.role === 'admin' || user.role === 'superadmin') {
            // Admins see everything (Global)
            coachIdForFeed = undefined;
        }

        const isModerator = user.role === 'admin' || user.role === 'superadmin' || user.role === 'coach';
        const posts = await userModel.getCommunityPosts(coachIdForFeed, userId, isModerator);

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

    } catch (error) {
        console.error('Get Feed Error:', error);
        res.status(500).json({ message: 'Error fetching community feed' });
    }
};

export const createPost = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const { content, type, image } = req.body; // image can be base64 or URL

        if (!userId) return res.status(401).json({ message: 'Unauthorized' });
        if (!content && !image) return res.status(400).json({ message: 'Content or Image required' });

        const user = await findUserById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Logic for auto-approval and coach_id assignment
        let status: DBCommunityPost['status'] = 'pending';
        let coachId: string | null = null;
        let tokensAwarded = 0; // Default 0

        // Define Token Rules based on Type
        if (type === 'hydration') {
            tokensAwarded = 1;
            status = 'published'; // Auto-approve hydration
        } else if (type === 'workout') {
            tokensAwarded = 1; // Or custom logic
            status = 'published'; // Auto-approve workout as requested
        } else if (type === 'presentation') {
            tokensAwarded = 20;
            status = 'pending';
        } else if (type === 'progress') {
            tokensAwarded = 20;
            status = 'pending';
        } else {
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
        } else if (user.role === 'client') {
            coachId = user.coach_id || null;
            // Ensure system events are always published for clients if that was the rule
            if (type === 'hydration' || type === 'workout') {
                status = 'published';
            }
        } else if (user.role === 'admin' || user.role === 'superadmin') {
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
                    const filename = `${uuidv4()}.${ext}`;
                    const uploadPath = path.join(__dirname, '../../public/uploads', filename); // relative to compiled src/controllers

                    // Ensure directory exists (redundant check but safe)
                    const dir = path.dirname(uploadPath);
                    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

                    fs.writeFileSync(uploadPath, Buffer.from(base64Data, 'base64'));

                    // Set URL for DB
                    finalImageUrl = `/uploads/${filename}`;
                    console.log(`[Upload] Image saved to ${uploadPath}, URL: ${finalImageUrl}`);
                }
            } catch (err) {
                console.error("Failed to save image file", err);
                // Fallback? If we fail to save, maybe don't post or post without image?
                // Let's post without image to avoid crashing, but log error.
                finalImageUrl = null;
            }
        }

        const newPost: DBCommunityPost = {
            id: uuidv4(),
            user_id: user.id,
            content: content || (finalImageUrl ? '📷 Imagen compartida' : ''),
            type: type || 'motivation',
            likes: 0,
            tokens_awarded: tokensAwarded,
            status: status,
            coach_id: coachId,
            image_url: finalImageUrl
        };

        await userModel.createCommunityPost(newPost);

        // If auto-published (like hydration), award tokens IMMEDIATELY
        if (status === 'published' && tokensAwarded > 0) {
            await userModel.addTokens(user.id, tokensAwarded);
        }

        res.status(201).json({ message: 'Post created', post: newPost });

    } catch (error) {
        console.error('Create Post Error:', error);
        res.status(500).json({ message: 'Error creating post' });
    }
};

export const toggleLike = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const postId = req.params.postId;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const result = await userModel.toggleLike(postId, userId);
        res.json({ status: result }); // 'liked' or 'unliked'
    } catch (error) {
        console.error('Toggle Like Error:', error);
        res.status(500).json({ message: 'Error toggling like' });
    }
};

export const addComment = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const postId = req.params.postId;
        const { content } = req.body;

        if (!userId) return res.status(401).json({ message: 'Unauthorized' });
        if (!content) return res.status(400).json({ message: 'Content required' });

        const commentId = uuidv4();
        await userModel.createComment(commentId, postId, userId, content);

        // Return the created comment for immediate display
        const user = await userModel.findUserById(userId);

        const newComment = {
            id: commentId,
            userId,
            userName: user?.name || 'Usuario',
            userAvatar: user?.avatar,
            content,
            timestamp: new Date()
        };

        res.status(201).json({ comment: newComment });

    } catch (error) {
        console.error('Add Comment Error:', error);
        res.status(500).json({ message: 'Error adding comment' });
    }
};

export const updatePostStatus = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const postId = req.params.postId;
        const { status } = req.body;

        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const user = await userModel.findUserById(userId);
        const isModerator = user && (user.role === 'admin' || user.role === 'superadmin' || user.role === 'coach');

        if (!isModerator) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const validStatuses = ['published', 'rejected', 'needs_edit', 'pending'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        // Fetch post to check eligibility for tokens
        const targetPost = await userModel.findPostById(postId);
        if (!targetPost) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const success = await userModel.updateCommunityPostStatus(postId, status);
        if (success) {
            // Award tokens if publishing for the first time
            if (status === 'published' && targetPost.status !== 'published' && targetPost.tokens_awarded > 0) {
                await userModel.addTokens(targetPost.user_id, targetPost.tokens_awarded);
                console.log(`Awarded ${targetPost.tokens_awarded} tokens to ${targetPost.user_id}`);
            }
            res.json({ message: 'Status updated' });
        } else {
            res.status(404).json({ message: 'Post not found' });
        }

    } catch (error) {
        console.error('Update Status Error:', error);
        res.status(500).json({ message: 'Error updating status' });
    }
};

