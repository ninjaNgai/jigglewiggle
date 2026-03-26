import type { AppMode } from "../shared/mode";

type ScoreCardParams = {
  score: number;
  grade: string;
  totalPoints: number;
  videoTitle: string;
  mode: AppMode;
};

const GRADE_COLORS: Record<string, string> = {
  S: "#ffd700",
  A: "#00ffff",
  B: "#b829ff",
  C: "#ff8800",
  D: "#ff4444",
};

/**
 * Renders a 1080×1080 score card canvas suitable for sharing on social media.
 * Returns a Blob (PNG) and the data URL string.
 */
export async function generateScoreCard(
  params: ScoreCardParams
): Promise<{ blob: Blob; dataUrl: string }> {
  const { score, grade, totalPoints, videoTitle, mode } = params;

  const SIZE = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;

  // ── Background ─────────────────────────────────────────────────────────────
  const bgGrad = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  if (mode === "gym") {
    bgGrad.addColorStop(0, "#0a0a0a");
    bgGrad.addColorStop(0.5, "#0d0a14");
    bgGrad.addColorStop(1, "#060606");
  } else {
    bgGrad.addColorStop(0, "#070714");
    bgGrad.addColorStop(0.5, "#0b0720");
    bgGrad.addColorStop(1, "#07071a");
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // ── Subtle grid ───────────────────────────────────────────────────────────
  ctx.strokeStyle = "rgba(0,255,255,0.04)";
  ctx.lineWidth = 1;
  const GRID = 60;
  for (let x = 0; x <= SIZE; x += GRID) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, SIZE); ctx.stroke();
  }
  for (let y = 0; y <= SIZE; y += GRID) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(SIZE, y); ctx.stroke();
  }

  // ── Corner accent lines ───────────────────────────────────────────────────
  const accentColor = mode === "gym" ? "#ff8800" : "#00ffff";
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 3;
  const C = 60; // corner size
  const M = 40; // margin
  // top-left
  ctx.beginPath(); ctx.moveTo(M, M + C); ctx.lineTo(M, M); ctx.lineTo(M + C, M); ctx.stroke();
  // top-right
  ctx.beginPath(); ctx.moveTo(SIZE - M - C, M); ctx.lineTo(SIZE - M, M); ctx.lineTo(SIZE - M, M + C); ctx.stroke();
  // bottom-left
  ctx.beginPath(); ctx.moveTo(M, SIZE - M - C); ctx.lineTo(M, SIZE - M); ctx.lineTo(M + C, SIZE - M); ctx.stroke();
  // bottom-right
  ctx.beginPath(); ctx.moveTo(SIZE - M - C, SIZE - M); ctx.lineTo(SIZE - M, SIZE - M); ctx.lineTo(SIZE - M, SIZE - M - C); ctx.stroke();

  // ── App name ──────────────────────────────────────────────────────────────
  ctx.textAlign = "center";
  ctx.fillStyle = `${accentColor}80`; // semi-transparent
  ctx.font = "bold 28px monospace";
  ctx.letterSpacing = "8px";
  ctx.fillText(mode === "gym" ? "IRON FORM" : "MUST DANCE", SIZE / 2, 110);

  // ── Grade badge ──────────────────────────────────────────────────────────
  const gradeColor = GRADE_COLORS[grade] ?? "#ffffff";
  const CX = SIZE / 2;
  const CY = 400;
  const R = 160;

  // Outer glow ring
  const glowGrad = ctx.createRadialGradient(CX, CY, R - 10, CX, CY, R + 40);
  glowGrad.addColorStop(0, `${gradeColor}50`);
  glowGrad.addColorStop(1, "transparent");
  ctx.fillStyle = glowGrad;
  ctx.beginPath(); ctx.arc(CX, CY, R + 40, 0, Math.PI * 2); ctx.fill();

  // Circle
  ctx.strokeStyle = gradeColor;
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI * 2); ctx.stroke();

  // Grade letter
  ctx.fillStyle = gradeColor;
  ctx.font = `bold ${R * 1.1}px monospace`;
  ctx.textBaseline = "middle";
  ctx.fillText(grade, CX, CY + 6);

  // ── Score number ─────────────────────────────────────────────────────────
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 96px monospace";
  ctx.fillText(`${score}`, CX, 640);

  ctx.fillStyle = `${accentColor}80`;
  ctx.font = "bold 28px monospace";
  ctx.letterSpacing = "4px";
  ctx.fillText("SCORE", CX, 680);

  // ── Points ────────────────────────────────────────────────────────────────
  if (totalPoints > 0) {
    ctx.fillStyle = "#ffffff60";
    ctx.font = "bold 32px monospace";
    ctx.letterSpacing = "2px";
    ctx.fillText(`${totalPoints.toLocaleString()} PTS`, CX, 750);
  }

  // ── Video title ──────────────────────────────────────────────────────────
  if (videoTitle) {
    const maxWidth = SIZE - 160;
    const title = truncateText(ctx, videoTitle, "22px monospace", maxWidth);
    ctx.fillStyle = "#ffffff50";
    ctx.font = "22px monospace";
    ctx.letterSpacing = "0px";
    ctx.fillText(title, CX, 840);
  }

  // ── Call to action ────────────────────────────────────────────────────────
  ctx.fillStyle = `${accentColor}90`;
  ctx.font = "bold 24px monospace";
  ctx.letterSpacing = "3px";
  ctx.fillText("mustdance.app", CX, 960);

  ctx.fillStyle = "#ffffff30";
  ctx.font = "18px monospace";
  ctx.letterSpacing = "1px";
  ctx.fillText("Can you beat my score?", CX, 994);

  // ── Export ────────────────────────────────────────────────────────────────
  const dataUrl = canvas.toDataURL("image/png");
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => b ? resolve(b) : reject(new Error("Canvas toBlob failed")), "image/png");
  });

  return { blob, dataUrl };
}

function truncateText(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: string,
  maxWidth: number
): string {
  ctx.font = font;
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (ctx.measureText(truncated + "…").width > maxWidth && truncated.length > 0) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + "…";
}
