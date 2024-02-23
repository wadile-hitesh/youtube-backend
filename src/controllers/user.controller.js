import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from '../utils/ApiError.js'
import {User} from '../models/user.models.js'
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import mongoose from 'mongoose'
import jwt from 'jsonwebtoken'

const generateAccessAndRefreshTokens = async(userId)=>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave : false})
        return {accessToken,refreshToken}

    } catch (error) {
        throw new ApiError(500, "Something Went Wrong While generating refreshed and access token")
    }
}

const registerUser = asyncHandler(async (req,res)=>{
    // get user details from the Frontend
    // Validation (Not Empty)
    // Check if user already exists : username and Email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create User object - create entry in db
    //remove password and refresh token field from response
    // check for user creation
    // return res


    const {fullname , email, username, password} = req.body
    // console.log(req.body);


    // if(fullname === ''){
    //     throw new ApiError(400,"FullName is Required")
    // }

    if(
        [fullname,email,username,password].some((field)=> field?.trim() === "")
    ){
        throw new ApiError(400,"All Fields are Requried")
    }

    const existedUser = await User.findOne({
        $or : [{email},{username}]
    })

    if(existedUser){
        throw new ApiError(409,"User Already Exist with email or username")
    }
    // console.log(req.files)
    const avatarLocalPath = req.files?.avatar[0]?.path
    // const coverImageLocalPath = req.files?.coverImage[0]?.path

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar File is Required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400, "Avatar File is Required")
    }

    const user = await User.create({
        fullname,
        avatar : avatar.url,
        coverImage : coverImage?.url || "",
        email,
        password,
        username : username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500,"Something Went Wrong While Registring a User")
    }

    return res.status(201).json(new ApiResponse(200,createdUser,"User Registered Successfully"))

})

const loginUser = asyncHandler( async (req,res)=>{
    // Get User Details from the frontend.
    // Validate data format.
    // Check if the use exist in the Database or not.
    // Redirect to Register if not

    const {email,username,password} = req.body
    if(!(username || email)){
        throw new ApiError(400, "Username or email is Requried")
    }

    const user = await User.findOne({
        $or : [{username},{email}]
    })

    if(!user){
        throw new ApiError(404, "User not found")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)
    if (!isPasswordValid) {
        throw new ApiError(401, "Password Incorrect")
    }

    const {accessToken,refreshToken} =  await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password,-refreshToken")

    const options = {
        httpOnly : true,
        secure : true
    }

    return res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(200,{user: loggedInUser, accessToken, refreshToken},"User Logged In Successfully")
    )

})

const logoutUser = asyncHandler(async (req,res)=>{
    User.findByIdAndUpdate(req.user._id,{
        $set : {
            refreshToken : undefined
        }
    },
        {
            new : true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(
        new ApiResponse(200,{},"User Logout Successfully")
    )

})

const refreshAccessToken = asyncHandler(async (req,res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(incomingRefreshToken){
        throw new ApiError(401,"Unauthorized Request")
    }

    try {
        const decodedToken = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id)
        if(!user){
            throw new ApiError(401,"Invalid Refresh Token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401,"Refresh Token is Expired or Used")
        }
    
        const options = {
            httpOnly : true,
            secure : true
        }
        const {accessToken,newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
        return res
        .status(200)
        .cookie("accessToken",accessToken, options)
        .cookie("refreshToken",newRefreshToken, options)
        .json(new ApiResponse(200, { accessToken, newRefreshToken },"Access Token Refreshed Successfully"))
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Refresh Token")
    }
})

export {registerUser,loginUser,logoutUser,refreshAccessToken}