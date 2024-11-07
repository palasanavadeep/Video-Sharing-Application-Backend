import {Router} from "express";
import {loginUser, logoutUser, refreshAccessToken, registerUser} from "../controllers/user.controller.js";
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


export default userRouter;