/**
 * Image Processing Utilities
 * Handles image optimization, cropping, and format conversion
 */

import sharp from 'sharp';

export interface ImageProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
  cropTo1x1?: boolean;
}

/**
 * Process and optimize an image
 * - Crop to 1:1 ratio (square)
 * - Convert to WebP format for better compression
 * - Resize if needed
 * - Optimize quality
 */
export async function processImage(
  buffer: Buffer,
  options: ImageProcessingOptions = {}
): Promise<{ buffer: Buffer; metadata: sharp.Metadata }> {
  const {
    maxWidth = 1024,
    maxHeight = 1024,
    quality = 85,
    format = 'webp',
    cropTo1x1 = false,
  } = options;

  let image = sharp(buffer);

  // Get original metadata
  const metadata = await image.metadata();

  // Crop to 1:1 ratio (square) if requested
  if (cropTo1x1 && metadata.width && metadata.height) {
    const size = Math.min(metadata.width, metadata.height);

    // Calculate center crop coordinates
    const left = Math.floor((metadata.width - size) / 2);
    const top = Math.floor((metadata.height - size) / 2);

    image = image.extract({
      left,
      top,
      width: size,
      height: size,
    });
  }

  // Resize if image is larger than max dimensions
  image = image.resize({
    width: maxWidth,
    height: maxHeight,
    fit: 'inside',
    withoutEnlargement: true,
  });

  // Convert to desired format with optimization
  switch (format) {
    case 'webp':
      image = image.webp({ quality, effort: 4 });
      break;
    case 'jpeg':
      image = image.jpeg({ quality, mozjpeg: true });
      break;
    case 'png':
      image = image.png({ quality, compressionLevel: 9 });
      break;
  }

  const processedBuffer = await image.toBuffer();

  return {
    buffer: processedBuffer,
    metadata: await sharp(processedBuffer).metadata(),
  };
}

/**
 * Process profile photo
 * - Crop to 1:1 square ratio
 * - Resize to 512x512 (optimal for profile photos)
 * - Convert to WebP
 */
export async function processProfilePhoto(buffer: Buffer): Promise<{
  buffer: Buffer;
  metadata: sharp.Metadata;
}> {
  return processImage(buffer, {
    maxWidth: 512,
    maxHeight: 512,
    quality: 90,
    format: 'webp',
    cropTo1x1: true,
  });
}

/**
 * Process document image
 * - Maintain aspect ratio
 * - Resize to max 1920x1920
 * - Convert to WebP
 */
export async function processDocumentImage(buffer: Buffer): Promise<{
  buffer: Buffer;
  metadata: sharp.Metadata;
}> {
  return processImage(buffer, {
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 85,
    format: 'webp',
    cropTo1x1: false,
  });
}

/**
 * Get image info without processing
 */
export async function getImageInfo(buffer: Buffer): Promise<sharp.Metadata> {
  return sharp(buffer).metadata();
}

/**
 * Validate if buffer is a valid image
 */
export async function isValidImage(buffer: Buffer): Promise<boolean> {
  try {
    const metadata = await sharp(buffer).metadata();
    return !!(metadata.width && metadata.height && metadata.format);
  } catch (error) {
    return false;
  }
}

/**
 * Calculate file size reduction percentage
 */
export function calculateSizeReduction(originalSize: number, newSize: number): number {
  return Math.round(((originalSize - newSize) / originalSize) * 100);
}
