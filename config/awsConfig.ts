import { S3Client } from '@aws-sdk/client-s3';
require('dotenv').config();

export const s3Config = {
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    }
};

export const s3Client = new S3Client(s3Config);
export const s3BaseUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.amazonaws.com/`;