import { SpinnerIcon } from '@videojs/react/icons'

export const Spinner: React.FC<{ className?: string }> = ({ className = 'size-4.5' }) => (
  <SpinnerIcon className={`shrink-0 ${className}`} />
)

const Loading: React.FC<{ loadingText: string }> = ({ loadingText }) => {
  return (
    <div className="flex items-center justify-center gap-2 py-32 text-control text-muted-foreground" role="status">
      <Spinner />
      <span>{loadingText}</span>
    </div>
  )
}

export default Loading
