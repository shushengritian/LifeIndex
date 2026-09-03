import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AppServicesContext } from '@/app/AppServicesContext'
import { LifeIndexDatabase } from '@/data/db/LifeIndexDatabase'
import { FinancePage } from '@/features/finance/FinancePage'
import { PwaProvider } from '@/pwa/PwaProvider'
import { FIXED_NOW } from '../fixtures/builders'

const databases: LifeIndexDatabase[] = []

afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.delete()))
})

describe('recoverable feature write failures', () => {
  it('keeps a Finance draft visible when IndexedDB rejects the write', async () => {
    const database = new LifeIndexDatabase(`LifeIndexFailureUiTest-${crypto.randomUUID()}`)
    databases.push(database)
    await database.initialize(new Date(FIXED_NOW))
    vi.spyOn(database.transactions, 'add').mockRejectedValueOnce(
      new Error('SyntheticDatabaseWriteFailure'),
    )
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const user = userEvent.setup()
    render(
      <AppServicesContext.Provider value={{ database }}>
        <PwaProvider>
          <FinancePage />
        </PwaProvider>
      </AppServicesContext.Provider>,
    )

    await user.click(await screen.findByRole('button', { name: '新增' }))
    const amount = screen.getByLabelText('金额（CNY）')
    await user.type(amount, '19.90')
    await user.selectOptions(screen.getByRole('combobox', { name: '分类' }), [
      'category-finance-expense-food-v1',
    ])
    await user.click(screen.getByRole('button', { name: '保存' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('未能保存，本次输入仍保留')
    expect(amount).toHaveValue('19.90')
    expect(await database.transactions.count()).toBe(0)
  })
})
