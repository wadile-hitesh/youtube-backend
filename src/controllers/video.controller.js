import mongoose, { Mongoose, isValidObjectId } from "mongoose";
import { Video } from "../models/video.models.js";
import {Like} from "../models/like.models.js"
import {Comment} from "../models/comments.models.js"
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const getAllVideos = asyncHandler(async (req, res) => {
    const {page = 1, limit = 10, query, sortBy, sortType, userId} = req.query;
    // console.log(req.query);

    const pipeline = []

    if(query){
        pipeline.push({
            $search : {
                index : "search-indexes",
                text : {
                    query : query,
                    path : [title,description]
                }
            }
        })
    }

    if(userId){
        if(!isValidObjectId(userId)){
            throw new ApiError(400, "Invalid UserId")
        }

        pipeline.push({
            $match : {
                owner : new mongoose.Types.ObjectId(userId)
            }
        })
    }

    // Fetch Video that are published Only

    pipeline.push({
        $match : {
            isPublished : true
        }
    })

    // Sort can be based on views, createdAt, duration

    if(sortBy && sortType){
        pipeline.push([
            {
                $sort : {
                    [sortBy] : sortType === "asc" ? 1 : -1
                }
            }
        ])
    }
    else{
        pipeline.push([
            {
                $sort : {
                    createdAt : -1
                }
            }
        ])
    }

    pipeline.push({
        $lookup : {
            from : "users",
            localField : "owner",
            foreignField : "_id",
            as : "ownerDetails",
            pipeline : [
                {
                    $project : {
                        username : 1,
                        fullname : 1,
                        avatar : 1
                    }
                },
                {
                    $unwind : "$ownerDetails"
                }
            ]
        },
    })

    const videoAggregate = await Video.aggregate(pipeline)

    const options = {
        page : parseInt(page,10),
        limit : parseInt(limit,10)
    }

    const video = await Video.aggregatePaginate(videoAggregate,options)

    // console.log(videos);

    return res.status(200).json(new ApiResponse(200, video,  "Videos Found Successfully"));
});

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
    // console.log(videoFilePath);
    // console.log(thumbnailFilePath);

    if(!videoFilePath){
        throw new ApiError("Video File is not Uploaded")
    }

    if(!thumbnailFilePath){
        throw new ApiError("Thumbnail Not Uploaded")
    }

    // Uploading the File to Cloudinary

    const videoFile = await uploadOnCloudinary(videoFilePath);
    const thumbnail = await uploadOnCloudinary(thumbnailFilePath);
    // console.log(videoFile);
    // console.log(thumbnail);

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
        videoFile : {
            url : videoFile.url,
            public_id : videoFile.public_id
        },
        duration : videoFile.duration,
        thumbnail : {
            url : thumbnail.url,
            public_id : thumbnail.public_id
        },
        owner : req.user?._id,
        isPublished : false
    })

    if(!video) {
        throw new ApiError(500, "Some Error Occured while creating the video document");
    }

    return res.status(201).json(new ApiResponse(201, {video}, "Video Published Successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
    const {videoId} = req.params;
    
    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid Video Id")
    }
    const video = await Video.findById(videoId)

    if(!video) {
        throw new ApiError(404, "Video Not Found");
    }

    const getVideo = await Video.aggregate([
        {
            $match : {
                _id : new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup : {
                from : "likes",
                localField : "_id",
                foreignField : "video",
                as : "likes"
            }
        },
        {
            $lookup : {
                from : "comments",
                localField : "_id",
                foreignField : "video",
                as : "comments"
            }
        },
        {
            $lookup : {
                from : "users",
                localField : "owner",
                foreignField : "_id",
                as : "owner",
                pipeline : [
                    {
                        $lookup : {
                            from : "subscriptions",
                            localField : "_id",
                            foreignField : "channel",
                            as : "subscribers"
                        }
                    },
                    {
                        $addFields : {
                            subscribersCount : {
                                $size : "$subscribers"
                            },
                            isSubscribedTo : {
                                $cond : {
                                    if : {
                                        $in : [req.user?._id, "$subscribers.subscriber"]
                                    },
                                    then : true,
                                    else : false
                                }
                            }
                        }
                    },
                    {
                        $project : {
                            username : 1,
                            fullname : 1,
                            avatar : 1,
                            subscribersCount : 1,
                            isSubscribed : 1
                        }
                    }
                ]
            }
        },
        {
            $addFields : {
                totalLikes : {
                    $size : "$likes"
                },
                owner : {
                    $first : "$owner"
                },
                isLiked : {
                    $cond : {
                        if : {
                            $in : [req.user?._id, "$likes.isLikedBy"],
            
                        },
                        then : true,
                        else : false
                    }
                }
            }
        },
        {
            $project : {
                videoFile : 1,
                title : 1,
                description : 1,
                views : 1,
                createdAt : 1,
                comments : 1,
                duration : 1,
                owner : 1,
                totalLikes : 1,
                isLiked : 1,
            }
        }
    ])
    
    if(!getVideo){
        return res.status(200).json(200, "Failed to Fetch Video")
    }

    return res.status(200).json(new ApiResponse(200, {video},"Video Found Successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
    const {videoId} = req.params;

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid Video Id")
    }

    const video = await Video.findById(videoId);

    if(!video) {
        return res.status(404).json(new ApiError(404, "Video Not Found"));
    }   

    if(video.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(400, "You are not authroized user to delete the video")
    }

    const deletedVideo = await Video.findByIdAndDelete(video?._id)

    if(!deleteVideo){
        throw new ApiError(400, "Failed to delete the Video Please try Again")
    }

    await deleteOnCloudinary(video.thumbnail.public_id)
    await deleteOnCloudinary(video.videoFile.public_id, "video")

    await Like.deleteMany({
        video : videoId
    })

    await Comment.deleteMany({
        video : videoId
    })
    return res.status(200).json(new ApiResponse(200, {}, "Video Deleted Successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
    // Get Video Id
    // Get Details like title and description and Thumbnail
    // Update the Video Document
    
    const {videoId} = req.params;
    const {title,description} = req.body;

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid Video Id")
    }
    
    if(!(title || description)){
        throw new ApiError(400, "Title and Description is Required")
    }

    const video = await Video.findById(videoId)
    
    if(!video){
        throw new ApiError(400,"Video Not Found")
    }

    if(video.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(400,"You are not authorized to Update the Video")
    }

    const thumbnailToDelete = video.thumbnail.public_id

    let thumbnailLocalPath;
    // console.log(req.file);

    if(req.file && req.file.path.length > 0){
        thumbnailLocalPath = req.file.path;
    }

    // console.log(req.file.path);
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    // console.log(thumbnail);
    if(!thumbnail) {
        return res.status(500).json(new ApiError(500, "Some Error Occured while uploading the thumbnail file"));
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId, {
        $set : {
            title,
            description,
            thumbnail : {
                url : thumbnail.url,
                public_id : thumbnail.public_id
            }
        }
    }, {new : true});

    if(!updatedVideo){
        throw new ApiError(400,"Some Error Occured While Updating the Video")
    }

    if(updatedVideo){
        await deleteOnCloudinary(thumbnailToDelete)
    }

    return res.status(201).json(new ApiResponse(201,{updatedVideo} ,"Video Updated Successfully"));
});

const togglePublishedStatus = asyncHandler(async(req,res)=>{
    const {videoId} = req.params

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid Video Id")
    }

    const video = await Video.findById(videoId)

    if(!video){
        throw new ApiError(400, "Video Not Found")
    }

    if(video?.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(400, "You are not authorized user to Published Video")
    }

    const toggleStatus =  await Video.findByIdAndUpdate(
        videoId,
        {
            $set : !video?.isPublished
        },
        {new : true}
    )

    if(!toggleStatus){
        throw new ApiError(400, "Failed To change the toggle Published Status")
    }

    return res.status(200).json(new ApiResponse(200,toggleStatus,"Change the Published status of the Video"))
})

export { 
    getAllVideos,
    publishVideo ,
    getVideoById,
    deleteVideo,
    updateVideo,
    togglePublishedStatus
}