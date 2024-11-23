import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {uploadOnCloudinary, deleteFromCloudinary, deleteVideoFromCloudinary} from "../utils/cloudinary.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {loginUser} from "./user.controller.js";


const getAllVideos = asyncHandler(async (req, res) => {
    let { page=1,
        limit=10,
        query="",
        sortBy,
        sortType,
        userId } = req.query
    //TODO: get all videos based on query, sort, pagination
    limit = parseInt(limit)
    page = parseInt(page)
    // console.log(typeof limit)
    const videos = await Video.aggregate([
        {
            $match : {
               $or : [
                   {
                       title : { $regex : query, $options: "i" },
                   },
                   {
                       description : { $regex : query, $options: "i" },
                   },
                   // check -----
                   {
                       owner : userId || "",
                   }
               ]
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
                        $project : {
                            username : 1,
                            fullName : 1,
                            avatar : 1
                        }
                    }
                ]
            }
        },
        // {
        //     $addFields : {
        //         owner : {
        //             $first : "$owner",
        //         }
        //     }
        // },
        {
            $unwind : "$owner"
        },
        {
            $project : {
                videoFile : 1,
                thumbnail : 1,
                owner : 1,
                title : 1,
                duration : 1,
                description : 1,
            }
        },
        {
            $sort : {
                [sortBy] : sortType === "asc" ? 1 : -1
            }
        },
        {
            $skip : (page - 1) * limit,
        },

        {
            $limit : limit
        }
    ]);


    return res.status(200)
        .json(new ApiResponse(
            200,
            videos,
            videos?"Videos Fetched Successfully" : "No Videos Found Based on Query"
        ))

})

const publishAVideo = asyncHandler(async (req, res) => {

    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video

    if(!title || !description){
        throw new Error("Tile and Description Are Required.!")
    }

    let videoLocalPath,thumbnailLocalPath;

    if(req.files && Array.isArray(req.files.videoFile) && req.files.videoFile.length ){
        videoLocalPath = req.files.videoFile[0]?.path;
    }

    if(req.files && Array.isArray(req.files.thumbnail) && req.files.thumbnail.length > 0){
        thumbnailLocalPath = req.files.thumbnail[0]?.path;
    }

    if(!thumbnailLocalPath){
        throw  new ApiError(400,"Thumbnail is Required");
    }
    if (!videoLocalPath){
        throw  new ApiError(400,"Video File is Required");
    }

    const cloudinaryVideo = await uploadOnCloudinary(videoLocalPath);
    if (!cloudinaryVideo?.url){
        throw  new ApiError(500,"Error in Uploading VideoFile to Cloudinary");
    }
    const cloudinaryThumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    if (!cloudinaryThumbnail?.url){
        throw  new ApiError(400,"Error in Uploading Thumbnail to Cloudinary");
    }

    const video = await Video.create({
        videoFile : cloudinaryVideo.url || "",
        thumbnail : cloudinaryThumbnail.url || "",
        title : title.trim(),
        description : description.trim(),
        duration : cloudinaryVideo.duration,
        owner : req.user._id,
    });

    if(!video){
        throw  new ApiError(500,"Error in Creating Video on DB");
    }

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            video,
            "Video Published Successfully"
        ))
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id

    if(!videoId || !isValidObjectId(videoId)){
        throw new ApiError(402,"provide a valid videoId.");
    }

    await Video.findByIdAndUpdate(
        videoId,
        {
           $inc : {
               views : 1
           }
        },
        {
            new :true
        }
    )

    const video = await Video.aggregate([
        {
            $match : {
                _id : new mongoose.Types.ObjectId(videoId),
            }
        },
        {
            $lookup : {
                from : "users",
                localField : "videoFile",
                foreignField : "_id",
                as : "owner",
                pipeline : [
                    {
                        $project : {
                            username : 1,
                            avatar : 1,
                            fullName : 1,
                        }
                    }
                ]
            }
        },
        {
            $addFields : {
                owner : {
                    $first : "$owner",
                }
            }
        },
        {
            $project : {
                owner : 1,
                videoFile : 1,
                thumbnail : 1,
                title : 1,
                duration : 1,
                description : 1,
                views : 1,
                createdAt : 1,
            }
        }

    ])
    if(!video){
        throw  new ApiError(401,"Video not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            video,
            "Video Fetched Successfully"
        ))
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail

    let {title , description } = req.body;

    const thumbnailLocalPath = req.file?.path;

    if(!thumbnailLocalPath && !title.trim() && !description.trim()){
        throw new ApiError(400,"All fields can't be Empty p" +
            "lease provide any field to update ");
    }

    const videoCheck = await Video.findById(videoId);

    if(!videoCheck){
        throw  new ApiError(401,"Video not found Please provide a valid videoId.");
    }

    if(videoCheck.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(401,"You are not Authorized to Update this Video");
    }

    const cloudinaryThumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    if (!cloudinaryThumbnail?.url){
        throw  new ApiError(500,"Error in uploading Thumbnail to Cloudinary");
    }

    const delResponse = await deleteFromCloudinary(videoCheck.thumbnail);
    console.log(delResponse)
    if(!delResponse){
        throw new ApiError(500,"Error in deleting Old thumbnail from Cloudinary");
    }

    title = title.trim() ? title : videoCheck.title;
    description = description.trim() ? description : videoCheck.description

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set : {
                title,
                description,
                thumbnail : cloudinaryThumbnail.url
            }
        },
        {
            new : true
        }
    );

    return res.status(200)
        .json(new ApiResponse(
            200,
            updatedVideo,
            "Video Details Updated Successfully"
        ))

})

// delete fom cloudinary--------
const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!videoId || !isValidObjectId(videoId)){
        throw new ApiError(401,"Invalid Video ID");
    }

    const video = await Video.findById(videoId);

    if(!video){
        throw new ApiError(400,"Video Not Found")
    }

    if(video.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(401,"You are not Authorized to Delete this Video");
    }

    const delOldVideoThumbnail = await deleteFromCloudinary(video.thumbnail);
    // console.log(delOldVideoThumbnail)
    if(!delOldVideoThumbnail){
        throw new ApiError(500,"Error in deleting Old Thumbnail");
    }
    const delOldVideoFile = await deleteVideoFromCloudinary(video.videoFile);
    if (!delOldVideoFile){
        throw new ApiError(500,"Error in deleting Old Video File");
    }

    const delResponse = await Video.findByIdAndDelete(videoId);

    if(!delResponse){
        throw new ApiError(500,"Error while Deleting this Video");
    }



    return res.status(200)
        .json(new ApiResponse(
            200,
            delResponse,
            "Video Deleted Successfully"
        ))
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!videoId || !isValidObjectId(videoId)){
        throw new ApiError(401,"Invalid Video ID");
    }

    const video = await Video.findById(videoId)

    if(!video)
    {
        throw new ApiError(401,"Video Not Found.!");
    }

    if(video.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(401,"You are not Authorized to Toggle" +
            " the Video Status");
    }

    const pubStatus = video.published;

    const toggleStatus = await Video.findByIdAndUpdate(
        videoId,
        {
            $set : {
                published : !pubStatus
            }
        },
        {
            new : true
        }
    )

    if(!toggleStatus){
        throw new ApiError(500,"Error in toggle the Publish Status")
    }

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            toggleStatus,
            "Publish Status Toggled Successfully"
        ))
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}