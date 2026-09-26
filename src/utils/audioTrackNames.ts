import type { Mp4ProbeTrack } from './mp4'

type AudioTrackLike = { id: string; label: string; language: string; enabled: boolean }
type AudioTrackListLike = EventTarget & { length: number; [index: number]: AudioTrackLike }

export function labelAudioTracks(video: HTMLVideoElement) {
  const native = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'audioTracks')?.get?.call(video) as
    | AudioTrackListLike
    | undefined
  if (!native) return undefined

  const labels = new WeakMap<AudioTrackLike, string>()
  const proxies = new WeakMap<AudioTrackLike, AudioTrackLike>()
  const bindTo = (target: object, value: unknown) => (typeof value === 'function' ? value.bind(target) : value)
  let names: Mp4ProbeTrack[] = []

  const wrap = (track: AudioTrackLike) => {
    let proxy = proxies.get(track)
    if (!proxy) {
      proxy = new Proxy(track, {
        get: (target, prop) =>
          prop === 'label' ? labels.get(target) || target.label : bindTo(target, Reflect.get(target, prop, target)),
        set: (target, prop, value) => Reflect.set(target, prop, value, target),
      })
      proxies.set(track, proxy)
    }
    return proxy
  }

  const list = new Proxy(native, {
    get(target, prop) {
      if (prop === Symbol.iterator) {
        return function* () {
          for (let i = 0; i < target.length; i++) yield wrap(target[i])
        }
      }
      if (typeof prop === 'string' && /^\d+$/.test(prop)) {
        const track = target[Number(prop)]
        return track && wrap(track)
      }
      return bindTo(target, Reflect.get(target, prop, target))
    },
  })
  Object.defineProperty(video, 'audioTracks', { configurable: true, get: () => list })

  const apply = () => {
    let changed = false
    Array.from({ length: native.length }, (_, i) => native[i]).forEach((track, index) => {
      const name = (names.find(entry => String(entry.id) === track.id) ?? names[index])?.name
      if (name && !track.label && labels.get(track) !== name) {
        labels.set(track, name)
        changed = true
      }
    })
    if (changed) native.dispatchEvent(new Event('change'))
  }
  native.addEventListener('addtrack', apply)

  return {
    setNames(tracks: Mp4ProbeTrack[]) {
      names = tracks.filter(track => track.type === 'soun')
      apply()
    },
  }
}
