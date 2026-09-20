const SIZE = 256;
const MAX_CHARS = 250_000; // khớp giới hạn ~300KB ở server, chừa dư

/** Đọc ảnh người dùng chọn, cắt vuông chính giữa, thu về 256x256 và nén JPEG (data URL). */
export async function resizeToAvatar(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Vui lòng chọn một file ảnh");

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Không đọc được ảnh này, hãy thử ảnh JPG hoặc PNG"));
      el.src = url;
    });

    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - side) / 2;
    const sy = (img.naturalHeight - side) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Trình duyệt không hỗ trợ xử lý ảnh");
    ctx.fillStyle = "#fff"; // nền trắng cho ảnh PNG trong suốt
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.drawImage(img, sx, sy, side, side, 0, 0, SIZE, SIZE);

    for (const q of [0.85, 0.7, 0.55, 0.4]) {
      const data = canvas.toDataURL("image/jpeg", q);
      if (data.length <= MAX_CHARS) return data;
    }
    throw new Error("Ảnh quá phức tạp, hãy chọn ảnh khác");
  } finally {
    URL.revokeObjectURL(url);
  }
}
