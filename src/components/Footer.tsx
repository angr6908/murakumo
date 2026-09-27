import { getPublicRuntimeConfig } from '../utils/publicRuntimeConfig'

const Footer = () => {
  return (
    <footer
      className="w-full px-4 py-8 text-center text-muted-foreground text-xs [&_a]:link [&_a]:text-foreground"
      dangerouslySetInnerHTML={{ __html: getPublicRuntimeConfig().footer }}
    ></footer>
  )
}

export default Footer
