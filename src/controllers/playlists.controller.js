import mongoose, {isValidObjectId} from 'mongoose';
import {Playlist} from '../models/playlist.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const createPlaylist = asyncHandler(async (req,res)=>{
    const {name, description} = req.body;

    if(!name || !description){
        throw new ApiError(400,"Name and Description is Required")
    }

    const playlist = await Playlist.create({
        name,
        description,
        owner : req.user?._id
    })

    if(!playlist){
        throw new ApiError(400, "Some Error Occurred While Creating Playlist")
    }

    return res.status(200).json(new ApiResponse(200,playlist,"Playlist Created Successfully"))
})


const updatePlaylist = asyncHandler(async (req,res)=>{
    const { name, description } = req.body;
    const {playlistId} = req.params

    if (!name || !description) {
        throw new ApiError(400, "Name and Description is Required");
    }

    if(!isValidObjectId(playlistId)){
        throw new ApiError(400, "Invalid Playlist Id")
    }
    const playlist = await Playlist.findById(playlistId)

    if(!playlist){
        throw new ApiError(400,"Playlist not found")
    }

    if(playlist.user.toString() !== req.user?._id.toString()){
        throw new ApiError(400, "User is not authorized to update the Playlist")
    }



    const updatedPlaylist = await findByIdAndUpdate(
        playlistId,
        {
            $set : {
                name,
                description
            }
        },
        {new : true}
    )

    return res.status(200).json(new ApiResponse(200,updatedPlaylist,"Playlist Update Successfully"))
})

const deletePlaylist = asyncHandler(async(req,res)=>{
    const {playlistId} = req.params

    if(!isValidObjectId(playlistId)){
        throw new ApiError(400,"Invalid Playlist Id")
    }

    const playlist = await findById(playlistId)

    if(!playlist){
        throw new ApiError(400,"Playlist Not Found")
    }

    if(playlist.user.toString() !== req.user?._id.toString()){
        throw new ApiError(400, "You are not Authorized User to Delete Playlist")
    }

    await Playlist.findByIdAndDelete(playlistId)

    return res.status(200).json(new ApiResponse(201,"Playlist Deleted Succesfully"))
})

const addVideoToPlaylist = asyncHandler(async (req,res)=>{
    const {playlistId, videoId} = req.params

    if(!isValidObjectId(playlistId)){
        throw new ApiError(400,"Invalid Playlist Id")
    }
    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid Video Id")
    }

    const playlist = await Playlist.findById(playlistId)
    const video = await Video.findById(videoId)

    if(!playlist){
        throw new ApiError(400,"Playlist Not Found")
    }

    if(!video){
        throw new ApiError(400,"Video Not Found")
    }

    if(playlist.owner.toString && video.owner.toString() !== req.user?._id.toString){
        throw new ApiError(400,"You are not authorized user to Add video to Playlist")
    }

    const updatedPlaylist = await findByIdAndUpdate(
            playlistId,
            {
                $addToSet : {
                    videos : video?._id
                },
            },
            {
                new : true
            }
    );

    if(!updatePlaylist){
        throw new ApiError(400, "Failed to Update Playlist")
    }

    return res.status(200).json(new ApiResponse(200,updatePlaylist,"Video Added to Playlist Successfully"))
})

const removeVideoFromPlaylist = asyncHandler(async (req,res)=>{
    const {playlistId,videoId} = req.params

        if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid Playlist Id");
        }
        if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Video Id");
        }

        const playlist = await Playlist.findById(playlistId);
        const video = await Video.findById(videoId);

        if (!playlist) {
        throw new ApiError(400, "Playlist Not Found");
        }

        if (!video) {
        throw new ApiError(400, "Video Not Found");
        }

        if (
        playlist.owner.toString &&
        video.owner.toString() !== req.user?._id.toString
        ) {
        throw new ApiError(
            400,
            "You are not authorized user to Add video to Playlist"
        );
        }

        const updatedPlaylist = await findByIdAndDelete(playlistId,
        {
            $pull : {
                videos : videoId
            }
        },
        { new : true}
    )

    if(!updatePlaylist){
        throw new ApiError(400, "Failed to remove video")
    }

    return res.status(200).json(new ApiResponse(200,updatePlaylist,"Video Removed Successfully"))
})

const getPlaylistById = asyncHandler(async (req,res)=>{
    const {playlistId} = req.params;

    if(!isValidObjectId(playlistId)){
        throw new ApiError(400,"Invalid Playlist Id")
    }

    const playlist = await Playlist.findById(playlistId);

    if(!playlist){
        throw new ApiError(400,"Playlist Not Found")
    }

    const getPlaylistVideos = await Playlist.aggregate([
        {
            $match : {
                _id : new mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            $lookup : {
                from : "videos",
                localField : "videos",
                foreignField : "_id",
                as : "videos"
            }
        },
        {
            $match : {
                "videos.isPublished" : true
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
            $addFields : {
                totalVideos : {
                    $size : "$videos"
                },
                totalViews : {
                    $sum : "videos.view"
                },
                owner : {
                    $first : "$owner"
                }
            }
        },
        {
            project : {
                name : 1,
                description : 1,
                createdAt : 1,
                updatedAt : 1,
                totalVideos : 1,
                totalViews : 1,
                videos : {
                    _id : 1,
                    thumbnail : 1,
                    title : 1,
                    description : 1,
                    videoFile : 1,
                    duration : 1,
                    createAt : 1,
                    views : 1,
                },
                owner : {
                    username : 1,
                    avatar : 1,
                    fullname : 1
                }
            }
        }
    ])

    if(!getPlaylistVideos){
        throw new ApiError(400, "NO Video Found")
    }

    return res.status(200).json(201, getPlaylistVideos, "Playist Fetched Successfully")
})

export {
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    getPlaylistById
}