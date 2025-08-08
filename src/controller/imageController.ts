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
            const imageBuffer = req.body

            if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) {
                res.status(400).send("Invalid image data");
                return;
            }
            
            const processedImage = await this.sharpService.convertImage(imageBuffer);

            const blackAndWhiteImage = processedImage.data;
            const imageInfo = processedImage.info;

            const base64Image = blackAndWhiteImage.toString('base64');

            const stringArtResult = this.stringArtService.generate(blackAndWhiteImage, imageInfo);

            res.status(200).json({
                stringArt: stringArtResult,
                base64Image: `data:image/png;base64,${base64Image}`
            });
        } catch (error) {
            console.error("Error in uploadImage:", error);
            res.status(500).send("Internal Server Error");
        }
    }
}