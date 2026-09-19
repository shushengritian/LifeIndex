import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { HealthHistoryList } from '@/features/health/HealthHistoryList'

it('groups consecutive dates and opens an entire accessible row without inline deletion', async () => {
  const open = vi.fn()
  render(
    <HealthHistoryList
      onOpen={open}
      rows={[
        {
          id: 'one',
          date: '2026-09-19',
          time: '10:00',
          title: '65.0 kg',
          subtitle: '体重记录',
          icon: 'heart',
          color: 'blue',
        },
        {
          id: 'two',
          date: '2026-09-19',
          time: '09:00',
          title: '65.1 kg',
          subtitle: '体重记录',
          icon: 'heart',
          color: 'blue',
        },
        {
          id: 'three',
          date: '2026-09-18',
          time: '09:00',
          title: '65.2 kg',
          subtitle: '体重记录',
          icon: 'heart',
          color: 'blue',
        },
      ]}
    />,
  )
  expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(2)
  expect(screen.getAllByRole('button')).toHaveLength(3)
  expect(screen.queryByRole('button', { name: /删除/ })).not.toBeInTheDocument()
  const row = screen.getByRole('button', { name: '编辑 65.1 kg' })
  expect(row.querySelector('svg')).not.toBeNull()
  await userEvent.click(row)
  expect(open).toHaveBeenCalledWith('two')
})
