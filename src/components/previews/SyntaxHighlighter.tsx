import SyntaxHighlighter from 'react-syntax-highlighter/dist/esm/light-async'
import tomorrow from 'react-syntax-highlighter/dist/esm/styles/hljs/tomorrow'
import tomorrowNight from 'react-syntax-highlighter/dist/esm/styles/hljs/tomorrow-night'
import tomorrowNightEighties from 'react-syntax-highlighter/dist/esm/styles/hljs/tomorrow-night-eighties'

const styles = {
  tomorrow,
  tomorrowNight,
  tomorrowNightEighties,
}

type SyntaxHighlighterStyle = keyof typeof styles

export default function ClientSyntaxHighlighter({
  children,
  language,
  preTag,
  styleName,
}: {
  children: string | string[]
  language?: string
  preTag?: 'div' | 'pre'
  styleName: SyntaxHighlighterStyle
}) {
  return (
    <SyntaxHighlighter language={language} style={styles[styleName]} PreTag={preTag}>
      {children}
    </SyntaxHighlighter>
  )
}
