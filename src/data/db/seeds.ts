import type { Category, Setting, TransactionType } from '@/shared/domain/types'

interface SeedDescriptor {
  id: string
  domain: Category['domain']
  transactionType?: TransactionType
  name: string
  icon: string
  color: Category['color']
  sortOrder: number
}

const seedDescriptors: SeedDescriptor[] = [
  {
    id: 'category-finance-expense-food-v1',
    domain: 'finance',
    transactionType: 'expense',
    name: '餐饮',
    icon: 'utensils',
    color: 'sage',
    sortOrder: 10,
  },
  {
    id: 'category-finance-expense-transport-v1',
    domain: 'finance',
    transactionType: 'expense',
    name: '交通',
    icon: 'transport',
    color: 'blue',
    sortOrder: 20,
  },
  {
    id: 'category-finance-expense-shopping-v1',
    domain: 'finance',
    transactionType: 'expense',
    name: '购物',
    icon: 'shopping',
    color: 'rose',
    sortOrder: 30,
  },
  {
    id: 'category-finance-expense-home-v1',
    domain: 'finance',
    transactionType: 'expense',
    name: '居家',
    icon: 'home',
    color: 'amber',
    sortOrder: 40,
  },
  {
    id: 'category-finance-expense-health-v1',
    domain: 'finance',
    transactionType: 'expense',
    name: '健康',
    icon: 'health',
    color: 'sage',
    sortOrder: 50,
  },
  {
    id: 'category-finance-expense-entertainment-v1',
    domain: 'finance',
    transactionType: 'expense',
    name: '娱乐',
    icon: 'entertainment',
    color: 'violet',
    sortOrder: 60,
  },
  {
    id: 'category-finance-expense-other-v1',
    domain: 'finance',
    transactionType: 'expense',
    name: '其他支出',
    icon: 'other',
    color: 'slate',
    sortOrder: 70,
  },
  {
    id: 'category-finance-income-salary-v1',
    domain: 'finance',
    transactionType: 'income',
    name: '工资',
    icon: 'salary',
    color: 'sage',
    sortOrder: 110,
  },
  {
    id: 'category-finance-income-bonus-v1',
    domain: 'finance',
    transactionType: 'income',
    name: '奖金',
    icon: 'bonus',
    color: 'amber',
    sortOrder: 120,
  },
  {
    id: 'category-finance-income-refund-v1',
    domain: 'finance',
    transactionType: 'income',
    name: '退款',
    icon: 'refund',
    color: 'blue',
    sortOrder: 130,
  },
  {
    id: 'category-finance-income-other-v1',
    domain: 'finance',
    transactionType: 'income',
    name: '其他收入',
    icon: 'other',
    color: 'slate',
    sortOrder: 140,
  },
  {
    id: 'category-focus-work-v1',
    domain: 'focus',
    name: '工作',
    icon: 'work',
    color: 'blue',
    sortOrder: 210,
  },
  {
    id: 'category-focus-study-v1',
    domain: 'focus',
    name: '学习',
    icon: 'study',
    color: 'violet',
    sortOrder: 220,
  },
  {
    id: 'category-focus-reading-v1',
    domain: 'focus',
    name: '阅读',
    icon: 'reading',
    color: 'sage',
    sortOrder: 230,
  },
  {
    id: 'category-focus-personal-v1',
    domain: 'focus',
    name: '个人',
    icon: 'personal',
    color: 'amber',
    sortOrder: 240,
  },
]

export const seedCategoryIds = seedDescriptors.map(({ id }) => id)

export function createSeedCategories(timestamp: string): Category[] {
  return seedDescriptors.map((descriptor) => ({
    ...descriptor,
    archived: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  }))
}

export function createSeedSettings(timestamp: string): Setting[] {
  return [
    { key: 'appearance', value: 'system', updatedAt: timestamp },
    { key: 'currency', value: { code: 'CNY' }, updatedAt: timestamp },
    {
      key: 'onboarding',
      value: { localDataNoticeSeen: false, backupNoticeSeen: false },
      updatedAt: timestamp,
    },
  ]
}
