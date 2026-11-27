"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, GraduationCap, MousePointerClick, X } from "lucide-react";
import { LESSONS, TOUR, type Lesson } from "@/lib/learn";
import { useUi } from "@/lib/store";

const SEEN_KEY = "dcf:tourSeen";
const PAD = 6;

export function TourButton() {
  const setTourOpen = useUi((s) => s.setTourOpen);
  const [seen, setSeen] = useState(true);
  useEffect(() => {
    try {
      setSeen(localStorage.getItem(SEEN_KEY) === "1");
    } catch {}
  }, []);
  return (
    <button
      onClick={() => {
        setTourOpen(true);
        setSeen(true);
        try {
          localStorage.setItem(SEEN_KEY, "1");
        } catch {}
      }}
      className="relative inline-flex shrink-0 items-center gap-2 rounded-[3px] border border-brass px-2.5 py-1.5 text-[12.5px] font-semibold text-brass hover:bg-brass hover:text-[#111]"
    >
      <GraduationCap className="size-4" aria-hidden />
      <span className="hidden sm:inline">Guided tour</span>
      {!seen && <span className="absolute -right-1 -top-1 size-2 animate-pulse rounded-full bg-brass" aria-hidden />}
    </button>
  );
}

type Rect = { top: number; left: number; width: number; height: number };

/**
 * A step-by-step walkthrough. It dims the page, cuts a hole around the element being
 * explained (which stays clickable, so "try it" steps work) and floats a card beside it.
 */
