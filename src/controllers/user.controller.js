import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from '../utils/ApiError.js'
import {User} from '../models/user.models.js'
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"

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

export {registerUser}