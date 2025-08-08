import sharp from "sharp";

// A custom type to define the combined output
export interface ProcessedImageOutput {
    rawBuffer: Buffer;
    rawInfo: sharp.OutputInfo;
    base64Png: string;
}

export class SharpServices {
    public async convertImage(imageBuffer: Buffer): Promise<ProcessedImageOutput> {
        try {
            // First, process the image and get the raw data for the string art algorithm
            const { data: rawBuffer, info: rawInfo } = await sharp(imageBuffer)
                .grayscale()
                .threshold(128) // Convert to black and white
                .raw()
                .toBuffer({ resolveWithObject: true }); 

            // Next, create a separate pipeline to get the formatted PNG buffer for the frontend
            const pngBuffer = await sharp(imageBuffer)
                .resize(256, 256, {
                    fit: sharp.fit.inside,
                    withoutEnlargement: true
                })
                .grayscale()
                .threshold(128) // Convert to black and white   
                .png() // This formats the image as a PNG
                .toBuffer();

            // Convert the PNG buffer to a Base64 string
            const base64Png = `data:image/png;base64,${pngBuffer.toString('base64')}`;
            
            return { rawBuffer, rawInfo, base64Png };

        } catch (error) {
            console.error("Error converting image:", error);
            throw new Error("Image conversion failed");
        }
    }
}
