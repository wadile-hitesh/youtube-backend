import { Router } from "express";
import { deleteVideo, getAllVideos, getVideoById, publishVideo, updateVideo } from "../controllers/video.controller.js";
import {upload} from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT);

router.route("/")
    .get(getAllVideos)
    .post(
        upload.fields([
            {
                name : "video",
                maxCount : 1
            },
            {
                name : "thumbnail",
                maxCount : 1
            }
        ]), 
        publishVideo);


router.route("/:videoId")
        .get(getVideoById)
        .post(deleteVideo)
        .patch(upload.single('thumbnail'),updateVideo)
export default router