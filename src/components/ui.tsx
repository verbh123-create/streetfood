"use client";
import { ReactNode, useEffect, useRef } from "react";
import { X, LoaderCircle } from "lucide-react";
export function Dialog({ open, onClose, title, eyebrow, children, wide = false, drawer = false }: { open: boolean; onClose: () => void; title: string; eyebrow?: string; children: ReactNode; wide?: boolean; drawer?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => {
    if (!open) return; const previous = document.activeElement as HTMLElement | null; const overflow = document.body.style.overflow; document.body.style.overflow = "hidden";
    const timer = setTimeout(() => ref.current?.querySelector<HTMLElement>("button, input, select, textarea, a[href]")?.focus(), 50);
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") closeRef.current(); if (event.key === "Tab") { const list = ref.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]'); if (!list?.length) return; const first = list[0], last = list[list.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } } };
    document.addEventListener("keydown", key); return () => { clearTimeout(timer); document.body.style.overflow = overflow; document.removeEventListener("keydown", key); previous?.focus(); };
  }, [open]);
  useEffect(() => { if (open) { ref.current?.scrollTo({ top: 0 }); } }, [title, open]);
  if (!open) return null;
  return <div className={`modal-backdrop ${drawer ? "drawer-backdrop" : ""}`} onMouseDown={event => { if (event.currentTarget === event.target) onClose(); }}><div ref={ref} role="dialog" aria-modal="true" aria-label={title} className={`modal ${wide ? "modal-wide" : ""} ${drawer ? "modal-drawer" : ""}`}><div className="modal-heading"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2></div><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={21} /></button></div>{children}</div></div>;
}
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) { return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>; }
export function Spinner() { return <LoaderCircle className="spin" size={18} />; }
export function EmptyState({ icon, title, text }: { icon: ReactNode; title: string; text: string }) { return <div className="empty-state"><div>{icon}</div><h3>{title}</h3><p>{text}</p></div>; }
