import mongoose, {Schema} from "mongoose";

const commentSchema = new mongoose.Schema({
    video : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "Video"
    },
    owner : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "User",
    },
    content : {
        type : string,
        required : true
    }
},{timestamps : true});