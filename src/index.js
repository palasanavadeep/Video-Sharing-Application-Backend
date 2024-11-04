import connectDB from "./db/index.js";
import {app} from "./app.js";

connectDB()
.then(()=>{
    let port = process.env.PORT || 8000;
    app.listen(port , ()=>{
        console.log(`Server is Listening on PORT :: ${port}`);
    })
})
.catch((err)=> console.log(`MongoDB Error in Connecting to DB :: ${err}`))