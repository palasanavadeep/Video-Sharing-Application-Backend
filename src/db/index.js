import mongoose from 'mongoose';
import { DB_NAME } from '../constants.js';

const connectDB = async()=>{
    try{
        const ConnectionRes = await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`);
        console.log(`\nMongoDB Connection Sucessful HOST : ${ConnectionRes.connection.host}`);
        
    }catch (err){
        console.log('MongoDB Connection Failed :: ' , err);
        process.exit(1);
    }
}

export default connectDB;