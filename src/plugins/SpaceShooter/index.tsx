"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const CANVAS_W = 480;
const CANVAS_H = 560;
const PLAYER_W = 40;
const PLAYER_H = 24;
const BULLET_W = 3;
const BULLET_H = 12;
const INVADER_ROWS = 4;
const INVADER_COLS = 9;
const INVADER_W = 32;
const INVADER_H = 22;
const INVADER_GAP_X = 14;
const INVADER_GAP_Y = 14;
const PLAYER_SPEED = 220;
const BULLET_SPEED = 420;
const ENEMY_BULLET_SPEED = 160;

interface Invader {
  x: number;
  y: number;
  alive: boolean;
}

interface Bullet {
  x: number;
  y: number;
  fromPlayer: boolean;
}

interface GameState {
  player: { x: number; y: number };
  invaders: Invader[];
  bullets: Bullet[];
  score: number;
  lives: number;
  phase: "idle" | "playing" | "gameover" | "won";
  direction: 1 | -1;
  invaderSpeed: number;
  lastEnemyFire: number;
}

function initInvaders(): Invader[] {
  const invaders: Invader[] = [];
  const startX = 28;
  const startY = 70;
  for (let row = 0; row < INVADER_ROWS; row++) {
    for (let col = 0; col < INVADER_COLS; col++) {
      invaders.push({
        x: startX + col * (INVADER_W + INVADER_GAP_X),
        y: startY + row * (INVADER_H + INVADER_GAP_Y),
        alive: true,
      });
    }
  }
  return invaders;
}

function initGame(): GameState {
  return {
    player: { x: CANVAS_W / 2 - PLAYER_W / 2, y: CANVAS_H - 54 },
    invaders: initInvaders(),
    bullets: [],
    score: 0,
    lives: 3,
    phase: "idle",
    direction: 1,
    invaderSpeed: 38,
    lastEnemyFire: 0,
  };
}

// Draw alien shape
function drawInvader(ctx: CanvasRenderingContext2D, x: number, y: number, row: number, tick: number) {
  const anim = Math.floor(tick / 30) % 2;
  const colors = ["#f87171", "#fb923c", "#facc15", "#a78bfa"];
  ctx.fillStyle = colors[row % colors.length];

  if (anim === 0) {
    ctx.fillRect(x + 4, y, INVADER_W - 8, INVADER_H - 6);
    ctx.fillRect(x, y + 4, INVADER_W, INVADER_H - 12);
    ctx.fillRect(x + 2, y + INVADER_H - 8, 6, 6);
    ctx.fillRect(x + INVADER_W - 8, y + INVADER_H - 8, 6, 6);
  } else {
    ctx.fillRect(x + 4, y, INVADER_W - 8, INVADER_H - 6);
    ctx.fillRect(x, y + 4, INVADER_W, INVADER_H - 12);
    ctx.fillRect(x, y + INVADER_H - 8, 6, 6);
    ctx.fillRect(x + INVADER_W - 6, y + INVADER_H - 8, 6, 6);
  }
  // Eyes
  ctx.fillStyle = "#0a0a1a";
  ctx.fillRect(x + 8, y + 4, 5, 5);
  ctx.fillRect(x + INVADER_W - 13, y + 4, 5, 5);
}

