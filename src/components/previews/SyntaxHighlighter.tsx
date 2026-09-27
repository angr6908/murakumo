import type { CSSProperties } from 'react'
import SyntaxHighlighter from 'react-syntax-highlighter/dist/esm/light-async'

const tokenGroups: Array<[string, string[]]> = [
  [
    'var(--syntax-tag)',
    ['variable', 'template-variable', 'tag', 'name', 'selector-id', 'selector-class', 'regexp', 'deletion'],
  ],
  ['var(--syntax-number)', ['number', 'literal', 'params', 'meta', 'link', 'attribute']],
  ['var(--syntax-type)', ['built_in', 'builtin-name', 'type']],
  ['var(--syntax-string)', ['string', 'symbol', 'bullet', 'addition']],
  ['var(--syntax-function)', ['title', 'section']],
  ['var(--syntax-keyword)', ['keyword', 'selector-tag']],
]

const style: Record<string, CSSProperties> = {
  hljs: {
    display: 'block',
    overflowX: 'auto',
    background: 'transparent',
    color: 'var(--color-foreground)',
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--text-control)',
    lineHeight: 1.6,
  },
  'hljs-comment': { color: 'var(--syntax-comment)', fontStyle: 'italic' },
  'hljs-quote': { color: 'var(--syntax-comment)', fontStyle: 'italic' },
  'hljs-emphasis': { fontStyle: 'italic' },
  'hljs-strong': { fontWeight: 600 },
  ...Object.fromEntries(
    tokenGroups.flatMap(([color, names]) => names.map(name => [`hljs-${name}`, { color }] as const)),
  ),
}

export default function ClientSyntaxHighlighter({
  children,
  language,
  preTag,
}: {
  children: string | string[]
  language?: string
  preTag?: 'div' | 'pre'
}) {
  return (
    <SyntaxHighlighter language={language} style={style} PreTag={preTag}>
      {children}
    </SyntaxHighlighter>
  )
}
