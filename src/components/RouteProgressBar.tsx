import Router from 'next/router'
import NProgress from 'nprogress'
import { useEffect } from 'react'

type RouteProgressBarProps = {
  color?: string
  height?: number
  options?: Parameters<typeof NProgress.configure>[0]
}

const START_POSITION = 0.3
const STOP_DELAY_MS = 200

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

export default function RouteProgressBar({ color = '#29D', height = 3, options }: RouteProgressBarProps) {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined

    const endProgress = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => NProgress.done(true), STOP_DELAY_MS)
    }
    const startProgress = () => {
      NProgress.set(START_POSITION)
      NProgress.start()
    }

    if (options) NProgress.configure(options)
    Router.events.on('routeChangeStart', startProgress)
    Router.events.on('routeChangeComplete', endProgress)
    Router.events.on('routeChangeError', endProgress)

    return () => {
      if (timer) clearTimeout(timer)
      Router.events.off('routeChangeStart', startProgress)
      Router.events.off('routeChangeComplete', endProgress)
      Router.events.off('routeChangeError', endProgress)
    }
  }, [options])

  return <style>{getStyle(color, height)}</style>
}
