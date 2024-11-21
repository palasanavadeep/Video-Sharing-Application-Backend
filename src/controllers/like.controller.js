import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {Comment} from "../models/comment.model.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    //TODO: toggle like on video

    if(!videoId || !isValidObjectId(videoId)){
        throw new Error("Invalid videoId.!")
    }

    const checkIfLiked = await Like.findOne({
        $and : [{video : videoId,likedBy : req?.user?._id}],
    });

    if(checkIfLiked){
        const undoLike = await Like.findByIdAndDelete(checkIfLiked._id);

        if(!undoLike){
            throw new ApiError(500,"Something went wrong while trying to unlike.!")
        }

        return res.status(200).json(new ApiResponse(
            200,
            undoLike,
            "Unliked Successfully"
        ))
    }

    const like = await Like.create({
        video : videoId,
        likedBy : req?.user?._id
    });

    if(!like){
        throw new ApiError(500,"Something went wrong while trying to like.!")
    }

    return  res
        .status(200)
        .json(new ApiResponse(
            200,
            like,
            "Liked Successfully"
        ))
});


const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params

    if(!commentId || !isValidObjectId(commentId)){
        throw new Error("Invalid commentId.!");
    }

    const ifLiked = await Like.findOne({
        $and : [{comment : commentId,likedBy: req?.user?._id}]
    });
    if(!ifLiked){
        const like = await Like.create({
            comment : commentId,
            likedBy: req?.user?._id
        });

        if(!like){
            throw new ApiError(500,"Error in Creating Like to Comment.!")
        }

        return res
            .status(200)
            .json(new ApiResponse(
                200,
                like,
                "Liked Successfully"
            ))
    }
    // check-------
    // if(ifLiked.likedBy !== req.user?._id){
    //     throw new ApiError(401,"You don't have access to Toggle this Comment");
    // }

    const unLike = await Like.findByIdAndDelete(ifLiked._id);

    if(!unLike){
        throw new ApiError(500,"Something went wrong while trying to unlike Comment.!")
    }

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            unLike,
            "Unliked Comment Successfully"
        ))

})

const toggleTweetLike = asyncHandler(async (req, res) => {
        const {tweetId} = req.params

        if(!tweetId || !isValidObjectId(tweetId)){
            throw new Error("Invalid TweetID .!");
        }

        const ifLiked = await Like.findOne({
            $and : [{comment : tweetId,likedBy: req?.user?._id}]
        });
        if(!ifLiked){
            const like = await Like.create({
                comment : tweetId,
                likedBy: req?.user?._id
            });

            if(!like){
                throw new ApiError(500,"Error in Creating Like to Tweet.!")
            }

            return res
                .status(200)
                .json(new ApiResponse(
                    200,
                    like,
                    "Tweet Liked  Successfully"
                ))
        }
        // check-------
        // if(ifLiked.likedBy !== req.user?._id){
        //     throw new ApiError(401,"You don't have access to Toggle this Comment");
        // }

        const unLike = await Like.findByIdAndDelete(ifLiked._id);

        if(!unLike){
            throw new ApiError(500,"Something went wrong while trying to unlike Tweet.!")
        }

        return res
            .status(200)
            .json(new ApiResponse(
                200,
                unLike,
                "Unliked Tweet Successfully"
            ))

    }
)

const getLikedVideos = asyncHandler(async (req, res) => {

    if(!req.user?._id){
        throw new ApiError(401,"Unauthorized request.!");
    }

    const likedVideos = await Like.aggregate([
        {
            $match : {
                likedBy: new mongoose.Types.ObjectId(req.user?._id)
                // check -------
            }
        },
        {
            $lookup : {
                from : "users",
                localField : "likedBy",
                foreignField : "_id",
                as : "owner",
                pipeline : [
                    {
                        $project : {
                            username : 1,
                            avatar : 1,
                            fullName : 1
                        }
                    }
                ]
            }
        },
        {
            $lookup : {
                from: "videos",
                localField: "video",
                foreignField : "_id",
                as : "likedVideos",
                pipeline: [
                    {
                        $lookup : {
                            from : "users",
                            localField : "owner",
                            foreignField : "_id",
                            as : "videoOwner",
                            pipeline : [
                                {
                                    $project : {
                                        username : 1,
                                        avatar : 1,
                                        fullName : 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields : {
                            videoOwner : {
                                $first : "$videoOwner",
                            }
                        }
                    },
                    {
                        $project: {
                            videoOwner : 1,
                            videoFile : 1,
                            thumbnail : 1,
                            title : 1,
                            duration : 1,

                        }
                    }
                ]
            }
        },
        {
            $addFields : {
                likedVideos : {
                    $first : "$likedVideos",
                },
                owner : {
                    $first : "$owner",
                }
            }
        },
        {
            $project : {
                owner : 1,
                likedVideos : 1,
            }
        }
    ]);

    if(!likedVideos){
        return res
            .status(200)
            .json(new ApiResponse(
                200,
                {},
                "Not Liked Any Video"
            ))
    }

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            likedVideos,
            "Liked Videos Fetched Successfully"
        ))

})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}