export function Tour() {
  const setTourOpen = useUi((s) => s.setTourOpen);
  const setTab = useUi((s) => s.setTab);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [vw, setVw] = useState(1200);
  const [vh, setVh] = useState(800);
  const card = useRef<HTMLDivElement>(null);
  const [cardH, setCardH] = useState(260);
  const [more, setMore] = useState(true);
  const step = TOUR[i];
  const last = i === TOUR.length - 1;
  const lesson: Lesson | undefined = step.lesson ? LESSONS[step.lesson] : undefined;

  const close = useCallback(() => setTourOpen(false), [setTourOpen]);
  const next = useCallback(() => (last ? close() : setI((x) => x + 1)), [last, close]);
  const prev = useCallback(() => setI((x) => Math.max(0, x - 1)), []);

  // Switch tab and bring the target into view when the step changes.
  useEffect(() => {
    if (step.tab) setTab(step.tab);
    setRect(null);
    if (!step.target) return;
    const t = setTimeout(() => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
      if (!el) return;
      const w = window.innerWidth;
      // Phones: target at the top, card below. Wide targets: push them down so the card fits above.
      const block: ScrollLogicalPosition = w < 640 ? "start" : el.offsetWidth > w - 420 ? "end" : "center";
      el.scrollIntoView({ block, behavior: "smooth" });
    }, 60);
    return () => clearTimeout(t);
  }, [i, step.tab, step.target, setTab]);

  // Track the target's position every frame (scrolling, resizing, layout changes).
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setVw(window.innerWidth);
      setVh(window.innerHeight);
      if (step.target) {
        const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
        if (el) {
          const r = el.getBoundingClientRect();
          setRect((p) =>
            p && Math.abs(p.top - r.top) < 0.5 && Math.abs(p.left - r.left) < 0.5 && p.width === r.width && p.height === r.height
              ? p
              : { top: r.top, left: r.left, width: r.width, height: r.height },
          );
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [step.target]);

  useLayoutEffect(() => {
    if (card.current) setCardH(card.current.offsetHeight);
  }, [i, rect?.width, vw]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, select")) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, next, prev]);

  useEffect(() => {
    card.current?.focus({ preventScroll: true });
  }, [i]);

  const mobile = vw < 640;
  useEffect(() => setMore(window.innerWidth >= 640), [i]);
  const hole = rect
    ? {
        top: Math.max(0, rect.top - PAD),
        left: Math.max(0, rect.left - PAD),
        width: Math.min(vw, rect.width + PAD * 2),
        height: Math.min(vh, rect.height + PAD * 2),
      }
    : null;

  // Card placement: centred with no target, a bottom sheet on phones, otherwise beside the target.
  const W = Math.min(380, vw - 24);
  let style: React.CSSProperties;
  if (!step.target || !hole) {
    style = { left: (vw - W) / 2, top: Math.max(16, (vh - cardH) / 2), width: W };
  } else if (mobile) {
    const below = vh - (hole.top + hole.height) - 24;
    const above = hole.top - 24;
    style =
      below >= above
        ? { left: 12, right: 12, bottom: 12, maxHeight: Math.max(220, below) }
        : { left: 12, right: 12, top: 12, maxHeight: Math.max(220, above) };
  } else {
    const right = hole.left + hole.width + 14;
    const leftSide = hole.left - W - 14;
    const clampTop = (t: number) => Math.min(Math.max(12, t), vh - cardH - 12);
    if (right + W < vw - 12) style = { left: right, top: clampTop(hole.top), width: W };
    else if (leftSide > 12) style = { left: leftSide, top: clampTop(hole.top), width: W };
    else if (hole.top + hole.height + cardH + 24 < vh)
      style = { left: Math.min(Math.max(12, hole.left), vw - W - 12), top: hole.top + hole.height + 12, width: W };
    else {
      const above = hole.top - 24;
      const below = vh - (hole.top + hole.height) - 24;
      const left = Math.min(Math.max(12, hole.left + hole.width - W), vw - W - 12);
      style =
        above >= below
          ? { left, top: Math.max(12, hole.top - Math.min(cardH, above) - 12), width: W, maxHeight: Math.max(200, above) }
          : { left, top: hole.top + hole.height + 12, width: W, maxHeight: Math.max(200, below) };
    }
  }

  const dim = "fixed z-[60] bg-black/70";
  return createPortal(
    <div aria-live="polite">
      {hole ? (
        <>
          <div className={dim} style={{ top: 0, left: 0, right: 0, height: hole.top }} />
          <div className={dim} style={{ top: hole.top + hole.height, left: 0, right: 0, bottom: 0 }} />
          <div className={dim} style={{ top: hole.top, left: 0, width: hole.left, height: hole.height }} />
          <div className={dim} style={{ top: hole.top, left: hole.left + hole.width, right: 0, height: hole.height }} />
          <div
            className="pointer-events-none fixed z-[61] rounded-[3px] ring-2 ring-brass transition-all duration-200"
            style={hole}
          />
        </>
      ) : (
        <div className={`${dim} inset-0`} />
      )}

      <div
        ref={card}
        tabIndex={-1}
        role="dialog"
        aria-modal="false"
        aria-labelledby="tour-title"
        className="fixed z-[62] max-h-[85vh] overflow-y-auto rounded-[3px] border border-brass bg-surface p-4 font-sans outline-none shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)]"
        style={style}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="num text-[11px] text-faint">
            {String(i + 1).padStart(2, "0")} / {String(TOUR.length).padStart(2, "0")}
          </span>
          <button onClick={close} aria-label="Close tour" className="text-faint hover:text-ink">
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <div className="mb-3 h-[2px] w-full bg-rule">
          <div className="h-full bg-brass transition-all" style={{ width: `${((i + 1) / TOUR.length) * 100}%` }} />
        </div>
        <h2 id="tour-title" className="text-[15px] font-bold leading-snug text-ink">
          {step.title}
        </h2>
        <p className="mt-2 text-[12.5px] leading-[1.65] text-muted">{step.body}</p>
        {(lesson?.think || lesson?.rule) && (
          <>
            <button
              onClick={() => setMore((m) => !m)}
              aria-expanded={more}
              className="mt-2 text-[11.5px] text-brass hover:underline"
            >
              {more ? "Hide the analyst's view" : "Show the analyst's view"}
            </button>
            {more && (
              <>
                {lesson.think && step.lesson !== "history" && (
                  <p className="mt-1.5 text-[12px] leading-[1.6] text-muted">{lesson.think}</p>
                )}
                {lesson.rule && (
                  <p className="mt-2 border-l-2 border-brass pl-2 text-[12px] leading-[1.6] text-muted">
                    <span className="text-brass">Rule of thumb </span>
                    {lesson.rule}
                  </p>
                )}
              </>
            )}
          </>
        )}
        {step.tryIt && (
          <p className="mt-3 flex gap-2 rounded-[3px] bg-brass-soft p-2 text-[12px] leading-[1.55] text-ink">
            <MousePointerClick className="mt-0.5 size-3.5 shrink-0 text-brass" aria-hidden />
            <span>
              <span className="font-semibold text-brass">Try it. </span>
              {step.tryIt}
            </span>
          </p>
        )}
        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            onClick={prev}
            disabled={i === 0}
            className="inline-flex items-center gap-1.5 rounded-[3px] border border-rule px-3 py-1.5 text-[12.5px] text-brass hover:opacity-80 disabled:opacity-30"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Previous
          </button>
          <button
            onClick={next}
            className="inline-flex items-center gap-1.5 rounded-[3px] bg-brass px-3 py-1.5 text-[12.5px] font-semibold text-[#111] hover:opacity-90"
          >
            {i === 0 ? "Start" : last ? "Finish" : "Next"}
            {!last && <ArrowRight className="size-3.5" aria-hidden />}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
