// lib/cloudinary.ts
// Pure JS Cloudinary signed upload, authenticated delivery, viewing & downloading
// Compatible with Expo, React Native (Hermes), and Web without external Node.js dependencies.

import { Platform, Linking } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

// ── Credentials ──
export const getCloudinaryConfig = () => {
  const cloudName = (
    process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME! ||
    process.env.CLOUDINARY_CLOUD_NAME! ||
    ""
  ).trim();

  const apiKey = (
    process.env.EXPO_PUBLIC_CLOUDINARY_API_KEY! ||
    process.env.CLOUDINARY_API_KEY! ||
    ""
  ).trim();

  const apiSecret = (
    process.env.EXPO_PUBLIC_CLOUDINARY_API_SECRET! ||
    process.env.CLOUDINARY_API_SECRET! ||
    ""
  ).trim();

  return { cloudName, apiKey, apiSecret };
};

// ── Pure JS SHA-1 (FIPS 180-1) Implementation ──
function sha1Bytes(input: Uint8Array | string): Uint8Array {
  const bytes =
    typeof input === "string" ? new TextEncoder().encode(input) : input;
  const len = bytes.length;
  const bitLen = len * 8;
  const totalBlocks = (len + 9 + 63) >> 6;
  const words = new Uint32Array(totalBlocks * 16);

  for (let i = 0; i < len; i++) {
    words[i >> 2] |= bytes[i] << (24 - (i % 4) * 8);
  }
  words[len >> 2] |= 0x80 << (24 - (len % 4) * 8);
  words[totalBlocks * 16 - 1] = bitLen & 0xffffffff;
  words[totalBlocks * 16 - 2] = Math.floor(bitLen / 0x100000000);

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;

  const w = new Uint32Array(80);
  const rol = (n: number, s: number) => (n << s) | (n >>> (32 - s));

  for (let b = 0; b < totalBlocks; b++) {
    for (let i = 0; i < 16; i++) w[i] = words[b * 16 + i];
    for (let i = 16; i < 80; i++) {
      w[i] = rol(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
    }

    let a = h0;
    let bReg = h1;
    let c = h2;
    let d = h3;
    let e = h4;

    for (let i = 0; i < 80; i++) {
      let f: number;
      let k: number;
      if (i < 20) {
        f = (bReg & c) | (~bReg & d);
        k = 0x5a827999;
      } else if (i < 40) {
        f = bReg ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (i < 60) {
        f = (bReg & c) | (bReg & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = bReg ^ c ^ d;
        k = 0xca62c1d6;
      }

      const temp = (rol(a, 5) + f + e + k + w[i]) | 0;
      e = d;
      d = c;
      c = rol(bReg, 30);
      bReg = a;
      a = temp;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + bReg) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
  }

  const res = new Uint8Array(20);
  const outWords = [h0, h1, h2, h3, h4];
  for (let i = 0; i < 5; i++) {
    res[i * 4] = (outWords[i] >>> 24) & 0xff;
    res[i * 4 + 1] = (outWords[i] >>> 16) & 0xff;
    res[i * 4 + 2] = (outWords[i] >>> 8) & 0xff;
    res[i * 4 + 3] = outWords[i] & 0xff;
  }
  return res;
}

export function sha1Hex(str: string): string {
  const bytes = sha1Bytes(str);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Convert bytes to URL-safe base64 (for Cloudinary delivery URL signatures)
function bytesToUrlSafeBase64(bytes: Uint8Array): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let base64 = "";
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < len ? bytes[i + 1] : 0;
    const b2 = i + 2 < len ? bytes[i + 2] : 0;
    const triplet = (b0 << 16) | (b1 << 8) | b2;

    base64 += chars[(triplet >> 18) & 63];
    base64 += chars[(triplet >> 12) & 63];
    base64 += i + 1 < len ? chars[(triplet >> 6) & 63] : "=";
    base64 += i + 2 < len ? chars[triplet & 63] : "=";
  }
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// ── Types ──
export interface CloudinarySignedParams {
  uploadUrl: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  publicId: string;
  type: string; // 'authenticated'
  cloudName: string;
}

export interface CloudinaryUploadResult {
  publicId: string;
  secureUrl: string;
  url: string;
  format?: string;
  resourceType?: string;
  bytes?: number;
  key: string; // compatibility with file_path in database
}

export interface SignedDeliveryOptions {
  resourceType?: "image" | "raw" | "video" | "auto";
  type?: "authenticated" | "private";
  format?: string;
}

// ── Helper: Clean file name to safe public ID ──
function sanitizeFileName(fileName: string): string {
  return fileName
    .toLowerCase()
    .replace(/\.[^/.]+$/, "") // strip extension
    .replace(/[^a-z0-9_-]/g, "_")
    .slice(0, 80);
}

// ── 1. Generate Signed Upload Credentials ──
export function getCloudinarySignedParams(options?: {
  fileName?: string;
  folder?: string;
  type?: string;
  publicId?: string;
}): CloudinarySignedParams {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary credentials missing. Ensure EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME, EXPO_PUBLIC_CLOUDINARY_API_KEY, and EXPO_PUBLIC_CLOUDINARY_API_SECRET are set.",
    );
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = options?.folder || "medical-reports";
  const type = options?.type || "authenticated";

  const safeName = options?.fileName
    ? sanitizeFileName(options.fileName)
    : "doc";
  const publicId = options?.publicId || `${timestamp}-${safeName}`;

  // Parameters to sign in alphabetical order
  const paramsToSign: Record<string, string | number> = {
    folder,
    public_id: publicId,
    timestamp,
    type,
  };

  const sortedKeys = Object.keys(paramsToSign).sort();
  const toSign =
    sortedKeys.map((k) => `${k}=${paramsToSign[k]}`).join("&") + apiSecret;

  const signature = sha1Hex(toSign);
  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

  return {
    uploadUrl,
    apiKey,
    timestamp,
    signature,
    folder,
    publicId,
    type,
    cloudName,
  };
}

// ── 2. Direct Signed Upload to Cloudinary Private Storage ──
export async function uploadToCloudinary(
  file: { uri: string; name: string; mimeType?: string },
  options?: {
    folder?: string;
    type?: string;
    signedParams?: CloudinarySignedParams;
  },
): Promise<CloudinaryUploadResult> {
  const signed =
    options?.signedParams ||
    getCloudinarySignedParams({
      fileName: file.name,
      folder: options?.folder,
      type: options?.type,
    });

  const formData = new FormData();

  // Attach file cross-platform
  if (Platform.OS === "web") {
    const fileRes = await fetch(file.uri);
    const fileBlob = await fileRes.blob();
    formData.append("file", fileBlob, file.name);
  } else {
    formData.append("file", {
      uri: file.uri,
      name: file.name,
      type: file.mimeType || "application/octet-stream",
    } as any);
  }

  formData.append("api_key", signed.apiKey);
  formData.append("timestamp", signed.timestamp.toString());
  formData.append("signature", signed.signature);
  formData.append("folder", signed.folder);
  formData.append("public_id", signed.publicId);
  formData.append("type", signed.type);

  const res = await fetch(signed.uploadUrl, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    let errorMessage = `Cloudinary upload failed with status ${res.status}`;
    try {
      const errJson = JSON.parse(errText);
      if (errJson.error?.message) {
        errorMessage = `Cloudinary: ${errJson.error.message}`;
      }
    } catch {}
    throw new Error(errorMessage);
  }

  const data = await res.json();

  // Ensure file_path key includes format extension if known
  const fileKey =
    data.format && !data.public_id.endsWith(`.${data.format}`)
      ? `${data.public_id}.${data.format}`
      : data.public_id;

  return {
    publicId: data.public_id,
    secureUrl: data.secure_url,
    url: data.url,
    format: data.format,
    resourceType: data.resource_type,
    bytes: data.bytes,
    key: fileKey, // stored in supabase medical_reports table
  };
}

// ── 3. Generate Signed Delivery URL for Private / Authenticated Assets ──
export function getSignedDeliveryUrl(
  filePathOrPublicId: string,
  options?: SignedDeliveryOptions,
): string {
  if (!filePathOrPublicId) return "";

  // If already a full signed delivery URL, return as-is
  if (
    filePathOrPublicId.startsWith("http://") ||
    filePathOrPublicId.startsWith("https://")
  ) {
    return filePathOrPublicId;
  }

  const { cloudName, apiSecret } = getCloudinaryConfig();
  if (!cloudName || !apiSecret) {
    return filePathOrPublicId;
  }

  const type = options?.type || "authenticated";

  // Clean path and ensure proper format extension
  let targetPath = filePathOrPublicId.trim().replace(/^\/+/, "");
  if (!targetPath.includes(".")) {
    const defaultFormat = options?.format || "pdf";
    targetPath = `${targetPath}.${defaultFormat}`;
  }

  const ext = (targetPath.split(".").pop() || "").toLowerCase();
  const isRaw = ["zip", "csv", "json", "txt", "bin", "xml", "tar", "gz"].includes(ext);
  const resourceType =
    options?.resourceType || (isRaw ? "raw" : "image");

  // String to sign for delivery URL is [public_id_with_extension] + apiSecret
  const hashBytes = sha1Bytes(targetPath + apiSecret);
  const base64UrlSig = bytesToUrlSafeBase64(hashBytes).slice(0, 8);

  return `https://res.cloudinary.com/${cloudName}/${resourceType}/${type}/s--${base64UrlSig}--/${targetPath}`;
}

// ── 4. View Document (Opens in Native In-App Browser or System Viewer) ──
export async function viewCloudinaryDocument(
  filePathOrPublicId: string,
  options?: SignedDeliveryOptions,
): Promise<string> {
  const signedUrl = getSignedDeliveryUrl(filePathOrPublicId, options);
  if (!signedUrl) {
    throw new Error("Could not find a valid document path to view.");
  }

  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.open(signedUrl, "_blank");
    }
    return signedUrl;
  }

  try {
    if (WebBrowser && WebBrowser.openBrowserAsync) {
      await WebBrowser.openBrowserAsync(signedUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        toolbarColor: "#4F46E5",
        controlsColor: "#FFFFFF",
      });
      return signedUrl;
    }
  } catch (err) {
    console.warn("WebBrowser open failed, falling back to Linking:", err);
  }

  const canOpen = await Linking.canOpenURL(signedUrl);
  if (canOpen) {
    await Linking.openURL(signedUrl);
  } else {
    throw new Error("Cannot open document viewer on this device.");
  }

  return signedUrl;
}

// ── 5. Download Document (Downloads locally & invokes Native Save/Share Sheet) ──
export async function downloadCloudinaryDocument(
  filePathOrPublicId: string,
  fileName?: string,
  options?: SignedDeliveryOptions,
): Promise<{ uri?: string; url: string }> {
  const signedUrl = getSignedDeliveryUrl(filePathOrPublicId, options);
  if (!signedUrl) {
    throw new Error("Could not find a valid document path to download.");
  }

  const rawName = (filePathOrPublicId.split("/").pop() || "").split("?")[0];
  const ext = (rawName.split(".").pop() || "pdf").toLowerCase();
  const safeName =
    fileName ||
    (rawName.includes(".") ? rawName : `medical-report-${Date.now()}.${ext}`);

  if (Platform.OS === "web") {
    if (typeof document !== "undefined") {
      const a = document.createElement("a");
      a.href = signedUrl;
      a.download = safeName;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    return { url: signedUrl };
  }

  const targetDir =
    FileSystem.documentDirectory || FileSystem.cacheDirectory || "";
  const localUri = `${targetDir}${Date.now()}-${safeName}`;

  const downloadResult = await FileSystem.downloadAsync(signedUrl, localUri);

  if (await Sharing.isAvailableAsync()) {
    const mimeType =
      ext === "pdf"
        ? "application/pdf"
        : ext === "png"
        ? "image/png"
        : ext === "jpg" || ext === "jpeg"
        ? "image/jpeg"
        : "application/octet-stream";

    await Sharing.shareAsync(downloadResult.uri, {
      dialogTitle: `Save ${safeName}`,
      mimeType,
      UTI: ext === "pdf" ? "com.adobe.pdf" : "public.item",
    });
  }

  return { uri: downloadResult.uri, url: signedUrl };
}

// ── 6. Delete Document from Cloudinary Private Storage ──
export async function deleteFromCloudinary(
  filePathOrPublicId: string,
  options?: { resourceType?: "image" | "raw" | "video"; type?: string },
): Promise<boolean> {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary credentials missing");
  }

  // Clean public_id
  let targetPath = filePathOrPublicId.trim().replace(/^\/+/, "");
  if (targetPath.startsWith("http://") || targetPath.startsWith("https://")) {
    const parts = targetPath.split("/authenticated/");
    if (parts.length > 1) {
      targetPath = parts[1]
        .replace(/^s--[^/]+--\//, "")
        .replace(/^v\d+\//, "");
    }
  }

  const ext = (targetPath.split(".").pop() || "").toLowerCase();
  const isRaw = ["zip", "csv", "json", "txt", "bin", "xml", "tar", "gz"].includes(ext);
  const resourceType = options?.resourceType || (isRaw ? "raw" : "image");
  const type = options?.type || "authenticated";

  // For image resources (including PDFs), Cloudinary destroy expects public_id without extension
  const publicId =
    resourceType === "image" ? targetPath.replace(/\.[^/.]+$/, "") : targetPath;

  const timestamp = Math.floor(Date.now() / 1000);
  const params: Record<string, string | number> = {
    public_id: publicId,
    timestamp,
    type,
  };

  const sortedKeys = Object.keys(params).sort();
  const toSign =
    sortedKeys.map((k) => `${k}=${params[k]}`).join("&") + apiSecret;
  const signature = sha1Hex(toSign);

  const formData = new FormData();
  formData.append("public_id", publicId);
  formData.append("timestamp", timestamp.toString());
  formData.append("type", type);
  formData.append("api_key", apiKey);
  formData.append("signature", signature);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.warn("Cloudinary destroy response not ok:", res.status, errText);
    return false;
  }

  const data = await res.json();
  return data.result === "ok";
}

