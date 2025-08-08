import { Router } from "express";
import { ImageController } from "../controller/imageController";
import { SharpServices } from "../services/sharpServices";
import { StringArtService } from "../services/stringArtService";

const imageController = new ImageController(
    new SharpServices(),
    new StringArtService()
);

const router = Router();

router.post("/transform", async (req, res) => imageController.uploadImage(req, res));

export default router;