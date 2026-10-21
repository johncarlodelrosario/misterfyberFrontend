// lib/imageCompression.ts
import imageCompression from "browser-image-compression";

export interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
  fileType?: string;
  initialQuality?: number;
}

/**
 * Compress an image file to reduce its size before uploading
 * 6MB original → ~300KB compressed
 */
export const compressImage = async (
  file: File,
  options: CompressionOptions = {},
): Promise<File> => {
  const defaultOptions: CompressionOptions = {
    maxSizeMB: 0.3, // 300KB max
    maxWidthOrHeight: 1280, // Max 1280px
    useWebWorker: true, // Non-blocking UI
    fileType: "image/jpeg", // JPEG for efficiency
    initialQuality: 0.75, // 75% quality
  };

  const finalOptions = { ...defaultOptions, ...options };

  console.log("🗜️ Compressing image:", {
    originalSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
    originalType: file.type,
    originalName: file.name,
  });

  try {
    const compressedFile = await imageCompression(file, finalOptions);

    const compressionRatio = (
      (1 - compressedFile.size / file.size) *
      100
    ).toFixed(1);

    console.log("✅ Image compressed:", {
      newSize: `${(compressedFile.size / 1024).toFixed(2)}KB`,
      saved: `${compressionRatio}%`,
      newType: compressedFile.type,
    });

    return compressedFile;
  } catch (error) {
    console.error("❌ Compression failed, using original:", error);
    return file;
  }
};

/**
 * Compress and convert image to base64 data URL
 */
export const compressImageToBase64 = async (
  file: File,
  options: CompressionOptions = {},
): Promise<string> => {
  const compressedFile = await compressImage(file, options);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      console.log(
        "📦 Base64 size:",
        `${(base64.length / 1024).toFixed(2)}KB (string length)`,
      );
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(compressedFile);
  });
};

/**
 * Validate image file before compression
 */
export const validateImageFile = (
  file: File,
  maxSizeMB: number = 10,
): { valid: boolean; error?: string } => {
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ];

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: "Please upload a valid image file (JPEG, PNG, GIF, or WebP)",
    };
  }

  if (file.size > maxSizeMB * 1024 * 1024) {
    return {
      valid: false,
      error: `File size must be less than ${maxSizeMB}MB`,
    };
  }

  return { valid: true };
};

/**
 * Get human-readable file size
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};
