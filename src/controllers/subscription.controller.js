import mongoose, {Mongoose, isValidObjectId} from "mongoose";
import { User } from "../models/user.models.js";
import {Subscription} from "../models/subscription.models.js"
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params;

    // Validate Channels ID
    // Check if User is Alread Subscribed to the Channel
    // If Yes, Unsubscribe
    // If No, Subscribe , then create a new Subscription Document
    
    if(!isValidObjectId(channelId)){
        throw new ApiError(400, "Invalid Channel Id");
    }
    
    const isSubscribed = await Subscription.findOne({
        subscriber : req.user?._id,
        channel : channelId
    })

    if(isSubscribed){
        await Subscription.findByIdAndDelete(isSubscribed?._id);

        return res.json(new ApiResponse(200, "Unsubscribed Successfully"));
    }

    await Subscription.create({
        subscriber : req.user?._id,
        channel : channelId
    })

    return res.json(new ApiResponse(200, "Subscribed Successfully"));
});

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
  // Validate Channels ID
  // Match the Channel ID in the Subscription Document
  // Get the Subscribers List
    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid Channel Id");
    }

    const subscribers = await Subscription.aggregate([

        // Match the Channel ID in the Subscription Document
        {
            $match : {
                channel : new mongoose.Types.ObjectId(channelId)
            }
        },

        // Get Subscribers List
        {
            $lookup : {
                from : "users",
                localField : "subscriber",
                foreignField : "_id",
                as : "subscriber",
            }
        },

        // Count the Subscribers
        {
            $addFields : {
                subscribersCount: {
                    $arrayElemAt : ["$subscriber", 0]
                },
            }
        },
        {
            $project : {
                _id : 0,
                subscribersCount : {
                    username : 1,
                    email : 1,
                    avatar : 1
                }
            }
        }
    ])
    

    console.log(subscribers);
    if(!subscribers){
        return res.json(new ApiResponse(200, "Subscribers Not Found"));
    }

    return res.json(new ApiResponse(200, "Subscribers List", subscribers));
});

const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;
    // console.log(subscriberId);
    if(!isValidObjectId(subscriberId)){
        throw new ApiError(400, "Invalid Subscriber Id");
    }

    const subscribedTo = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId("660c13a8a9630f96ca01028e"),
            },
        },
        {
            $lookup: {
            from: "users",
            localField: "channel",
            foreignField: "_id",
            as: "subscribedTo",
            },
        },
        {
            $addFields: {
                subscribedTo: {
                    $arrayElemAt: ["$subscribedTo", 0],
                },
            },
        },
        {
            $project: {
                subscribedTo: {
                    username: 1,
                    email: 1,
                    avatar: 1,
                },
            },
        },
    ]);

    return res.json(new ApiResponse(200, "Subscribed Channels", subscribedTo));
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };