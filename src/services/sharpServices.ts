import sharp from "sharp";

export class SharpServices {
    public async convertImage(imageBuffer: Buffer): Promise<{data:Buffer; info: sharp.OutputInfo}> {
        try {
            const processedImage = await sharp(imageBuffer)
                .grayscale()
                .threshold(128)
                .raw()
                .toBuffer({resolveWithObject: true});
            
            return processedImage
        } catch (error) {
            console.error("Error converting image:", error);
            throw new Error("Image conversion failed");
        }
    }
}