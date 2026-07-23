import toast from 'react-hot-toast'
import { useClipboard } from 'use-clipboard-copy'

/** Copy a link to the clipboard and confirm it with a toast. */
export function useCopyLink() {
  const clipboard = useClipboard()

  return (url: string, message: string) => {
    clipboard.copy(url)
    toast.success(message)
  }
}
