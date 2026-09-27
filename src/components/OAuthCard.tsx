import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export const inlineCodeClass = 'rounded-md bg-accent px-1.5 py-0.5 font-mono text-xs'

export function Callout({
  icon: Icon,
  iconClassName,
  children,
}: {
  icon: LucideIcon
  iconClassName: string
  children: ReactNode
}) {
  return (
    <div className="well flex gap-2.5 px-3 py-2.5 text-control">
      <Icon className={`mt-px shrink-0 ${iconClassName}`} />
      <div>{children}</div>
    </div>
  )
}

export default function OAuthCard({
  icon: Icon,
  step,
  stepTitle,
  children,
}: {
  icon: LucideIcon
  step: number
  stepTitle: string
  children: ReactNode
}) {
  return (
    <div className="mx-auto w-full max-w-5xl py-4 sm:p-4">
      <div className="surface flex flex-col gap-4 p-4 text-sm leading-relaxed sm:rounded-popup sm:p-6">
        <div className="flex flex-col items-center gap-3 pb-2 text-center">
          <div className="grid size-11 place-items-center rounded-full bg-accent">
            <Icon />
          </div>
          <h3 className="dialog-title">{'Welcome to your new Murakumo'}</h3>
          <div className="flex w-36 gap-1" role="img" aria-label={`Step ${step} of 3`}>
            {[1, 2, 3].map(i => (
              <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-primary' : 'bg-muted'}`} />
            ))}
          </div>
          <div className="text-control text-muted-foreground">{`Step ${step}/3: ${stepTitle}`}</div>
        </div>
        {children}
      </div>
    </div>
  )
}
