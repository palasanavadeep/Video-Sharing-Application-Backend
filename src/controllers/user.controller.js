import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js";
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js";

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

export {registerUser}
