import type { ParsedUrlQuery } from 'querystring'

import Link from 'next/link'
import { FontAwesomeIcon } from '../utils/fontawesome'

const HomeCrumb = () => {
  return (
    <Link href="/" className="flex items-center">
      <FontAwesomeIcon className="h-3 w-3" icon={['far', 'flag']} />
      <span className="ml-2 font-medium">{'Home'}</span>
    </Link>
  )
}

const Breadcrumb: React.FC<{ query?: ParsedUrlQuery }> = ({ query }) => {
  const path = query?.path

  if (Array.isArray(path)) {
    // Render in reverse so the browser scrolls to the end of the breadcrumb.
    return (
      <ol className="no-scrollbar inline-flex flex-row-reverse items-center gap-1 overflow-x-scroll text-sm text-gray-600 md:gap-3 dark:text-gray-300">
        {path
          .slice()
          .reverse()
          .map((p: string, i: number) => (
            <li key={i} className="flex flex-shrink-0 items-center">
              <FontAwesomeIcon className="h-3 w-3" icon="angle-right" />
              <Link
                href={`/${path
                  .slice(0, path.length - i)
                  .map(p => encodeURIComponent(p))
                  .join('/')}`}
                passHref
                className={`ml-1 transition-all duration-75 hover:opacity-70 md:ml-3 ${
                  i === 0 ? 'pointer-events-none opacity-80' : ''
                }`}
              >
                {p}
              </Link>
            </li>
          ))}
        <li className="flex-shrink-0 transition-all duration-75 hover:opacity-80">
          <HomeCrumb />
        </li>
      </ol>
    )
  }

  return (
    <div className="text-sm text-gray-600 transition-all duration-75 hover:opacity-80 dark:text-gray-300">
      <HomeCrumb />
    </div>
  )
}

export default Breadcrumb
