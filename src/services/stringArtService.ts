import { SharpServices, ProcessedImageOutput } from './sharpServices';

interface Nail {
    x: number;
    y: number;
}

export interface StringArtConfig {
    nailCount?: number;
    maxLines?: number;
    canvasSize?: number;
    margin?: number;
    brightnessFactor?: number;
    contrastSteps?: number;
    applyThreshold?: boolean;
}

export interface StringArtOutput {
    lines: number[];
    nails: Nail[];
    originalImage?: string; // Base64 PNG for frontend preview
    metadata: {
        totalLines: number;
        nailCount: number;
        canvasSize: number;
        originalDimensions: {
            width: number;
            height: number;
        };
    };
}

export class StringArtService {
    private config: Required<Omit<StringArtConfig, 'applyThreshold'>> & { applyThreshold?: boolean };
    private sharpService: SharpServices;
    
    constructor(config: StringArtConfig = {}) {
        this.config = {
            nailCount: config.nailCount || 240,
            maxLines: config.maxLines || 4000,
            canvasSize: config.canvasSize || 300,
            margin: config.margin || 10,
            brightnessFactor: config.brightnessFactor || 10,
            contrastSteps: config.contrastSteps || 100,
            applyThreshold: config.applyThreshold || false
        };
        this.sharpService = new SharpServices();
    }

    private generateNails(): Nail[] {
        const nails: Nail[] = [];
        const radius = this.config.canvasSize / 2 - this.config.margin;
        const centerX = this.config.canvasSize / 2;
        const centerY = this.config.canvasSize / 2;

        for (let i = 0; i < this.config.nailCount; i++) {
            const angle = (2 * Math.PI / this.config.nailCount) * i;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            nails.push({ 
                x: Math.floor(x), 
                y: Math.floor(y) 
            });
        }

        return nails;
    }

    private evaluateContrast(
        nail1Index: number, 
        nail2Index: number, 
        nails: Nail[], 
        imageData: Buffer, 
        width: number
    ): number {
        let totalContrast = 0;
        const nail1 = nails[nail1Index];
        const nail2 = nails[nail2Index];

        for (let i = 0; i < this.config.contrastSteps; i++) {
            const t = i / this.config.contrastSteps;
            const x = Math.floor(nail1.x + (nail2.x - nail1.x) * t);
            const y = Math.floor(nail1.y + (nail2.y - nail1.y) * t);

            if (x >= 0 && x < this.config.canvasSize && y >= 0 && y < this.config.canvasSize) {
                const pixelIndex = (y * width + x) * 4; // RGBA format
                const brightness = imageData[pixelIndex]; // Red channel (grayscale)
                totalContrast += (255 - brightness);
            }
        }

        return totalContrast / this.config.contrastSteps;
    }

    private updateImageData(
        nail1Index: number, 
        nail2Index: number, 
        nails: Nail[], 
        imageData: Buffer, 
        width: number
    ): void {
        const nail1 = nails[nail1Index];
        const nail2 = nails[nail2Index];

        for (let i = 0; i < this.config.contrastSteps; i++) {
            const t = i / this.config.contrastSteps;
            const x = Math.floor(nail1.x + (nail2.x - nail1.x) * t);
            const y = Math.floor(nail1.y + (nail2.y - nail1.y) * t);
            const pixelIndex = (y * width + x) * 4;

            if (pixelIndex >= 0 && pixelIndex < imageData.length - 3) {
                // Update RGB channels (assuming grayscale)
                for (let channel = 0; channel < 3; channel++) {
                    const currentValue = imageData[pixelIndex + channel];
                    if (currentValue < 255 - this.config.brightnessFactor) {
                        imageData[pixelIndex + channel] = Math.min(255, 
                            currentValue + this.config.brightnessFactor
                        );
                    }
                }
            }
        }
    }

    private findNextNailIndex(
        currentIndex: number, 
        nails: Nail[], 
        imageData: Buffer, 
        width: number
    ): number | null {
        let nextIndex: number | null = null;
        let highestContrast = -1;

        for (let i = 0; i < nails.length; i++) {
            if (i !== currentIndex) {
                const contrast = this.evaluateContrast(currentIndex, i, nails, imageData, width);
                if (contrast > highestContrast) {
                    highestContrast = contrast;
                    nextIndex = i;
                }
            }
        }

        if (nextIndex === null) {
            // Fallback to random selection
            do {
                nextIndex = Math.floor(Math.random() * this.config.nailCount);
            } while (nextIndex === currentIndex);
            console.log("Using random next index as fallback");
        }

        return nextIndex;
    }

