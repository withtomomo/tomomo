import React, { useRef, useEffect, useMemo } from "react";

interface CharacterSpriteProps {
  grid: number[][];
  color: string;
  size: number;
  displaySize: number;
  className?: string;
  animate?: boolean;
}

// Analyze the grid to find animatable parts
interface Analysis {
  eyes: Array<{ x: number; y: number }>;
  bodyMinY: number;
  bodyMaxY: number;
  bodyMinX: number;
  bodyMaxX: number;
  midY: number;
  rowExtents: Record<number, { min: number; max: number }>;
  legs: Array<{ x: number; y: number }>;
  topFeatures: Array<{ x: number; y: number }>;
  tail: Array<{ x: number; y: number }>;
  mainBodyTop: number;
  mainBodyBottom: number;
}

function analyzeCharacter(grid: number[][], size: number): Analysis {
  const eyes: Array<{ x: number; y: number }> = [];
  let bodyMinY = size,
    bodyMaxY = 0,
    bodyMinX = size,
    bodyMaxX = 0;
  const rowExtents: Record<number, { min: number; max: number }> = {};

  for (let y = 0; y < size; y++) {
    let rowMin = size,
      rowMax = -1;
    for (let x = 0; x < size; x++) {
      const v = grid[y]?.[x] ?? 0;
      if (v === 2) eyes.push({ x, y });
      if (v === 1 || v === 2) {
        bodyMinY = Math.min(bodyMinY, y);
        bodyMaxY = Math.max(bodyMaxY, y);
        bodyMinX = Math.min(bodyMinX, x);
        bodyMaxX = Math.max(bodyMaxX, x);
        rowMin = Math.min(rowMin, x);
        rowMax = Math.max(rowMax, x);
      }
    }
    if (rowMax >= 0) rowExtents[y] = { min: rowMin, max: rowMax };
  }

  const midY = Math.round((bodyMinY + bodyMaxY) / 2);

  const legs: Array<{ x: number; y: number }> = [];
  let mainBodyBottom = bodyMaxY;
  for (let yy = bodyMaxY; yy >= bodyMinY; yy--) {
    const ext = rowExtents[yy];
    if (ext && ext.max - ext.min >= 3) {
      mainBodyBottom = yy;
      break;
    }
  }
  for (let ly = mainBodyBottom + 1; ly <= bodyMaxY; ly++) {
    for (let lx = 0; lx < size; lx++) {
      if ((grid[ly]?.[lx] ?? 0) === 1) legs.push({ x: lx, y: ly });
    }
  }

  const topFeatures: Array<{ x: number; y: number }> = [];
  let mainBodyTop = bodyMinY;
  for (let ty = bodyMinY; ty <= bodyMaxY; ty++) {
    const te = rowExtents[ty];
    if (te && te.max - te.min >= 4) {
      mainBodyTop = ty;
      break;
    }
  }
  for (let fy = bodyMinY; fy < mainBodyTop; fy++) {
    for (let fx = 0; fx < size; fx++) {
      if ((grid[fy]?.[fx] ?? 0) === 1) topFeatures.push({ x: fx, y: fy });
    }
  }

  const tail: Array<{ x: number; y: number }> = [];
  for (let tailY = mainBodyTop; tailY <= mainBodyBottom; tailY++) {
    const tailExt = rowExtents[tailY];
    if (!tailExt) continue;
    const rx = tailExt.max;
    const aboveExt = rowExtents[tailY - 1];
    const belowExt = rowExtents[tailY + 1];
    const aboveMax = aboveExt ? aboveExt.max : 0;
    const belowMax = belowExt ? belowExt.max : 0;
    if (rx > aboveMax + 1 && rx > belowMax + 1) {
      tail.push({ x: rx, y: tailY });
      if (grid[tailY - 1]?.[rx] === 1) tail.push({ x: rx, y: tailY - 1 });
    }
  }

  return {
    eyes,
    bodyMinY,
    bodyMaxY,
    bodyMinX,
    bodyMaxX,
    midY,
    rowExtents,
    legs,
    topFeatures,
    tail,
    mainBodyTop,
    mainBodyBottom,
  };
}

