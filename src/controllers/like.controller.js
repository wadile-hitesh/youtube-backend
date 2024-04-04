import mongoose,{isValidObjectId} from "mongoose";
import {Like} from '../models/like.models.js'
import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from '../utils/ApiError.js'
import {ApiResponse} from '../utils/ApiResponse.js'

const toggleVideoLike = asyncHandler(async (req, res, next) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        return res.status(400).json(new ApiError(400, "Invalid video id"));
    }

    // Check if the Video is Already Liked or Not
    const liked = await Like.findOne({ videoId, likedBy: req.user._id });

    if (liked) {
        await Like.findByIdAndDelete(liked._id);
        return res.status(200).json(new ApiResponse(200, "Video Unliked"));
    }

    await Like.create({ videoId, likedBy: req.user._id });

    return res.status(201).json(new ApiResponse(201, "Video Liked"));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    if(!isValidObjectId(commentId)){
        return res.status(400).json(new ApiError(400, "Invalid comment id"));
    }

    // Check if the Comment is Already Liked or Not
    const liked = await Like.findOne({ commentId, likedBy: req.user._id });
    if (liked) {
        await Like.findByIdAndDelete(liked._id);
        return res.status(200).json(new ApiResponse(200, "Comment Unliked"));
    }

    await Like.create({ commentId, likedBy: req.user._id });

    return res.status(201).json(new ApiResponse(201, "Comment Liked"));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;

    if(!isValidObjectId(tweetId)){
        return res.status(400).json(new ApiError(400, "Invalid tweet id"));
    }

    // Check if the Tweet is Already Liked or Not
    const liked = await Like.findOne({ tweetId, likedBy: req.user._id });
    if (liked) {
        await Like.findByIdAndDelete(liked._id);
        return res.status(200).json(new ApiResponse(200, "Tweet Unliked"));
    }

    await Like.create({ tweetId, likedBy: req.user._id });

    return res.status(201).json(new ApiResponse(201, "Tweet Liked"));
});

const getAllLikedVideos = asyncHandler(async (req, res) => {
    const likedVideosAggregate = await Like.aggregate([
        {
            $match : {
                likedBy : new mongoose.Types.ObjectId(req.user._id),
            }
        },
        {
            $lookup : {
                from : "videos",
                localField : "videoId",
                foreignField : "_id",
                as : "likedvideo",
                pipeline : [
                    {
                        $lookup : {
                            from : "users",
                            localField : "owner",
                            foreignField : "_id",
                            as : "owner_details"
                        }
                    },
                    {
                        $unwind : "$owner_details"
                    },
                ]
            }
            
        },
        {
            $unwind : "$likedvideo"
        },
        {
            $sort : {
                "createdAt" : -1
            }
        },
        {
            $project : {
                _id : 0,
                likedVideo : {
                    _id : 1,
                    thumbnail : 1,
                    videoFile : 1,
                    title : 1,
                    description : 1,
                    views : 1,
                    duration : 1,
                    createdAt : 1,
                    isPublished : 1,
                    ownerDetails : {
                        _id : 1,
                        username : 1,
                        fullname : 1,
                        avatar : 1
                    }
                }
            }
        }

    ])

    return res.status(200).json(new ApiResponse(200, likedVideosAggregate, "Liked Videos"));
});

export { toggleVideoLike, tog };