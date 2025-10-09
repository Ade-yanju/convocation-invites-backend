// server/src/cloudinary.js
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";

const {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  CLOUDINARY_FOLDER,
} = process.env;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.warn(
    "Cloudinary not configured: missing env variables. uploadBufferToCloudinary will fail."
  );
}

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * uploadBufferToCloudinary(buffer, { folder, filename })
 * returns { publicUrl, secure_url, rawResult }
 */
export default function uploadBufferToCloudinary(
  buffer,
  {
    folder = CLOUDINARY_FOLDER || "invites",
    filename = `invite-${Date.now()}`,
  } = {}
) {
  return new Promise((resolve, reject) => {
    if (
      !CLOUDINARY_API_KEY ||
      !CLOUDINARY_API_SECRET ||
      !CLOUDINARY_CLOUD_NAME
    ) {
      return reject(new Error("Cloudinary not configured (missing keys)"));
    }

    const publicId = `${folder}/${filename.replace(/\.(pdf|PDF)$/, "")}`;

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw", // store pdf as raw so it's downloadable
        public_id: publicId,
        folder,
        use_filename: true,
        unique_filename: false,
        overwrite: true,
      },
      (error, result) => {
        if (error) return reject(error);
        return resolve({
          publicUrl: result?.secure_url || result?.url,
          secure_url: result?.secure_url,
          rawResult: result,
        });
      }
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}
