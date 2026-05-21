import { useEffect, useRef } from 'react'

/**
 * A single item on the spin wheel.
 * Requirements: 6.3, 6.7
 */
export interface SpinItem {
  label: string   // 1–100 chars
  weight: number  // 1–1000, only used when weighted=true
}

export interface WheelCanvasProps {
  items: SpinItem[]
  currentAngle: number  // radians — controlled by parent
  size?: number         // CSS px, default 320
}

/** Fixed 10-colour palette cycling by segment index */
const PALETTE = [
  '#2563EB',
  '#7C3AED',
  '#DB2777',
  '#DC2626',
  '#D97706',
  '#65A30D',
  '#0891B2',
  '#0D9488',
  '#9333EA',
  '#EA580C',
] as const

/**
 * Truncates a label so it fits within maxWidth pixels using the given font.
 */
function truncateLabel(
  ctx: CanvasRenderingContext2D,
  label: string,
  maxWidth: number,
): string {
  if (ctx.measureText(label).width <= maxWidth) return label
  let truncated = label
  while (truncated.length > 1 && ctx.measureText(truncated + '…').width > maxWidth) {
    truncated = truncated.slice(0, -1)
  }
  return truncated + '…'
}

/**
 * Draws the spin wheel onto the canvas.
 *
 * Layout:
 *   - Pointer triangle sits at the very top centre, pointing downward into the wheel.
 *   - The wheel circle is inset slightly so the pointer sits outside it.
 *
 * Requirements: 6.3, 6.7
 */
function drawWheel(
  canvas: HTMLCanvasElement,
  items: SpinItem[],
  currentAngle: number,
  size: number,
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const dpr = window.devicePixelRatio || 1
  const physicalSize = size * dpr

  // Resize canvas backing store if needed
  if (canvas.width !== physicalSize || canvas.height !== physicalSize) {
    canvas.width = physicalSize
    canvas.height = physicalSize
  }

  ctx.save()
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, size, size)

  const cx = size / 2
  const cy = size / 2

  // Pointer triangle dimensions
  const pointerH = 18   // height of the triangle
  const pointerW = 14   // base width of the triangle

  // Wheel radius — leave room for the pointer at the top
  const radius = size / 2 - pointerH - 4

  const n = items.length
  const segmentAngle = (2 * Math.PI) / n

  // ── Draw pie segments ──────────────────────────────────────────────────────
  for (let i = 0; i < n; i++) {
    const startAngle = currentAngle + i * segmentAngle - Math.PI / 2
    const endAngle = startAngle + segmentAngle

    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, radius, startAngle, endAngle)
    ctx.closePath()

    ctx.fillStyle = PALETTE[i % PALETTE.length]
    ctx.fill()

    // Subtle border between segments
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'
    ctx.lineWidth = 1
    ctx.stroke()
  }

  // ── Draw segment labels ────────────────────────────────────────────────────
  const fontSize = Math.max(10, Math.min(14, Math.floor(radius / n * 1.8)))
  ctx.font = `bold ${fontSize}px 'Geist', 'Inter', system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // Max label width: roughly half the radius so text stays inside the segment
  const maxLabelWidth = radius * 0.55

  for (let i = 0; i < n; i++) {
    const midAngle = currentAngle + (i + 0.5) * segmentAngle - Math.PI / 2

    // Position text at ~65% of the radius from centre
    const textRadius = radius * 0.65
    const tx = cx + textRadius * Math.cos(midAngle)
    const ty = cy + textRadius * Math.sin(midAngle)

    ctx.save()
    ctx.translate(tx, ty)
    // Rotate text to follow the arc midpoint; flip if in the left half so text reads left-to-right
    let rotation = midAngle
    if (Math.cos(midAngle) < 0) {
      rotation += Math.PI
    }
    ctx.rotate(rotation)

    const label = truncateLabel(ctx, items[i].label, maxLabelWidth)

    // Drop shadow for readability
    ctx.shadowColor = 'rgba(0,0,0,0.6)'
    ctx.shadowBlur = 3
    ctx.fillStyle = '#FFFFFF'
    ctx.fillText(label, 0, 0)
    ctx.shadowBlur = 0

    ctx.restore()
  }

  // ── Draw wheel rim ─────────────────────────────────────────────────────────
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, 2 * Math.PI)
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'
  ctx.lineWidth = 3
  ctx.stroke()

  // ── Draw centre hub ────────────────────────────────────────────────────────
  ctx.beginPath()
  ctx.arc(cx, cy, 10, 0, 2 * Math.PI)
  ctx.fillStyle = '#FAFAFA'
  ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // ── Draw pointer triangle at top centre ───────────────────────────────────
  // The pointer points downward (toward the wheel) and sits just above the rim.
  const pointerTipY = cy - radius + 2   // tip just touches the rim
  const pointerBaseY = pointerTipY - pointerH
  const pointerLeft = cx - pointerW / 2
  const pointerRight = cx + pointerW / 2

  ctx.beginPath()
  ctx.moveTo(cx, pointerTipY)           // tip (pointing down into wheel)
  ctx.lineTo(pointerLeft, pointerBaseY) // base left
  ctx.lineTo(pointerRight, pointerBaseY)// base right
  ctx.closePath()

  ctx.fillStyle = '#FAFAFA'
  ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.4)'
  ctx.lineWidth = 1.5
  ctx.stroke()

  ctx.restore()
}

/**
 * WheelCanvas — renders a spinning prize wheel using the Canvas 2D API.
 *
 * The parent controls `currentAngle`; this component is purely presentational.
 * It redraws whenever `items`, `currentAngle`, or `size` changes.
 *
 * Requirements: 6.3, 6.7
 */
export default function WheelCanvas({
  items,
  currentAngle,
  size = 320,
}: WheelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || items.length === 0) return
    drawWheel(canvas, items, currentAngle, size)
  }, [items, currentAngle, size])

  return (
    <canvas
      ref={canvasRef}
      aria-label="Spin wheel"
      role="img"
      style={{
        width: size,
        height: size,
        display: 'block',
      }}
    />
  )
}
