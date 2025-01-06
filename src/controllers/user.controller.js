import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js";
import {User} from "../models/user.model.js"
import {deleteFromCloudinary, uploadOnCloudinary} from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import mongoose, {isValidObjectId} from "mongoose";

const generateRefreshAndAccessToken = async(userId)=>{
    try{
        const user = await User.findById(userId);
        const accessToken =  user.generateAccessToken();
        const refreshToken =  user.generateRefreshToken();

        user.refreshToken = refreshToken;

        await user.save({ validateBeforeSave : false})

        return {refreshToken, accessToken};
    }catch{
        throw new ApiError(500,"ERROR in generating Refresh Token and Access Token");
    }

}

const registerUser = asyncHandler(async(req,res) => {
    // get user data
    // validate user data
    // check if user already exist : username
    // store images / get stored files which are by middleware
    // upload images
    // store data in db
    // check for user creation 
    // remove pass and refreshToken form response 
    // return response

    // get user data
    const {username , email , fullName , password} = req.body;  // files are handled in user.routes.js
    // console.log("Username : " , username ," password : " , password);
    

    // validate user data
    // check for the non-empty fields
    if([username,password,email,fullName].some((field)=> field?.trim() === "")){
        throw new ApiError(400,"All fields are Required");        
    }

    // check if user already exist : username or email
    // checks if any user with specified username or email is there
    const existedUser = await User.findOne({
        $or : [{username} , {email}]
    })
    if(existedUser){
        throw new ApiError(409,"Username or Email already exist")
    }

    // store images in local server / get stored files which are by middleware
    // const avatarLocalFilePath = req.files?.avatar[0]?.path;
    // const coverImageLocalFIlePath = req.files?.coverImage[0]?.path;
    // bugs in above code  :: not a good check , try using if
    let avatarLocalFilePath;
    if(req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0){
        avatarLocalFilePath = req.files?.avatar[0]?.path;
    }
    let coverImageLocalFIlePath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalFIlePath = req.files?.coverImage[0]?.path;
    }

    if(!avatarLocalFilePath){
        throw  new ApiError(400,"avatar is Required");
    }

    // upload images to cloud
    const avatar = await uploadOnCloudinary(avatarLocalFilePath);
    if(!avatar){
        throw  new ApiError(400,"Avatar is Not Uploaded Successfully on Cloudinary");
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalFIlePath);

    // store data in db
    const userData = await User.create({
        username : username.toLowerCase(),
        password,
        email,
        fullName,
        avatar : avatar.url,
        coverImage : coverImage?.url || ""
    })
    if(!userData){
        throw  new ApiError(500,"Something went Wrong :: Error in Uploading data to DB");
    }

    // check for user creation if YES remove pass and refreshToken form response
    const userResponse = await User.findById(userData._id)
        .select("-password -refreshToken");
    if(!userResponse){
        throw  new ApiError(500,"Something went Wrong :: Error in Uploading data to DB");
    }

    // return userResponse to the client
    res.status(200).json(
        new ApiResponse(
             201,
            userResponse,
            "User Registered Successfully"
        )
    );

})

const loginUser = asyncHandler(async (req,res) => {
    // store user details from request
    // email or username based login
    // validate if user exists
    // check password
    // if password is correct then generate refresh token and  access token
    // send tokens through cookies

    // store user details from request
    const {username='', email='', password} = req.body;

    if(!username && !email ){
        throw new ApiError(400,"Username or Email is Required");
    }
    if(!password){
        throw new ApiError(400,"Password is required");
    }
    // email or username based login
    const user = await User.findOne({
        $or : [{username} , {email}]
    })

    if(!user){
        throw  new ApiError(404,"User Not Found");
    }

    // check password
    const validation = await user.isPasswordCorrect(password);
    if(!validation){
        throw  new ApiError(401,"Wrong Password");
    }

    // if password is correct then generate refresh token and  access token
    const {refreshToken , accessToken} = await generateRefreshAndAccessToken(user._id);

    const loggedUser = await User.findById(user._id).select("-password -refreshToken");

    const  options = {
        httpOnly : true,
        secure : false,
        sameSite: 'None'
    }

    return res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json({
        user : loggedUser,
        accessToken,
        refreshToken
    });

})

