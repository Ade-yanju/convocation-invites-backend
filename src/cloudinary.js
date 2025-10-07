// server/src/cloudinary.js
import cloudinary from "cloudinary";
import streamifier from "streamifier";
import { config } from "./config.js";

cloudinary.v2.config({
  cloud_name: config.CLOUD_NAME,
  api_key: config.CLOUD_KEY,
  api_secret: config.CLOUD_SECRET,
});

export function uploadBufferToCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const cld_uploader = cloudinary.v2.uploader;
    const upload_stream = cld_uploader.upload_stream(
      { resource_type: "auto", ...options },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(upload_stream);
  });
}
