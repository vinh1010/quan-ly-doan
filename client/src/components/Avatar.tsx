interface Props {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
}

/** Ảnh đại diện tròn; chưa có ảnh thì hiện chữ cái đầu của tên. */
export default function Avatar({ src, name, size = 40, className = "" }: Props) {
  const initial = name.trim().split(/\s+/).pop()?.charAt(0).toUpperCase() ?? "?";
  const style = { width: size, height: size, fontSize: size * 0.42 };
  return src ? (
    <img src={src} alt={`Ảnh ${name}`} style={style} className={`shrink-0 rounded-full object-cover ${className}`} />
  ) : (
    <span
      aria-hidden
      style={style}
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-[#d6e6f7] font-semibold text-[#1a56c4] ${className}`}
    >
      {initial}
    </span>
  );
}
