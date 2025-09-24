import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Head from "next/head";
import Image from "next/image";
import { Hand, Ship } from "lucide-react";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

type WindowState = "open" | "closing" | "closed";
type SubmitState = "idle" | "submitting" | "submitted" | "error";

type Position = { x: number; y: number };

export default function Home() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<SubmitState>("idle");
  const [windowState, setWindowState] = useState<WindowState>("open");
  const [windowPosition, setWindowPosition] = useState<Position>({ x: 24, y: 48 });
  const [isDragging, setIsDragging] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  const windowRef = useRef<HTMLDivElement | null>(null);
  const trailRef = useRef<HTMLDivElement | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const pointerIdRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const rippleKey = useRef(0);

  const windowPosRef = useRef<Position>({ x: 24, y: 48 });
  const trailPosRef = useRef<Position>({ x: 24, y: 48 });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email || status === "submitting") {
      return;
    }

    setStatus("submitting");

    try {
      const form = event.currentTarget;
      const formData = new FormData(form);
      formData.set("access_key", "c936ceee-6372-4974-87d0-4953c43b80cc");
      formData.set("email", email);
      formData.set("subject", "New portfolio update request");
      formData.set("from_name", "Aaron Hanson Portfolio");

      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (response.ok && data?.success) {
        setStatus("submitted");
        setEmail("");
        form.reset();
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  const centerWindow = () => {
    if (typeof window === "undefined" || !windowRef.current) {
      return;
    }

    const { offsetWidth, offsetHeight } = windowRef.current;
    const x = Math.max((window.innerWidth - offsetWidth) / 2, 12);
    const y = Math.max((window.innerHeight - offsetHeight) / 2, 24);

    const nextPosition = { x, y };
    setWindowPosition(nextPosition);
    windowPosRef.current = nextPosition;
    trailPosRef.current = nextPosition;
  };

  useEffect(() => {
    centerWindow();
    const handleResize = () => {
      centerWindow();
      updateWindowSize();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const updateWindowSize = () => {
    if (windowRef.current) {
      setWindowSize({
        width: windowRef.current.offsetWidth,
        height: windowRef.current.offsetHeight,
      });
    }
  };

  useEffect(() => {
    updateWindowSize();
  }, [status, windowState]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (status !== "submitted") {
      return;
    }

    const timer = window.setTimeout(() => setStatus("idle"), 4000);
    return () => window.clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    windowPosRef.current = windowPosition;
  }, [windowPosition]);

  useEffect(() => {
    let frame: number;

    const animateTrail = () => {
      const target = windowPosRef.current;
      const current = trailPosRef.current;

      current.x += (target.x - current.x) * 0.16;
      current.y += (target.y - current.y) * 0.16;

      if (trailRef.current) {
        trailRef.current.style.transform = `translate3d(${current.x}px, ${current.y}px, 0)`;
        trailRef.current.style.opacity = isDragging ? "0.55" : "0";
      }

      frame = window.requestAnimationFrame(animateTrail);
    };

    frame = window.requestAnimationFrame(animateTrail);
    return () => window.cancelAnimationFrame(frame);
  }, [isDragging]);

  useEffect(() => {
    if (!trailRef.current) {
      return;
    }

    const width = windowSize.width || 320;
    const height = windowSize.height || 360;
    trailRef.current.style.width = `${width}px`;
    trailRef.current.style.height = `${height}px`;
  }, [windowSize]);

  const clampPosition = (x: number, y: number) => {
    if (typeof window === "undefined" || !windowRef.current) {
      return { x, y };
    }

    const { offsetWidth, offsetHeight } = windowRef.current;
    const maxX = Math.max(window.innerWidth - offsetWidth - 12, 12);
    const maxY = Math.max(window.innerHeight - offsetHeight - 12, 12);

    return {
      x: Math.min(Math.max(x, 12), maxX),
      y: Math.min(Math.max(y, 12), maxY),
    };
  };

  const handleDragStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (windowState !== "open") {
      return;
    }

    setIsDragging(true);
    pointerIdRef.current = event.pointerId;
    dragOffset.current = {
      x: event.clientX - windowPosition.x,
      y: event.clientY - windowPosition.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.style.cursor = "grabbing";
  };

  const handleDragMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDragging || pointerIdRef.current !== event.pointerId) {
      return;
    }

    event.preventDefault();
    const nextX = event.clientX - dragOffset.current.x;
    const nextY = event.clientY - dragOffset.current.y;
    const clamped = clampPosition(nextX, nextY);

    setWindowPosition(clamped);
    windowPosRef.current = clamped;
  };

  const handleDragEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current === event.pointerId) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    pointerIdRef.current = null;
    setIsDragging(false);
    event.currentTarget.style.cursor = "grab";
  };

  const handleClose = () => {
    if (windowState !== "open") {
      return;
    }

    rippleKey.current += 1;
    setWindowState("closing");

    closeTimerRef.current = window.setTimeout(() => {
      setWindowState("closed");
      closeTimerRef.current = null;
    }, 320);
  };

  const handleReopen = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    setWindowState("open");
    setStatus("idle");
    centerWindow();
  };

  const visibilityClasses =
    windowState === "open"
      ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
      : "opacity-0 translate-y-4 scale-95 pointer-events-none";

  const showWindow = windowState !== "closed";
  const showRipple = windowState === "closing";
  const showRestore = windowState === "closed";

  const handleButtonPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (status === "error") {
      setStatus("idle");
    }
    event.stopPropagation();
    event.currentTarget.blur();
  };

  return (
    <>
      <Head>
        <title>Aaron Hanson — AI Builder & Lifecycle Marketer</title>
        <meta
          name="description"
          content="Builder crafting efficient automations with AI. Notes on Claude Code, OpenAI Codex, and workflows that actually deliver results."
        />
      </Head>
      <div
        className={`${spaceGrotesk.variable} ${plexMono.variable} bg-wave font-sans relative min-h-screen bg-[#050505] text-white`}
      >
        <main className="relative flex min-h-screen flex-col items-center justify-center gap-12 px-4 py-16">
          <div className="text-xs font-mono uppercase tracking-[0.35em] text-white/40">
            Aaron Hanson / Portfolio Console
          </div>

          {showWindow && (
            <>
              <div
                ref={trailRef}
                aria-hidden
                className="pointer-events-none fixed left-0 top-0 z-[5] rounded-[32px] bg-[conic-gradient(at_top_right,_rgba(255,255,255,0.35),_rgba(56,189,248,0.25),_transparent_70%)] blur-3xl transition-opacity duration-200"
                style={{
                  transform: `translate3d(${windowPosition.x}px, ${windowPosition.y}px, 0)`,
                  opacity: 0,
                }}
              />

              <section
                ref={windowRef}
                style={{
                  transform: `translate3d(${windowPosition.x}px, ${windowPosition.y}px, 0)`,
                }}
                className={`fixed left-0 top-0 z-10 w-[min(720px,calc(100vw-24px))] overflow-hidden rounded-3xl border border-white/15 bg-white text-black shadow-[0_22px_120px_rgba(0,0,0,0.55)] transition-all duration-300 ease-out ${visibilityClasses}`}
              >
                <header className="flex items-center justify-between border-b border-black/10 bg-black px-6 py-4 text-white">
                  <div
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      handleDragStart(event);
                    }}
                    onPointerMove={handleDragMove}
                    onPointerUp={handleDragEnd}
                    onPointerCancel={handleDragEnd}
                    className={`flex flex-1 items-center gap-3 text-xs font-medium uppercase tracking-[0.3em] ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
                  >
                    <span className="inline-flex h-2 w-2 rounded-full bg-white" />
                    <span>AJH</span>
                  </div>
                  <button
                    type="button"
                    aria-label="Close window"
                    onClick={handleClose}
                    onPointerDown={handleButtonPointerDown}
                    className="flex h-6 w-6 items-center justify-center rounded-sm border border-white/30 text-base leading-none transition hover:bg-white hover:text-black"
                  >
                    ×
                  </button>
                </header>

                <div className="space-y-8 px-6 py-10 sm:px-10 sm:py-12">
                  <div className="space-y-3">
                    <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Aaron Hanson</h1>
                    <p className="text-sm uppercase tracking-[0.3em] text-black/60">
                      AI Builder & Lifecycle Marketer
                    </p>
                    <div className="hand-wave-group flex items-center gap-2 text-base font-medium text-black/80 sm:text-lg">
                      <span>Hey, I&apos;m Aaron.</span>
                      <Hand className="hand-wave h-5 w-5 text-black/60" strokeWidth={1.75} />
                    </div>
                    <p className="text-base leading-relaxed text-black/70 sm:text-lg">
                      I use AI every day to build and experiment across <span className="font-semibold">marketing, software, health, and productivity</span>. Currently exploring how these tools can create better systems and workflows that actually deliver results.
                    </p>
                    <p className="text-base leading-relaxed text-black/70 sm:text-lg">
                      Want updates? Drop your email below and I&apos;ll share what I&apos;m learning.
                    </p>
                  </div>

                  <div className="space-y-4 rounded-2xl border border-black/10 bg-black/5 p-6">
                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-black/70">
                      Enter your email to get infrequent updates.
                    </p>
                    <form
                      className="flex flex-col gap-3 sm:flex-row"
                      action="https://api.web3forms.com/submit"
                      method="POST"
                      onSubmit={handleSubmit}
                    >
                      <input type="hidden" name="access_key" value="c936ceee-6372-4974-87d0-4953c43b80cc" />
                      <input type="hidden" name="subject" value="New portfolio update request" />
                      <input type="hidden" name="from_name" value="Aaron Hanson Portfolio" />
                      <input type="checkbox" name="botcheck" className="hidden" tabIndex={-1} autoComplete="off" />

                      <label className="sr-only" htmlFor="email">
                        Email address
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        value={email}
                        onChange={(event) => {
                          setEmail(event.target.value);
                          if (status === "error") {
                            setStatus("idle");
                          }
                        }}
                        autoComplete="email"
                        placeholder="you@workspace.com"
                        className="flex-1 rounded-xl border border-black/15 bg-transparent px-4 py-3 text-sm text-black placeholder:text-black/40 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/40"
                      />
                      <button
                        type="submit"
                        disabled={status === "submitting"}
                        className="group inline-flex min-h-[54px] w-full flex-col items-center justify-center gap-1 rounded-xl border border-black bg-black px-5 py-3 text-center text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-white hover:text-black cursor-pointer cursor-ship-hover disabled:cursor-not-allowed disabled:border-black/40 disabled:bg-black/30 disabled:text-white/50 sm:w-auto"
                      >
                        {status === "submitted" ? (
                          <span>Added</span>
                        ) : status === "submitting" ? (
                          <span>Setting sail…</span>
                        ) : (
                          <span className="flex items-center gap-2">
                            Ship it!
                            <Ship
                              className="h-5 w-5 text-white transition group-hover:text-black"
                              strokeWidth={1.8}
                              aria-hidden
                            />
                          </span>
                        )}
                      </button>
                    </form>
                    <p className="text-xs font-mono text-black/50" aria-live="polite">
                      {status === "submitted"
                        ? "// Logged. Expect the next signal when there’s something worth launching."
                        : status === "error"
                          ? "// Something glitched—please try again."
                          : ""}
                    </p>
                  </div>
                </div>
              </section>
            </>
          )}

          {showRipple && (
            <div
              key={rippleKey.current}
              className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center"
            >
              <div className="h-32 w-32 rounded-full border border-white/30 bg-white/10 animate-[window-ripple_340ms_ease-out_forwards]" />
            </div>
          )}

          {showRestore && (
            <div className="flex flex-col items-center gap-4 text-center">
              <Image
                src="/you!.gif"
                alt="Animated collage inviting you back into the console"
                width={480}
                height={400}
                unoptimized
                className="w-[min(320px,80vw)] cursor-pointer rounded-3xl border border-white/20 shadow-[0_12px_60px_rgba(0,0,0,0.6)]"
                onClick={handleReopen}
                priority
              />
            </div>
          )}
        </main>
      </div>
    </>
  );
}
