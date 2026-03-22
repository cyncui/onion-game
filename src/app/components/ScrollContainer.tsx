"use client";

import { useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import { AnimatePresence } from "framer-motion";
import { useDrawingContext } from "./DrawingProvider";
import { useGateContext } from "./GateProvider";
import DrawingCanvas from "./DrawingCanvas/DrawingCanvas";
import CompanionSprite from "./CompanionSprite/CompanionSprite";
import GateQuestion from "./GateQuestion/GateQuestion";
import ExitScreen from "./ExitScreen/ExitScreen";
import AsciiGarden from "./AsciiGarden/AsciiGarden";

/**
 * Color stops for the journey from underground to sky.
 * Each stop is [scrollProgress (0-1), r, g, b].
 */
const COLOR_STOPS: [number, number, number, number][] = [
  [0.0, 0x2c, 0x18, 0x10], // Dark brown — bedrock
  [0.15, 0x3e, 0x24, 0x17], // Warm dark earth
  [0.3, 0x55, 0x3a, 0x28], // Rich soil
  [0.45, 0x6b, 0x50, 0x3c], // Lighter earth
  [0.6, 0x7a, 0x6e, 0x5a], // Near surface — muddy green-brown
  [0.7, 0x6e, 0x8b, 0x6e], // Breaking ground — muted green
  [0.8, 0x7a, 0xa8, 0xb8], // Transition — grey-blue
  [0.9, 0x87, 0xce, 0xeb], // Light sky blue
  [1.0, 0x5b, 0xb0, 0xd9], // Clear sky blue
];

function interpolateColor(progress: number): string {
  const t = Math.max(0, Math.min(1, progress));

  let lower = COLOR_STOPS[0];
  let upper = COLOR_STOPS[COLOR_STOPS.length - 1];

  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    if (t >= COLOR_STOPS[i][0] && t <= COLOR_STOPS[i + 1][0]) {
      lower = COLOR_STOPS[i];
      upper = COLOR_STOPS[i + 1];
      break;
    }
  }

  const range = upper[0] - lower[0];
  const localT = range === 0 ? 0 : (t - lower[0]) / range;
  const eased = localT * localT * (3 - 2 * localT);

  const r = Math.round(lower[1] + (upper[1] - lower[1]) * eased);
  const g = Math.round(lower[2] + (upper[2] - lower[2]) * eased);
  const b = Math.round(lower[3] + (upper[3] - lower[3]) * eased);

  return `rgb(${r}, ${g}, ${b})`;
}

/* ------------------------------------------------------------------ */
/*  8 Levels — ON SCREEN content from the pitch document              */
/* ------------------------------------------------------------------ */

interface LevelDef {
  label: string;
  content: ReactNode;
}

/* ---- Shared typography ---- */

const headlineStyle = {
  fontSize: "clamp(1.15rem, 3vw, 1.6rem)",
  fontWeight: 700,
  lineHeight: 1.5,
  marginBottom: "0.75rem",
} as const;

const bodyStyle = {
  fontSize: "clamp(0.85rem, 2vw, 1.05rem)",
  lineHeight: 1.7,
  opacity: 0.8,
  marginBottom: "0.5rem",
} as const;

const accentStyle = {
  fontSize: "clamp(1rem, 2.5vw, 1.25rem)",
  fontWeight: 600,
  color: "rgba(255, 255, 255, 0.95)",
  marginBottom: "0.25rem",
} as const;

/* ---- Card components ---- */

const cardStyle = {
  background: "linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)",
  border: "2px solid",
  borderColor: "rgba(255, 255, 255, 0.18) rgba(255, 255, 255, 0.06) rgba(255, 255, 255, 0.06) rgba(255, 255, 255, 0.18)",
  borderRadius: "4px",
  padding: "1.25rem 1.5rem",
  backdropFilter: "blur(8px)",
  boxShadow: "inset 1px 1px 0 rgba(255, 255, 255, 0.08), inset -1px -1px 0 rgba(0, 0, 0, 0.15), 0 2px 0 rgba(0, 0, 0, 0.2)",
} as const;

const cardTitleBase = {
  fontWeight: 700,
  color: "rgba(255, 255, 255, 0.95)",
  marginBottom: "0.25rem",
} as const;

