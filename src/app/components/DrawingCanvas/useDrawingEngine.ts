"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import type { Point, Stroke, Tool } from "./types";

const DEFAULT_COLOR = "#2d5016";
const DEFAULT_SIZE = 12;

/** Draw a single stroke onto a canvas context using quadratic Bezier smoothing. */
function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  if (stroke.points.length === 0) return;

  const isEraser = stroke.tool === "eraser";

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (isEraser) {
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "rgba(0,0,0,1)";
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = stroke.color;
  }

  const pts = stroke.points;

  if (pts.length === 1) {
    // Single dot
    const p = pts[0];
    const r = (stroke.size * Math.max(0.3, p.pressure)) / 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = isEraser ? "rgba(0,0,0,1)" : stroke.color;
    if (isEraser) ctx.globalCompositeOperation = "destination-out";
    ctx.fill();
    ctx.restore();
    return;
  }

  // Draw with quadratic Bezier for smoothness
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);

  for (let i = 0; i < pts.length - 1; i++) {
    const curr = pts[i];
    const next = pts[i + 1];
    const midX = (curr.x + next.x) / 2;
    const midY = (curr.y + next.y) / 2;

    // Pressure-based width
    const pressure = Math.max(0.3, (curr.pressure + next.pressure) / 2);
    ctx.lineWidth = stroke.size * pressure;

    ctx.quadraticCurveTo(curr.x, curr.y, midX, midY);
  }

  // Final segment to last point
  const last = pts[pts.length - 1];
  ctx.lineWidth = stroke.size * Math.max(0.3, last.pressure);
  ctx.lineTo(last.x, last.y);
  ctx.stroke();
  ctx.restore();
}

/** Redraw all strokes onto a cleared canvas. */
function redrawAll(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  strokes: Stroke[]
) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const stroke of strokes) {
    drawStroke(ctx, stroke);
  }
}

export interface DrawingEngine {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  undo: () => void;
  clear: () => void;
  getDataURL: () => string;
  currentTool: Tool;
  currentColor: string;
  currentSize: number;
  setTool: (tool: Tool) => void;
  setColor: (color: string) => void;
  setBrushSize: (size: number) => void;
  hasStrokes: boolean;
}

export function useDrawingEngine(): DrawingEngine {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const isPointerDownRef = useRef(false);

  // These are for the toolbar UI — infrequent updates, fine in state
  const [currentTool, setCurrentTool] = useState<Tool>("brush");
  const [currentColor, setCurrentColor] = useState(DEFAULT_COLOR);
  const [currentSize, setCurrentSize] = useState(DEFAULT_SIZE);
  const [hasStrokes, setHasStrokes] = useState(false);

  // Refs that shadow the state so pointer handlers always see latest values
  const toolRef = useRef(currentTool);
  const colorRef = useRef(currentColor);
  const sizeRef = useRef(currentSize);

  useEffect(() => {
    toolRef.current = currentTool;
  }, [currentTool]);
  useEffect(() => {
    colorRef.current = currentColor;
  }, [currentColor]);
  useEffect(() => {
    sizeRef.current = currentSize;
  }, [currentSize]);

  // Map pointer position to canvas CSS coordinates.
  // The parent level card has transform: none while drawing is active,
  // so getBoundingClientRect is accurate here.
  const getCanvasPoint = useCallback(
    (e: PointerEvent): Point => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        pressure: e.pressure > 0 ? e.pressure : 0.5,
      };
    },
    []
  );

  // Pointer handlers
  const handlePointerDown = useCallback(
    (e: PointerEvent) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.setPointerCapture(e.pointerId);

      isPointerDownRef.current = true;
      const point = getCanvasPoint(e);

      currentStrokeRef.current = {
        points: [point],
        color: colorRef.current,
        size: sizeRef.current,
        tool: toolRef.current,
      };
    },
    [getCanvasPoint]
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!isPointerDownRef.current || !currentStrokeRef.current) return;
      e.preventDefault();

      const ctx = ctxRef.current;
      if (!ctx) return;

      const point = getCanvasPoint(e);
      const stroke = currentStrokeRef.current;
      stroke.points.push(point);

      // Incremental draw: just the latest segment
      const pts = stroke.points;
      if (pts.length < 2) return;

      const prev = pts[pts.length - 2];
      const curr = pts[pts.length - 1];
      const midX = (prev.x + curr.x) / 2;
      const midY = (prev.y + curr.y) / 2;
      const pressure = Math.max(0.3, (prev.pressure + curr.pressure) / 2);

      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (stroke.tool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(0,0,0,1)";
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = stroke.color;
      }

      ctx.lineWidth = stroke.size * pressure;
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
      ctx.stroke();
      ctx.restore();
    },
    [getCanvasPoint]
  );

  const handlePointerUp = useCallback(() => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;

    if (currentStrokeRef.current && currentStrokeRef.current.points.length > 0) {
      strokesRef.current.push(currentStrokeRef.current);
      // Cap at 50 strokes
      if (strokesRef.current.length > 50) {
        strokesRef.current = strokesRef.current.slice(-50);
      }
      setHasStrokes(true);
    }
    currentStrokeRef.current = null;
  }, []);

  // Initialize canvas dimensions once on mount
  const initializedRef = useRef(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || initializedRef.current) return;

    // Wait a frame to ensure layout is complete
    requestAnimationFrame(() => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctxRef.current = ctx;
      initializedRef.current = true;
    });
  }, []);

  // Attach pointer event listeners (separate from init so they don't reset canvas)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointerleave", handlePointerUp);

    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointerleave", handlePointerUp);
    };
  }, [handlePointerDown, handlePointerMove, handlePointerUp]);

  const undo = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    strokesRef.current.pop();
    setHasStrokes(strokesRef.current.length > 0);
    redrawAll(canvas, ctx, strokesRef.current);
  }, []);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    strokesRef.current = [];
    setHasStrokes(false);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const getDataURL = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return "";
    return canvas.toDataURL("image/png");
  }, []);

  return {
    canvasRef,
    undo,
    clear,
    getDataURL,
    currentTool,
    currentColor,
    currentSize,
    setTool: setCurrentTool,
    setColor: setCurrentColor,
    setBrushSize: setCurrentSize,
    hasStrokes,
  };
}
