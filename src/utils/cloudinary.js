import {v2 as cloudinary} from "cloudinary";
import fs from "fs"

cloudinary.config({
    cloud_name : process.env.CLOUDINARY_CLOUD_NAME,
    api_key : process.env.CLOUDINARY_API_KEY,
    api_secret : process.env.CLOUDINARY_API_SECRET
})

const uploadOnCloudinary = async(localPath) => {
    try {
        if(!localPath) return null;

        const response = await cloudinary.uploader.upload(localPath,{
            resource_type : "auto"
        })

        console.log("File uploaded Successfully");
        // console.log(response);
        fs.unlinkSync(localPath);
        return response;
        
    } catch (error) {
        console.log("Error in Uploading File to Cloudinary..!");
        fs.unlinkSync(localPath)
        return null;        
    }

}

const deleteFromCloudinary = async(cloudinaryFilePath) => {

    if(!cloudinaryFilePath){
        return null;
    }
    try{
        // select filename without url // file public id
        let fileName = cloudinaryFilePath.split("/").pop().split('.')[0];

        return  await cloudinary.uploader.destroy(fileName);

    }catch(error){
        console.log("Error in deleteFromCloudinary");
        return null;
    }
}

export {uploadOnCloudinary , deleteFromCloudinary}