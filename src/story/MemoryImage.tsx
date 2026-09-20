import { useEffect, useRef, useState } from "react";
import { assetUrl } from "../utils/assetUrl";
export function MemoryImage({
  path,
  alt,
  eager = false,
}: {
  path?: string;
  alt: string;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const src = path ? assetUrl(path) : "";
  if (!src || failed === src) return null;
  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(src)}
    />
  );
}
export function PhotoViewer({
  image,
  title,
  date,
  description,
  onClose,
}: {
  image?: string;
  title: string;
  date?: string;
  description?: string;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.showModal();
    return () => {
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="photo-viewer"
      aria-label={title || "照片"}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button className="photo-close" onClick={onClose} aria-label="关闭照片">
        ×
      </button>
      <figure>
        <MemoryImage path={image} alt={title || "照片"} eager />
        <figcaption>
          {date && <span>{date}</span>}
          {title && <h3>{title}</h3>}
          {description && <p>{description}</p>}
        </figcaption>
      </figure>
    </dialog>
  );
}
export function formatStoryDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const parsed = new Date(`${date}T12:00:00Z`);
  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  )
    return date;
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(parsed);
}