const logoutUser = asyncHandler(async (req,res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset : {
                refreshToken : 1,
            }
        },
        {
            // gives it object after Update
            new : true
        }
    )
    const options = {
        httpOnly : true,
        secure : true
    }

    return res.status(200)
        .clearCookie("accessToken",options)
        .clearCookie("refreshToken",options)
        .json(new ApiResponse(
            200,
            {},
            "Logged Out Successfully",
        ))

})

// ge-Gen refresh and access tokens
const refreshAccessToken = asyncHandler(async(req,res) => {
    const clientRefreshToken = req.cookies?.refreshToken || req.body.refreshToken;

    if(!clientRefreshToken){
        throw new ApiError(401,'Unauthorized request');
    }
    try{
        const decodedClientRefreshToken = jwt.verify(clientRefreshToken,process.env.REFRESH_TOKEN_SECRET);

        const user = await User.findById(decodedClientRefreshToken?._id);

        if(!user){
            throw new ApiError(401,'Invalid refresh token');
        }

        if(user?.refreshToken !== clientRefreshToken){
            throw new ApiError(401,'Refresh token is invalid');
        }

        const {refreshToken, accessToken } = await generateRefreshAndAccessToken(user._id);

        // console.log(refreshToken , ' - ' , accessToken);

        const options = {
            httpOnly : true,
            secure : true
        }
        return res
            .status(200)
            .cookie("accessToken",accessToken,options)
            .cookie("refreshToken",refreshToken,options)
            .json( new ApiResponse(
                    200,
                    {
                        refreshToken,
                        accessToken
                    },
                    "Access Token and Refresh Token Successfully Updated"
            ))

    }catch (error){
        throw new ApiError(401,error.message || "Error in Generating refresh and access tokens");
    }

    // const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    //
    // if (!incomingRefreshToken) {
    //     throw new ApiError(401, "unauthorized request")
    // }
    //
    // try {
    //     const decodedToken = jwt.verify(
    //         incomingRefreshToken,
    //         process.env.REFRESH_TOKEN_SECRET
    //     )
    //
    //     const user = await User.findById(decodedToken?._id)
    //
    //     if (!user) {
    //         throw new ApiError(401, "Invalid refresh token")
    //     }
    //
    //     if (incomingRefreshToken !== user?.refreshToken) {
    //         throw new ApiError(401, "Refresh token is expired or used")
    //
    //     }
    //
    //     const options = {
    //         httpOnly: true,
    //         secure: true
    //     }
    //
    //     const {accessToken, newRefreshToken} = await generateRefreshAndAccessToken(user._id)
    //
    //     return res
    //         .status(200)
    //         .cookie("accessToken", accessToken, options)
    //         .cookie("refreshToken", newRefreshToken, options)
    //         .json(
    //             new ApiResponse(
    //                 200,
    //                 {accessToken, refreshToken: newRefreshToken},
    //                 "Access token refreshed"
    //             )
    //         )
    // } catch (error) {
    //     throw new ApiError(401, error?.message || "Invalid refresh token")
    // }

})

const changePassword = asyncHandler(async(req,res) => {
    const { oldPassword, newPassword } = req.body;

    if(!(oldPassword || newPassword)){
        throw new ApiError(401,'Password is Required..!');
    }

    const user = await User.findById(req.user?._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if(!isPasswordCorrect){
        throw new ApiError(401,'Invalid password');
    }

    user.password = newPassword;
    await user.save({validateBeforeSave:false});

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            {},
            "Password Updated Successfully",
        ))
})

// verifyJWT (middleware) injects user into request object
const getCurrentUser = asyncHandler(async(req,res) => {
    if(!req.user){
        throw new ApiError(401,'Unauthorized access token');
    }
    return res
        .status(200)
        .json(new ApiResponse(
            200,
            req.user,
            "Current User fetched Successfully"
        ))
})

const updateAccountDetails = asyncHandler(async(req,res) => {
    const {fullName , email } = req.body;

    if(!fullName || !email ){
        throw new ApiError(401,'Please Provide fullName or email');
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                fullName,
                email
            }
        },
        {
            new : true
        }
    ).select('-password -refreshToken');

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            user,
            "Account Details Updated Successfully",
        ))
})

