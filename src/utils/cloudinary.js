import {v2 as cloudinary } from "cloudinary"
import fs from "fs"

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath)=>{
    try {
        if(!localFilePath) return null
        // upload file
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type : "auto"
        })

        // print the response
        // console.log("File is Uploaded on Cloudinary", response); 
        fs.unlinkSync(localFilePath)
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath)  // remove the locally saved temporary file as the upload operation got failed
        return null;
    }
}

const deleteOnCloudinary = async (public_id, resource_type = "image")=>{
    try {
        if(!localFilePath){
            return null
        }

        const response = await cloudinary.uploader.destroy(public_id, {
            resource_type : `${resource_type}`
        })
    } catch (error) {
        return error
        console.log("Delete on Cloudinary")
    }
}

export {uploadOnCloudinary,deleteOnCloudinary};