import type { Request, Response } from "express";
import { z } from "zod";
import { generateText, GeminiApiError, GeminiConfigError } from "../lib/gemini";

/**
 * AI hỗ trợ soạn thảo (Generative AI) — giảm tải biên soạn tài liệu cho Bí thư/Phó Bí thư Đoàn xã:
 * 1) draftDocument: gợi ý khung nội dung/dự thảo Kế hoạch, Chương trình, Báo cáo tổng kết...
 * 2) draftSocialPost: chuyển 1 văn bản (Kế hoạch/Báo cáo) thành bài viết ngắn gọn để đăng Fanpage.
 * Không lưu vào CSDL — chỉ trả nội dung để người dùng xem/sửa/copy, không ghi nhật ký hoạt động.
 */

async function handleGeminiCall(res: Response, prompt: string) {
  try {
    const text = await generateText(prompt);
    res.json({ text });
  } catch (e) {
    if (e instanceof GeminiConfigError) return res.status(503).json({ message: e.message });
    if (e instanceof GeminiApiError) return res.status(502).json({ message: e.message });
    throw e;
  }
}

const draftSchema = z.object({
  docType: z.string({ required_error: "Vui lòng chọn loại văn bản" }).trim().min(1).max(100),
  title: z.string({ required_error: "Vui lòng nhập tiêu đề" }).trim().min(1, "Vui lòng nhập tiêu đề").max(300),
  context: z.string().trim().max(3000).optional().default(""),
});

export async function draftDocument(req: Request, res: Response) {
  const parsed = draftSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Dữ liệu không hợp lệ", errors: parsed.error.flatten().fieldErrors });
  }
  const { docType, title, context } = parsed.data;

  const prompt = [
    `Bạn là cán bộ Đoàn TNCS Hồ Chí Minh, hỗ trợ Bí thư/Phó Bí thư Đoàn xã soạn thảo văn bản nội bộ.`,
    `Hãy soạn một bản dự thảo "${docType}" với tiêu đề: "${title}".`,
    context ? `Thông tin/định hướng thêm do người dùng cung cấp:\n${context}` : "",
    ``,
    `Yêu cầu:`,
    `- Viết bằng tiếng Việt, văn phong hành chính - đoàn thể, mạch lạc, đúng thể thức văn bản Đoàn (có thể gồm: Mục đích - yêu cầu, Nội dung - thời gian - địa điểm, Đối tượng tham gia, Phân công tổ chức thực hiện, Kinh phí (nếu phù hợp), Kết luận/Khen thưởng - đánh giá tùy loại văn bản).`,
    `- Đây là bản GỢI Ý KHUNG để cán bộ chỉnh sửa lại, không tự bịa số liệu/tên người/ngày tháng cụ thể nếu người dùng chưa cung cấp — để chỗ trống hoặc ghi "(điền sau)".`,
    `- Không thêm lời dẫn/giải thích ngoài nội dung văn bản, chỉ trả về phần nội dung văn bản.`,
  ]
    .filter(Boolean)
    .join("\n");

  await handleGeminiCall(res, prompt);
}

const socialPostSchema = z.object({
  sourceText: z
    .string({ required_error: "Vui lòng nhập/dán nội dung Kế hoạch hoặc Báo cáo" })
    .trim()
    .min(20, "Nội dung quá ngắn để chuyển thành bài viết")
    .max(8000),
});

export async function draftSocialPost(req: Request, res: Response) {
  const parsed = socialPostSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Dữ liệu không hợp lệ", errors: parsed.error.flatten().fieldErrors });
  }
  const { sourceText } = parsed.data;

  const prompt = [
    `Bạn là người phụ trách truyền thông của Đoàn xã Phú Cát.`,
    `Hãy chuyển nội dung Kế hoạch/Báo cáo dưới đây thành 1 bài viết ngắn gọn, hấp dẫn để đăng lên Fanpage Đoàn xã Phú Cát hoặc Cổng thông tin của xã.`,
    ``,
    `Nội dung gốc:`,
    sourceText,
    ``,
    `Yêu cầu bài viết:`,
    `- Tiếng Việt, giọng văn gần gũi, truyền cảm hứng, phù hợp mạng xã hội (không cứng nhắc như văn bản hành chính).`,
    `- Độ dài khoảng 150-250 chữ, có thể chia đoạn ngắn dễ đọc.`,
    `- Mở đầu thu hút, có thể gợi ý 2-3 hashtag liên quan ở cuối bài (ví dụ #DoanXaPhuCat).`,
    `- Chỉ trả về nội dung bài viết, không thêm lời dẫn/giải thích khác.`,
  ].join("\n");

  await handleGeminiCall(res, prompt);
}
