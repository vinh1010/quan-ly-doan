// Gọi Gemini API (Google AI Studio) để sinh nội dung văn bản. Dùng fetch có sẵn của Node,
// không thêm SDK ngoài — chỉ cần 1 lệnh gọi REST đơn giản, đủ cho tính năng hỗ trợ soạn thảo.
// Lấy API key miễn phí tại https://aistudio.google.com/apikey, đặt vào GEMINI_API_KEY trong .env.

const DEFAULT_MODEL = "gemini-2.5-flash";

export class GeminiConfigError extends Error {}
export class GeminiApiError extends Error {}

export async function generateText(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiConfigError(
      "Chưa cấu hình GEMINI_API_KEY trên máy chủ — liên hệ quản trị viên để bật tính năng AI.",
    );
  }
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
      }),
    },
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("Gemini API lỗi:", res.status, body);
    throw new GeminiApiError(
      res.status === 429
        ? "AI đang quá tải (vượt hạn mức miễn phí), vui lòng thử lại sau ít phút."
        : "Không gọi được dịch vụ AI, vui lòng thử lại.",
    );
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
    promptFeedback?: { blockReason?: string };
  };

  if (data.promptFeedback?.blockReason) {
    throw new GeminiApiError("Nội dung yêu cầu bị chặn bởi bộ lọc an toàn của AI, vui lòng thử diễn đạt khác.");
  }

  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text.trim()) {
    throw new GeminiApiError("AI không trả về nội dung, vui lòng thử lại.");
  }
  return text.trim();
}
