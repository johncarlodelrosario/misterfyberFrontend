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
    maxSizeMB: 0.3, // ✅ 300KB max (mula 6MB, bababa sa ~300KB!)
    maxWidthOrHeight: 1280, // ✅ Max 1280px (magandang balance)
    useWebWorker: true, // ✅ Non-blocking UI
    fileType: "image/jpeg", // ✅ JPEG para efficient
    initialQuality: 0.75, // ✅ 75% quality (magandang balance)
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
