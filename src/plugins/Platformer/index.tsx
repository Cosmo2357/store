"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ── Constants ──────────────────────────────────────────────────────────────
const CANVAS_W = 560;
const CANVAS_H = 420;
const GRAVITY = 1400;
const JUMP_VY = -520;
const PLAYER_SPEED = 200;
const PLAYER_W = 22;
const PLAYER_H = 28;
const COIN_R = 7;
const ENEMY_W = 26;
const ENEMY_H = 20;
const ENEMY_SPEED = 60;

// ── Types ──────────────────────────────────────────────────────────────────
interface Platform { x: number; y: number; w: number; h: number }
interface Coin     { x: number; y: number; collected: boolean }
interface Enemy    { x: number; y: number; vx: number; alive: boolean }
interface Flag     { x: number; y: number }

interface Level {
  platforms: Platform[];
  coins: Coin[];
  enemies: Enemy[];
  flag: Flag;
  width: number;
}

interface Player {
  x: number; y: number;
  vx: number; vy: number;
  onGround: boolean;
  facing: 1 | -1;
  dead: boolean;
  deathTimer: number;
}

// ── Level builder ──────────────────────────────────────────────────────────
function buildLevel(n: number): Level {
  const seed = n * 31337;
  const rand = (i: number) => ((seed + i * 1664525 + 1013904223) >>> 0) / 0xFFFFFFFF;

  const platforms: Platform[] = [];
  const coins: Coin[] = [];
  const enemies: Enemy[] = [];

  // Ground
  const levelW = 2400 + n * 400;
  platforms.push({ x: 0, y: CANVAS_H - 40, w: levelW, h: 40 });

  // Floating platforms
  let px = 280;
  for (let i = 0; i < 14 + n * 2; i++) {
    const w = 80 + rand(i) * 100;
    const y = CANVAS_H - 100 - rand(i + 100) * 160;
    platforms.push({ x: px, y, w, h: 16 });

    // Coins on top of platforms
    const coinCount = 1 + Math.floor(rand(i + 200) * 3);
    for (let c = 0; c < coinCount; c++) {
      coins.push({ x: px + (w / (coinCount + 1)) * (c + 1), y: y - 24, collected: false });
    }

    // Enemy on some platforms
    if (rand(i + 300) > 0.55 && w > 90) {
      enemies.push({ x: px + 20, y: y - ENEMY_H, vx: ENEMY_SPEED, alive: true });
    }

    px += w + 80 + rand(i + 400) * 80;
  }

  const flag: Flag = { x: levelW - 80, y: CANVAS_H - 40 - 120 };

  return { platforms, coins, enemies, flag, width: levelW };
}

function initPlayer(): Player {
  return { x: 60, y: CANVAS_H - 40 - PLAYER_H, vx: 0, vy: 0, onGround: false, facing: 1, dead: false, deathTimer: 0 };
}