const updateUserAvatar = asyncHandler(async(req,res) => {

    const avatarLocalPath = req.file?.path;
    console.log(avatarLocalPath);

    if(!avatarLocalPath){
        throw new ApiError(401,'Please Provide avatar');
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    const userResponse = await User.findById(req.user?._id)

    if(!userResponse){
        throw new ApiError(401,"User Not Found")
    }
    const delOldAvatar = await deleteFromCloudinary(userResponse.avatar);
    // console.log(delOldAvatar);

    if(!avatar){
        throw new ApiError(500,'Error in uploading avatar on Cloudinary');
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                avatar : avatar?.url
            }
        },
        {
            new : true
        }
    ).select('-password')

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            user,
            "Avatar Updated Successfully",
        ))
})

const updateUserCoverImage = asyncHandler(async(req,res) => {
    const coverImageLocalPath = req.file?.path;

    if(!coverImageLocalPath){
        throw new ApiError(401,'Please Provide coverImage');
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!coverImage){
        throw new ApiError(500,'Error in uploading coverImage on Cloudinary');
    }

    const userResponse = await User.findById(req.user?._id)

    if(!userResponse){
        throw new ApiError(401,"User Not Found")
    }
    // doesn't return empty obj if File not found
    const delOldCoverImage = await deleteFromCloudinary(userResponse.coverImage);


    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                coverImage : coverImage?.url
            }
        },
        {
            new : true
        }
    ).select('-password');

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            user,
            "coverImage Updated Successfully",
        ))

})

const getUserChannelProfile = asyncHandler(async(req,res) => {
    const {userId} = req.params;

    if(!userId.trim() && !isValidObjectId(userId)){
        throw new ApiError(401,'Please Provide Valid userId ');
    }

    const channel = await User.aggregate([
        {
            $match:{
                _id : new mongoose.Types.ObjectId(userId),
            }
        },
        {
            $lookup : {
                from : "subscriptions",
                localField : "_id",
                foreignField : "subscriber",
                as : "subscribedTo"
            }
        },
        {
            $lookup : {
                from : "subscriptions",
                localField : "_id",
                foreignField : "channel",
                as : "subscribers"
            }
        },
        {
            $addFields : {
                subscribersCount : {
                    $size : "$subscribers"
                },
                subscribedToCount : {
                    $size : "$subscribedTo"
                },
                isSubscribed : {
                    $cond : {
                        if : {$in : [req.user?._id,"$subscribers.subscriber"]},
                        then : true,
                        else : false
                    }
                }
            }
        },
        {
            $project : {
                fullName : 1,
                username : 1,
                email : 1,
                isSubscribed : 1,
                subscribersCount : 1,
                subscribedToCount : 1,
                avatar : 1,
                coverImage : 1,
            }
        }
    ]);

    // console.log(channel);

    if(!channel?.length){
        throw new ApiError(401,'Please Provide valid channel');
    }

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            channel[0],
            "Successfully fetched User Channel Profile"
        ))

})

const getUserWatchHistory =  asyncHandler(async (req,res) => {

    let {
        page = 1,
        limit = 10,

    } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);


    // console.log(page + " "+ limit);
    const user = await  User.aggregate([
        {
            $match : {
                _id : new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup : {
                from : "videos",
                localField : "watchHistory",
                foreignField : "_id",
                as : "watchHistory",
                pipeline : [
                    {
                        $lookup : {
                            from : "users",
                            localField : "owner",
                            foreignField : "_id",
                            as : "owner",
                            pipeline : [
                                {
                                    $project : {
                                        avatar : 1,
                                        username : 1,
                                        fullName : 1,
                                        email : 1
                                    }
                                }
                            ]
                        }
                    },
                    // add first element of array
                    {
                        $addFields : {
                            owner : {
                                $first : "$owner"
                            }
                        }
                    },
                    {
                        $skip : (page - 1) * limit,
                    },
                    {
                        $limit : limit,
                    }
                ]
            }
        },


    ]);


    // console.log(user)

    if(!user?.length){
        throw new ApiError("Unable to fetch user Watch History !")
    }

    return res
    .status(200)
    .json(new ApiResponse(200,user[0].watchHistory,"User Watch History Fetched Successfully."));

})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changePassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getUserWatchHistory
}
