import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {

    const {content} = req.body;

    if(!content){
        throw new ApiError(401,"Tweet content can't be Empty");
    }

    const user = req.user._id;

    const tweetResponse = await Tweet.create({
        content,
        owner : user
    });

    if(!tweetResponse){
        throw new ApiError(401,'Error in creating tweet');
    }

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            tweetResponse,
            "Tweet Creatd Successfully"
        ))

})

const getUserTweets = asyncHandler(async (req, res) => {
    const {userId} = req.params
    
    if(!isValidObjectId(userId)){
        throw new ApiError(400,"Please Provide a valid User ID");
    }

    const tweets = await Tweet.findById({owner : userId});

    if(!tweets){
        throw new ApiError(401,"User doesn't have tweets");
    }

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            tweets,
            "Tweet Fetched Successfully"
        ))
})

const updateTweet = asyncHandler(async (req, res) => {
    const {tweetId} = req.params;
    const {content} = req.body;

    if(!content){
        throw new ApiError(401,"Tweet content can't be Empty");
    }

    const tweet = await Tweet.findById(tweetId);
    if(!tweet){
        throw new ApiError(401,"Invalid Tweet ID");
    }

    if(!tweet?.owner === req.user._id){
        throw new ApiError(401,"You don't have access to Update this Tweet");
    }

    // const updatedTweet = await Tweet.findByIdAndUpdate(
    //     tweetId,
    //     {
    //         $set : {
    //             content
    //         }
    //     },
    //     {
    //         new : true
    //     }
    // );

    tweet.content = content;
    await tweet.save({validateBeforeSave : false});

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            {content},
            "Successfully updated tweet"
        ))

})

const deleteTweet = asyncHandler(async (req, res) => {

    const {tweetId} = req.params;

    if(!isValidObjectId(tweetId)){
        throw new ApiError(401,"Tweet ID is not a valid ID");
    }

    const tweet = await Tweet.findById(tweetId);

    if(!tweet){
        throw new ApiError(401,"Invalid Tweet ID");
    }

    if(tweet.owner !== req.user._id){
        throw new ApiError(401,"You don't have access to Delete this Tweet");
    }

    const response = await Tweet.findByIdAndDelete(tweetId);

    if(!response){
        throw new ApiError(500,"Something went wrong While deleting tweet");
    }

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            {response},
            "Successfully deleted tweet"
        ))
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}