import jwt from 'jsonwebtoken';
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {asyncHandler} from "../utils/asyncHandler.js";


export const verifyJWT = asyncHandler(async(req, res, next) => {
    try{
        const accessToken = req.cookies?.accessToken || req.header('Authorization')?.replace('Bearer ', '');

        const token = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);

        if(!token){
            throw new ApiError(401, 'Unauthorized access token');
        }
        const user = await User.findById(token?._id).select('-password -refreshToken');

        if(!user){
            throw new ApiError(401, 'Unauthorized access token');
        }

        req.user = user;
        next();

    }catch(err){
        throw new ApiError(401, 'Unauthorized Access :: ' +err.message);
    }
})