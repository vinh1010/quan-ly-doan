const SIZE = 256;
const MAX_CHARS = 250_000; // khớp giới hạn ~300KB ở server, chừa dư

const isHeic = (file: File) => /hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);

/** Giải mã ảnh: ưu tiên createImageBitmap (đúng chiều xoay EXIF), dự phòng bằng thẻ <img>. */
async function decode(blob: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(blob, { imageOrientation: "from-image" });
      return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
    } catch {
      // rơi xuống cách dự phòng bên dưới
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("decode"));
      el.src = url;
    });
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => {} };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Đọc ảnh người dùng chọn, cắt vuông chính giữa, thu về 256x256 và nén JPEG (data URL). */
export async function resizeToAvatar(file: File): Promise<string> {
  // Sao chép nội dung vào bộ nhớ ngay: file chọn từ thư viện iOS có thể mất nếu đọc chậm hoặc ô chọn bị làm mới
  let blob: Blob;
  try {
    blob = new Blob([await file.arrayBuffer()], { type: file.type || "image/jpeg" });
  } catch {
    throw new Error("Không đọc được file. Nếu ảnh đang ở iCloud, hãy mở ảnh cho tải xong rồi chọn lại");
  }

  let decoded;
  try {
    decoded = await decode(blob);
  } catch {
    throw new Error(
      isHeic(file)
        ? "Ảnh định dạng HEIC chưa được hỗ trợ. Trên iPhone: Cài đặt → Camera → Định dạng → Tương thích nhất, hoặc chụp lại ảnh"
        : "Không đọc được ảnh này, hãy thử ảnh JPG hoặc PNG",
    );
  }

  try {
    const side = Math.min(decoded.width, decoded.height);
    if (!side) throw new Error("Ảnh không hợp lệ");
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Trình duyệt không hỗ trợ xử lý ảnh");
    ctx.fillStyle = "#fff"; // nền trắng cho ảnh PNG trong suốt
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.drawImage(
      decoded.source,
      (decoded.width - side) / 2,
      (decoded.height - side) / 2,
      side,
      side,
      0,
      0,
      SIZE,
      SIZE,
    );

    for (const q of [0.85, 0.7, 0.55, 0.4]) {
      const data = canvas.toDataURL("image/jpeg", q);
      if (data.length <= MAX_CHARS) return data;
    }
    throw new Error("Ảnh quá phức tạp, hãy chọn ảnh khác");
  } finally {
    decoded.close();
  }
}
