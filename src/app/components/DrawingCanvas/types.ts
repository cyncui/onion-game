export interface Point {
  x: number;
  y: number;
  pressure: number;
}

export interface Stroke {
  points: Point[];
  color: string;
  size: number;
  tool: "brush" | "eraser";
}

export type Tool = "brush" | "eraser";