const cardDescBase = {
  opacity: 0.65,
  lineHeight: 1.4,
} as const;

type CardVariant = "stat" | "tech" | "credential";

const CARD_VARIANTS: Record<CardVariant, {
  layout: React.CSSProperties;
  titleSize: string;
  descSize: string;
}> = {
  stat: {
    layout: { textAlign: "center", flex: "1 1 0", minWidth: 0 },
    titleSize: "clamp(1.4rem, 3.5vw, 2rem)",
    descSize: "clamp(0.7rem, 1.5vw, 0.8rem)",
  },
  tech: {
    layout: {},
    titleSize: "clamp(0.95rem, 2.2vw, 1.15rem)",
    descSize: "clamp(0.75rem, 1.5vw, 0.85rem)",
  },
  credential: {
    layout: { display: "flex", alignItems: "baseline", gap: "0.75rem" },
    titleSize: "clamp(1.1rem, 2.5vw, 1.4rem)",
    descSize: "clamp(0.75rem, 1.5vw, 0.85rem)",
  },
};

function InfoCard({
  title,
  desc,
  variant = "stat",
}: {
  title: string;
  desc: string;
  variant?: CardVariant;
}) {
  const v = CARD_VARIANTS[variant];
  const titleEl = variant === "credential" ? "span" : "p";
  const descEl = variant === "credential" ? "span" : "p";
  const Title = titleEl;
  const Desc = descEl;
  return (
    <div style={{ ...cardStyle, ...v.layout }}>
      <Title style={{ ...cardTitleBase, fontSize: v.titleSize, ...(variant === "credential" ? { flexShrink: 0 } : {}) }}>
        {title}
      </Title>
      <Desc style={{ ...cardDescBase, fontSize: v.descSize }}>
        {desc}
      </Desc>
    </div>
  );
}

