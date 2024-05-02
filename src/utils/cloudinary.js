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
            const responce = await cloudinary.uploader.upload(localfilepath, {
                  resource_type: "auto"
            });

            /* responce: {
           public_id: 'sample_video',
           version: 1312461204,
           signature: 'abcdefgc024acceb1c1baa1f8d4a3e5e8b9ee7c2',
           width: 1280,
           height: 720,
           format: 'mp4',
           resource_type: 'video',
           duration: 63.27,
           created_at: '2011-08-04T20:55:32Z',
           bytes: 120253456,
           type: 'upload',
           etag: 'd3ca7b74e838e74f3f34cd',
           url: 'http://res.cloudinary.com/demo/video/upload/v1312461204/sample_video.mp4',
           secure_url: 'https://res.cloudinary.com/demo/video/upload/v1312461204/sample_video.mp4',
           ...
                 } */

            // maybe--> console.log("File is Uploaded On Cloudinary : )",responce.url);

            fs.unlinkSync(localfilepath); // delete file from public/temp
            return responce;

      } catch (error) {
            fs.unlinkSync(localfilepath) //remove the localy save temporary file as the uploaded op get failed
            return null;
      }
}

const deleteOnCloudinary = async (public_id, resource_type = "image") => {
      try {
            if (!public_id) return null;
            const result = await cloudinary.uploader.destroy(public_id, {
                  resource_type: `${resource_type}`
            });
      } catch (error) {
            return null;
      }
};

export { uploadOnCloudinary, deleteOnCloudinary };
