import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin:'http://localhost:5173',
    credentials: true
}));
app.use(express.raw({ type: 'image/*', limit: '10mb' }));
app.use(express.json());

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});