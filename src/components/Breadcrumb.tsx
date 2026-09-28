import { ChevronIcon } from '@videojs/react/icons'
import { House } from 'lucide-react'
import Link from 'next/link'
import { useI18n } from '../i18n'
import { encodeSegments, type QueryMap } from '../utils/drivePath'

const crumbClass = (current: boolean) =>
  `inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 transition-colors ${
    current
      ? 'pointer-events-none font-medium text-foreground'
      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
  }`

const HomeCrumb = ({ current }: { current: boolean }) => {
  const { t } = useI18n()
  return (
    <Link
      href="/"
      className={crumbClass(current)}
      aria-current={current ? 'page' : undefined}
    >
      <House className="size-4" />
      <span>{t('Home')}</span>
    </Link>
  )
}

const Breadcrumb: React.FC<{ query?: QueryMap }> = ({ query }) => {
  const path = query?.path

  if (Array.isArray(path)) {
    // Render in reverse so the browser scrolls to the end of the breadcrumb.
    return (
      <ol className="no-scrollbar inline-flex min-w-0 flex-row-reverse items-center overflow-x-scroll text-control">
        {path.toReversed().map((p, i) => {
          // Each crumb targets a distinct prefix of the path, so its href is a stable unique key
          const href = `/${encodeSegments(path.slice(0, path.length - i))}`
          return (
            <li key={href} className="flex shrink-0 items-center">
              <ChevronIcon className="size-3.5 text-muted-foreground" />
              <Link
                href={href}
                passHref
                className={crumbClass(i === 0)}
                aria-current={i === 0 ? 'page' : undefined}
              >
                {p}
              </Link>
            </li>
          )
        })}
        <li className="shrink-0">
          <HomeCrumb current={false} />
        </li>
      </ol>
    )
  }

  return (
    <div className="text-control">
      <HomeCrumb current />
    </div>
  )
}

export default Breadcrumb
