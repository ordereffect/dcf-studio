"use client";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";
import { LESSONS, type Lesson, type LessonId } from "@/lib/learn";

export function LessonBody({ lesson }: { lesson: Lesson }) {
  return (
    <div className="grid gap-2 text-[12px] leading-[1.6]">
      <p className="text-ink">{lesson.what}</p>
      {lesson.think && <p className="text-muted">{lesson.think}</p>}
      {lesson.rule && (
        <p className="border-l-2 border-brass pl-2 text-muted">
          <span className="text-brass">Rule of thumb </span>
          {lesson.rule}
        </p>
      )}
    </div>
  );
}

/** A small ⓘ that explains any input or output. Hover, focus or tap to open. */
export function InfoTip({ id, className }: { id: LessonId; className?: string }) {
  const lesson: Lesson = LESSONS[id];
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; above: boolean } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const tipId = useId();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const place = () => {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    const w = Math.min(320, window.innerWidth - 24);
    const left = Math.min(Math.max(12, r.left + r.width / 2 - w / 2), window.innerWidth - w - 12);
    const above = r.bottom + 220 > window.innerHeight && r.top > 240;
    setPos({ left, top: above ? r.top - 8 : r.bottom + 8, above });
  };
  const show = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    place();
    setOpen(true);
  };
  const hide = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  useEffect(() => {
    if (!open) return;
    const onScroll = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btn}
        type="button"
        aria-label={`About ${lesson.title}`}
        aria-describedby={open ? tipId : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (open) setOpen(false);
          else show();
        }}
        className={`inline-flex shrink-0 align-middle text-faint hover:text-brass focus-visible:text-brass ${className ?? ""}`}
      >
        <Info className="size-3.5" aria-hidden />
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            id={tipId}
            role="tooltip"
            onMouseEnter={show}
            onMouseLeave={hide}
            style={{
              left: pos.left,
              top: pos.top,
              width: Math.min(320, window.innerWidth - 24),
              transform: pos.above ? "translateY(-100%)" : undefined,
            }}
            className="fixed z-[70] rounded-[7px] border border-rule bg-surface p-3 font-sans shadow-[0_12px_40px_-12px_rgba(0,0,0,0.6)]"
          >
            <div className="mb-1.5 text-[12px] font-bold text-brass">{lesson.title}</div>
            <LessonBody lesson={lesson} />
          </div>,
          document.body,
        )}
    </>
  );
}
