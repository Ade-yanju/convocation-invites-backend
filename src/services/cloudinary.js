import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export function uploadPdfBuffer(buf, { publicId, folder = "invites" } = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      resource_type: "raw", // PDFs and arbitrary files
      folder,
      public_id: publicId, // you may include ".pdf" in the id
      overwrite: true,
      tags: ["invite", "pdf"],
    };
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result); // result.secure_url, result.public_id, etc.
    });
    stream.end(buf);
  });
}
