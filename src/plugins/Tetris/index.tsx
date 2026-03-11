"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const COLS = 10;
const ROWS = 20;
const CELL = 28;
const CANVAS_W = COLS * CELL;
const CANVAS_H = ROWS * CELL;

type Color = string;
type Board = (Color | null)[][];

const PIECES = [
  { shape: [[1, 1, 1, 1]], color: "#22d3ee" },         // I
  { shape: [[1, 1], [1, 1]], color: "#fbbf24" },        // O
  { shape: [[0, 1, 0], [1, 1, 1]], color: "#a78bfa" },  // T
  { shape: [[0, 1, 1], [1, 1, 0]], color: "#4ade80" },  // S
  { shape: [[1, 1, 0], [0, 1, 1]], color: "#f87171" },  // Z
  { shape: [[1, 0, 0], [1, 1, 1]], color: "#60a5fa" },  // J
  { shape: [[0, 0, 1], [1, 1, 1]], color: "#fb923c" },  // L
];

function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function randomPiece() {
  const p = PIECES[Math.floor(Math.random() * PIECES.length)];
  return {
    shape: p.shape.map((r) => [...r]),
    color: p.color,
    x: Math.floor(COLS / 2) - Math.floor(p.shape[0].length / 2),
    y: 0,
  };
}

function rotate(shape: number[][]): number[][] {
  const rows = shape.length;
  const cols = shape[0].length;
  const result = Array.from({ length: cols }, () => Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function isValid(board: Board, shape: number[][], x: number, y: number): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = x + c, ny = y + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return false;
      if (ny >= 0 && board[ny][nx]) return false;
    }
  }
  return true;
}

function merge(board: Board, shape: number[][], x: number, y: number, color: string): Board {
  const b = board.map((r) => [...r]);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      if (shape[r][c] && y + r >= 0) b[y + r][x + c] = color;
  return b;
}

function clearLines(board: Board): { board: Board; cleared: number } {
  const kept = board.filter((row) => row.some((cell) => !cell));
  const cleared = ROWS - kept.length;
  const newRows = Array.from({ length: cleared }, () => Array(COLS).fill(null));
  return { board: [...newRows, ...kept], cleared };
}

function drawCell(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(cx + 1, cy + 1, CELL - 2, CELL - 2);
  // Highlight top
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.fillRect(cx + 2, cy + 2, CELL - 5, 5);
  // Shadow bottom
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(cx + 2, cy + CELL - 6, CELL - 5, 4);
}

