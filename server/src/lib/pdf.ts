import path from "node:path";
import PdfPrinter from "pdfmake";

// Font Roboto (Google Fonts, giấy phép Apache 2.0) có đủ dấu tiếng Việt — font mặc định của
// pdfkit (Helvetica...) không có dấu. File .ttf nằm trong src/assets/fonts, được copy sang
// dist/assets/fonts khi build (xem script "build" trong package.json).
const FONT_DIR = path.resolve(__dirname, "../assets/fonts");

const printer = new PdfPrinter({
  Roboto: {
    normal: path.join(FONT_DIR, "Roboto-Regular.ttf"),
    bold: path.join(FONT_DIR, "Roboto-Bold.ttf"),
    italics: path.join(FONT_DIR, "Roboto-Italic.ttf"),
    bolditalics: path.join(FONT_DIR, "Roboto-BoldItalic.ttf"),
  },
});

/** Tạo file PDF (Buffer) từ định nghĩa nội dung kiểu pdfmake. */
export function createPdfBuffer(docDefinition: Record<string, unknown>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = printer.createPdfKitDocument({
        pageSize: "A4",
        pageMargins: [40, 40, 40, 40],
        defaultStyle: { font: "Roboto", fontSize: 10 },
        ...docDefinition,
      });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
      doc.end();
    } catch (e) {
      reject(e as Error);
    }
  });
}
