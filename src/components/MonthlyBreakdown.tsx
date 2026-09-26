import { useLayoutEffect, useRef, useState } from 'react'
import { getLargestMonthTotal, getNiceAxisMax } from '../lib/calculations'
import { MONTHS, MONTH_KEYS, type MonthKey } from '../lib/months'
import type { MonthlyMinutes } from '../lib/types'

interface MonthlyBreakdownProps {
  totals: MonthlyMinutes
  selectedMonth: MonthKey
  onSelect: (month: MonthKey) => void
  label?: string
}

const TICK_COUNT = 5
const FALLBACK_WIDTH = 640
const TOOLTIP_MIN_GAP = 34
const TOOLTIP_MAX_WIDTH = 140
const MARGIN = { top: 18, right: 16, bottom: 30, left: 46 }
const numberFormatter = new Intl.NumberFormat('en-US')

function useMeasuredWidth() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(FALLBACK_WIDTH)

  useLayoutEffect(() => {
    const node = containerRef.current

    if (!node) {
      return
    }

    setWidth(node.clientWidth || FALLBACK_WIDTH)

    if (typeof ResizeObserver === 'undefined') {
      return
    }

    const observer = new ResizeObserver((entries) => {
      const measured = entries[0]?.contentRect.width ?? 0

      if (measured > 0) {
        setWidth(measured)
      }
    })

    observer.observe(node)

    return () => observer.disconnect()
  }, [])

  return { containerRef, width }
}

export function MonthlyBreakdown({
  totals,
  selectedMonth,
  onSelect,
  label = 'Monthly late-minute totals',
}: MonthlyBreakdownProps) {
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([])
  const { containerRef, width } = useMeasuredWidth()
  const isCompact = width < 480
  const height = isCompact ? 190 : 250
  const plotWidth = Math.max(width - MARGIN.left - MARGIN.right, 40)
  const plotHeight = height - MARGIN.top - MARGIN.bottom
  const axisMax = getNiceAxisMax(getLargestMonthTotal(totals), TICK_COUNT)
  const step = plotWidth / (MONTHS.length - 1)

  function xFor(index: number) {
    return MARGIN.left + step * index
  }

  function yFor(value: number) {
    return MARGIN.top + plotHeight - (value / axisMax) * plotHeight
  }

  const points = MONTHS.map((month, index) => ({
    month,
    total: totals[month.key],
    x: xFor(index),
    y: yFor(totals[month.key]),
  }))
  const linePath = points
    .map((point, index) =>
      index === 0 ? `M${point.x} ${point.y}` : `L${point.x} ${point.y}`,
    )
    .join(' ')
  const areaPath = `${linePath} L${xFor(MONTHS.length - 1)} ${MARGIN.top + plotHeight} L${xFor(0)} ${MARGIN.top + plotHeight} Z`
  const baseline = MARGIN.top + plotHeight
  const ticks = Array.from({ length: TICK_COUNT + 1 }, (_, index) => {
    const value = (axisMax / TICK_COUNT) * index

    return {
      value,
      y: yFor(value),
      label: numberFormatter.format(Math.round(value)),
    }
  })
  const selectedPoint = points.find((point) => point.month.key === selectedMonth)

  function moveFocus(index: number) {
    const next = MONTH_KEYS[(index + MONTH_KEYS.length) % MONTH_KEYS.length]
    onSelect(next)
    buttonsRef.current[MONTH_KEYS.indexOf(next)]?.focus()
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const current = MONTH_KEYS.indexOf(
      (event.target as HTMLButtonElement).dataset.month as MonthKey,
    )

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      moveFocus(current + 1)
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      moveFocus(current - 1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      moveFocus(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      moveFocus(MONTHS.length - 1)
    }
  }

  return (
    <div className="month-breakdown">
      <div
        className="month-chart"
        ref={containerRef}
        style={{ height: `${height}px` }}
        role="group"
        aria-label={label}
        onKeyDown={handleKeyDown}
      >
        <svg
          className="month-chart__plot"
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          aria-hidden="true"
          focusable="false"
        >
          {ticks.map((tick) => (
            <g key={tick.value}>
              <line
                className="month-chart__gridline"
                x1={MARGIN.left}
                x2={MARGIN.left + plotWidth}
                y1={tick.y}
                y2={tick.y}
              />
              <text
                className="month-chart__tick-label"
                x={MARGIN.left - 10}
                y={tick.y}
                textAnchor="end"
                dominantBaseline="middle"
              >
                {tick.label}
              </text>
            </g>
          ))}
          <path className="month-chart__area" d={areaPath} />
          <path className="month-chart__line" d={linePath} />
          <line
            className="month-chart__axis"
            x1={MARGIN.left}
            x2={MARGIN.left + plotWidth}
            y1={baseline}
            y2={baseline}
          />
          {points.map((point) =>
            point.total === 0 ? null : (
              <circle
                key={`dot-${point.month.key}`}
                className="month-chart__dot"
                cx={point.x}
                cy={point.y}
                r={2.75}
              />
            ),
          )}
          {selectedPoint ? (
            <>
              <line
                className="month-chart__marker-line"
                x1={selectedPoint.x}
                x2={selectedPoint.x}
                y1={MARGIN.top}
                y2={baseline}
              />
              <circle
                className="month-chart__marker"
                cx={selectedPoint.x}
                cy={selectedPoint.y}
                r={5}
              />
            </>
          ) : null}
        </svg>

        <div className="month-chart__axis-labels" aria-hidden="true">
          {points.map((point) => (
            <span
              key={`label-${point.month.key}`}
              className={`month-chart__axis-label${point.month.key === selectedMonth ? ' month-chart__axis-label--selected' : ''}`}
              style={{ left: `${point.x}px` }}
            >
              {point.month.shortLabel}
            </span>
          ))}
        </div>

        {points.map((point, index) => {
          const isSelected = selectedMonth === point.month.key
          const hitAreaWidth = step || plotWidth / MONTHS.length
          const rawLeft = point.x - hitAreaWidth / 2
          const hitLeft = Math.min(
            Math.max(rawLeft, 0),
            Math.max(width - hitAreaWidth, 0),
          )
          const flipBelow = point.y - MARGIN.top < TOOLTIP_MIN_GAP
          const tipLeft = Math.min(
            Math.max(point.x - TOOLTIP_MAX_WIDTH / 2, 0),
            Math.max(width - TOOLTIP_MAX_WIDTH, 0),
          )

          return (
            <button
              key={`hit-${point.month.key}`}
              type="button"
              ref={(node) => {
                buttonsRef.current[index] = node
              }}
              data-month={point.month.key}
              className={`month-chart__hit${isSelected ? ' month-chart__hit--selected' : ''}`}
              style={{
                left: `${hitLeft}px`,
                width: `${hitAreaWidth}px`,
                top: `${MARGIN.top}px`,
                height: `${plotHeight}px`,
              }}
              aria-pressed={isSelected}
              aria-label={`${point.month.label}: ${point.total} late minutes`}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => onSelect(point.month.key)}
            >
              <span
                className={`month-chart__tooltip${flipBelow ? ' month-chart__tooltip--below' : ''}`}
                style={{
                  left: `${tipLeft - hitLeft}px`,
                  top: `${point.y - MARGIN.top + (flipBelow ? 12 : -12)}px`,
                }}
              >
                {point.month.shortLabel} · {numberFormatter.format(point.total)}{' '}
                min
              </span>
            </button>
          )
        })}
      </div>

      <table className="sr-only">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Late minutes</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={`row-${point.month.key}`}>
              <th scope="row">{point.month.label}</th>
              <td>{numberFormatter.format(point.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