function copyGrid(grid: number[][], size: number): number[][] {
  const g: number[][] = [];
  for (let y = 0; y < size; y++) {
    g[y] = [];
    for (let x = 0; x < size; x++) g[y]![x] = grid[y]?.[x] ?? 0;
  }
  return g;
}

function applyBounce(
  grid: number[][],
  size: number,
  offset: number
): number[][] {
  if (offset === 0) return grid;
  const g: number[][] = [];
  for (let y = 0; y < size; y++) {
    g[y] = [];
    for (let x = 0; x < size; x++) g[y]![x] = 0;
  }
  for (let y = 0; y < size; y++) {
    const destY = y - offset;
    if (destY < 0 || destY >= size) continue;
    for (let x = 0; x < size; x++) {
      if ((grid[y]?.[x] ?? 0) !== 0) g[destY]![x] = grid[y]![x]!;
    }
  }
  return g;
}

function applyBlink(
  grid: number[][],
  eyes: Analysis["eyes"],
  closed: boolean
): number[][] {
  if (!closed || eyes.length === 0) return grid;
  for (const e of eyes) grid[e.y]![e.x] = 1;
  return grid;
}

function applyBreathe(
  grid: number[][],
  size: number,
  analysis: Analysis,
  phase: number
): number[][] {
  if (phase === 0) return grid;
  const ext = analysis.rowExtents[analysis.midY];
  if (!ext) return grid;
  const nl = ext.min - 1;
  const nr = ext.max + 1;
  if (nl >= 0 && (grid[analysis.midY]?.[nl] ?? 0) === 0)
    grid[analysis.midY]![nl] = 1;
  if (nr < size && (grid[analysis.midY]?.[nr] ?? 0) === 0)
    grid[analysis.midY]![nr] = 1;
  const above = analysis.midY - 1;
  if (above >= 0) {
    const ea = analysis.rowExtents[above];
    if (ea) {
      if (ea.min - 1 >= 0 && (grid[above]?.[ea.min - 1] ?? 0) === 0)
        grid[above]![ea.min - 1] = 1;
      if (ea.max + 1 < size && (grid[above]?.[ea.max + 1] ?? 0) === 0)
        grid[above]![ea.max + 1] = 1;
    }
  }
  return grid;
}

function applyLegWiggle(
  grid: number[][],
  size: number,
  legs: Analysis["legs"],
  phase: number
): number[][] {
  if (phase === 0 || legs.length === 0) return grid;
  for (const l of legs) grid[l.y]![l.x] = 0;
  for (const l of legs) {
    const nx = l.x + phase;
    if (nx >= 0 && nx < size) grid[l.y]![nx] = 1;
  }
  return grid;
}

function applyTopWiggle(
  grid: number[][],
  size: number,
  topFeatures: Analysis["topFeatures"],
  phase: number
): number[][] {
  if (phase === 0 || topFeatures.length === 0) return grid;
  for (const f of topFeatures) grid[f.y]![f.x] = 0;
  for (const f of topFeatures) {
    const ny = f.y + phase;
    if (ny >= 0 && ny < size) grid[ny]![f.x] = 1;
  }
  return grid;
}

function applyLookAround(
  grid: number[][],
  size: number,
  eyes: Analysis["eyes"],
  direction: number
): number[][] {
  if (direction === 0 || eyes.length === 0) return grid;
  for (const e of eyes) {
    grid[e.y]![e.x] = 1;
    const nx = e.x + direction;
    if (nx >= 0 && nx < size && (grid[e.y]?.[nx] ?? 0) === 1)
      grid[e.y]![nx] = 2;
  }
  return grid;
}

