import { useEffect, useRef, type ReactNode } from 'react'
import { ArrowDownUp, Check, ChevronLeft, ChevronRight, FilterX, RefreshCw, Rows3, Search, SlidersHorizontal, X } from 'lucide-react'

export type HistoryFilters = { search: string; kind: string; sort: string; page_size: string }

type Props = {
  fa: boolean
  filters: HistoryFilters
  page: number
  pages: number
  loading: boolean
  onFilter: (key: keyof HistoryFilters, value: string) => void
  onPage: (page: number) => void
  onRefresh: () => void
  onReset: () => void
}

function closeMenu(button: HTMLButtonElement) {
  const menu = button.closest('details')
  if (menu) {
    menu.open = false
    menu.querySelector('summary')?.focus()
  }
}

function ChoiceMenu({ label, icon, value, options, active, onChange }: {
  label: string
  icon: ReactNode
  value: string
  options: { value: string; label: string }[]
  active: boolean
  onChange: (value: string) => void
}) {
  const selected = options.find(option => option.value === value)?.label
  return (
    <details name="dashboard-history-options" className="dashboard-history-menu" onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false
    }}>
      <summary className={`dashboard-history-icon app-tooltip${active ? ' is-active' : ''}`} data-tooltip={`${label}: ${selected}`} aria-label={`${label}: ${selected}`}>
        {icon}
        {active && <span className="dashboard-history-dot" />}
      </summary>
      <div className="dashboard-history-popover" role="group" aria-label={label}>
        <span className="dashboard-history-menu-title">{label}</span>
        {options.map(option => (
          <button key={option.value} type="button" aria-pressed={option.value === value} onClick={event => {
            if (option.value !== value) onChange(option.value)
            closeMenu(event.currentTarget)
          }}>
            <span>{option.label}</span>
            {option.value === value && <Check size={15} aria-hidden="true" />}
          </button>
        ))}
      </div>
    </details>
  )
}

export default function HistoryControls({ fa, filters, page, pages, loading, onFilter, onPage, onRefresh, onReset }: Props) {
  const root = useRef<HTMLDivElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const changed = filters.search !== '' || filters.kind !== 'all' || filters.sort !== 'newest' || filters.page_size !== '10'
  const previous = fa ? 'صفحهٔ قبلی' : 'Previous page'
  const next = fa ? 'صفحهٔ بعدی' : 'Next page'
  const refresh = fa ? 'تازه‌سازی تاریخچه' : 'Refresh history'
  const reset = fa ? 'بازنشانی فیلترها و مرتب‌سازی' : 'Reset filters and sorting'
  const number = (value: number) => value.toLocaleString(fa ? 'fa-IR' : 'en-US')

  useEffect(() => {
    function dismiss(event: PointerEvent) {
      root.current?.querySelectorAll('details[open]').forEach(menu => {
        if (event.target instanceof Node && !menu.contains(event.target)) (menu as HTMLDetailsElement).open = false
      })
    }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [])

  return (
    <div ref={root} className="dashboard-history-controls" aria-label={fa ? 'کنترل‌های تاریخچه' : 'History controls'} onKeyDown={event => {
      if (event.key !== 'Escape') return
      root.current?.querySelectorAll<HTMLDetailsElement>('details[open]').forEach(menu => {
        menu.open = false
        if (menu.contains(event.target as Node)) menu.querySelector('summary')?.focus()
      })
    }}>
      <div className="dashboard-history-search">
        <Search size={16} aria-hidden="true" />
        <input ref={search} type="search" aria-label={fa ? 'جست‌وجوی نام فایل' : 'Search filename'} placeholder={fa ? 'جست‌وجوی فایل…' : 'Search files…'} value={filters.search} onChange={event => onFilter('search', event.target.value)} />
        {filters.search && <button className="app-tooltip" type="button" aria-label={fa ? 'پاک‌کردن جست‌وجو' : 'Clear search'} data-tooltip={fa ? 'پاک‌کردن جست‌وجو' : 'Clear search'} onClick={() => { onFilter('search', ''); search.current?.focus() }}><X size={14} aria-hidden="true" /></button>}
      </div>
      <div className="dashboard-history-tools">
        <ChoiceMenu label={fa ? 'نوع تبدیل' : 'Conversion type'} icon={<SlidersHorizontal size={17} aria-hidden="true" />} value={filters.kind} active={filters.kind !== 'all'} onChange={value => onFilter('kind', value)} options={[
          { value: 'all', label: fa ? 'همهٔ تبدیل‌ها' : 'All conversions' },
          { value: 'stt', label: fa ? 'گفتار به متن (STT)' : 'Speech to text (STT)' },
          { value: 'tts', label: fa ? 'متن به گفتار (TTS)' : 'Text to speech (TTS)' },
          { value: 'video', label: fa ? 'ویدیو' : 'Video' },
        ]} />
        <ChoiceMenu label={fa ? 'مرتب‌سازی' : 'Sort'} icon={<ArrowDownUp size={17} aria-hidden="true" />} value={filters.sort} active={filters.sort !== 'newest'} onChange={value => onFilter('sort', value)} options={[
          { value: 'newest', label: fa ? 'جدیدترین' : 'Newest' },
          { value: 'oldest', label: fa ? 'قدیمی‌ترین' : 'Oldest' },
          { value: 'name_asc', label: fa ? 'نام فایل (صعودی)' : 'Filename (A–Z)' },
          { value: 'name_desc', label: fa ? 'نام فایل (نزولی)' : 'Filename (Z–A)' },
        ]} />
        <ChoiceMenu label={fa ? 'تعداد در صفحه' : 'Rows per page'} icon={<Rows3 size={17} aria-hidden="true" />} value={filters.page_size} active={filters.page_size !== '10'} onChange={value => onFilter('page_size', value)} options={[10, 25, 50, 100].map(size => ({ value: String(size), label: fa ? `${number(size)} ردیف` : `${size} rows` }))} />
        <button className="dashboard-history-icon app-tooltip" type="button" data-tooltip={refresh} aria-label={refresh} disabled={loading} onClick={onRefresh}><RefreshCw size={16} className={loading ? 'dashboard-history-refreshing' : undefined} aria-hidden="true" /></button>
        {changed && <button className="dashboard-history-icon app-tooltip" type="button" data-tooltip={reset} aria-label={reset} onClick={onReset}><FilterX size={16} aria-hidden="true" /></button>}
      </div>
      <nav className="dashboard-history-pagination" aria-label={fa ? 'صفحه‌بندی تاریخچه' : 'History pagination'}>
        <button className="dashboard-history-icon app-tooltip" type="button" data-tooltip={previous} aria-label={previous} disabled={loading || page <= 1} onClick={() => onPage(page - 1)}>{fa ? <ChevronRight size={18} aria-hidden="true" /> : <ChevronLeft size={18} aria-hidden="true" />}</button>
        <span className="dashboard-history-page-counter" aria-live="polite">
          <span className="dashboard-history-current-page">{number(page)}</span>
          <span className="dashboard-history-page-total">{fa ? 'از' : 'of'} {number(pages)}</span>
        </span>
        <button className="dashboard-history-icon app-tooltip" type="button" data-tooltip={next} aria-label={next} disabled={loading || page >= pages} onClick={() => onPage(page + 1)}>{fa ? <ChevronLeft size={18} aria-hidden="true" /> : <ChevronRight size={18} aria-hidden="true" />}</button>
      </nav>
    </div>
  )
}
