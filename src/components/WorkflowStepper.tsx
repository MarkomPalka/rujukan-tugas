import type { WorkflowStep } from '../types'
import { WORKFLOW_STEPS } from '../types'

interface Props {
  current: WorkflowStep
  onNavigate: (step: WorkflowStep) => void
  canNavigateTo: (step: WorkflowStep) => boolean
  stepStatus?: Partial<Record<WorkflowStep, 'done' | 'partial'>>
}

export default function WorkflowStepper({
  current,
  onNavigate,
  canNavigateTo,
  stepStatus,
}: Props) {
  const currentIndex = WORKFLOW_STEPS.findIndex((s) => s.id === current)

  return (
    <nav aria-label="Tahapan pengerjaan" className="mb-8">
      <ol className="flex flex-col sm:flex-row gap-2 sm:gap-0">
        {WORKFLOW_STEPS.map((step, index) => {
          const isActive = step.id === current
          const override = stepStatus?.[step.id]
          const isDone = override === 'done' || (!override && index < currentIndex)
          const isPartial = override === 'partial'
          const canClick = canNavigateTo(step.id) && (isDone || isPartial || isActive)
          const statusTitle = isActive
            ? 'Tahap yang sedang dikerjakan'
            : isDone
              ? 'Tahap selesai'
              : isPartial
                ? 'Sudah pernah dicari, tapi belum ada sumber yang dipakai di esai'
                : 'Selesaikan tahap sebelumnya dulu'

          return (
            <li key={step.id} className="flex items-center flex-1 min-w-0">
              <button
                type="button"
                title={statusTitle}
                onClick={() => canClick && onNavigate(step.id)}
                disabled={!canClick}
                className={`flex items-center gap-3 w-full text-left p-3 rounded-xl transition-colors ${
                  isActive
                    ? 'bg-brand-50 border border-brand-200'
                    : isDone || isPartial
                      ? 'hover:bg-stone-50 cursor-pointer'
                      : 'opacity-50 cursor-not-allowed'
                }`}
              >
                <span
                  className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    isActive
                      ? 'bg-brand-600 text-white'
                      : isDone
                        ? 'bg-emerald-500 text-white'
                        : isPartial
                          ? 'bg-amber-500 text-white'
                          : 'bg-stone-200 text-stone-500'
                  }`}
                >
                  {isDone ? '✓' : index + 1}
                </span>
                <span className="min-w-0">
                  <span
                    className={`block text-sm font-medium truncate ${
                      isActive ? 'text-brand-900' : 'text-stone-700'
                    }`}
                  >
                    {step.label}
                  </span>
                  <span className="block text-xs text-muted truncate">{step.description}</span>
                </span>
              </button>
              {index < WORKFLOW_STEPS.length - 1 && (
                <div
                  className="hidden sm:block w-4 h-px bg-border shrink-0 mx-1"
                  aria-hidden
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
