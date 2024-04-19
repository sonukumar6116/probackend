import { v2 as cloudinary } from "cloudinary";

//fs is node.js library  --> no need to NPM INSTALL
import fs from "fs";

cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localfilepath) => {
      try {
            if (!localfilepath)
                  return null;

            //upload the file on clodinary
            const responce=await cloudinary.uploader.upload(localfilepath,{
                  resource_type:"auto"
            });

            //file has been uploaded successfully
            // maybe-- console.log("File is Uploaded On Cloudinary : )",responce.url);
            fs.unlinkSync(localfilepath);
            return responce;

      } catch (error) {
            fs.unlinkSync(localfilepath) //remove the localy save temporary file as the uploaded op get failed
            return null;
      }
}

export {uploadOnCloudinary};
