import path from "node:path";
import dotenv from "dotenv";

// Nạp biến môi trường của CSDL test (tách biệt hoàn toàn với CSDL dev/production)
// trước khi bất kỳ module nào trong app khởi tạo PrismaClient.
dotenv.config({ path: path.resolve(__dirname, "../../.env.test"), override: true });

if (!(process.env.DATABASE_URL ?? "").includes("quanlydoan_test")) {
  throw new Error(
    "DATABASE_URL không trỏ tới CSDL test (quanlydoan_test) — dừng lại để tránh chạy test trên dữ liệu thật.",
  );
}
