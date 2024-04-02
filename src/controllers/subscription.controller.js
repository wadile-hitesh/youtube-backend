import mongoose, {isValidObjectId} from "mongoose";
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

    

    console.log(subscribers);

    return res.json(new ApiResponse(200, "Subscribers List", subscribers));
});

const getSubscribedChannels = asyncHandler(async (req, res) => {});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };