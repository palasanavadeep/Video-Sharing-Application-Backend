import {Router} from "express";
import {loginUser, logoutUser, refreshAccessToken, 
    registerUser,changePassword,getCurrentUser,updateAccountDetails,
    updateUserAvatar, updateUserCoverImage,getUserChannelProfile,
    getUserWatchHistory
} from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js";
import {verifyJWT} from "../middlewares/auth.middleware.js";

const userRouter = Router();

userRouter.route("/register").post(
    // middleware 
    upload.fields([
        {
            name : "avatar",
            maxCount : 1
        },
        {
            name : "coverImage",
            maxCount : 1
        }
    ]),
    // controller
    registerUser
);

userRouter.route('/login').post(loginUser);


// secured
userRouter.route('/logout').post( verifyJWT , logoutUser);

userRouter.route("/refresh-tokens").post(refreshAccessToken);

userRouter.route('/change-password').post(verifyJWT,changePassword);

userRouter.route('/current-user').get(verifyJWT,getCurrentUser);

userRouter.route('/update-profile').patch(verifyJWT,updateAccountDetails);

userRouter.route('/update-avatar').patch(
    verifyJWT,upload.single("avatar"),updateUserAvatar);

userRouter.route('/update-coverImage').patch(
    verifyJWT,upload.single("coverImage"),updateUserCoverImage);

userRouter.route('/c/:username').get(verifyJWT,getUserChannelProfile);

userRouter.route('/watch-history').get(verifyJWT,getUserWatchHistory);


export default userRouter;