function applySquash(
  grid: number[][],
  size: number,
  analysis: Analysis,
  squashing: boolean
): number[][] {
  if (!squashing) return grid;
  const bot = analysis.mainBodyBottom;
  const ext = analysis.rowExtents[bot];
  if (!ext) return grid;
  if (ext.min - 1 >= 0 && (grid[bot]?.[ext.min - 1] ?? 0) === 0)
    grid[bot]![ext.min - 1] = 1;
  if (ext.max + 1 < size && (grid[bot]?.[ext.max + 1] ?? 0) === 0)
    grid[bot]![ext.max + 1] = 1;
  const bot2 = bot - 1;
  const ext2 = analysis.rowExtents[bot2];
  if (ext2) {
    if (ext2.min - 1 >= 0 && (grid[bot2]?.[ext2.min - 1] ?? 0) === 0)
      grid[bot2]![ext2.min - 1] = 1;
    if (ext2.max + 1 < size && (grid[bot2]?.[ext2.max + 1] ?? 0) === 0)
      grid[bot2]![ext2.max + 1] = 1;
  }
  return grid;
}

function applyTailWag(
  grid: number[][],
  size: number,
  tail: Analysis["tail"],
  phase: number
): number[][] {
  if (phase === 0 || tail.length === 0) return grid;
  for (const t of tail) grid[t.y]![t.x] = 0;
  for (const t of tail) {
    const ny = t.y + phase;
    if (ny >= 0 && ny < size) grid[ny]![t.x] = 1;
  }
  return grid;
}

function applyStretch(
  grid: number[][],
  size: number,
  analysis: Analysis,
  stretching: boolean
): number[][] {
  if (!stretching) return grid;
  const mid = analysis.midY;
  for (let y = 0; y < mid; y++) {
    const srcY = y + 1;
    if (srcY < size) {
      for (let x = 0; x < size; x++) grid[y]![x] = grid[srcY]?.[x] ?? 0;
    }
  }
  return grid;
}

function applyHappyEyes(grid: number[][], eyes: Analysis["eyes"]): number[][] {
  if (eyes.length === 0) return grid;
  for (let i = 0; i < eyes.length; i++) {
    const e = eyes[i]!;
    if (i % 2 === 0) {
      grid[e.y]![e.x] = 1;
      if (e.y - 1 >= 0 && (grid[e.y - 1]?.[e.x] ?? 0) === 1)
        grid[e.y - 1]![e.x] = 2;
    } else {
      grid[e.y]![e.x] = 1;
    }
  }
  return grid;
}