export default function SpaceShooter() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(initGame());
  const keysRef = useRef<Set<string>>(new Set());
  const lastTimeRef = useRef<number>(0);
  const animRef = useRef<number>(0);
  const lastShotRef = useRef<number>(0);
  const tickRef = useRef<number>(0);
  const [display, setDisplay] = useState({ score: 0, lives: 3, phase: "idle" as GameState["phase"] });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const state = stateRef.current;
    tickRef.current += 1;
    const tick = tickRef.current;

    // Background
    ctx.fillStyle = "#080818";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Stars
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    for (let i = 0; i < 60; i++) {
      const sx = (i * 137 + 71) % CANVAS_W;
      const sy = (i * 239 + 13) % CANVAS_H;
      ctx.fillRect(sx, sy, i % 3 === 0 ? 2 : 1, i % 3 === 0 ? 2 : 1);
    }

    // Player ship
    const px = state.player.x;
    const py = state.player.y;
    ctx.fillStyle = "#4ade80";
    ctx.beginPath();
    ctx.moveTo(px + PLAYER_W / 2, py);
    ctx.lineTo(px + PLAYER_W, py + PLAYER_H);
    ctx.lineTo(px, py + PLAYER_H);
    ctx.closePath();
    ctx.fill();
    // Cockpit
    ctx.fillStyle = "#86efac";
    ctx.beginPath();
    ctx.arc(px + PLAYER_W / 2, py + 12, 5, 0, Math.PI * 2);
    ctx.fill();
    // Engine glow
    ctx.fillStyle = `rgba(74,222,128,${0.4 + 0.3 * Math.sin(tick * 0.2)})`;
    ctx.fillRect(px + 10, py + PLAYER_H, 8, 6);
    ctx.fillRect(px + PLAYER_W - 18, py + PLAYER_H, 8, 6);

    // Invaders
    for (let i = 0; i < state.invaders.length; i++) {
      const inv = state.invaders[i];
      if (!inv.alive) continue;
      const row = Math.floor(i / INVADER_COLS);
      drawInvader(ctx, inv.x, inv.y, row, tick);
    }

    // Bullets
    for (const b of state.bullets) {
      if (b.fromPlayer) {
        const grad = ctx.createLinearGradient(b.x, b.y, b.x, b.y + BULLET_H);
        grad.addColorStop(0, "#facc15");
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
      } else {
        const grad = ctx.createLinearGradient(b.x, b.y, b.x, b.y + BULLET_H);
        grad.addColorStop(0, "transparent");
        grad.addColorStop(1, "#fb7185");
        ctx.fillStyle = grad;
      }
      ctx.fillRect(b.x - BULLET_W / 2, b.y, BULLET_W, BULLET_H);
    }

    // Ground line
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, CANVAS_H - 30, CANVAS_W, 2);

    // HUD
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "bold 13px monospace";
    ctx.fillText(`SCORE  ${String(state.score).padStart(5, "0")}`, 10, 22);
    const hearts = "♥".repeat(state.lives) + "♡".repeat(Math.max(0, 3 - state.lives));
    ctx.fillStyle = "#f87171";
    ctx.fillText(hearts, CANVAS_W - 70, 22);

    // Overlay
    if (state.phase === "idle" || state.phase === "gameover" || state.phase === "won") {
      ctx.fillStyle = "rgba(0,0,0,0.68)";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.textAlign = "center";

      if (state.phase === "idle") {
        ctx.fillStyle = "#facc15";
        ctx.font = "bold 30px monospace";
        ctx.fillText("SPACE SHOOTER", CANVAS_W / 2, CANVAS_H / 2 - 40);
      } else if (state.phase === "won") {
        ctx.fillStyle = "#4ade80";
        ctx.font = "bold 28px monospace";
        ctx.fillText("YOU WIN!", CANVAS_W / 2, CANVAS_H / 2 - 50);
        ctx.fillStyle = "#e2e8f0";
        ctx.font = "16px monospace";
        ctx.fillText(`Score: ${state.score}`, CANVAS_W / 2, CANVAS_H / 2 - 15);
      } else {
        ctx.fillStyle = "#f87171";
        ctx.font = "bold 28px monospace";
        ctx.fillText("GAME OVER", CANVAS_W / 2, CANVAS_H / 2 - 50);
        ctx.fillStyle = "#e2e8f0";
        ctx.font = "16px monospace";
        ctx.fillText(`Score: ${state.score}`, CANVAS_W / 2, CANVAS_H / 2 - 15);
      }

      ctx.fillStyle = "#94a3b8";
      ctx.font = "14px monospace";
      ctx.fillText("Press SPACE to start", CANVAS_W / 2, CANVAS_H / 2 + 20);
      ctx.fillText("← →  Move     SPACE  Fire", CANVAS_W / 2, CANVAS_H / 2 + 46);
      ctx.textAlign = "left";
    }
  }, []);

  const update = useCallback((dt: number, now: number) => {
    const state = stateRef.current;
    const keys = keysRef.current;
    if (state.phase !== "playing") return;

    // Move player
    if (keys.has("ArrowLeft")) state.player.x = Math.max(0, state.player.x - PLAYER_SPEED * dt);
    if (keys.has("ArrowRight")) state.player.x = Math.min(CANVAS_W - PLAYER_W, state.player.x + PLAYER_SPEED * dt);

    // Player shoot
    if (keys.has(" ") && now - lastShotRef.current > 380) {
      lastShotRef.current = now;
      state.bullets.push({ x: state.player.x + PLAYER_W / 2, y: state.player.y, fromPlayer: true });
    }

    // Cull off-screen bullets
    state.bullets = state.bullets.filter((b) => b.y > -30 && b.y < CANVAS_H + 30);

    // Move bullets
    for (const b of state.bullets) {
      b.y += (b.fromPlayer ? -1 : 1) * BULLET_SPEED * dt;
    }

    // Move invaders
    const alive = state.invaders.filter((i) => i.alive);
    if (alive.length === 0) {
      state.phase = "won";
      setDisplay({ score: state.score, lives: state.lives, phase: "won" });
      return;
    }

    // Speed up as fewer invaders remain
    state.invaderSpeed = 38 + (INVADER_ROWS * INVADER_COLS - alive.length) * 1.8;

    const minX = Math.min(...alive.map((i) => i.x));
    const maxX = Math.max(...alive.map((i) => i.x + INVADER_W));
    let stepDown = false;
    if (state.direction === 1 && maxX + state.invaderSpeed * dt > CANVAS_W - 8) {
      stepDown = true;
      state.direction = -1;
    } else if (state.direction === -1 && minX - state.invaderSpeed * dt < 8) {
      stepDown = true;
      state.direction = 1;
    }
    for (const inv of state.invaders) {
      if (!inv.alive) continue;
      inv.x += state.direction * state.invaderSpeed * dt;
      if (stepDown) inv.y += 18;
    }

    // Invaders reach bottom
    const maxY = Math.max(...alive.map((i) => i.y + INVADER_H));
    if (maxY >= state.player.y) {
      state.lives = 0;
      state.phase = "gameover";
      setDisplay({ score: state.score, lives: 0, phase: "gameover" });
      return;
    }

    // Enemy fire
    const fireInterval = Math.max(600, 1400 - alive.length * 14);
    if (now - state.lastEnemyFire > fireInterval) {
      state.lastEnemyFire = now;
      const shooter = alive[Math.floor(Math.random() * alive.length)];
      state.bullets.push({ x: shooter.x + INVADER_W / 2, y: shooter.y + INVADER_H, fromPlayer: false });
    }

    // Player bullet vs invader
    for (const b of state.bullets) {
      if (!b.fromPlayer) continue;
      for (const inv of state.invaders) {
        if (!inv.alive) continue;
        if (b.x >= inv.x && b.x <= inv.x + INVADER_W && b.y >= inv.y && b.y <= inv.y + INVADER_H) {
          inv.alive = false;
          b.y = -9999;
          state.score += 10;
        }
      }
    }

    // Enemy bullet vs player
    for (const b of state.bullets) {
      if (b.fromPlayer) continue;
      if (b.x >= state.player.x && b.x <= state.player.x + PLAYER_W && b.y >= state.player.y && b.y <= state.player.y + PLAYER_H) {
        b.y = CANVAS_H + 9999;
        state.lives -= 1;
        if (state.lives <= 0) {
          state.phase = "gameover";
          setDisplay({ score: state.score, lives: 0, phase: "gameover" });
          return;
        }
      }
    }

    setDisplay({ score: state.score, lives: state.lives, phase: state.phase });
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
      keysRef.current.add(e.key);
      const state = stateRef.current;
      if (e.key === " " && state.phase !== "playing") {
        const next = initGame();
        next.phase = "playing";
        stateRef.current = next;
        setDisplay({ score: 0, lives: 3, phase: "playing" });
      }
    };
    const onKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.key);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    const loop = (now: number) => {
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = now;
      update(dt, now);
      draw();
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw, update]);

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <h1 className="text-2xl font-bold">Space Shooter</h1>
      <p className="text-sm text-muted-foreground">← → to move · SPACE to fire · Press SPACE to start</p>
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="rounded-xl border border-border"
        tabIndex={0}
      />
    </div>
  );
}
