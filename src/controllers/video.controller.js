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
    // console.log(req.files);
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

const getVideoById = asyncHandler(async (req, res) => {
    const {videoId} = req.params;
    console.log(req);
    const video = await Video.findById(videoId)

    if(!video) {
        return res.status(404).json(new ApiError(404, "Video Not Found"));
    }

    return res.status(200).json(new ApiResponse(200, {video},"Video Found Successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
    const {videoId} = req.params;

    const video = await Video.findByIdAndDelete(videoId);

    if(!video) {
        return res.status(404).json(new ApiError(404, "Video Not Found"));
    }

    return res.status(200).json(new ApiResponse(200, {video}, "Video Deleted Successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
    // Get Video Id
    // Get Details like title and description and Thumbnail
    // Update the Video Document
    
    const {videoId} = req.params;
    const {title,description} = req.body;

    let thumbnailLocalPath;
    console.log(req.file);

    if(req.file && req.file.path.length > 0){
        thumbnailLocalPath = req.file.path;
    }
    // console.log(req.file.path);
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    console.log(thumbnail);
    if(!thumbnail) {
        return res.status(500).json(new ApiError(500, "Some Error Occured while uploading the thumbnail file"));
    }

    const video = await Video.findByIdAndUpdate(videoId, {
        $set : {
            title,
            description,
            thumbnail : thumbnail.url
        }
    }, {new : true});

    return res.status(201).json(new ApiResponse(201,{video} ,"Video Updated Successfully"));
});

export { 
    publishVideo ,
    getVideoById,
    deleteVideo,
    updateVideo
}