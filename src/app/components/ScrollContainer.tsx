"use client";

import { useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import { AnimatePresence } from "framer-motion";
import { useDrawingContext } from "./DrawingProvider";
import { useGateContext } from "./GateProvider";
import DrawingCanvas from "./DrawingCanvas/DrawingCanvas";
import CompanionSprite from "./CompanionSprite/CompanionSprite";
import GateQuestion from "./GateQuestion/GateQuestion";
import ExitScreen from "./ExitScreen/ExitScreen";


/**
 * Per-level colors — distributed dynamically across all flat pages.
 */
const LEVEL_COLORS: [number, number, number][] = [
  [0x2c, 0x18, 0x10], // Level 0 — Dark brown bedrock
  [0x3e, 0x24, 0x17], // Level 1 — Warm dark earth
  [0x55, 0x3a, 0x28], // Level 2 — Rich soil
  [0x6b, 0x50, 0x3c], // Level 3 — Lighter earth
  [0x7a, 0x6e, 0x5a], // Level 4 — Near surface
  [0x6e, 0x8b, 0x6e], // Level 5 — Muted green
  [0x7a, 0xa8, 0xb8], // Level 6 — Grey-blue
  [0x87, 0xce, 0xeb], // Level 7 — Sky blue
];

function buildColorStops(
  levels: LevelDef[],
  colors: [number, number, number][]
): [number, number, number, number][] {
  const totalPages = levels.reduce((s, l) => s + l.pages.length, 0);
  const stops: [number, number, number, number][] = [];
  let offset = 0;
  for (let i = 0; i < levels.length; i++) {
    const t = totalPages > 0 ? offset / totalPages : 0;
    stops.push([t, colors[i][0], colors[i][1], colors[i][2]]);
    offset += levels[i].pages.length;
  }
  // End stop
  const last = colors[colors.length - 1];
  stops.push([1.0, last[0], last[1], last[2]]);
  return stops;
}

function interpolateColor(
  progress: number,
  stops: [number, number, number, number][]
): string {
  const t = Math.max(0, Math.min(1, progress));

  let lower = stops[0];
  let upper = stops[stops.length - 1];

  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i][0] && t <= stops[i + 1][0]) {
      lower = stops[i];
      upper = stops[i + 1];
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

/* ---- Mobile detection ---- */

function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`);
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [breakpoint]);
  return isMobile;
}

/* ------------------------------------------------------------------ */
/*  8 Levels, multi-page — each page shows one key idea              */
/* ------------------------------------------------------------------ */

interface PageDef {
  content: ReactNode;
}

interface LevelDef {
  label: string;
  pages: PageDef[];
}

interface FlatPage {
  levelIndex: number;
  pageIndex: number;
  globalIndex: number;
}

/* ---- Shared typography ---- */

const headlineStyle = {
  fontFamily: "var(--font-pixel)",
  fontSize: "clamp(1.15rem, 3vw, 1.6rem)",
  fontWeight: 700,
  lineHeight: 1.5,
  marginBottom: "0.75rem",
} as const;

const bodyStyle = {
  fontFamily: "var(--font-geist)",
  fontSize: "clamp(0.95rem, 2.2vw, 1.1rem)",
  lineHeight: 1.7,
  opacity: 0.8,
  marginBottom: "0.5rem",
} as const;

const accentStyle = {
  fontFamily: "var(--font-pixel)",
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
  padding: "clamp(0.75rem, 3vw, 1.25rem) clamp(1rem, 4vw, 1.5rem)",
  backdropFilter: "blur(8px)",
  boxShadow: "inset 1px 1px 0 rgba(255, 255, 255, 0.08), inset -1px -1px 0 rgba(0, 0, 0, 0.15), 0 2px 0 rgba(0, 0, 0, 0.2)",
} as const;

const cardTitleBase = {
  fontFamily: "var(--font-pixel)",
  fontWeight: 700,
  color: "rgba(255, 255, 255, 0.95)",
  marginBottom: "0.25rem",
} as const;

const cardDescBase = {
  fontFamily: "var(--font-geist)",
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

/* ---- Page wrapper with mobile-friendly padding ---- */

const pageWrap = {
  maxWidth: 760,
  padding: "1.5rem clamp(1rem, 5vw, 1.5rem)",
  width: "100%",
} as const;

const LEVELS: LevelDef[] = [
  /* Level 0 — The Gate */
  {
    label: "The Seed",
    pages: [{ content: null }], // GateQuestion renders here
  },

  /* Level 1 — The Problem */
  {
    label: "The Problem",
    pages: [
      {
        content: (
          <div style={pageWrap}>
            <h2 style={headlineStyle}>
              Every important decision about people depends on how they actually behave.
            </h2>
            <h2 style={headlineStyle}>Yet no one has this data.</h2>
            <p style={bodyStyle}>
              AI makes everyone look perfect on paper. Self-reporting is dead.
            </p>
            <p style={{ ...accentStyle, marginTop: "0.5rem" }}>We need a new type of signal.</p>
          </div>
        ),
      },
      {
        content: (
          <div style={pageWrap}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <InfoCard title="40-80%" desc="of applicants use AI to write about themselves (SHRM)" />
              <InfoCard title="37%" desc="of employers don't trust resumes (Willo 2026)" />
              <InfoCard title="$8.8T" desc="lost to employee disengagement (Gallup)" />
            </div>
          </div>
        ),
      },
    ],
  },

  /* Level 2 — The Solution */
  {
    label: "The Solution",
    pages: [
      {
        content: (
          <div style={pageWrap}>
            <p style={{ ...bodyStyle, fontStyle: "italic", opacity: 0.7 }}>
              You&rsquo;d understand yourself deeply. You&rsquo;d see others clearly.
            </p>
            <p style={{ ...bodyStyle, fontStyle: "italic", opacity: 0.7, marginBottom: "1rem" }}>
              The right people would end up in the right places — not by luck, but by real understanding.
            </p>
            <h2 style={headlineStyle}>Interactive stories that capture real behavior.</h2>
            <p style={accentStyle}>Fun to play, hard to game.</p>
          </div>
        ),
      },
      {
        content: (
          <div style={pageWrap}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1rem" }}>
              <InfoCard variant="tech" title="Narrative Engine" desc="Personalised stories at scale" />
              <InfoCard variant="tech" title="Interface Composer" desc="Adaptive UIs for every scenario" />
              <InfoCard variant="tech" title="Behavioural Graph" desc="Maps actions and patterns over time" />
            </div>
            <p style={{ ...bodyStyle, opacity: 0.45, fontSize: "clamp(0.75rem, 1.4vw, 0.8rem)" }}>
              Buzzfeed Quizzes x Pokemon Cards x Bandersnatch x GitHub Graph
            </p>
          </div>
        ),
      },
    ],
  },

  /* Level 3 — Traction */
  {
    label: "Traction",
    pages: [
      {
        content: (
          <div style={pageWrap}>
            <h2 style={headlineStyle}>One campaign. $0 marketing spend.</h2>
            <h2 style={{ ...headlineStyle, color: "rgba(255, 255, 255, 0.95)" }}>78% D3 retention.</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.6rem", marginTop: "1rem" }}>
              <InfoCard title="38%" desc="completed full journey" />
              <InfoCard title="24,000+" desc="behavioural data points" />
              <InfoCard title="7 min" desc="median session length" />
              <InfoCard title="4" desc="unsolicited B2B inquiries" />
            </div>
          </div>
        ),
      },
      {
        content: (
          <div style={pageWrap}>
            <div style={{ display: "flex", gap: "0.6rem", marginBottom: "1rem", flexWrap: "wrap" }}>
              <InfoCard title="2,100+" desc="organic players" />
              <InfoCard title="2.7" desc="avg. games per user" />
            </div>
            <p style={bodyStyle}>4M+ combined audience via distribution partners</p>
          </div>
        ),
      },
    ],
  },

  /* Level 4 — The Team (uses isMobile via TeamPage component below) */
  {
    label: "The Team",
    pages: [{ content: "TEAM_PAGE" as unknown as ReactNode }], // Rendered dynamically
  },

  /* Level 5 — The Landscape */
  {
    label: "The Landscape",
    pages: [
      {
        content: (
          <div style={pageWrap}>
            <InfoCard title="$65B" desc="spent understanding people" />
            <div style={{ height: "1rem" }} />
            <p style={bodyStyle}>
              Personality Assessments &bull; Therapy &bull; Coaching &bull; Journalling &bull; Astrology
            </p>
            <h2 style={{ ...headlineStyle, fontSize: "clamp(1rem, 2.5vw, 1.3rem)", marginTop: "0.5rem" }}>
              They all capture what you say. None capture what you do.
            </h2>
          </div>
        ),
      },
      {
        content: (
          <div style={pageWrap}>
            <p style={{ ...accentStyle, marginBottom: "0.75rem" }}>Adjacent verticals:</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <InfoCard variant="tech" title="LinkedIn" desc="Professional identity" />
              <InfoCard variant="tech" title="Indeed" desc="Recruiting signals" />
              <InfoCard variant="tech" title="Hinge" desc="Relational behavior" />
              <InfoCard variant="tech" title="CollegeBoard" desc="Academic assessment" />
            </div>
          </div>
        ),
      },
    ],
  },

  /* Level 6 — The Engine */
  {
    label: "The Engine",
    pages: [
      {
        content: (
          <div style={pageWrap}>
            <h2 style={headlineStyle}>Consumers build the data.</h2>
            <h2 style={{ ...headlineStyle, marginBottom: "1rem" }}>Enterprises pay to read it.</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <InfoCard variant="tech" title="NOW" desc="Think Duolingo — $1B+ from free to premium" />
              <InfoCard variant="tech" title="NEXT" desc="Think Plaid — $430M ARR from API access" />
            </div>
          </div>
        ),
      },
      {
        content: "FLYWHEEL_PAGE" as unknown as ReactNode, // Rendered dynamically
      },
    ],
  },

  /* Level 7 — The Garden */
  {
    label: "The Garden",
    pages: [
      {
        content: (
          <div style={pageWrap}>
            <h2 style={headlineStyle}>The next 18 months:</h2>
            <h2 style={{ ...headlineStyle, marginBottom: "1rem" }}>from signal to seed readiness.</h2>
            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
              <InfoCard title="100K" desc="behavioral profiles" />
              <InfoCard title="1-2" desc="paid B2B pilots" />
            </div>
          </div>
        ),
      },
      {
        content: (
          <div style={{ ...pageWrap, display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "flex-start", paddingTop: "clamp(2rem, 8vh, 4rem)" }}>
            <h2 style={headlineStyle}>$525K in formation capital.</h2>
            <p style={bodyStyle}>Betaworks, True Ventures, Slack Fund. Now financing the next phase.</p>
            <p style={{ ...bodyStyle, fontWeight: 600, marginTop: "1rem" }}>Helen Huang — howdy@helenhuang.io</p>
            <p style={{ ...bodyStyle, opacity: 0.6 }}>trove.garden</p>
            <p style={{ ...bodyStyle, fontStyle: "italic", opacity: 0.65, marginTop: "1rem" }}>
              &ldquo;People have layers. So does Trove.<br />
              Thanks for peeling back ours — now let&rsquo;s grow something together.&rdquo;
            </p>
          </div>
        ),
      },
    ],
  },
];

/* ---- Flatten levels into pages for scroll math ---- */

const FLAT_PAGES: FlatPage[] = [];
let _gi = 0;
for (let li = 0; li < LEVELS.length; li++) {
  for (let pi = 0; pi < LEVELS[li].pages.length; pi++) {
    FLAT_PAGES.push({ levelIndex: li, pageIndex: pi, globalIndex: _gi });
    _gi++;
  }
}
const TOTAL_PAGES = FLAT_PAGES.length;
const COLOR_STOPS = buildColorStops(LEVELS, LEVEL_COLORS);

/* Find flat index for a given level's first page */
function flatIndexForLevel(levelIndex: number): number {
  const fp = FLAT_PAGES.find((p) => p.levelIndex === levelIndex);
  return fp ? fp.globalIndex : 0;
}

/* ---- Team page component (needs isMobile) ---- */

function TeamPage({ isMobile }: { isMobile: boolean }) {
  if (isMobile) {
    return (
      <div style={pageWrap}>
        {/* Stacked layout for mobile */}
        <div style={{ ...cardStyle, padding: 0, overflow: "hidden", marginBottom: "0.6rem" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/helen.png"
            alt="Helen Huang"
            style={{ width: "100%", maxHeight: "280px", objectFit: "cover", borderRadius: "2px 2px 0 0" }}
          />
          <div style={{ padding: "0.6rem 0.75rem", textAlign: "center" }}>
            <p style={{ ...accentStyle, fontSize: "clamp(0.95rem, 2.5vw, 1.1rem)", marginBottom: "0.1rem" }}>
              Helen Huang
            </p>
            <p style={{ ...cardDescBase, fontSize: "clamp(0.75rem, 1.5vw, 0.8rem)" }}>
              Founder & CEO
            </p>
          </div>
        </div>
        <Card style={{ marginBottom: "0.6rem" }}>
          <h2 style={{ ...headlineStyle, fontSize: "clamp(1rem, 2.5vw, 1.2rem)", marginBottom: "0.15rem" }}>
            Bootstrapped to 7-figures.
          </h2>
          <p style={{ ...cardDescBase, fontSize: "clamp(0.8rem, 1.8vw, 0.9rem)" }}>
            Mission-driven. Building bigger.
          </p>
        </Card>
        <Card style={{ marginBottom: "0.6rem" }}>
          <p style={{ ...bodyStyle, fontSize: "clamp(0.8rem, 1.8vw, 0.9rem)", opacity: 0.7, marginBottom: 0 }}>
            Former PM at Microsoft and Zynga. Bootstrapped a profitable edtech startup to 7-figure revenue.
          </p>
        </Card>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
          <InfoCard variant="credential" title="2nd" desc="time founder" />
          <InfoCard variant="credential" title="#1" desc="PH #1" />
          <InfoCard variant="credential" title="Forbes" desc="30 Under 30" />
          <InfoCard variant="credential" title="30K+" desc="launch audience" />
        </div>
      </div>
    );
  }

  return (
    <div style={pageWrap}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gridTemplateRows: "auto auto auto auto",
          gap: "0.6rem",
        }}
      >
        <div style={{ ...cardStyle, gridColumn: "1", gridRow: "1 / 4", padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/helen.png"
            alt="Helen Huang"
            style={{ width: "100%", flex: 1, objectFit: "cover", borderRadius: "2px 2px 0 0" }}
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
        <Card style={{ gridColumn: "2 / 4", gridRow: "1", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <h2 style={{ ...headlineStyle, fontSize: "clamp(1rem, 2.5vw, 1.3rem)", marginBottom: "0.15rem" }}>
            Bootstrapped to 7-figures.
          </h2>
          <p style={{ ...cardDescBase, fontSize: "clamp(0.75rem, 1.5vw, 0.85rem)" }}>
            Mission-driven. Building bigger.
          </p>
        </Card>
        <Card style={{ gridColumn: "2 / 4", gridRow: "2" }}>
          <p style={{ fontSize: "clamp(0.75rem, 1.5vw, 0.85rem)", opacity: 0.7, lineHeight: 1.6 }}>
            Former PM at Microsoft and Zynga<br />
            Bootstrapped a profitable edtech startup to 7-figure revenue
          </p>
        </Card>
        <InfoCard variant="credential" title="2nd" desc="time founder" />
        <InfoCard variant="credential" title="#1" desc="PH #1" />
        <InfoCard variant="credential" title="Forbes" desc="30 Under 30" />
        <InfoCard variant="credential" title="30K+" desc="launch audience" />
        <InfoCard variant="credential" title="7-fig" desc="bootstrapped" />
      </div>
    </div>
  );
}

/* ---- Flywheel node map (Slay the Spire style) ---- */

const FLYWHEEL_NODES = [
  { label: "More plays", icon: "▶" },
  { label: "Sharper models", icon: "◆" },
  { label: "Accurate profiles", icon: "◉" },
  { label: "B2B value", icon: "★" },
  { label: "More users", icon: "●" },
];

function FlywheelPage() {
  const r = 120; // radius of the circle
  const cx = 160; // center x
  const cy = 150; // center y
  const nodeSize = 20;

  // Position nodes in a circle (starting from top, clockwise)
  const nodes = FLYWHEEL_NODES.map((node, i) => {
    const angle = (i / FLYWHEEL_NODES.length) * Math.PI * 2 - Math.PI / 2;
    return {
      ...node,
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  });

  return (
    <div style={{ ...pageWrap, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <h2 style={{ ...headlineStyle, fontSize: "clamp(1rem, 2.5vw, 1.2rem)", textAlign: "center", marginBottom: "1rem" }}>
        The flywheel:
      </h2>
      <svg
        viewBox="0 0 320 300"
        style={{ width: "min(320px, 85vw)", height: "auto" }}
      >
        {/* Connecting paths between nodes — dashed trail style */}
        {nodes.map((node, i) => {
          const next = nodes[(i + 1) % nodes.length];
          // Curved path via center offset
          const mx = (node.x + next.x) / 2 + (cy - (node.y + next.y) / 2) * 0.3;
          const my = (node.y + next.y) / 2 - (cx - (node.x + next.x) / 2) * 0.3;
          return (
            <path
              key={`path-${i}`}
              d={`M ${node.x} ${node.y} Q ${mx} ${my} ${next.x} ${next.y}`}
              fill="none"
              stroke="rgba(44,24,16,0.25)"
              strokeWidth="2"
              strokeDasharray="6 4"
            />
          );
        })}

        {/* Arrow indicators on paths */}
        {nodes.map((node, i) => {
          const next = nodes[(i + 1) % nodes.length];
          const midX = (node.x + next.x) / 2;
          const midY = (node.y + next.y) / 2;
          const angle = Math.atan2(next.y - node.y, next.x - node.x) * (180 / Math.PI);
          return (
            <g key={`arrow-${i}`} transform={`translate(${midX}, ${midY}) rotate(${angle})`}>
              <polygon
                points="0,-4 8,0 0,4"
                fill="rgba(44,24,16,0.35)"
              />
            </g>
          );
        })}

        {/* Node circles + labels */}
        {nodes.map((node, i) => (
          <g key={`node-${i}`}>
            {/* Outer glow */}
            <circle
              cx={node.x}
              cy={node.y}
              r={nodeSize + 4}
              fill="none"
              stroke="rgba(44,24,16,0.1)"
              strokeWidth="2"
            />
            {/* Node background */}
            <circle
              cx={node.x}
              cy={node.y}
              r={nodeSize}
              fill="rgba(44,24,16,0.08)"
              stroke="rgba(44,24,16,0.3)"
              strokeWidth="2"
            />
            {/* Icon */}
            <text
              x={node.x}
              y={node.y + 1}
              textAnchor="middle"
              dominantBaseline="central"
              fill="rgba(44,24,16,0.7)"
              fontSize="12"
              fontFamily="var(--font-pixel)"
            >
              {node.icon}
            </text>
            {/* Label */}
            <text
              x={node.x}
              y={node.y + nodeSize + 16}
              textAnchor="middle"
              fill="rgba(44,24,16,0.75)"
              fontSize="11"
              fontWeight="500"
              fontFamily="var(--font-geist)"
            >
              {node.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function ScrollContainer() {
  const [scrollY, setScrollY] = useState(0);
  const [viewportH, setViewportH] = useState(0);
  const hasTriggeredDrawing = useRef(false);
  const rafRef = useRef<number>(0);
  const lastScrollY = useRef(0);
  const isMobile = useIsMobile();

  const { drawingDataURL, isDrawing, setIsDrawing } = useDrawingContext();
  const { gateAnswer } = useGateContext();

  // Flat page index for key levels
  const drawingPageIndex = flatIndexForLevel(1); // Level 1 first page
  const gardenStartPage = flatIndexForLevel(7); // Level 7

  useEffect(() => {
    setViewportH(window.innerHeight);

    function handleScroll() {
      if (rafRef.current) return;
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

  // When user answers "yes", scroll to Level 1's first page
  useEffect(() => {
    if (gateAnswer === "yes" && viewportH > 0) {
      window.scrollTo({ top: drawingPageIndex * viewportH, behavior: "smooth" });
    }
  }, [gateAnswer, viewportH, drawingPageIndex]);

  // Scroll math based on flat pages
  const maxScroll = (TOTAL_PAGES + 1) * viewportH;
  const progress = maxScroll > 0 ? Math.min(scrollY / maxScroll, 1) : 0;
  const bgColor = interpolateColor(progress, COLOR_STOPS);

  // Which flat page is "current" based on scroll
  const currentPageFloat = viewportH > 0 ? scrollY / viewportH : 0;

  // Map currentPageFloat back to a level index for CompanionSprite
  const currentLevelIndex = (() => {
    for (let i = FLAT_PAGES.length - 1; i >= 0; i--) {
      if (currentPageFloat >= FLAT_PAGES[i].globalIndex) return FLAT_PAGES[i].levelIndex;
    }
    return 0;
  })();

  // Trigger drawing mode when reaching Level 1's first page
  useEffect(() => {
    if (
      gateAnswer === "yes" &&
      !hasTriggeredDrawing.current &&
      !drawingDataURL &&
      !isDrawing &&
      currentPageFloat >= drawingPageIndex - 0.2 &&
      currentPageFloat <= drawingPageIndex + 0.5
    ) {
      hasTriggeredDrawing.current = true;
      setIsDrawing(true);
    }
  }, [gateAnswer, currentPageFloat, drawingDataURL, isDrawing, setIsDrawing, drawingPageIndex]);

  const getPageTransform = useCallback(
    (flatIndex: number) => {
      const isLast = flatIndex === TOTAL_PAGES - 1;
      const delta = flatIndex - currentPageFloat;

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
    [currentPageFloat]
  );

  const isLight = progress < 0.7;

  // "No" path
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
        {/* Pages positioned in 3D space */}
        {FLAT_PAGES.map((fp) => {
          const level = LEVELS[fp.levelIndex];
          const page = level.pages[fp.pageIndex];
          const { scale, z, opacity } = getPageTransform(fp.globalIndex);

          const isGate = fp.levelIndex === 0 && fp.pageIndex === 0;
          const isLastPage = fp.globalIndex === TOTAL_PAGES - 1;
          const isDrawingPage = fp.globalIndex === drawingPageIndex;
          const showCanvas = isDrawingPage && isDrawing && !drawingDataURL;
          const showGateQuestion = isGate && gateAnswer === null;
          const forceIdentity = showCanvas;

          // Determine content — handle dynamic team page
          let pageContent = page.content;
          if (page.content === ("TEAM_PAGE" as unknown)) {
            pageContent = <TeamPage isMobile={isMobile} />;
          } else if (page.content === ("FLYWHEEL_PAGE" as unknown)) {
            pageContent = <FlywheelPage />;
          }

          return (
            <div
              key={`${fp.levelIndex}-${fp.pageIndex}`}
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: isLastPage ? "flex-start" : "center",
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
                    width: "100%",
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  {pageContent}
                </div>
              )}
            </div>
          );
        })}

        {/* Dithered flowers — fades in at the bottom on final pages */}
        {currentPageFloat >= TOTAL_PAGES - 1.5 && (
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              pointerEvents: "none",
              opacity: Math.min(1, (currentPageFloat - (TOTAL_PAGES - 1.5)) * 2),
              transition: "opacity 0.3s ease",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/flowers.webp"
              alt=""
              style={{
                display: "block",
                width: "100%",
                height: "clamp(200px, 40vh, 400px)",
                objectFit: "cover",
                objectPosition: "top center",
              }}
            />
            {/* Transparency gradient — fades top edge into sky background */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: `linear-gradient(to bottom, ${bgColor} 0%, transparent 50%)`,
              }}
            />
          </div>
        )}

        {/* Companion sprite — appears after drawing */}
        {drawingDataURL && currentPageFloat > drawingPageIndex + 1.5 && (
          <CompanionSprite currentLevel={currentLevelIndex} />
        )}
      </div>
    </>
  );
}
