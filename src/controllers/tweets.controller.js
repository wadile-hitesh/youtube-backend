import mongoose, {isValidObjectId} from "mongoose";
import {Tweet} from "../models/tweet.model.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res, next) => {
    const {content} = req.body;

    if(!content){
        throw new ApiError(400, "Content is required");
    }

    const tweet = await Tweet.create({
        owner : req.user._id,
        content
    });

    if(!tweet){
        return res.status(500).json(new ApiError(500, "Error while creating tweet"));
    }

    return res.status(201).json(new ApiResponse(201, {tweet}, "Tweet created successfully"));
});

const updateTweet = asyncHandler(async (req, res, next) => {
    const {tweetId} = req.params;
    const {content} = req.body;

    if(!isValidObjectId(tweetId)){
        throw new ApiError(400, "Invalid tweet id");
    }
    
    const tweet = await Tweet.findById(tweetId);

    if(!tweet){
        throw new ApiError(404, "Tweet not found");
    }

    if(tweet.owner.toString() != req.user._id.toString()){
        throw new ApiError(403, "You are not authorized to update this tweet");
    }

    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId, 
        {
            $set : {
                content
            }
        }, {new : true});

    if(!updatedTweet){
        return res.status(500).json(new ApiError(500, "Error while updating tweet"));
    }

    return res.status(200).json(new ApiResponse(200, {tweet : updatedTweet}, "Tweet updated successfully"));
});

const deleteTweet = asyncHandler(async (req, res, next) => {
    const {tweetId} = req.params;

    if(!isValidObjectId(tweetId)){
        throw new ApiError(400, "Invalid tweet id");
    }

    const tweet = await Tweet.findById(tweetId);

    if(!tweet){
        throw new ApiError(404, "Tweet not found");
    }

    if(tweet.owner.toString() != req.user._id.toString()){
        throw new ApiError(403, "You are not authorized to delete this tweet");
    }

    await findByIdAndDelete(tweetId);

    return res.status(200).json(new ApiResponse(200,  "Tweet deleted successfully"));
});

const getUserTweets = asyncHandler(async (req, res, next) => {
    const {userId} = req.params;

    if(!isValidObjectId(userId)){
        throw new ApiError(400, "Invalid user id");
    }
    const userTweet = await Tweet.aggregate([
        {
            $match : {
                owner : new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup : {
                from : "users",
                localField : "owner",
                foreignField : "_id",
                as : "ownerDetails",
                pipline : [
                    {
                        $project : {
                            username : 1,
                            fullname : 1,
                            avatar : 1,
                        }
                    }
                ]
            }
        },
        {
                $unwind : "$ownerDetails"
        },
        {
            $lookup : {
                from : "likes",
                localField : "_id",
                foreignField : "tweet",
                as : "likesDetails",
                pipline : [
                    {
                        $project : {
                            likedBy : 1
                        }
                    }
                ]
            }
        },
        {
            $addFields : {
                likeCount : {
                    $size : "$likes"
                },
                ownerDetails : {
                    $first : "$ownerDetails"
                },
                isLiked : {
                    $cond : {
                        if : {
                            $in : [req.user?._id, "$likesDetails.likedBy"]
                        },
                        then : true,
                        else : false
                    }
                }
            },
        },
        {
            $sort : {
                createdAt : -1
            }
        },
        {
            $project : {
                content : 1,
                ownerDetails : 1,
                likeDetails : 1,
                likeCount : 1,
                createdAt : 1,
                isLiked : 1
            }
        }       
    ])
});

export {
    createTweet
}