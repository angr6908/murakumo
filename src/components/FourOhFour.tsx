import { CircleAlert } from 'lucide-react'

const FourOhFour: React.FC<{ errorMsg: string }> = ({ errorMsg }) => {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 py-12 text-center text-control">
      <div className="grid size-11 place-items-center rounded-full bg-accent">
        <CircleAlert />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="dialog-title">{"Oops, that's a four-oh-four."}</div>
        <div className="text-muted-foreground">{'Something went wrong while loading this page.'}</div>
      </div>
      <div className="well w-full break-all px-3 py-2 text-left font-mono text-muted-foreground text-xs">
        {errorMsg}
      </div>
      <div className="text-muted-foreground">
        {'Press '}
        <kbd className="kbd">F12</kbd>
        {' and open devtools for more details, or seek help at '}
        <a
          className="link text-foreground"
          href="https://github.com/angr6908/murakumo/discussions"
          target="_blank"
          rel="noopener noreferrer"
        >
          {'Murakumo discussions'}
        </a>
        .
      </div>
    </div>
  )
}

export default FourOhFour
