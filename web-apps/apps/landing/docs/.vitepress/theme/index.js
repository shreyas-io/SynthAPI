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
          'Continue to platform',
        ),
    }),
}
