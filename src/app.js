import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();

app.on("error" ,(err)=>{
    console.log('ERROR :: ',err);
    throw err
})

app.use(cors({
    origin : process.env.CORS_ORIGN,
    credentials : true
}))

// config app about input data type 
app.use(express.json({limit : "16kb"}));
app.use(express.urlencoded({limit : "16kb" , extended : true}));
app.use(express.static("public"));
app.use(cookieParser());

// routes
import userRouter from "./routes/user.routes.js";
import tweetRouter from './routes/tweet.routes.js';
import commentRouter from './routes/comment.routes.js';
import likeRouter from './routes/like.routes.js';
import playlistRouter from './routes/playlist.routes.js';
import subscriptionRouter from './routes/subscription.routes.js';
import videoRouter from './routes/video.routes.js';
import dashboardRouter from "./routes/dashboard.routes.js";


app.use("/user",userRouter);
app.use('/tweets',tweetRouter);
app.use("/comments",commentRouter);
app.use("/like",likeRouter);
app.use("/playlist",playlistRouter);
app.use("/subscription",subscriptionRouter);
app.use("/video",videoRouter);
app.use("/dashboard",dashboardRouter);


export {app};