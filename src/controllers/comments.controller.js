import mongoose, {isValidObjectId} from 'mongoose';
import {Comment} from '../models/comment.model.js';
import {Like} from '../models/like.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const getVideoComments = asyncHandler(async (req,res)=>{
    const {videoId} = req.params;
    const {page = 1, limit = 10} = req.query;

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video id");
    }

    const videoComments = await Comment.aggregate([
        {
            $match : {
                video : mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup : {
                from : "users",
                localField : "owner",
                foreignField : "_id",
                as : "owner"
            }
        },
        {
            $lookup : {
                from : "likes",
                localField : "_id",
                foreignField : "comment",
                as : "likes"
            }
        },
        {
            $addFields : {
                likesCount : {
                    $size : "$likes"
                },
                owner : {
                    $first : "$owner"
                },
                isLiked : {
                    $cond : {
                        if : {
                            $in : [req.user?._id, "$likes.likedBy"]
                        },
                        then : true,
                        else : false
                    }
                }
            }            
        },
        {
            $sort : {
                createdAt : -1
            }
        },
        {
            $project : {
                content : 1,
                createdAt : 1,
                likesCount : 1,
                isLiked : 1,
                owner : {
                    username : 1,
                    avatar : 1,
                    fullname : 1
                }
            }
        }
    ])
})

const addComment = asyncHandler(async (req, res) => {
    const {videoId} = req.params;
    const {content} = req.body;

    if(!isValidObjectId(videoId)){
        return next(new ApiError(400, "Invalid video id"));
    }

    if(!content){
        throw new ApiError(400, "Content is required");
    }

    const comment = await Comment.create({
        content,
        video : videoId,
        user : req.user?._id
    })

    if(!comment){
        throw new ApiError(500, "Failed to add comment");
    }

    return res.status(201).json(new ApiResponse(201, {comment}, "Comment added successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params;

    if(!isValidObjectId(commentId)){
        throw new ApiError(400, "Invalid comment id");
    }

    const comment = await Comment.findById(commentId)

    if(!comment){
        throw new ApiError(404, "Comment not found");
    }

    if(comment.user.toString() !== req.user._id.toString()){
        throw new ApiError(403, "You are not authorized to delete this comment");
    }

    await Comment.findByIdAndDelete(commentId);

    await Like.deleteMany({
        comment : commentId,
        likedBy : req.user?._id
    })

    return res.status(201).json(new ApiResponse(201, "Comment deleted successfully"));
})

const updateComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params;
    const {content} = req.body;

    if(!isValidObjectId(commentId)){
        throw new ApiError(400, "Invalid comment id");
    }

    const comment = await Comment.findById(commentId)

    if(!comment){
        throw new ApiError(404, "Comment not found");
    }

    if(comment.user.toString() !== req.user._id.toString()){
        throw new ApiError(403, "You are not authorized to update this comment");
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set : {
                content
            }
        
    },
    {new : true}
)

    if(!updatedComment){
        throw new ApiError(500, "Failed to update comment");
    }

    return res.status(201).json(new ApiResponse(201, {updatedComment}, "Comment updated successfully"));

})

export {
    addComment,
    deleteComment,
    updateComment,
    getVideoComments
}