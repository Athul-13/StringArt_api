import { Router } from "express";
import multer from "multer";
import { ImageController } from "../controller/imageController";
import { SharpServices } from "../services/sharpServices";
import { StringArtService } from "../services/stringArtService";

const imageController = new ImageController(
    new SharpServices(),
    new StringArtService()
);

const router = Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/transform",upload.single("image") , async (req, res) => imageController.uploadImage(req, res));

export default router;