    public async generateFromBuffer(imageBuffer: Buffer): Promise<StringArtOutput> {
        try {
            // Validate the image buffer first
            const isValid = await this.sharpService.validateImageBuffer(imageBuffer);
            if (!isValid) {
                throw new Error('Invalid image buffer provided');
            }

            // Process the image using SharpServices
            const processedImage: ProcessedImageOutput = await this.sharpService.convertImageForStringArt(
                imageBuffer,
                {
                    canvasSize: this.config.canvasSize,
                    applyThreshold: this.config.applyThreshold,
                    previewSize: 400 // Larger preview for better quality
                }
            );

            // Convert grayscale to RGBA for algorithm processing
            const rgbaData = this.sharpService.convertGrayscaleToRGBA(
                processedImage.rawBuffer,
                processedImage.rawInfo.width,
                processedImage.rawInfo.height
            );

            // Generate nails
            const nails = this.generateNails();

            // Initialize with random starting nail
            const startingIndex = Math.floor(Math.random() * this.config.nailCount);
            const lineIndex: number[] = [startingIndex];

            // Generate string art path
            let currentNailIndex = startingIndex;
            console.log('Starting string art generation...');
            
            for (let i = 1; i < this.config.maxLines; i++) {
                const nextNailIndex = this.findNextNailIndex(
                    currentNailIndex, 
                    nails, 
                    rgbaData, 
                    processedImage.rawInfo.width
                );

                if (nextNailIndex === null) {
                    console.log("No valid nail found. Stopping at line", i);
                    break;
                }

                lineIndex.push(nextNailIndex);
                this.updateImageData(
                    currentNailIndex, 
                    nextNailIndex, 
                    nails, 
                    rgbaData, 
                    processedImage.rawInfo.width
                );
                currentNailIndex = nextNailIndex;

                // Log progress every 1000 lines
                if (i % 1000 === 0) {
                    console.log(`Generated ${i} lines (${((i/this.config.maxLines)*100).toFixed(1)}%)`);
                }
            }

            console.log(`String art generation complete. Total lines: ${lineIndex.length}`);

            return {
                lines: lineIndex,
                nails,
                originalImage: processedImage.base64Png,
                metadata: {
                    totalLines: lineIndex.length,
                    nailCount: this.config.nailCount,
                    canvasSize: this.config.canvasSize,
                    originalDimensions: processedImage.originalDimensions
                }
            };

        } catch (error) {
            console.error('Error in string art generation:', error);
            throw new Error(`String art generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // Method to generate string art from already processed image data
    public async generateFromProcessedData(
        processedImage: ProcessedImageOutput
    ): Promise<StringArtOutput> {
        try {
            // Convert grayscale to RGBA for algorithm processing
            const rgbaData = this.sharpService.convertGrayscaleToRGBA(
                processedImage.rawBuffer,
                processedImage.rawInfo.width,
                processedImage.rawInfo.height
            );

            // Generate nails
            const nails = this.generateNails();

            // Initialize with random starting nail
            const startingIndex = Math.floor(Math.random() * this.config.nailCount);
            const lineIndex: number[] = [startingIndex];

            // Generate string art path
            let currentNailIndex = startingIndex;
            console.log('Starting string art generation...');
            
            for (let i = 1; i < this.config.maxLines; i++) {
                const nextNailIndex = this.findNextNailIndex(
                    currentNailIndex, 
                    nails, 
                    rgbaData, 
                    processedImage.rawInfo.width
                );

                if (nextNailIndex === null) {
                    console.log("No valid nail found. Stopping at line", i);
                    break;
                }

                lineIndex.push(nextNailIndex);
                this.updateImageData(
                    currentNailIndex, 
                    nextNailIndex, 
                    nails, 
                    rgbaData, 
                    processedImage.rawInfo.width
                );
                currentNailIndex = nextNailIndex;

                // Log progress every 1000 lines
                if (i % 1000 === 0) {
                    console.log(`Generated ${i} lines (${((i/this.config.maxLines)*100).toFixed(1)}%)`);
                }
            }

            console.log(`String art generation complete. Total lines: ${lineIndex.length}`);

            return {
                lines: lineIndex,
                nails,
                originalImage: processedImage.base64Png,
                metadata: {
                    totalLines: lineIndex.length,
                    nailCount: this.config.nailCount,
                    canvasSize: this.config.canvasSize,
                    originalDimensions: processedImage.originalDimensions
                }
            };

        } catch (error) {
            console.error('Error in string art generation:', error);
            throw new Error(`String art generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // Legacy method for file path input
    public async generate(inputImagePath: string): Promise<StringArtOutput> {
        const fs = await import('fs');
        const imageBuffer = fs.readFileSync(inputImagePath);
        return this.generateFromBuffer(imageBuffer);
    }
}