function Card({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return <div style={{ ...cardStyle, ...style }}>{children}</div>;
}

const LEVELS: LevelDef[] = [
  /* Level 0 — The Gate (handled by GateQuestion component) */
  {
    label: "The Seed",
    content: null, // GateQuestion renders here
  },

  /* Level 1 — The Problem */
  {
    label: "The Problem",
    content: (
      <div style={{ maxWidth: 760, padding: "1.5rem" }}>
        <h2 style={headlineStyle}>
          Every important decision about people depends on how they actually behave.
        </h2>
        <h2 style={{ ...headlineStyle, marginBottom: "1rem" }}>
          Yet no one has this data.
        </h2>
        <p style={bodyStyle}>And now AI makes everyone look perfect on paper.</p>
        <p style={{ ...bodyStyle, marginBottom: "1.25rem" }}>
          Self-reporting is dead. We need a new type of signal.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <InfoCard title="40-80%" desc="of applicants use AI to write about themselves (SHRM)" />
          <InfoCard title="37%" desc="of employers don't trust resumes (Willo 2026)" />
          <InfoCard title="$8.8T" desc="lost to employee disengagement (Gallup)" />
        </div>
      </div>
    ),
  },

  /* Level 2 — The Solution */
  {
    label: "The Solution",
    content: (
      <div style={{ maxWidth: 760, padding: "1.5rem" }}>
        <p style={{ ...bodyStyle, fontStyle: "italic", opacity: 0.7 }}>
          You&rsquo;d understand yourself deeply. You&rsquo;d see others clearly.
        </p>
        <p style={{ ...bodyStyle, fontStyle: "italic", opacity: 0.7, marginBottom: "1.25rem" }}>
          And the right people would end up in the right places — not by luck, but by real understanding.
        </p>
        <h2 style={headlineStyle}>Interactive stories that capture real behavior.</h2>
        <p style={{ ...bodyStyle, marginBottom: "1.25rem" }}>Fun to play, hard to game.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1.25rem" }}>
          <InfoCard variant="tech" title="Narrative Engine" desc="Personalised stories at scale" />
          <InfoCard variant="tech" title="Interface Composer" desc="Adaptive UIs for every scenario" />
          <InfoCard variant="tech" title="Behavioural Graph" desc="Maps actions and patterns over time" />
        </div>
        <p style={{ ...bodyStyle, opacity: 0.45, fontSize: "clamp(0.7rem, 1.4vw, 0.8rem)" }}>
          Buzzfeed Quizzes x Pokemon Cards x Bandersnatch x GitHub Graph
        </p>
      </div>
    ),
  },

  /* Level 3 — Traction */
  {
    label: "Traction",
    content: (
      <div style={{ maxWidth: 760, padding: "1.5rem" }}>
        <h2 style={headlineStyle}>One campaign. $0 marketing spend.</h2>
        <h2 style={{ ...headlineStyle, marginBottom: "1.25rem", color: "rgba(255, 255, 255, 0.95)" }}>78% D3 retention.</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.6rem", marginBottom: "1rem" }}>
          <InfoCard title="38%" desc="completed full journey" />
          <InfoCard title="24,000+" desc="behavioural data points" />
          <InfoCard title="7 min" desc="median session length" />
          <InfoCard title="4" desc="unsolicited B2B inquiries" />
        </div>
        <div style={{ display: "flex", gap: "0.6rem", marginBottom: "1rem" }}>
          <InfoCard title="2,100+" desc="organic players" />
          <InfoCard title="2.7" desc="avg. games per user" />
        </div>
        <p style={bodyStyle}>4M+ combined audience via distribution partners</p>
      </div>
    ),
  },

  /* Level 4 — The Team */
  {
    label: "The Team",
    content: (
      <div style={{ maxWidth: 760, padding: "1.5rem" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gridTemplateRows: "auto auto auto auto",
            gap: "0.6rem",
          }}
        >
          {/* Photo + name — left column spanning 3 rows */}
          <div style={{ ...cardStyle, gridColumn: "1", gridRow: "1 / 4", padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/helen.png"
              alt="Helen Huang"
              style={{
                width: "100%",
                flex: 1,
                objectFit: "cover",
                borderRadius: "2px 2px 0 0",
              }}
            />
            <div style={{ padding: "0.6rem 0.75rem", textAlign: "center" }}>
              <p style={{ ...accentStyle, fontSize: "clamp(0.85rem, 2vw, 1.05rem)", marginBottom: "0.1rem" }}>
                Helen Huang
              </p>
              <p style={{ ...cardDescBase, fontSize: "clamp(0.65rem, 1.3vw, 0.75rem)" }}>
                Founder & CEO
              </p>
            </div>
          </div>

          {/* Headline card — spans 2 cols */}
          {/* Headline — right side row 1 */}
          <Card style={{ gridColumn: "2 / 4", gridRow: "1", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <h2 style={{ ...headlineStyle, fontSize: "clamp(1rem, 2.5vw, 1.3rem)", marginBottom: "0.15rem" }}>
              Bootstrapped to 7-figures.
            </h2>
            <p style={{ ...cardDescBase, fontSize: "clamp(0.75rem, 1.5vw, 0.85rem)" }}>
              Mission-driven. Building bigger.
            </p>
          </Card>

          {/* Bio — right side row 2 */}
          <Card style={{ gridColumn: "2 / 4", gridRow: "2" }}>
            <p style={{ fontSize: "clamp(0.75rem, 1.5vw, 0.85rem)", opacity: 0.7, lineHeight: 1.6 }}>
              Former PM at Microsoft and Zynga<br />
              Bootstrapped a profitable edtech startup to 7-figure revenue
            </p>
          </Card>

          {/* Credentials — right side row 3 */}
          <InfoCard variant="credential" title="2nd" desc="time founder" />
          <InfoCard variant="credential" title="#1" desc="PH #1" />

          {/* Bottom row — full width */}
          <InfoCard variant="credential" title="Forbes" desc="30 Under 30" />
          <InfoCard variant="credential" title="30K+" desc="launch audience" />
          <InfoCard variant="credential" title="7-fig" desc="bootstrapped" />
        </div>
      </div>
    ),
  },

  /* Level 5 — The Landscape */
  {
    label: "The Landscape",
    content: (
      <div style={{ maxWidth: 760, padding: "1.5rem" }}>
        <InfoCard title="$65B" desc="spent understanding people" />
        <div style={{ height: "1rem" }} />
        <p style={bodyStyle}>
          Personality Assessments &bull; Therapy &bull; Coaching &bull; Journalling &bull; Astrology
        </p>
        <p style={{ ...headlineStyle, fontSize: "clamp(1rem, 2.5vw, 1.3rem)", marginBottom: "1.5rem" }}>
          They all capture what you say. None capture what you do.
        </p>
        <p style={{ ...accentStyle, marginBottom: "0.5rem" }}>Adjacent verticals:</p>
        <p style={bodyStyle}>
          LinkedIn (Professional) &bull; Indeed (Recruiting) &bull; Hinge (Relational) &bull; CollegeBoard (Academic)
        </p>
      </div>
    ),
  },

  /* Level 6 — The Engine */
  {
    label: "The Engine",
    content: (
      <div style={{ maxWidth: 760, padding: "1.5rem" }}>
        <h2 style={headlineStyle}>Consumers build the data.</h2>
        <h2 style={{ ...headlineStyle, marginBottom: "1.25rem" }}>Enterprises pay to read it.</h2>
        <div style={{ display: "flex", gap: "0.6rem", marginBottom: "1.25rem" }}>
          <InfoCard variant="tech" title="NOW" desc="Think Duolingo — $1B+ from free to premium" />
          <InfoCard variant="tech" title="NEXT" desc="Think Plaid — $430M ARR from API access" />
        </div>
        <p style={{ ...bodyStyle, fontSize: "clamp(0.8rem, 1.8vw, 0.95rem)" }}>
          More plays &rarr; sharper models &rarr; more accurate profiles &rarr; more B2B value &rarr; more users &rarr; more plays
        </p>
      </div>
    ),
  },

  /* Level 7 — The Garden */
  {
    label: "The Garden",
    content: (
      <div style={{ maxWidth: 760, padding: "1.5rem" }}>
        <h2 style={headlineStyle}>The next 18 months:</h2>
        <h2 style={{ ...headlineStyle, marginBottom: "1.25rem" }}>from signal to seed readiness.</h2>
        <div style={{ display: "flex", gap: "0.6rem", marginBottom: "1.25rem" }}>
          <InfoCard title="100K" desc="behavioral profiles" />
          <InfoCard title="1-2" desc="paid B2B pilots" />
          <InfoCard title="Retention" desc="across verticals" />
        </div>
        <p style={bodyStyle}>$525K in formation capital from Betaworks, True Ventures, Slack Fund.</p>
        <p style={{ ...bodyStyle, marginBottom: "1.5rem" }}>Now financing the next phase.</p>
        <p style={{ ...bodyStyle, fontWeight: 600 }}>Helen Huang — howdy@helenhuang.io</p>
        <p style={{ ...bodyStyle, opacity: 0.6 }}>trove.garden</p>
        <div style={{ height: "1rem" }} />
        <p style={{ ...bodyStyle, fontStyle: "italic", opacity: 0.65 }}>
          &ldquo;People have layers. So does Trove.<br />
          Thanks for peeling back ours — now let&rsquo;s grow something together.&rdquo;
        </p>
      </div>
    ),
  },
];

export default function ScrollContainer() {
  const [scrollY, setScrollY] = useState(0);
  const [viewportH, setViewportH] = useState(0);
  const totalLevels = LEVELS.length;
  const hasTriggeredDrawing = useRef(false);
  const rafRef = useRef<number>(0);
  const lastScrollY = useRef(0);

  const { drawingDataURL, isDrawing, setIsDrawing } = useDrawingContext();
  const { gateAnswer } = useGateContext();

  useEffect(() => {
    setViewportH(window.innerHeight);

    function handleScroll() {
      if (rafRef.current) return; // already scheduled
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        const y = window.scrollY;
        if (y !== lastScrollY.current) {
          lastScrollY.current = y;
          setScrollY(y);
        }
      });
    }
    function handleResize() {
      setViewportH(window.innerHeight);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);
    handleScroll();
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Scroll lock while drawing or gate unanswered
  useEffect(() => {
    if (isDrawing || gateAnswer === null) {
      document.documentElement.style.overflow = "hidden";
    } else {
      document.documentElement.style.overflow = "";
    }
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [isDrawing, gateAnswer]);

  // When user answers "yes", scroll to Level 1
  useEffect(() => {
    if (gateAnswer === "yes" && viewportH > 0) {
      window.scrollTo({ top: viewportH, behavior: "smooth" });
    }
  }, [gateAnswer, viewportH]);

  // Extra viewport at end so the last level stays visible
  const maxScroll = (totalLevels + 1) * viewportH;
  const progress = maxScroll > 0 ? Math.min(scrollY / maxScroll, 1) : 0;
  const bgColor = interpolateColor(progress);

  // Which level is "current" based on scroll
  const currentLevelFloat = viewportH > 0 ? scrollY / viewportH : 0;

  // Trigger drawing mode when reaching Level 1 (only on "yes" path)
  // Drawing happens on Level 1 — the Problem level — before content shows
  useEffect(() => {
    if (
      gateAnswer === "yes" &&
      !hasTriggeredDrawing.current &&
      !drawingDataURL &&
      !isDrawing &&
      currentLevelFloat >= 0.8 &&
      currentLevelFloat <= 1.5
    ) {
      hasTriggeredDrawing.current = true;
      setIsDrawing(true);
    }
  }, [gateAnswer, currentLevelFloat, drawingDataURL, isDrawing, setIsDrawing]);

  const getLevelTransform = useCallback(
    (index: number) => {
      const isLast = index === LEVELS.length - 1;
      const delta = index - currentLevelFloat;

      if (delta > 1.5) {
        return { scale: 0.1, z: -2000, opacity: 0 };
      } else if (delta > 0) {
        const t = 1 - delta;
        const eased = t * t;
        return {
          scale: 0.3 + 0.7 * eased,
          z: -1200 * (1 - eased),
          opacity: Math.min(1, t * 2),
        };
      } else if (isLast) {
        return { scale: 1, z: 0, opacity: 1 };
      } else if (delta > -0.8) {
        const t = -delta;
        return {
          scale: 1 + t * 0.5,
          z: t * 400,
          opacity: Math.max(0, 1 - t * 1.8),
        };
      } else {
        return { scale: 2, z: 800, opacity: 0 };
      }
    },
    [currentLevelFloat]
  );

  const isLight = progress < 0.7;

  // "No" path — show exit screen instead of the entire scroll journey
  if (gateAnswer === "no") {
    return <ExitScreen />;
  }

  return (
    <>
      {/* Invisible scroll track */}
      <div style={{ height: maxScroll + viewportH, position: "relative" }} />

      {/* Fixed viewport with perspective */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: bgColor,
          transition: "background 0.05s linear",
          perspective: "1200px",
          perspectiveOrigin: "50% 50%",
          overflow: "hidden",
        }}
      >
        {/* Level cards — positioned in 3D space */}
        {LEVELS.map((level, i) => {
          const { scale, z, opacity } = getLevelTransform(i);
          const isLevel0 = i === 0;
          const isLevel1 = i === 1;
          const showCanvas = isLevel1 && isDrawing && !drawingDataURL;
          const showGateQuestion = isLevel0 && gateAnswer === null;

          // When drawing is active, force Level 1 to identity transform
          // so canvas coordinates aren't distorted by perspective/3D
          const forceIdentity = showCanvas;

          return (
            <div
              key={level.label}
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: forceIdentity
                  ? "none"
                  : `translateZ(${z}px) scale(${scale})`,
                opacity: forceIdentity ? 1 : opacity,
                pointerEvents: opacity < 0.1 && !forceIdentity ? "none" : "auto",
                willChange: "transform, opacity",
              }}
            >
              {showGateQuestion ? (
                <AnimatePresence>
                  <GateQuestion />
                </AnimatePresence>
              ) : showCanvas ? (
                <DrawingCanvas />
              ) : (
                <div
                  style={{
                    textAlign: "left",
                    color: isLight
                      ? "rgba(255,255,255,0.85)"
                      : "rgba(30,30,30,0.85)",
                    transition: "color 0.5s ease",
                  }}
                >
                  {level.content}
                </div>
              )}
            </div>
          );
        })}

        {/* ASCII garden — visible on the last level */}
        {currentLevelFloat >= 6 && (
          <AsciiGarden pixelSize={4} flowerCount={45} />
        )}

        {/* Companion sprite — appears after drawing on levels past 1 */}
        {drawingDataURL && currentLevelFloat > 1.5 && (
          <CompanionSprite currentLevel={Math.floor(currentLevelFloat)} />
        )}
      </div>
    </>
  );
}
