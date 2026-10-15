import { randomUUID } from "crypto";
import express from "express";
import multer from "multer";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { UserType } from "@nancy-motorcycle-spares/shared";
import { config } from "../config";
import { authenticate, authorize } from "../middleware/auth";
import { AppError, asyncHandler } from "../middleware/errorHandler";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 5;

const imageTypes = {
  "image/jpeg": { extension: "jpg" },
  "image/png": { extension: "png" },
  "image/webp": { extension: "webp" },
  "image/gif": { extension: "gif" }
} as const;

type ImageMimeType = keyof typeof imageTypes;

const isImageMimeType = (mimeType: string): mimeType is ImageMimeType =>
  Object.prototype.hasOwnProperty.call(imageTypes, mimeType);

const hasValidImageSignature = (file: Express.Multer.File) => {
  if (!isImageMimeType(file.mimetype)) return false;

  if (file.mimetype === "image/webp") {
    return file.buffer.toString("ascii", 0, 4) === "RIFF" &&
      file.buffer.toString("ascii", 8, 12) === "WEBP";
  }

  if (file.mimetype === "image/gif") {
    const signature = file.buffer.toString("ascii", 0, 6);
    return signature === "GIF87a" || signature === "GIF89a";
  }

  if (file.mimetype === "image/jpeg") {
    return file.buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  }

  return file.buffer.subarray(0, 8)
    .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
};

const createS3Client = () => {
  if (!config.awsS3Bucket || !config.awsAccessKeyId || !config.awsSecretAccessKey || !config.awsPublicBaseUrl) {
    throw new AppError("Image storage is not configured. Contact the site administrator.", 503);
  }

  return new S3Client({
    region: config.awsRegion,
    ...(config.awsEndpoint ? { endpoint: config.awsEndpoint, forcePathStyle: true } : {}),
    credentials: {
      accessKeyId: config.awsAccessKeyId,
      secretAccessKey: config.awsSecretAccessKey
    }
  });
};

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES
  },
  fileFilter: (_req, file, callback) => {
    if (!isImageMimeType(file.mimetype)) {
      callback(new AppError("Only JPEG, PNG, WebP, and GIF images are supported.", 400));
      return;
    }

    callback(null, true);
  }
});

router.post(
  "/images",
  authenticate,
  authorize(UserType.ADMIN),
  (req, res, next) => {
    upload.array("images", MAX_FILES)(req, res, (error: unknown) => {
      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          return next(new AppError("Each image must be 5 MB or smaller.", 400));
        }
        if (error.code === "LIMIT_FILE_COUNT") {
          return next(new AppError(`Upload no more than ${MAX_FILES} images at a time.`, 400));
        }
        return next(new AppError("Could not process image upload.", 400));
      }

      next(error);
    });
  },
  asyncHandler(async (req, res) => {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files?.length) {
      throw new AppError("Select at least one image to upload.", 400);
    }

    const invalidFile = files.find((file) => !hasValidImageSignature(file));
    if (invalidFile) {
      throw new AppError("One or more files are not valid images.", 400);
    }

    const client = createS3Client();
    const publicBaseUrl = config.awsPublicBaseUrl?.replace(/\/+$/, "");
    if (!publicBaseUrl) {
      throw new AppError("Image storage is not configured. Contact the site administrator.", 503);
    }
    const uploadedImages: string[] = [];

    for (const file of files) {
      const mimeType = file.mimetype as ImageMimeType;
      const key = `products/${randomUUID()}.${imageTypes[mimeType].extension}`;

      await client.send(new PutObjectCommand({
        Bucket: config.awsS3Bucket,
        Key: key,
        Body: file.buffer,
        ContentLength: file.size,
        ContentType: mimeType,
        CacheControl: "public, max-age=31536000, immutable"
      }));

      const encodedKey = key.split("/").map(encodeURIComponent).join("/");
      uploadedImages.push(`${publicBaseUrl}/${encodedKey}`);
    }

    res.status(201).json({
      success: true,
      data: { images: uploadedImages }
    });
  })
);

export default router;
