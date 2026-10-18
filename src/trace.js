/**
 * Monochrome strip chart: normalised pressure drop per stage over time.
 * Ring buffers, 1px lines, no fills. Rendered at device pixel ratio.
 */

const SERIES_COLORS = ["#111211", "#74766f", "#a6a8a1"];
const LOW = 0.35;
const HIGH = 1.8;
const MAX = 3.6;

export function createTrace(canvas, { samples = 320 } = {}) {
  const ctx = canvas.getContext("2d");
  let width = 0;
  let height = 0;
  let dpr = 1;

  const buffers = [0, 1, 2].map(() => new Float32Array(samples));
  const filled = [0, 0, 0];
  const markers = [];

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    draw();
  }

  function push(values) {
    for (let s = 0; s < 3; s++) {
      const buffer = buffers[s];
      buffer.copyWithin(1, 0, samples - 1);
      buffer[0] = values[s] ?? 1;
      filled[s] = Math.min(samples, filled[s] + 1);
    }
    for (const m of markers) m.index += 1;
    while (markers.length && markers[0].index > samples) markers.shift();
    draw();
  }

  function mark(label) {
    markers.push({ index: 0, label });
    draw();
  }

  function draw() {
    if (!width || !height) return;

    const padLeft = 1;
    const padRight = 27;
    const padTop = 7;
    const padBottom = 13;
    const plotW = Math.max(1, width - padLeft - padRight);
    const plotH = Math.max(1, height - padTop - padBottom);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const yFor = (v) => padTop + plotH - (Math.min(v, MAX) / MAX) * plotH;
    const xFor = (i) => padLeft + plotW - (i / (samples - 1)) * plotW;

    // Grid.
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(17,18,17,0.12)";
    ctx.font = "450 9px 'Inter Variable', Inter, system-ui, sans-serif";
    ctx.fillStyle = "#7c7e78";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    for (const v of [0, 1, 2, 3]) {
      const y = Math.round(yFor(v)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + plotW, y);
      ctx.stroke();
      ctx.fillText(String(v), padLeft + plotW + 6, y);
    }

    // Thresholds.
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = "rgba(17,18,17,0.26)";
    for (const v of [LOW, HIGH]) {
      const y = Math.round(yFor(v)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + plotW, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // State-change markers.
    ctx.setLineDash([1, 4]);
    ctx.strokeStyle = "rgba(17,18,17,0.2)";
    for (const m of markers) {
      const x = Math.round(xFor(m.index)) + 0.5;
      if (x < padLeft + 2) continue;
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, padTop + plotH);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Baseline (1.0).
    ctx.strokeStyle = "rgba(17,18,17,0.3)";
    const baseY = Math.round(yFor(1)) + 0.5;
    ctx.beginPath();
    ctx.moveTo(padLeft, baseY);
    ctx.lineTo(padLeft + plotW, baseY);
    ctx.stroke();

    // Series.
    for (let s = 0; s < 3; s++) {
      const n = filled[s];
      if (n < 2) continue;
      ctx.strokeStyle = SERIES_COLORS[s];
      ctx.lineWidth = s === 0 ? 1.4 : 1;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const x = xFor(i);
        const y = yFor(buffers[s][i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // X axis labels.
    ctx.fillStyle = "#7c7e78";
    ctx.textAlign = "left";
    ctx.fillText("−40 s", padLeft, height - 5);
    ctx.textAlign = "right";
    ctx.fillText("now", padLeft + plotW, height - 5);
  }

  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  return { push, mark, resize };
}
