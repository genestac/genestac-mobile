import { S3Client } from "@aws-sdk/client-s3";

const region =
  process.env.EXPO_PUBLIC_AWS_REGION || process.env.AWS_REGION || "ap-south-1";
const accessKeyId = (
  process.env.EXPO_PUBLIC_AWS_ACCESS_KEY_ID ||
  process.env.AWS_ACCESS_KEY_ID ||
  ""
).trim();
const secretAccessKey = (
  process.env.EXPO_PUBLIC_AWS_SECRET_ACCESS_KEY ||
  process.env.AWS_SECRET_ACCESS_KEY ||
  ""
).trim();

export const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});
