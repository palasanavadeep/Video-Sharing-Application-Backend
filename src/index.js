import connectDB from "./db/index.js";
import {app} from "./app.js";

// start the server after connecting to db
connectDB()
.then(()=>{
    let port = process.env.PORT || 8000;
    app.listen(port , ()=>{
        console.log(`Server is Listening on PORT :: ${port}`);
    })
})
.catch((err)=> console.log(`MongoDB Error in Connecting to DB :: ${err}`))