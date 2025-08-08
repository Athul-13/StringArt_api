import { Request,Response } from "express";
import { SharpServices } from "../services/sharpServices";
import { StringArtService } from "../services/stringArtService";

export class ImageController {
    constructor(
        private sharpService: SharpServices,
        private stringArtService: StringArtService
    ) {}
        
    public async uploadImage(req: Request, res: Response): Promise<void> {
        try {
            const imageBuffer = req.file?.buffer;

            if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) {
                res.status(400).send("Invalid image data");
                return;
            }
            
            const processedImage = await this.sharpService.convertImage(imageBuffer);

            const base64Image = processedImage.base64Png;
            const rawBuffer = processedImage.rawBuffer;
            const rawInfo = processedImage.rawInfo;

            const stringArtResult = this.stringArtService.generate(rawBuffer, rawInfo);

            res.status(200).json({
                stringArt: stringArtResult,
                base64Image: base64Image
            });
        } catch (error) {
            console.error("Error in uploadImage:", error);
            res.status(500).send("Internal Server Error");
        }
    }
}