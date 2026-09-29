import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { draftDocument, draftSocialPost } from "../api/ai";
import { parseApiError } from "../api/secretaries";
import { useToast } from "../components/Toast";

const field =
  "mt-1 w-full border-0 border-b border-slate-300 bg-transparent py-1 text-sm outline-none focus:border-[#1890ff]";
const label = "block text-xs text-slate-500";
const btnPrimary =
  "rounded-sm bg-[#1890ff] px-5 py-2 text-xs font-bold uppercase text-white hover:opacity-90 disabled:opacity-50";
const btnGhost =
  "rounded-sm border border-slate-300 px-5 py-2 text-xs font-bold uppercase text-slate-600 hover:bg-slate-50 disabled:opacity-50";

const DOC_TYPES = [
  "Kế hoạch tổ chức hoạt động (giải thể thao, hội thi...)",
  "Chương trình (Mùa hè xanh, tình nguyện...)",
  "Báo cáo tổng kết công tác Đoàn theo tháng/quý",
  "Khác",
];

async function copy(text: string, toast: (k: "success" | "error", m: string) => void) {
  try {
    await navigator.clipboard.writeText(text);
    toast("success", "Đã sao chép");
  } catch {
    toast("error", "Không sao chép được, vui lòng bôi đen và Ctrl+C thủ công");
  }
}

export default function AiAssistant() {
  const toast = useToast();

  // Bước 1: soạn dự thảo
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [title, setTitle] = useState("");
  const [context, setContext] = useState("");
  const [draft, setDraft] = useState("");

  const draftMut = useMutation({
    mutationFn: () => draftDocument({ docType, title, context }),
    onSuccess: (text) => setDraft(text),
    onError: (err) => toast("error", parseApiError(err).message),
  });

  // Bước 2: chuyển thành bài viết Fanpage
  const [source, setSource] = useState("");
  const [post, setPost] = useState("");

  const postMut = useMutation({
    mutationFn: () => draftSocialPost({ sourceText: source }),
    onSuccess: (text) => setPost(text),
    onError: (err) => toast("error", parseApiError(err).message),
  });

  return (
    <div className="space-y-6">
      <div className="bg-white shadow-sm">
        <h1 className="border-b px-4 py-4 text-2xl font-light text-slate-800 sm:px-9">Trợ lý AI soạn thảo</h1>
        <p className="px-4 pt-4 text-xs text-slate-500 sm:px-9">
          Gợi ý bằng AI, bạn nên đọc lại và chỉnh sửa (số liệu, ngày tháng, tên người...) trước khi ban hành/đăng bài.
        </p>

        {/* Bước 1 */}
        <div className="space-y-4 px-4 py-5 sm:px-9">
          <h2 className="text-sm font-bold uppercase text-slate-700">1. Soạn dự thảo Kế hoạch / Báo cáo</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={label}>
              Loại văn bản
              <select className={field} value={docType} onChange={(e) => setDocType(e.target.value)}>
                {DOC_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className={label}>
              Tiêu đề văn bản
              <input
                className={field}
                placeholder='VD: "Kế hoạch tổ chức Giải bóng đá Thanh niên Xã Phú Cát năm 2026"'
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
          </div>
          <label className={label}>
            Thông tin/định hướng thêm (không bắt buộc — thời gian, địa điểm, đối tượng, mục tiêu...)
            <textarea
              className={field}
              rows={3}
              placeholder="VD: Dự kiến tổ chức cuối tháng 11/2026, tại sân vận động xã, dành cho Đoàn viên thanh niên 13 thôn..."
              value={context}
              onChange={(e) => setContext(e.target.value)}
            />
          </label>
          <button
            className={btnPrimary}
            disabled={draftMut.isPending || !title.trim()}
            onClick={() => draftMut.mutate()}
          >
            {draftMut.isPending ? "Đang soạn..." : "Soạn dự thảo bằng AI"}
          </button>

          {draft && (
            <div className="space-y-2">
              <textarea
                className="w-full rounded border border-slate-300 p-3 text-sm leading-relaxed"
                rows={16}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <button className={btnGhost} onClick={() => copy(draft, toast)}>
                  Sao chép
                </button>
                <button
                  className={btnGhost}
                  onClick={() => {
                    setSource(draft);
                    toast("success", "Đã đưa nội dung xuống bước 2 bên dưới");
                  }}
                >
                  Dùng nội dung này để tạo bài viết Fanpage ↓
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white shadow-sm">
        <div className="space-y-4 px-4 py-5 sm:px-9">
          <h2 className="text-sm font-bold uppercase text-slate-700">2. Chuyển thành bài viết Fanpage / Cổng thông tin xã</h2>
          <label className={label}>
            Nội dung Kế hoạch/Báo cáo (dán vào đây, hoặc dùng nút ở bước 1)
            <textarea
              className={field}
              rows={6}
              placeholder="Dán nội dung Kế hoạch hoặc Báo cáo cần chuyển thành bài viết truyền thông..."
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
          </label>
          <button
            className={btnPrimary}
            disabled={postMut.isPending || source.trim().length < 20}
            onClick={() => postMut.mutate()}
          >
            {postMut.isPending ? "Đang tạo..." : "Tạo bài viết truyền thông"}
          </button>

          {post && (
            <div className="space-y-2">
              <textarea
                className="w-full rounded border border-slate-300 p-3 text-sm leading-relaxed"
                rows={10}
                value={post}
                onChange={(e) => setPost(e.target.value)}
              />
              <button className={btnGhost} onClick={() => copy(post, toast)}>
                Sao chép
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
