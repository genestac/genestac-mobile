// lib/upload-url.ts
// Cloudinary Private Vault Signed Upload & URL generator for React Native / Expo

import {
  getCloudinarySignedParams,
  uploadToCloudinary,
  getSignedDeliveryUrl,
  viewCloudinaryDocument,
  downloadCloudinaryDocument,
  deleteFromCloudinary,
  CloudinarySignedParams,
  CloudinaryUploadResult,
  SignedDeliveryOptions,
} from "./cloudinary";

export interface PresignedUrlResult {
  uploadUrl: string;
  key: string;
  signature: string;
  timestamp: number;
  apiKey: string;
  folder: string;
  publicId: string;
  type: string;
}

/**
 * Generates Cloudinary signed upload parameters using API Key, API Secret, and Cloud Name.
 * Files are stored with delivery type 'authenticated' for private access.
 */
export async function getPresignedUploadUrl(
  fileName: string,
  _fileType?: string,
): Promise<PresignedUrlResult> {
  const signed = getCloudinarySignedParams({ fileName });
  return {
    uploadUrl: signed.uploadUrl,
    key: `${signed.folder}/${signed.publicId}`,
    signature: signed.signature,
    timestamp: signed.timestamp,
    apiKey: signed.apiKey,
    folder: signed.folder,
    publicId: signed.publicId,
    type: signed.type,
  };
}

export {
  getCloudinarySignedParams,
  uploadToCloudinary,
  getSignedDeliveryUrl,
  viewCloudinaryDocument,
  downloadCloudinaryDocument,
  deleteFromCloudinary,
  CloudinarySignedParams,
  CloudinaryUploadResult,
  SignedDeliveryOptions,
};