export function CharacterSprite({
  grid,
  color,
  size,
  displaySize,
  className = "",
  animate = false,
}: CharacterSpriteProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const analysis = useMemo(() => analyzeCharacter(grid, size), [grid, size]);

  // Only animate at larger sizes (48px+). Small sprites stay static.
  const shouldAnimate = animate && displaySize >= 48;

  // Build SVG rects for static rendering
  const svgRects = useMemo(() => {
    const rects: React.ReactElement[] = [];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if ((grid[y]?.[x] ?? 0) === 1) {
          rects.push(
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width={1.05}
              height={1.05}
              fill={color}
            />
          );
        }
      }
    }
    return rects;
  }, [grid, color, size]);

  useEffect(() => {
    if (!shouldAnimate) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const px = Math.floor(displaySize / size);
    const actual = px * size;
    canvas.width = actual;
    canvas.height = actual;
    const maybeCtx = canvas.getContext("2d");
    if (!maybeCtx) return;
    const ctx = maybeCtx;
    ctx.imageSmoothingEnabled = false;

    // Animation state
    const startTime = performance.now();
    const bounceOff = Math.random() * 2000;
    const breatheOff = Math.random() * 3000;
    const wiggleOff = Math.random() * 4000;
    const tailOff = Math.random() * 3000;

    let nextBlink = 2000 + Math.random() * 3000;
    let blinkEnd = 0;
    let isBlinking = false;
    let doDoubleBlink = false;
    let doubleBlinkGap = 0;

    let nextLook = 5000 + Math.random() * 8000;
    let lookEnd = 0;
    let lookDir = 0;

    let nextHappy = 12000 + Math.random() * 20000;
    let happyEnd = 0;
    let isHappy = false;

    let lastFrame = 0;

    function render(now: number) {
      // 10 FPS limit
      if (now - lastFrame < 90) {
        animRef.current = requestAnimationFrame(render);
        return;
      }
      lastFrame = now;

      const t = now - startTime;

      // Blink
      if (!isBlinking && !isHappy && t > nextBlink) {
        isBlinking = true;
        blinkEnd = t + 120;
        doDoubleBlink = Math.random() < 0.25;
        if (doDoubleBlink) doubleBlinkGap = blinkEnd + 100;
      }
      if (isBlinking && t > blinkEnd) {
        if (doDoubleBlink && t < doubleBlinkGap + 120) {
          if (t > doubleBlinkGap) {
            blinkEnd = doubleBlinkGap + 120;
            doDoubleBlink = false;
          }
        } else {
          isBlinking = false;
          nextBlink = t + 2500 + Math.random() * 4000;
        }
      }
      const blinkClosed = isBlinking && t < blinkEnd;

      // Happy
      if (!isHappy && t > nextHappy) {
        isHappy = true;
        happyEnd = t + 800 + Math.random() * 400;
      }
      if (isHappy && t > happyEnd) {
        isHappy = false;
        nextHappy = t + 15000 + Math.random() * 25000;
      }

      // Look
      if (lookDir === 0 && !isHappy && t > nextLook) {
        lookDir = Math.random() < 0.5 ? -1 : 1;
        lookEnd = t + 600 + Math.random() * 400;
      }
      if (lookDir !== 0 && t > lookEnd) {
        lookDir = 0;
        nextLook = t + 6000 + Math.random() * 10000;
      }

      // Bounce
      const bounceT = (t + bounceOff) % 2400;
      const bounceUp = bounceT < 300 ? 1 : 0;
      const squashing = bounceT >= 300 && bounceT < 500;
      const stretching = bounceT < 200;

      // Breathe
      const breatheT = (t + breatheOff) % 3500;
      const breathePhase = breatheT > 1200 && breatheT < 2400 ? 1 : 0;

      // Legs
      const wiggleT = (t + wiggleOff) % 2800;
      const legPhase =
        wiggleT < 700 ? 0 : wiggleT < 1400 ? 1 : wiggleT < 2100 ? 0 : -1;

      // Top
      const topPhase = bounceUp === 1 ? -1 : 0;

      // Tail
      const tailT = (t + tailOff) % 1800;
      const tailPhase = tailT < 600 ? 0 : tailT < 1200 ? -1 : 0;

      // Compose: copyGrid first, then all apply* functions mutate in-place.
      // applyBounce returns a new grid, so it must come last before draw.
      let g = copyGrid(grid, size);
      g = applyBreathe(g, size, analysis, breathePhase);
      g = applyTailWag(g, size, analysis.tail, tailPhase);
      if (blinkClosed) {
        g = applyBlink(g, analysis.eyes, true);
      } else if (isHappy) {
        g = applyHappyEyes(g, analysis.eyes);
      } else if (lookDir !== 0) {
        g = applyLookAround(g, size, analysis.eyes, lookDir);
      }
      g = applyLegWiggle(g, size, analysis.legs, legPhase);
      g = applyTopWiggle(g, size, analysis.topFeatures, topPhase);
      g = applySquash(g, size, analysis, squashing && bounceUp === 0);
      if (stretching && bounceUp === 1)
        g = applyStretch(g, size, analysis, true);
      g = applyBounce(g, size, bounceUp);

      // Draw: transparent canvas, only body pixels (value 1)
      ctx.clearRect(0, 0, actual, actual);
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const v = g[y]?.[x] ?? 0;
          if (v === 1) {
            ctx.fillStyle = color;
            ctx.fillRect(x * px, y * px, px + 1, px + 1);
          }
        }
      }

      animRef.current = requestAnimationFrame(render);
    }

    animRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animRef.current);
  }, [grid, color, size, displaySize, shouldAnimate, analysis]);

  if (shouldAnimate) {
    return (
      <div
        className={`shrink-0 overflow-hidden ${className}`}
        style={{ width: displaySize, height: displaySize }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: displaySize,
            height: displaySize,
            imageRendering: "pixelated",
          }}
        />
      </div>
    );
  }

  // Static: SVG scales perfectly at any size
  return (
    <div
      className={`shrink-0 overflow-hidden ${className}`}
      style={{ width: displaySize, height: displaySize }}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={displaySize}
        height={displaySize}
        shapeRendering="crispEdges"
      >
        {svgRects}
      </svg>
    </div>
  );
}
