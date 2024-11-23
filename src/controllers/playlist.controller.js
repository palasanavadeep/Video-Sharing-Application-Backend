import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {Video} from "../models/video.model.js";


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body

    if(!(name || description)){
        throw new ApiError(401,"Name or description can't be empty")
    }

    const checkIfPlaylistExist = await Playlist.findOne({
        $and : [{name},{owner : req.user._id}]
    })

    if(checkIfPlaylistExist){
        throw new ApiError(401,"PlayList Already Exist");
    }

    const playlist = await Playlist.create({
        name,
        description,
        owner : req.user._id
    });

    if(!playlist){
        throw new ApiError(501,"Error in creating playlist");
    }

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            playlist,
            "PlayList created Successfully"
        ))
})
// check-----------------------
const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    if(!userId){
        throw new ApiError(401,"Please Provide Valid username");
    }

    const playlists = await Playlist.aggregate([
        {
            $match : {
                owner : new mongoose.Types.ObjectId(userId),
            }
        },

        // lookup for videos in playlist
        {
            $lookup : {
                from : "videos",
                localField : "videos",
                foreignField : "_id",
                as : "videos",
                pipeline : [
                    // lookup for video owner
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
                    // pipeline for add owner field
                    {
                        $addFields : {
                            owner : {
                                $first : "$videoOwner"
                            }
                        }
                    },
                    // pipeline for  project of video owner
                    {
                        $project : {
                            title : 1,
                            owner : 1,
                            thumbnail : 1,
                            duration : 1,
                        }
                    }
                ]
            }
        },

        // lookup for  playlist Owner
        {
            $lookup : {
                from : "users",
                localField : "owner",
                foreignField : "_id",
                as : "playListOwner",
                pipeline : [
                    {
                        $project: {
                            username : 1,
                            fullName : 1,
                            avatar : 1
                        }
                    }
                ]
            }
        },

        // adding fields to final res
        {
            $addFields : {
                playListOwner : {
                    $first : "$playListOwner"
                }
            }
        },

        // final projection
        {
            $project : {
                playListOwner : 1,
                videos : 1,
                name : 1,
                description : 1,
            }
        }

    ]);

    // if(playlists.length === 0 ){
    //     throw new ApiError(401,"Error in Fetching playlists");
    // }

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            playlists,
            playlists.length ===0 ? "No playlist Found"
                :"User Playlists Fetched Successfully"
        ))

})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params

    if(!playlistId || !isValidObjectId(playlistId)){
        throw new ApiError("Invalid or Empty Playlist ID")
    }
    const checkIfExist = await Playlist.findById(playlistId);
    if(!checkIfExist){
        throw new ApiError(401,"Playlist not found")
    }

    const playlist = await Playlist.aggregate([
        {
            $match : {
                _id : new mongoose.Types.ObjectId(playlistId),
            }
        },
        {
            $lookup : {
                from : "videos",
                localField : "videos",
                foreignField : "_id",
                as : "videos",
                pipeline : [
                    // pipeline for  project of video owner
                    {
                        $project : {
                            title : 1,
                            description : 1,
                            owner : 1,
                            thumbnail : 1,
                            videoFile : 1,
                            duration : 1,
                        }
                    }
                ]
            }
        },
        {
            $lookup : {
                from : "users",
                localField: "owner",
                foreignField : "_id",
                as : "playlistOwner",
                pipeline : [{
                    $project: {
                        username : 1,
                        fullName : 1,
                        avatar : 1,
                    }
                }]
            }
        },
        // opt
        {
            $addFields : {
                videos : {
                    $first : "$videos"
                },
                playlistOwner : {
                    $first : "$playListOwner"
                }
            }
        },
        {
            $project : {
                videos : 1,
                playlistOwner : 1,
                title : 1,
                description : 1,
                createdAt : 1,
                updatedAt: 1,
            }
        }
    ]);

    if(!playlist){
        throw new ApiError(401,"Error in Fetching Playlists");
    }

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            playlist,
            "PlayList Fetched Successfully.!"
        ))
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {

    const {playlistId, videoId} = req.params

    if(!playlistId || !isValidObjectId(playlistId)){
        throw new ApiError("Invalid or Empty Playlist ID");
    }
    if(!videoId || !isValidObjectId(videoId)){
        throw new ApiError(401,"Invalid or Empty Video ID");
    }

    const playlist = await Playlist.findById(playlistId);
    if(!playlist){
        throw new ApiError(401,"Playlist not found");
    }

    if(!(playlist.owner).equals(req.user._id)){
        throw new ApiError(401,"You are Not Owner of Playlist.! Can't edit Playlist");
    }

    // console.log(!(playlist.owner).equals(req.user._id))
    // console.log(typeof playlist.owner)
    // console.log(typeof req.user._id)
    // console.log(playlist.owner.toString() === req.user._id.toString());

    const checkIfVideoAlreadyExistInPlaylist = playlist.videos
        .filter((video) => video.toString() === videoId)

    // console.log(typeof Object.entries(playlist.videos) + "  values are "+  playlist.videos);

    if(checkIfVideoAlreadyExistInPlaylist.length > 0){
        throw new ApiError(401,"Video already exists in Playlist");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set : {
                videos : [videoId],
            }
        },
        {
            new : true
        }
    );

    if(!updatedPlaylist){
        throw new ApiError(500,"Error in adding Video to Playlist");
    }

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            updatedPlaylist,
            "Successfully Video Added to Playlist"
        ))
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // TODO: remove video from playlist
    if(!videoId || !isValidObjectId(videoId)){
        throw new ApiError(401,"Invalid or Empty Video ID");
    }
    if(!playlistId || !isValidObjectId(playlistId)){
        throw new ApiError("Invalid or Empty Playlist ID");
    }

    const playlist = await Playlist.findById(playlistId);
    if(!playlist){
        throw new ApiError(401,"Playlist not found");
    }

    if(playlist.owner.toString() !== req.user._id.toString()){
        throw new ApiError(401,"You are Not Owner of Playlist.! Can't Delete Playlist");
    }

    const checkIfVideoExistInPlaylist = playlist.videos
        .filter((video) => video.toString() !== videoId)

    if(checkIfVideoExistInPlaylist.length === playlist.videos.length){
        throw new ApiError(401,"Video doesn't exists in Playlist");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set : {
                videos : checkIfVideoExistInPlaylist,
            }
        },
        {
            new : true
        }
    );

    if(!updatedPlaylist){
        throw new ApiError(500,"Error in Deleting Video to Playlist");
    }

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            updatedPlaylist,
            "Successfully Deleted from Playlist"
        ))

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params

    if(!playlistId || !isValidObjectId(playlistId)){
        throw new ApiError(401,"Invalid or Empty Playlist ID")
    }

    const check = await Playlist.findById(playlistId);
    if(!check){
        throw new ApiError(401,"Playlist not found")
    }

    if(check.owner.toString() !== req.user._id.toString()){
        throw new ApiError(401,"You don't have access to Delete this Playlist");
    }

    const playlist = await Playlist.findByIdAndDelete(check)
    if(!playlist){
        throw new ApiError(500 ,"Error in Deleting  playlist");
    }

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            playlist,
            "Playlist Deleted Successfully"
        ))

})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body

    if(!playlistId || !isValidObjectId(playlistId)){
        throw new ApiError(401,"Invalid or Empty Playlist ID")
    }

    if(!(name.trim() || description.trim())){
        throw new ApiError(401,"Please Provide Data to Update (Name / Description)");
    }
    const playlist = await Playlist.findById(playlistId);

    if(playlist.owner.toString() !== req.user._id.toString()){
        throw new ApiError(401,"You are not Authorized to Update this Playlist")
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set : {
                name: name.trim(),
                description: description.trim(),
            }
        },
        {
            new: true
        }
    );

    if(!updatedPlaylist){
        throw  new ApiError(500,"Error in Updating Playlist");
    }

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            updatePlaylist,
            "Playlist Updated Successfully"
        ))
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}