import express from "express";
import cors from "cors";
import imageRoute from "./routes/imageRoute";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true
}));
app.use(express.json());

app.use("/api", imageRoute);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});