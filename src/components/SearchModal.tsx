import { Dialog } from '@videojs/react'
import AwesomeDebouncePromise from 'awesome-debounce-promise'
import { Folder, Search } from 'lucide-react'
import Link from 'next/link'
import type { Dispatch, ReactNode, SetStateAction } from 'react'
import { useState } from 'react'
import { useAsync } from 'react-async-hook'
import useConstant from 'use-constant'
import type { OdSearchResult } from '../types'
import { getFileIcon } from '../utils/getFileIcon'
import { useI18n } from '../i18n'
import { get } from '../utils/http'
import { Spinner } from './Loading'
import ModalShell from './ModalShell'

type SearchItem = OdSearchResult[number]
type SearchState = ReturnType<typeof useDriveItemSearch>['results']

function useDriveItemSearch() {
  const [query, setQuery] = useState('')
  const searchDriveItem = async (q: string) => {
    const { data } = await get('/api/search/', { params: { q: q.trim() } })
    return data.map((item: OdSearchResult[number]) => ({
      ...item,
      path: typeof item.path === 'string' ? item.path : '',
    }))
  }

  const debouncedDriveItemSearch = useConstant(() => AwesomeDebouncePromise(searchDriveItem, 1000))
  const results = useAsync(async () => {
    return query.trim().length === 0 ? [] : debouncedDriveItemSearch(query)
  }, [query])

  return { query, setQuery, results }
}

function SearchResultItem({ item, onSelect }: { item: SearchItem; onSelect: () => void }) {
  const Icon = item.file ? getFileIcon(item.name) : Folder

  return (
    <Link href={item.path} passHref prefetch={false} className="menu-item gap-3" onClick={onSelect}>
      <Icon className="text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{item.name}</div>
        <div className="truncate text-muted-foreground text-xs">{decodeURIComponent(item.path)}</div>
      </div>
    </Link>
  )
}

const SearchStatus = ({ children }: { children: ReactNode }) => (
  <div className="flex items-center justify-center gap-2 px-4 py-10 text-control text-muted-foreground">{children}</div>
)

function SearchResults({ query, results, onSelect }: { query: string; results: SearchState; onSelect: () => void }) {
  const { t } = useI18n()
  if (query.trim().length === 0) return null

  if (results.loading) {
    return (
      <SearchStatus>
        <Spinner />
        <span>{t('Searching ...')}</span>
      </SearchStatus>
    )
  }

  if (results.error) {
    return (
      <SearchStatus>{t('Error: {{message}}', { message: results.error.message ?? t('Search failed.') })}</SearchStatus>
    )
  }

  if (!results.result || results.result.length === 0) {
    return <SearchStatus>{t('Nothing here.')}</SearchStatus>
  }

  return (
    <div className="menu-content scroll-thin max-h-[60vh] overflow-y-auto">
      {results.result.map(item => (
        <SearchResultItem key={item.id} item={item} onSelect={onSelect} />
      ))}
    </div>
  )
}

export default function SearchModal({
  searchOpen,
  setSearchOpen,
}: {
  searchOpen: boolean
  setSearchOpen: Dispatch<SetStateAction<boolean>>
}) {
  const { query, setQuery, results } = useDriveItemSearch()
  const { t } = useI18n()

  const closeSearchBox = () => {
    setSearchOpen(false)
    setQuery('')
  }

  return (
    <ModalShell
      open={searchOpen}
      onClose={closeSearchBox}
      layerClassName="items-start sm:pt-[12vh]"
      panelClassName="max-w-xl gap-1 p-2"
    >
      <Dialog.Title className="sr-only">{t('Search')}</Dialog.Title>
      <label className="flex h-11 items-center gap-2.5 rounded-full bg-accent px-4 text-muted-foreground">
        <Search />
        <input
          type="text"
          id="search-box"
          className="min-w-0 flex-1 bg-transparent text-foreground text-sm placeholder:text-muted-foreground"
          placeholder={t('Search ...')}
          autoComplete="off"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <kbd className="kbd">ESC</kbd>
      </label>
      <SearchResults query={query} results={results} onSelect={closeSearchBox} />
    </ModalShell>
  )
}
