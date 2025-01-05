import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {uploadOnCloudinary, deleteFromCloudinary, deleteVideoFromCloudinary} from "../utils/cloudinary.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {loginUser} from "./user.controller.js";

// fetch all videos of a  channel
const getChannelVideos = asyncHandler(async(req,res) => {
    let { page="1",
        limit="10",
        sortBy = 'duration',
        sortType = 'asc',
        channelId =''
    } = req.query
    limit = parseInt(limit)
    page = parseInt(page)
    if((!channelId || !isValidObjectId(channelId))){
        throw new ApiError(401,"Invalid userId or userId must be provided!")
    }
    const videos = await Video.aggregate([
        {
            $match : {
                owner : new mongoose.Types.ObjectId(channelId) || ""
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
                createdAt : 1,
                views : 1,
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
            videos?"Videos Fetched Successfully" : "Channel Doesn't have any Videos"
        ))
})


const getAllVideos = asyncHandler(async (req, res) => {
    let { page=1,
        limit=10,
        query="",
        sortBy = 'duration',
        sortType = 'asc',
        userId =''
    } = req.query
    //TODO: get all videos based on query, sort, pagination
    limit = parseInt(limit)
    page = parseInt(page)

    if (!query){
        if (userId && !isValidObjectId(userId)){
            throw new ApiError(401,"Invalid userId or userId!");
        }
    }

    // if((!userId || !isValidObjectId(userId))){
    //     throw new ApiError(401,"Invalid userId or userId must be provided!")
    // }
    // console.log(typeof limit)
    const videos = await Video.aggregate([
        {
            $match : {
                $and : [
                    {
                        published : true,
                    },
                    {
                        $or : [
                            {
                                title : { $regex : query, $options: "i" },
                            },
                            {
                                description : { $regex : query, $options: "i" },
                            },
                            {
                                owner: userId ? new mongoose.Types.ObjectId(userId) : null,
                            },
                        ]
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
                createdAt : 1,
                views : 1,
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

    if (!req.user?._id){
        throw  new ApiError(401,"User Not Found!");
    }

    if(!videoId || !isValidObjectId(videoId)){
        throw new ApiError(402,"provide a valid videoId.");
    }

    // old
    const video = await Video.aggregate([
        {
            $match : {
                _id : new mongoose.Types.ObjectId(videoId),
            }
        },
        // {
        //     $lookup : {
        //         from : "users",
        //         localField : "owner",
        //         foreignField : "_id",
        //         as : "owner",
        //         pipeline : [
        //             {
        //                 $project : {
        //                     username : 1,
        //                     avatar : 1,
        //                     fullName : 1,
        //                 }
        //             }
        //         ]
        //     }
        // },
        // {
        //     $addFields : {
        //         owner : {
        //             $first : "$owner",
        //         }
        //     }
        // },
        {
            $lookup : {
                from : "likes",
                localField : "_id",
                foreignField : "video",
                as : "likes",
                pipeline : [
                    {
                        $project : {
                            video : 1,
                            likedBy : 1,
                        }
                    }
                ]
            }
        },
        {
            $addFields : {
                videoLikes : {
                    $size : "$likes",
                },
                isLiked : {
                    $cond : {
                        if : { $in : [req.user._id , "$likes.likedBy"]},
                        then : true,
                        else : false,
                    }
                }
            }
        },

        {
            $project : {
                videoLikes : 1,
                isLiked : 1,
                owner : 1,
                videoFile : 1,
                thumbnail : 1,
                title : 1,
                duration : 1,
                description : 1,
                views : 1,
                createdAt : 1,
                published : 1
            }
        }

    ])

    // new
    // const video = await Video.findById(videoId);

    if(!video){
        throw  new ApiError(401,"Video not found");
    }

    // if (!video.published){
    //     throw  new ApiError(401,"Publish Status is False Unable to access Video");
    // }

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

    const updatedWatchHistory = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $addToSet :{
                watchHistory : videoId,
            }
        },
        {
            new :true
        }
    );

    if (!updatedWatchHistory){
        throw  new ApiError(500,"Error in Updating Video on DB");
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

    // console.log(thumbnailLocalPath)

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
    let cloudinaryThumbnail,delResponse;
    if(thumbnailLocalPath){
        cloudinaryThumbnail = await uploadOnCloudinary(thumbnailLocalPath);
        if (!cloudinaryThumbnail?.url){
            throw  new ApiError(500,"Error in uploading Thumbnail to Cloudinary");
        }

        delResponse = await deleteFromCloudinary(videoCheck.thumbnail);
        // console.log(delResponse);

        if(!delResponse){
            throw new ApiError(500,"Error in deleting Old thumbnail from Cloudinary");
        }
    }

    title = title.trim() ? title : videoCheck.title;
    description = description.trim() ? description : videoCheck.description

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set : {
                title,
                description,
                thumbnail : thumbnailLocalPath ?  cloudinaryThumbnail.url : videoCheck.thumbnail,
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
    togglePublishStatus,
    getChannelVideos,
}