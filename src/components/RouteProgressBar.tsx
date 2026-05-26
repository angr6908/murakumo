import Router from 'next/router'
import NProgress from 'nprogress'
import { useEffect } from 'react'

type RouteProgressBarProps = {
  color?: string
  height?: number
  nonce?: string
  options?: Parameters<typeof NProgress.configure>[0]
  showOnShallow?: boolean
  startPosition?: number
  stopDelayMs?: number
}

const getStyle = (color: string, height: number) => `
  #nprogress {
    pointer-events: none;
  }

  #nprogress .bar {
    background: ${color};
    position: fixed;
    z-index: 9999;
    top: 0;
    left: 0;
    width: 100%;
    height: ${height}px;
  }

  #nprogress .peg {
    display: block;
    position: absolute;
    right: 0;
    width: 100px;
    height: 100%;
    box-shadow: 0 0 10px ${color}, 0 0 5px ${color};
    opacity: 1;
    transform: rotate(3deg) translate(0, -4px);
  }

  #nprogress .spinner {
    display: block;
    position: fixed;
    z-index: 1031;
    top: 15px;
    right: 15px;
  }

  #nprogress .spinner-icon {
    width: 18px;
    height: 18px;
    box-sizing: border-box;
    border: solid 2px transparent;
    border-top-color: ${color};
    border-left-color: ${color};
    border-radius: 50%;
    animation: nprogress-spinner 400ms linear infinite;
  }

  @keyframes nprogress-spinner {
    0% {
      transform: rotate(0deg);
    }

    100% {
      transform: rotate(360deg);
    }
  }
`

export default function RouteProgressBar({
  color = '#29D',
  height = 3,
  nonce,
  options,
  showOnShallow = true,
  startPosition = 0.3,
  stopDelayMs = 200,
}: RouteProgressBarProps) {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined

    const endProgress = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => NProgress.done(true), stopDelayMs)
    }
    const startProgress = (_: string, { shallow }: { shallow: boolean }) => {
      if (shallow && !showOnShallow) return
      NProgress.set(startPosition)
      NProgress.start()
    }
    const stopProgress = (_: string, { shallow }: { shallow: boolean }) => {
      if (!shallow || showOnShallow) endProgress()
    }
    const errorProgress = (_: Error, __: string, { shallow }: { shallow: boolean }) => {
      if (!shallow || showOnShallow) endProgress()
    }

    if (options) NProgress.configure(options)
    Router.events.on('routeChangeStart', startProgress)
    Router.events.on('routeChangeComplete', stopProgress)
    Router.events.on('routeChangeError', errorProgress)

    return () => {
      if (timer) clearTimeout(timer)
      Router.events.off('routeChangeStart', startProgress)
      Router.events.off('routeChangeComplete', stopProgress)
      Router.events.off('routeChangeError', errorProgress)
    }
  }, [options, showOnShallow, startPosition, stopDelayMs])

  return <style nonce={nonce}>{getStyle(color, height)}</style>
}
