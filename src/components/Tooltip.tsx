interface Props {
  label: string
  children: React.ReactNode
}

export default function Tooltip({ label, children }: Props) {
  return (
    <span className="relative inline-flex group" tabIndex={0}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-max max-w-56 -translate-x-1/2 rounded-lg bg-brand-900 px-2.5 py-1.5 text-center text-xs leading-snug text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus:opacity-100"
      >
        {label}
        <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-brand-900" />
      </span>
    </span>
  )
}
