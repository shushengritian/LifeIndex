export function MonthPicker({
  month,
  onChange,
}: {
  month: string
  onChange: (value: string) => void
}) {
  return (
    <label className="v4-month-picker">
      <span>查看月份</span>
      <input
        type="month"
        value={month}
        onChange={(event) => {
          if (/^\d{4}-(0[1-9]|1[0-2])$/.test(event.target.value)) onChange(event.target.value)
        }}
      />
    </label>
  )
}
