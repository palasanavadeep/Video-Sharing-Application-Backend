import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription

    if(!channelId || !isValidObjectId(channelId)){
        throw new ApiError(401,"Invalid channelId.!")
    }

    const isSubscribed = await Subscription.findOne({
        $and : [{channel : channelId},{subscriber : req.user._id}]
    })

    if(!isSubscribed){
        const newSubscribe = await Subscription.create({
            channel : channelId,
            subscriber : req.user._id,
        });

        if(!newSubscribe){
            throw new ApiError(500,"Error in creating Subscription");
        }

        return res
            .status(200)
            .json(new ApiResponse(
                200,
                newSubscribe,
                "Subscribed successfully"
            ))

    }

    const unSubscribe = await  Subscription.findByIdAndDelete(isSubscribed._id);

    if(!unSubscribe){
        throw new ApiError(500,"Error in deleting Subscription document");
    }

    return  res
        .status(200)
        .json(new ApiResponse(
            200,
            unSubscribe,
            "Unsubscribed successfully"
        ))

})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {subscriberId} = req.params

    if(!subscriberId || !isValidObjectId(subscriberId)){
        throw new ApiError(401,"Invalid subscriberId.!")
    }

    const subscribers = await Subscription.aggregate([
        {
            $match : {
                channel : new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup: {
                from : "users",
                localField : "subscriber",
                foreignField : "_id",
                as : "subscriberList",
                pipeline : [
                    {
                        $project : {
                            username : 1,
                            avatar : 1,
                        }
                    }
                ]
            }
        },
        {
            $addFields : {
                subscribers : {
                    $first : "$subscribers",
                }
            }
        },
        {
            $project : {
                subscribers : 1,
                createdAt : 1
            }
        }
    ])

    if(!subscribers){
        throw new ApiError(500,"Error in fetching Subscribers List");
    }

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            subscribers,
            "Subscriber List Fetched Successfully"
        ))

})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { channelId } = req.params

    if(!channelId || !isValidObjectId(channelId)){
        throw new ApiError(401,"Invalid subscriberId.!");
    }

    const subscribedChannels = await Subscription.aggregate([
        {
            $match : {
                subscriber : new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup : {
                from : "users",
                localField : "channel",
                foreignField : "_id",
                as : "channels",
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
                channels : {
                    $first : "$channels",
                }
            }
        },
        {
            $project : {
                channels : 1,
                createdAt : 1
            }
        }
    ]);

    if(!subscribedChannels){
        throw new ApiError(500,"Error in fetching Subscribed Channels List");
    }

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            subscribedChannels,
            subscribedChannels?"No channels Subscribed ":"Subscribed Channels fetched Successfully"
        ))
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}