export default function Tetris() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardRef = useRef<Board>(emptyBoard());
  const pieceRef = useRef(randomPiece());
  const nextRef = useRef(randomPiece());
  const scoreRef = useRef(0);
  const linesRef = useRef(0);
  const levelRef = useRef(1);
  const phaseRef = useRef<"idle" | "playing" | "gameover">("idle");
  const lastDropRef = useRef(0);
  const animRef = useRef(0);
  const [display, setDisplay] = useState({
    score: 0, lines: 0, level: 1,
    phase: "idle" as "idle" | "playing" | "gameover",
  });

  const getDropInterval = () => Math.max(80, 800 - (levelRef.current - 1) * 72);

  const lockPiece = useCallback(() => {
    const piece = pieceRef.current;
    const board = merge(boardRef.current, piece.shape, piece.x, piece.y, piece.color);
    const { board: newBoard, cleared } = clearLines(board);
    boardRef.current = newBoard;
    if (cleared > 0) {
      const pts = [0, 100, 300, 500, 800][cleared] * levelRef.current;
      scoreRef.current += pts;
      linesRef.current += cleared;
      levelRef.current = Math.floor(linesRef.current / 10) + 1;
    }
    const next = nextRef.current;
    pieceRef.current = next;
    nextRef.current = randomPiece();
    if (!isValid(boardRef.current, next.shape, next.x, next.y)) {
      phaseRef.current = "gameover";
      setDisplay({ score: scoreRef.current, lines: linesRef.current, level: levelRef.current, phase: "gameover" });
    } else {
      setDisplay({ score: scoreRef.current, lines: linesRef.current, level: levelRef.current, phase: "playing" });
    }
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const board = boardRef.current;
    const piece = pieceRef.current;
    const phase = phaseRef.current;

    // Background
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 0.5;
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        ctx.strokeRect(c * CELL, r * CELL, CELL, CELL);

    // Ghost piece
    if (phase === "playing") {
      let ghostY = piece.y;
      while (isValid(board, piece.shape, piece.x, ghostY + 1)) ghostY++;
      if (ghostY !== piece.y) {
        for (let r = 0; r < piece.shape.length; r++) {
          for (let c = 0; c < piece.shape[r].length; c++) {
            if (!piece.shape[r][c]) continue;
            ctx.fillStyle = "rgba(255,255,255,0.08)";
            ctx.fillRect((piece.x + c) * CELL + 1, (ghostY + r) * CELL + 1, CELL - 2, CELL - 2);
          }
        }
      }
    }

    // Board
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (board[r][c]) drawCell(ctx, c * CELL, r * CELL, board[r][c]!);

    // Active piece
    if (phase === "playing") {
      for (let r = 0; r < piece.shape.length; r++)
        for (let c = 0; c < piece.shape[r].length; c++)
          if (piece.shape[r][c]) drawCell(ctx, (piece.x + c) * CELL, (piece.y + r) * CELL, piece.color);
    }

    // Overlay
    if (phase !== "playing") {
      ctx.fillStyle = "rgba(0,0,0,0.72)";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.textAlign = "center";
      if (phase === "idle") {
        ctx.fillStyle = "#a78bfa";
        ctx.font = "bold 34px monospace";
        ctx.fillText("TETRIS", CANVAS_W / 2, CANVAS_H / 2 - 40);
      } else {
        ctx.fillStyle = "#f87171";
        ctx.font = "bold 28px monospace";
        ctx.fillText("GAME OVER", CANVAS_W / 2, CANVAS_H / 2 - 50);
        ctx.fillStyle = "#e2e8f0";
        ctx.font = "15px monospace";
        ctx.fillText(`Score: ${scoreRef.current}`, CANVAS_W / 2, CANVAS_H / 2 - 10);
        ctx.fillText(`Lines: ${linesRef.current}`, CANVAS_W / 2, CANVAS_H / 2 + 14);
      }
      ctx.fillStyle = "#94a3b8";
      ctx.font = "13px monospace";
      ctx.fillText("Press Enter to start", CANVAS_W / 2, CANVAS_H / 2 + 44);
      ctx.fillText("← → ↓  Move    ↑  Rotate", CANVAS_W / 2, CANVAS_H / 2 + 66);
      ctx.fillText("Space  Hard drop", CANVAS_W / 2, CANVAS_H / 2 + 86);
      ctx.textAlign = "left";
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " ", "Enter"].includes(e.key))
        e.preventDefault();

      if (e.key === "Enter" && phaseRef.current !== "playing") {
        boardRef.current = emptyBoard();
        pieceRef.current = randomPiece();
        nextRef.current = randomPiece();
        scoreRef.current = 0;
        linesRef.current = 0;
        levelRef.current = 1;
        phaseRef.current = "playing";
        lastDropRef.current = performance.now();
        setDisplay({ score: 0, lines: 0, level: 1, phase: "playing" });
        return;
      }

      if (phaseRef.current !== "playing") return;

      const piece = pieceRef.current;
      const board = boardRef.current;

      if (e.key === "ArrowLeft" && isValid(board, piece.shape, piece.x - 1, piece.y))
        piece.x -= 1;
      if (e.key === "ArrowRight" && isValid(board, piece.shape, piece.x + 1, piece.y))
        piece.x += 1;
      if (e.key === "ArrowUp") {
        const rotated = rotate(piece.shape);
        // Wall kick: try offsets 0, -1, +1, -2, +2
        for (const dx of [0, -1, 1, -2, 2]) {
          if (isValid(board, rotated, piece.x + dx, piece.y)) {
            piece.shape = rotated;
            piece.x += dx;
            break;
          }
        }
      }
      if (e.key === "ArrowDown") {
        if (isValid(board, piece.shape, piece.x, piece.y + 1)) {
          piece.y += 1;
          scoreRef.current += 1;
          lastDropRef.current = performance.now();
        }
      }
      if (e.key === " ") {
        while (isValid(board, piece.shape, piece.x, piece.y + 1)) {
          piece.y += 1;
          scoreRef.current += 2;
        }
        lockPiece();
        lastDropRef.current = performance.now();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lockPiece]);

  useEffect(() => {
    const loop = (now: number) => {
      if (phaseRef.current === "playing") {
        if (now - lastDropRef.current > getDropInterval()) {
          const piece = pieceRef.current;
          if (isValid(boardRef.current, piece.shape, piece.x, piece.y + 1)) {
            piece.y += 1;
          } else {
            lockPiece();
          }
          lastDropRef.current = now;
        }
      }
      draw();
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw, lockPiece]);

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <h1 className="text-2xl font-bold">Tetris</h1>
      <div className="flex items-start gap-5">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="rounded-xl border border-border"
          tabIndex={0}
        />
        <div className="flex flex-col gap-3 min-w-[130px]">
          <div className="rounded-lg border bg-card p-3 space-y-0.5">
            <p className="text-xs text-muted-foreground">Score</p>
            <p className="text-xl font-bold font-mono">{display.score.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border bg-card p-3 space-y-0.5">
            <p className="text-xs text-muted-foreground">Lines</p>
            <p className="text-xl font-bold font-mono">{display.lines}</p>
          </div>
          <div className="rounded-lg border bg-card p-3 space-y-0.5">
            <p className="text-xs text-muted-foreground">Level</p>
            <p className="text-xl font-bold font-mono">{display.level}</p>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground mb-2">Controls</p>
            <p className="text-xs font-mono">Enter  Start</p>
            <p className="text-xs font-mono">← →    Move</p>
            <p className="text-xs font-mono">↑      Rotate</p>
            <p className="text-xs font-mono">↓      Soft drop</p>
            <p className="text-xs font-mono">Space  Hard drop</p>
          </div>
        </div>
      </div>
    </div>
  );
}
