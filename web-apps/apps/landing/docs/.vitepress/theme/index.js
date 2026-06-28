import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'
import './custom.css'

const getPlatformHref = () => {
  const configuredBaseUrl =
    import.meta.env.VITE_PLATFORM_BASE_URL?.replace(/\/$/, '')

  if (configuredBaseUrl) {
    return `${configuredBaseUrl}/`
  }

  if (typeof window === 'undefined') {
    return '/platform/'
  }

  if (window.location.port === '5175') {
    return `${window.location.protocol}//${window.location.hostname}:5174/platform/`
  }

  return `${window.location.origin}/platform/`
}

export default {
  extends: DefaultTheme,
  enhanceApp({ router }) {
    if (typeof window !== 'undefined') {
      const patchLogoLink = () => {
        setTimeout(() => {
          const titleLink = document.querySelector('.VPNavBarTitle .title')
          if (titleLink && titleLink.getAttribute('href') !== '/') {
            titleLink.setAttribute('href', '/')
          }
        }, 50)
      }

      window.addEventListener('DOMContentLoaded', patchLogoLink)

      const originalOnAfterRouteChanged = router.onAfterRouteChanged
      router.onAfterRouteChanged = (to) => {
        if (originalOnAfterRouteChanged) originalOnAfterRouteChanged(to)
        patchLogoLink()
      }

      window.addEventListener('click', (e) => {
        const titleLink = e.target.closest('.VPNavBarTitle .title')
        if (titleLink) {
          e.preventDefault()
          window.location.href = '/'
        }
      })
    }
  },
  Layout: () =>
    h(DefaultTheme.Layout, null, {
      'nav-bar-content-after': () =>
        h(
          'a',
          {
            class: 'docs-platform-link',
            href: getPlatformHref(),
            target: '_blank',
            rel: 'noreferrer',
          },
          [
            h('span', 'Continue to platform'),
            h(
              'svg',
              {
                xmlns: 'http://www.w3.org/2000/svg',
                width: '14',
                height: '14',
                viewBox: '0 0 24 24',
                fill: 'none',
                stroke: 'currentColor',
                'stroke-width': '2.5',
                'stroke-linecap': 'round',
                'stroke-linejoin': 'round',
                class: 'docs-platform-link-icon',
              },
              [
                h('line', { x1: '5', y1: '12', x2: '19', y2: '12' }),
                h('polyline', { points: '12 5 19 12 12 19' }),
              ]
            ),
          ]
        ),
    }),
}
