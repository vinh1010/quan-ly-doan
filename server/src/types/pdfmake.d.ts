// pdfmake@0.2 chỉ có bản dựng cho trình duyệt trên DefinitelyTyped (bản mới hơn, API khác hẳn
// PdfPrinter phía server mà dự án đang dùng). Khai báo tối giản riêng cho đúng những gì cần dùng.
declare module "pdfmake" {
  import type { Writable } from "node:stream";

  export interface TFontFiles {
    normal: string;
    bold?: string;
    italics?: string;
    bolditalics?: string;
  }

  export type TFontDictionary = Record<string, TFontFiles>;

  /** Chỉ khai báo phần thật sự dùng tới của tài liệu PDFKit mà pdfmake trả về. */
  export interface PdfKitDocument extends Writable {
    on(event: "data", listener: (chunk: Buffer) => void): this;
    on(event: "end", listener: () => void): this;
    on(event: "error", listener: (err: Error) => void): this;
    end(): void;
  }

  export default class PdfPrinter {
    constructor(fonts: TFontDictionary);
    createPdfKitDocument(docDefinition: Record<string, unknown>): PdfKitDocument;
  }
}
