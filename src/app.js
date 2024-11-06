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


app.use("/user",userRouter);

export {app};