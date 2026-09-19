import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { WeightTrendChart } from '@/features/health/WeightTrendChart'
import type { WeightEntry } from '@/shared/domain/types'

function measurement(date: string, time: string, grams: number): WeightEntry {
  const stamp = `${date}T${time}:00.000Z`
  return {
    id: stamp,
    localDate: date,
    measuredAt: stamp,
    weightGrams: grams,
    timezoneOffsetMinutes: 0,
    createdAt: stamp,
    updatedAt: stamp,
  }
}

it('takes the last daily measurement and excludes older/future data without filling gaps', () => {
  const entries = [
    measurement('2026-09-19', '08:00', 66000),
    measurement('2026-09-19', '10:00', 65000),
    measurement('2026-09-10', '10:00', 67000),
    measurement('2026-09-20', '10:00', 68000),
    measurement('2026-08-01', '10:00', 69000),
  ]
  const { container } = render(<WeightTrendChart entries={entries} today="2026-09-19" />)
  expect(screen.getByRole('img')).toHaveAccessibleName(expect.stringContaining('2 天有记录'))
  expect(container.querySelectorAll('circle')).toHaveLength(2)
  expect(container.querySelector('polyline')).not.toBeNull()
  expect(container.querySelectorAll('circle')[1]?.textContent).toContain('65.0 公斤')
  expect(container.querySelectorAll('circle')[0]?.textContent).toContain('2026-09-10')
  expect(entries[0]?.weightGrams).toBe(66000)
})

it('shows a single point without implying a change and provides an empty-window explanation', () => {
  const { container, rerender } = render(
    <WeightTrendChart entries={[measurement('2026-09-19', '10:00', 65000)]} today="2026-09-19" />,
  )
  expect(container.querySelectorAll('circle')).toHaveLength(1)
  expect(container.querySelector('polyline')).toBeNull()
  expect(container.innerHTML).not.toContain('NaN')
  rerender(
    <WeightTrendChart entries={[measurement('2026-08-01', '10:00', 65000)]} today="2026-09-19" />,
  )
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
  expect(screen.getByText(/近 30 天暂无体重记录/)).toBeInTheDocument()
})
