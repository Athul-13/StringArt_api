import { Request,Response } from "express";
import { SharpServices } from "../services/sharpServices";

export class ImageController {
    constructor(private sharpService: SharpServices) {}
        
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

        } catch (error) {
            console.error("Error in uploadImage:", error);
            res.status(500).send("Internal Server Error");
        }
    }
}