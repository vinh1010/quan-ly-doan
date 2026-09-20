import "dotenv/config";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "./prisma";
import authRoutes from "./routes/auth";
import { secretaryRoutes, unitRoutes } from "./routes/secretaries";
import { accountRoutes, auditLogRoutes, reportRoutes } from "./routes/system";

if (!process.env.JWT_SECRET) {
  throw new Error("Thiếu JWT_SECRET trong server/.env");
}

const app = express();
app.set("trust proxy", 1); // chạy sau proxy của host (Render, Railway...) để lấy đúng IP
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// Kiểm tra kết nối DB và bảng đã migrate chưa. Chỉ trả mã lỗi Prisma, không lộ chi tiết kết nối.
app.get("/api/health/db", async (_req, res) => {
  try {
    const users = await prisma.user.count();
    res.json({ db: "ok", users });
  } catch (e) {
    console.error("Kiểm tra DB lỗi:", e);
    const code = (e as { code?: string }).code ?? (e as Error).name;
    res.status(503).json({ db: "error", code });
  }
});
app.use("/api/auth", authRoutes);
app.use("/api/secretaries", secretaryRoutes);
app.use("/api/units", unitRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/audit-logs", auditLogRoutes);
app.use("/api/reports", reportRoutes);

// Khi deploy: server phục vụ luôn bản build của client (một host duy nhất, không lo CORS)
const clientDist = path.resolve(__dirname, "../../client/dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(clientDist, "index.html")));
}

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ message: "Lỗi máy chủ" });
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`API chạy tại http://localhost:${port}`));
