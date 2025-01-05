import mongoose, {isValidObjectId} from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {Video} from "../models/video.model.js";
import {Tweet} from "../models/tweet.model.js";

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    // let {page = 1, limit = 10} = req.query;
    //
    // page = parseInt(page);
    // limit = parseInt(limit);

    if(!videoId || !isValidObjectId(videoId)){
        throw new ApiError(401,"Invalid videoId or videoId must be provided!")
    }
    // const docs = await Comment.countDocuments({video : videoId})

    // console.log(docs)
    // let skip = (page - 1) * limit;
    // skip = (skip <= docs) ? skip : 0;

    // check ------------
    const comments  = await Comment.aggregate([
        {
            $match : {
                video : new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup : {
                from : "users",
                localField : "owner",
                foreignField : "_id",
                as : "createdBy",
                pipeline : [
                    {
                        $project : {
                            _id : 1,
                            username : 1,
                            avatar : 1,
                            fullName : 1,
                        }
                    }
                ]

            }
        },
        {
            $unwind : "$createdBy",
        },
        {
            $addFields : {
                // createdBy : {
                //     $first : "$createdBy",
                // },
                isMyComment : {
                    $cond: {
                        if: { $eq: [req.user?._id , "$createdBy._id"] },
                        then: true,
                        else: false,
                    }
                }

            }
        },
        // {
        //     $unwind : "$createdBy",
        // },
        {
            $sort : {
                createdAt : -1,
            }
        },
        {
            $project : {
                content : 1,
                createdBy : 1,
                createdAt : 1,
                isMyComment : 1,
            }
        },
        // {
        //     $skip : skip,
        // },
        // {
        //     $limit : limit
        // }
    ]);
    // console.log(req.user._id);

    if(comments.length === 0){
        return res.status(200)
            .json(new ApiResponse(
                200,
                comments,
                "Video has No Comments"
            ))
    }

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            comments,
            "Video Comments Fetched Successfully"
        ))



})

const addComment = asyncHandler(async (req, res) => {

    const {videoId} = req.params;
    const {content} = req.body;

    if(!videoId){
        throw new ApiError(401,"Please Provide a Video ID")
    }
    if(!content){
        throw new ApiError(401,"Please Provide  content");
    }

    const video = await Video.findById(videoId);

    if(!video){
        throw new ApiError(401,"Invalid Video ID");
    }

    const comment  = await Comment.create({
        owner : req.user._id.toString(),
        video : videoId,
        content,
    })

    return res
        .status(200)
        .json(new ApiResponse(
        200,
            comment,
            "Comment Created Successfully"
        ));
})

const updateComment = asyncHandler(async (req, res) => {

    const {commentId} = req.params;
    const {content} = req.body;

    if(!commentId){
        throw new ApiError(401,"Please Provide a Comment ID")
    }
    if(!content){
        throw new ApiError(401,"Please Provide content");
    }

    const comment = await Comment.findById(commentId);

    if(!comment){
        throw new ApiError(401,"Invalid Comment ID");
    }
    // console.log(comment.owner.toString() !== req.user._id.toString());

    if(comment.owner.toString() !== req.user._id.toString()){
        throw new ApiError(401,"You don't have access to Update this Comment");
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set : {
                content,
            }
        },
        {
            new : true
        }
    );

    // console.log(updatedComment)
    if(!updatedComment){
        throw new ApiError(500,"Something went wrong While Updating Comment");
    }

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            updatedComment,
            "Successfully updated comment"
        ))

})

const deleteComment = asyncHandler(async (req, res) => {

    const {commentId} = req.params;
    if(!commentId){
        throw new ApiError(401,"Please Provide a Comment ID");
    }

    const comment = await Comment.findById(commentId);
    if(!comment){
        throw new ApiError(401,"Invalid Comment ID");
    }
    if(comment.owner.toString() !== req.user._id.toString()){
        throw new ApiError(401,"You don't have access to Delete this Comment");
    }

    const response = await Comment.findByIdAndDelete(commentId);

    if(!response){
        throw new ApiError(500,"Something went wrong While deleting comment");
    }

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            response,
            "Successfully deleted comment"
        ))

})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}