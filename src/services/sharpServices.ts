import sharp from "sharp";

// Configuration interface for image processing
export interface ImageProcessingConfig {
    canvasSize?: number;
    applyThreshold?: boolean;
    thresholdValue?: number;
    previewSize?: number;
    maintainAspectRatio?: boolean;
}

// A custom type to define the combined output
export interface ProcessedImageOutput {
    rawBuffer: Buffer;
    rawInfo: sharp.OutputInfo;
    base64Png: string;
    originalDimensions: {
        width: number;
        height: number;
    };
}

export class SharpServices {
    private defaultConfig: Required<ImageProcessingConfig> = {
        canvasSize: 300,
        applyThreshold: false,
        thresholdValue: 128,
        previewSize: 256,
        maintainAspectRatio: true
    };

    public async convertImageForStringArt(
        imageBuffer: Buffer, 
        config: ImageProcessingConfig = {}
    ): Promise<ProcessedImageOutput> {
        try {
            const finalConfig = { ...this.defaultConfig, ...config };
            
            // Get original image metadata
            const metadata = await sharp(imageBuffer).metadata();
            const originalDimensions = {
                width: metadata.width || 0,
                height: metadata.height || 0
            };

            // First, process the image for the string art algorithm
            // Use square dimensions and preserve grayscale for better results
            let rawPipeline = sharp(imageBuffer)
                .resize(finalConfig.canvasSize, finalConfig.canvasSize, {
                    fit: finalConfig.maintainAspectRatio ? sharp.fit.inside : sharp.fit.fill,
                    background: { r: 255, g: 255, b: 255, alpha: 1 }, // White background
                    withoutEnlargement: false
                })
                .grayscale();

            // Only apply threshold if specifically requested (not recommended for string art)
            if (finalConfig.applyThreshold) {
                rawPipeline = rawPipeline.threshold(finalConfig.thresholdValue);
            }

            const { data: rawBuffer, info: rawInfo } = await rawPipeline
                .raw()
                .toBuffer({ resolveWithObject: true });

            // Create a preview PNG for the frontend
            let previewPipeline = sharp(imageBuffer)
                .resize(finalConfig.previewSize, finalConfig.previewSize, {
                    fit: sharp.fit.inside,
                    background: { r: 255, g: 255, b: 255, alpha: 1 },
                    withoutEnlargement: true
                })
                .grayscale();

            if (finalConfig.applyThreshold) {
                previewPipeline = previewPipeline.threshold(finalConfig.thresholdValue);
            }

            const pngBuffer = await previewPipeline
                .png({
                    quality: 90,
                    compressionLevel: 6
                })
                .toBuffer();

            // Convert the PNG buffer to a Base64 string
            const base64Png = `data:image/png;base64,${pngBuffer.toString('base64')}`;
            
            return { 
                rawBuffer, 
                rawInfo, 
                base64Png,
                originalDimensions
            };

        } catch (error) {
            console.error("Error converting image for string art:", error);
            throw new Error(`Image conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // Legacy method for backward compatibility
    public async convertImage(imageBuffer: Buffer): Promise<ProcessedImageOutput> {
        return this.convertImageForStringArt(imageBuffer, {
            applyThreshold: true, // Keep original behavior
            thresholdValue: 128
        });
    }

    // Method to create RGBA buffer (needed for the string art algorithm)
    public convertGrayscaleToRGBA(grayscaleBuffer: Buffer, width: number, height: number): Buffer {
        const rgbaBuffer = Buffer.alloc(width * height * 4);
        
        for (let i = 0; i < grayscaleBuffer.length; i++) {
            const rgbaIndex = i * 4;
            const grayValue = grayscaleBuffer[i];
            
            rgbaBuffer[rgbaIndex] = grayValue;     // R
            rgbaBuffer[rgbaIndex + 1] = grayValue; // G  
            rgbaBuffer[rgbaIndex + 2] = grayValue; // B
            rgbaBuffer[rgbaIndex + 3] = 255;       // A (fully opaque)
        }
        
        return rgbaBuffer;
    }

    // Utility method to validate image buffer
    public async validateImageBuffer(imageBuffer: Buffer): Promise<boolean> {
        try {
            const metadata = await sharp(imageBuffer).metadata();
            return !!(metadata.width && metadata.height && metadata.format);
        } catch {
            return false;
        }
    }

    // Method to get image metadata without processing
    public async getImageMetadata(imageBuffer: Buffer) {
        try {
            return await sharp(imageBuffer).metadata();
        } catch (error) {
            console.error("Error getting image metadata:", error);
            throw new Error("Failed to read image metadata");
        }
    }
}