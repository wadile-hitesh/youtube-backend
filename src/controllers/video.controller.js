import mongoose from "mongoose";
import { Video } from "../models/video.models.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { upload } from "../middlewares/multer.middleware.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const publishVideo = asyncHandler(async (req, res) => {
    const {title, description} = req.body;

    if(!title || !description) {
        return res.status(400).json(new ApiError(400, "Title and Description are required"));
    }
    console.log("User");
    // Get the video file path
    const videoFilePath = req.files?.video[0].path;
    // Thumbnail File Path
    const thumbnailFilePath = req.files?.thumbnail[0].path;
    console.log(videoFilePath);
    console.log(thumbnailFilePath);

    // Uploading the File to Cloudinary

    const videoFile = await uploadOnCloudinary(videoFilePath);
    const thumbnail = await uploadOnCloudinary(thumbnailFilePath);
    console.log(videoFile);
    console.log(thumbnail);

    if(!videoFile) {
        return res.status(500).json(new ApiError(500, "Some Error Occured while uploading the video file"));
    }

    if(!thumbnail) {
        return res.status(500).json(new ApiError(500, "Some Error Occured while uploading the thumbnail file"));
    }
    // Create a new Video document

    const video = await Video.create({
        title,
        description,
        videoFile : videoFile.url,
        duration : videoFile.duration,
        thumbnail : thumbnail.url,
        owner : req.user._id
    })

    if(!video) {
        return res.status(500).json(new ApiError(500, "Some Error Occured while creating the video document"));
    }

    return res.status(201).json(new ApiResponse(201, {video}, "Video Published Successfully"));
});

export { 
    publishVideo ,
}