// ── AABB ────────────────────────────────────────────────────────────────────
function rectOverlap(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// ── Component ──────────────────────────────────────────────────────────────
export default function Platformer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const levelRef = useRef<Level>(buildLevel(1));
  const playerRef = useRef<Player>(initPlayer());
  const cameraXRef = useRef(0);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const coinsRef = useRef(0);
  const levelNumRef = useRef(1);
  const phaseRef = useRef<"idle" | "playing" | "gameover" | "levelclear">("idle");
  const animRef = useRef(0);
  const lastRef = useRef(0);
  const tickRef = useRef(0);

  const [display, setDisplay] = useState({ score: 0, lives: 3, coins: 0, level: 1, phase: "idle" as "idle" | "playing" | "gameover" | "levelclear" });

  const startLevel = useCallback((n: number) => {
    levelRef.current = buildLevel(n);
    playerRef.current = initPlayer();
    cameraXRef.current = 0;
    levelNumRef.current = n;
    phaseRef.current = "playing";
    setDisplay(d => ({ ...d, level: n, phase: "playing" }));
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const level = levelRef.current;
    const player = playerRef.current;
    const cam = cameraXRef.current;
    const phase = phaseRef.current;
    tickRef.current++;
    const tick = tickRef.current;

    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    sky.addColorStop(0, "#87CEEB");
    sky.addColorStop(1, "#E0F4FF");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Clouds (parallax)
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    const cloudPositions = [100, 280, 480, 680, 900, 1100];
    cloudPositions.forEach((cx, i) => {
      const px2 = ((cx - cam * 0.3) % (CANVAS_W + 200) + CANVAS_W + 200) % (CANVAS_W + 200) - 100;
      const cy = 40 + (i % 3) * 30;
      ctx.beginPath(); ctx.arc(px2, cy, 24, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(px2 + 28, cy - 8, 18, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(px2 + 52, cy, 22, 0, Math.PI * 2); ctx.fill();
    });

    // Platforms
    for (const p of level.platforms) {
      const sx = p.x - cam;
      if (sx > CANVAS_W + 10 || sx + p.w < -10) continue;
      const isGround = p.h === 40;
      // Top grass
      ctx.fillStyle = isGround ? "#5D8A3C" : "#7CBF50";
      ctx.fillRect(sx, p.y, p.w, isGround ? 12 : p.h);
      // Dirt
      if (isGround) {
        ctx.fillStyle = "#9B6A3C";
        ctx.fillRect(sx, p.y + 12, p.w, p.h - 12);
      }
      // Platform underside highlight
      if (!isGround) {
        ctx.fillStyle = "#6AAB44";
        ctx.fillRect(sx, p.y, p.w, 4);
        ctx.fillStyle = "#4E7A2E";
        ctx.fillRect(sx, p.y + p.h - 4, p.w, 4);
      }
    }

    // Flag pole
    const fx = level.flag.x - cam;
    if (fx > -20 && fx < CANVAS_W + 20) {
      ctx.fillStyle = "#888";
      ctx.fillRect(fx, level.flag.y, 4, CANVAS_H - 40 - level.flag.y);
      ctx.fillStyle = "#E53E3E";
      ctx.beginPath(); ctx.moveTo(fx + 4, level.flag.y); ctx.lineTo(fx + 30, level.flag.y + 12); ctx.lineTo(fx + 4, level.flag.y + 24); ctx.closePath(); ctx.fill();
    }

    // Coins
    for (const coin of level.coins) {
      if (coin.collected) continue;
      const sx = coin.x - cam;
      if (sx < -20 || sx > CANVAS_W + 20) continue;
      const bob = Math.sin(tick * 0.08 + coin.x * 0.05) * 3;
      ctx.fillStyle = "#FFD700";
      ctx.beginPath(); ctx.arc(sx, coin.y + bob, COIN_R, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#FFA500";
      ctx.beginPath(); ctx.arc(sx - 2, coin.y + bob - 2, COIN_R * 0.5, 0, Math.PI * 2); ctx.fill();
    }

    // Enemies
    for (const enemy of level.enemies) {
      if (!enemy.alive) continue;
      const sx = enemy.x - cam;
      if (sx < -30 || sx > CANVAS_W + 30) continue;
      // Goomba-style brown mushroom enemy
      ctx.fillStyle = "#8B4513";
      ctx.beginPath(); ctx.ellipse(sx + ENEMY_W / 2, enemy.y + ENEMY_H * 0.6, ENEMY_W / 2, ENEMY_H * 0.55, 0, 0, Math.PI * 2); ctx.fill();
      // Cap
      ctx.fillStyle = "#6B2D0A";
      ctx.beginPath(); ctx.ellipse(sx + ENEMY_W / 2, enemy.y + ENEMY_H * 0.3, ENEMY_W / 2, ENEMY_H * 0.35, 0, 0, Math.PI * 2); ctx.fill();
      // Eyes
      ctx.fillStyle = "white";
      ctx.beginPath(); ctx.arc(sx + 7, enemy.y + ENEMY_H * 0.55, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(sx + ENEMY_W - 7, enemy.y + ENEMY_H * 0.55, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#111";
      ctx.beginPath(); ctx.arc(sx + 8, enemy.y + ENEMY_H * 0.55, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(sx + ENEMY_W - 8, enemy.y + ENEMY_H * 0.55, 2, 0, Math.PI * 2); ctx.fill();
    }

    // Player
    if (!player.dead || Math.floor(tick / 6) % 2 === 0) {
      const sx = player.x - cam;
      const flip = player.facing === -1;
      ctx.save();
      if (flip) { ctx.translate(sx + PLAYER_W, player.y); ctx.scale(-1, 1); }
      else       { ctx.translate(sx, player.y); }

      // Body
      ctx.fillStyle = "#E53E3E";
      ctx.fillRect(2, 8, PLAYER_W - 4, PLAYER_H - 8);
      // Hat
      ctx.fillStyle = "#E53E3E";
      ctx.fillRect(0, 2, PLAYER_W, 8);
      ctx.fillRect(2, 0, PLAYER_W - 4, 4);
      // Face
      ctx.fillStyle = "#F6C98E";
      ctx.fillRect(6, 8, PLAYER_W - 8, 10);
      // Eyes
      ctx.fillStyle = "#333";
      ctx.fillRect(PLAYER_W - 10, 10, 3, 3);
      // Overalls
      ctx.fillStyle = "#3182CE";
      ctx.fillRect(2, 18, PLAYER_W - 4, PLAYER_H - 18);
      // Buttons
      ctx.fillStyle = "white";
      ctx.fillRect(8, 20, 3, 3);
      ctx.restore();
    }

    // HUD overlay
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, 0, CANVAS_W, 36);
    ctx.fillStyle = "white";
    ctx.font = "bold 14px monospace";
    ctx.fillText(`LEVEL ${levelNumRef.current}`, 10, 22);
    ctx.fillText(`♥ ${livesRef.current}`, 120, 22);
    ctx.fillText(`🪙 ${coinsRef.current}`, 190, 22);
    ctx.fillText(`SCORE ${String(scoreRef.current).padStart(6, "0")}`, 280, 22);

    // Overlays
    if (phase === "idle" || phase === "gameover" || phase === "levelclear") {
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.textAlign = "center";

      if (phase === "idle") {
        ctx.fillStyle = "#FFD700";
        ctx.font = "bold 32px monospace";
        ctx.fillText("PLATFORMER", CANVAS_W / 2, CANVAS_H / 2 - 40);
        ctx.fillStyle = "white";
        ctx.font = "15px monospace";
        ctx.fillText("Press Enter to start", CANVAS_W / 2, CANVAS_H / 2 + 4);
        ctx.fillText("← →  Move    ↑ / Space  Jump", CANVAS_W / 2, CANVAS_H / 2 + 28);
      } else if (phase === "levelclear") {
        ctx.fillStyle = "#68D391";
        ctx.font = "bold 28px monospace";
        ctx.fillText("LEVEL CLEAR!", CANVAS_W / 2, CANVAS_H / 2 - 20);
        ctx.fillStyle = "white";
        ctx.font = "15px monospace";
        ctx.fillText("Press Enter for next level", CANVAS_W / 2, CANVAS_H / 2 + 20);
      } else {
        ctx.fillStyle = "#FC8181";
        ctx.font = "bold 28px monospace";
        ctx.fillText("GAME OVER", CANVAS_W / 2, CANVAS_H / 2 - 30);
        ctx.fillStyle = "white";
        ctx.font = "15px monospace";
        ctx.fillText(`Score: ${scoreRef.current}`, CANVAS_W / 2, CANVAS_H / 2 + 10);
        ctx.fillText("Press Enter to retry", CANVAS_W / 2, CANVAS_H / 2 + 36);
      }
      ctx.textAlign = "left";
    }
  }, []);

  const update = useCallback((dt: number) => {
    const player = playerRef.current;
    const level = levelRef.current;
    const keys = keysRef.current;
    const phase = phaseRef.current;

    if (phase !== "playing") return;
    if (player.dead) {
      player.deathTimer -= dt;
      if (player.deathTimer <= 0) {
        if (livesRef.current <= 0) {
          phaseRef.current = "gameover";
          setDisplay(d => ({ ...d, phase: "gameover" }));
        } else {
          playerRef.current = initPlayer();
          cameraXRef.current = 0;
        }
      }
      return;
    }

    // Input
    let moveX = 0;
    if (keys.has("ArrowLeft"))  { moveX = -1; player.facing = -1; }
    if (keys.has("ArrowRight")) { moveX = 1;  player.facing = 1; }
    player.vx = moveX * PLAYER_SPEED;

    if ((keys.has("ArrowUp") || keys.has(" ")) && player.onGround) {
      player.vy = JUMP_VY;
      player.onGround = false;
    }

    // Physics
    player.vy += GRAVITY * dt;
    player.vy = Math.min(player.vy, 900);
    player.x += player.vx * dt;
    player.y += player.vy * dt;
    player.onGround = false;

    // Platform collision
    for (const p of level.platforms) {
      if (!rectOverlap(player.x, player.y, PLAYER_W, PLAYER_H, p.x, p.y, p.w, p.h)) continue;
      const overlapLeft  = player.x + PLAYER_W - p.x;
      const overlapRight = p.x + p.w - player.x;
      const overlapTop   = player.y + PLAYER_H - p.y;
      const overlapBot   = p.y + p.h - player.y;
      const minH = Math.min(overlapTop, overlapBot);
      const minV = Math.min(overlapLeft, overlapRight);

      if (minH < minV) {
        if (overlapTop < overlapBot) {
          player.y = p.y - PLAYER_H;
          player.vy = 0;
          player.onGround = true;
        } else {
          player.y = p.y + p.h;
          player.vy = 0;
        }
      } else {
        if (overlapLeft < overlapRight) player.x = p.x - PLAYER_W;
        else                            player.x = p.x + p.w;
      }
    }

    // Fell off bottom
    if (player.y > CANVAS_H + 80) {
      livesRef.current -= 1;
      player.dead = true;
      player.deathTimer = 1.2;
      setDisplay(d => ({ ...d, lives: livesRef.current }));
      return;
    }

    // Coins
    for (const coin of level.coins) {
      if (coin.collected) continue;
      const dx = player.x + PLAYER_W / 2 - coin.x;
      const dy = player.y + PLAYER_H / 2 - coin.y;
      if (dx * dx + dy * dy < (PLAYER_W / 2 + COIN_R) ** 2) {
        coin.collected = true;
        coinsRef.current += 1;
        scoreRef.current += 100;
        setDisplay(d => ({ ...d, score: scoreRef.current, coins: coinsRef.current }));
      }
    }

    // Enemies
    for (const enemy of level.enemies) {
      if (!enemy.alive) continue;

      // Move enemy
      enemy.x += enemy.vx * dt;
      // Reverse at platform edges / walls
      const standingPlatform = level.platforms.find(p =>
        enemy.x + ENEMY_W > p.x && enemy.x < p.x + p.w &&
        Math.abs((enemy.y + ENEMY_H) - p.y) < 4
      );
      if (standingPlatform) {
        const atLeftEdge  = enemy.x <= standingPlatform.x;
        const atRightEdge = enemy.x + ENEMY_W >= standingPlatform.x + standingPlatform.w;
        if (atLeftEdge || atRightEdge) enemy.vx *= -1;
      }

      // Check player vs enemy
      if (!rectOverlap(player.x, player.y, PLAYER_W, PLAYER_H, enemy.x, enemy.y, ENEMY_W, ENEMY_H)) continue;

      const playerBottom = player.y + PLAYER_H;
      const enemyTop = enemy.y;
      // Stomp: player falling onto enemy top
      if (player.vy > 0 && playerBottom - enemyTop < 16) {
        enemy.alive = false;
        player.vy = JUMP_VY * 0.55;
        scoreRef.current += 200;
        setDisplay(d => ({ ...d, score: scoreRef.current }));
      } else {
        // Player hurt
        livesRef.current -= 1;
        player.dead = true;
        player.deathTimer = 1.2;
        setDisplay(d => ({ ...d, lives: livesRef.current }));
        return;
      }
    }

    // Flag: level clear
    if (rectOverlap(player.x, player.y, PLAYER_W, PLAYER_H, level.flag.x, level.flag.y, 30, CANVAS_H - 40 - level.flag.y)) {
      scoreRef.current += 500;
      phaseRef.current = "levelclear";
      setDisplay(d => ({ ...d, score: scoreRef.current, phase: "levelclear" }));
    }

    // Camera
    const target = player.x - CANVAS_W / 3;
    cameraXRef.current = Math.max(0, Math.min(target, level.width - CANVAS_W));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " ", "Enter"].includes(e.key))
        e.preventDefault();
      keysRef.current.add(e.key);

      if (e.key === "Enter") {
        const phase = phaseRef.current;
        if (phase === "idle" || phase === "gameover") {
          scoreRef.current = 0;
          livesRef.current = 3;
          coinsRef.current = 0;
          setDisplay({ score: 0, lives: 3, coins: 0, level: 1, phase: "playing" });
          startLevel(1);
        } else if (phase === "levelclear") {
          startLevel(levelNumRef.current + 1);
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.key);
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onKeyUp); };
  }, [startLevel]);

  useEffect(() => {
    const loop = (now: number) => {
      const dt = Math.min((now - lastRef.current) / 1000, 0.05);
      lastRef.current = now;
      update(dt);
      draw();
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw, update]);

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <h1 className="text-2xl font-bold">Platformer</h1>
      <p className="text-sm text-muted-foreground">← → to move · ↑ or Space to jump · Stomp enemies · Collect coins · Reach the flag!</p>
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
