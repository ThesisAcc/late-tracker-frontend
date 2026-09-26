export const MONTHS = [
  { key: 'jan', label: 'January', shortLabel: 'Jan' },
  { key: 'feb', label: 'February', shortLabel: 'Feb' },
  { key: 'mar', label: 'March', shortLabel: 'Mar' },
  { key: 'apr', label: 'April', shortLabel: 'Apr' },
  { key: 'may', label: 'May', shortLabel: 'May' },
  { key: 'jun', label: 'June', shortLabel: 'Jun' },
  { key: 'jul', label: 'July', shortLabel: 'Jul' },
  { key: 'aug', label: 'August', shortLabel: 'Aug' },
  { key: 'sep', label: 'September', shortLabel: 'Sep' },
  { key: 'oct', label: 'October', shortLabel: 'Oct' },
  { key: 'nov', label: 'November', shortLabel: 'Nov' },
  { key: 'dec', label: 'December', shortLabel: 'Dec' },
] as const

export type MonthKey = (typeof MONTHS)[number]['key']

export const MONTH_KEYS = MONTHS.map((month) => month.key)

export function getMonthDefinition(month: MonthKey) {
  return MONTHS.find((item) => item.key === month) ?? MONTHS[0]
}

export function getCurrentMonthKey(): MonthKey {
  return MONTHS[new Date().getMonth()].key
}
