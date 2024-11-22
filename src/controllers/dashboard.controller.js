import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.

    const userId = new mongoose.Types.ObjectId(req?.user._id);

    const videoStats = await Video.aggregate([
        {
            $match : {
                owner : userId
            }
        },
        {
            $group : {
                _id : "$videoFile",
                totalVideos : {
                    $sum : 1
                },
                totalViews : {
                    $sum : "$views"
                }
            }
        },
        {
            $project : {
                // videoFiles : 1,
                totalVideos : 1,
                totalViews : 1,
            }
        }
    ])

    const subsStats = await Subscription.aggregate([
        {
            $match : {
                channel : userId
            },
        },
        {
            $group : {
                _id : null,
                totalSubscribers : {
                    $sum : 1
                }
            }
        },
        {
            $project : {
                totalSubscribers : 1
            }
        }
    ])

    const likeStats = await Like.aggregate([
        {
            $lookup : {
                from : "videos",
                localField : "video",
                foreignField : "_id",
                as : "videos"
            }
        },
        {
            $lookup : {
                from :  "tweets",
                localField: "tweet",
                foreignField : "_id",
                as : "tweets"
            }
        },
        {
            $lookup : {
                from: "comments",
                localField: "comment",
                foreignField : "_id",
                as : "comments"
            }
        },
        {
            $addFields : {
                videos : {
                    $first : "$videos"
                },
                tweets : {
                    $first : "$tweets",
                },
                comments : {
                    $first : "$comments",
                }
            }
        },
        {
            $match : {
                $or : [
                    { "videos.owner" : userId},
                    { "tweets.owner" : userId},
                    { "comments.owner" : userId},
                ]
            }
        },
        // check --------
        {
            $group : {
                _id : null,
                totalLikes : {
                    $sum : 1
                }
            }
        },
        {
            $project : {
                totalLikes : 1
            }
        }
    ]);

    const channelStats = {
        channel : req?.user._id,
        totalLikes : likeStats[0]?.totalLikes || "",
        totalSubscribers : subsStats[0]?.totalSubscribers || "",
        totalViews : videoStats[0]?.totalViews || "",
        totalVideos : videoStats[0]?.totalVideos || '',

    }

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            channelStats,
            "Channels Stats Fetched Successfully"
        ))


})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel

    const channelVideos = await Video.aggregate([
        {
            $match : {
                owner : new mongoose.Types.ObjectId(req?.user?._id),
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
                            avatar : 1,
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
                views : 1,
                published : 1,
            }
        }
    ]);

    if(!channelVideos){
        return res
            .status(200)
            .json(new ApiResponse(
                200,
                channelVideos,
                "No Videos Uploaded BY the Channel"
            ))
    }

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            channelVideos,
            "Channel Videos Fetched Successfully"
        ))
})

export {
    getChannelStats,
    getChannelVideos
}