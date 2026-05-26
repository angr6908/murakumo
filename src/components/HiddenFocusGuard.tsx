import { forwardRef } from 'react'

const HiddenFocusGuard = forwardRef<HTMLButtonElement>((_, ref) => (
  <button
    ref={ref}
    type="button"
    tabIndex={-1}
    aria-hidden="true"
    className="fixed h-px w-px -translate-x-full overflow-hidden opacity-0"
  />
))

HiddenFocusGuard.displayName = 'HiddenFocusGuard'

export default HiddenFocusGuard
