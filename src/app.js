import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();

app.on("error" ,(err)=>{
    console.log('ERROR :: ',err);
    throw err
})

const allowedOrigins = [process.env.CORS_ORIGIN, "http://localhost:5173", "https://drush.vercel.app"];


app.options('*', cors()); // This allows handling of OPTIONS requests


// app.use(cors({
//     origin : [process.env.CORS_ORIGN,"http://localhost:5173"],
//     credentials : true
// }))

// CORS middleware - apply before any routes
app.use(cors({
    origin: (origin, callback) => {
        // Allow only specified origins, block others
        if (allowedOrigins.includes(origin) || !origin) { // Allow localhost during development without origin
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'), false);
        }
    },
    credentials: true, // Allow credentials (cookies, HTTP authentication)
}));

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


app.use("/api/user",userRouter);
app.use('/api/tweets',tweetRouter);
app.use("/api/comments",commentRouter);
app.use("/api/like",likeRouter);
app.use("/api/playlist",playlistRouter);
app.use("/api/subscription",subscriptionRouter);
app.use("/api/video",videoRouter);
app.use("/api/dashboard",dashboardRouter);


export {app};