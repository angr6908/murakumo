import { getPublicRuntimeConfig } from '../utils/publicRuntimeConfig'

const Footer = () => {
  return (
    <div
      className="w-full border-gray-900/10 border-t p-4 text-center font-medium text-gray-400 text-xs dark:border-gray-500/30"
      dangerouslySetInnerHTML={{ __html: getPublicRuntimeConfig().footer }}
    ></div>
  )
}

export default Footer
