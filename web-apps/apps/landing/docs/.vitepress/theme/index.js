import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'
import './custom.css'

const getPlatformHref = () => {
  if (typeof window === 'undefined') {
    return '/platform/'
  }

  const configuredBaseUrl =
    import.meta.env.VITE_PLATFORM_BASE_URL?.replace(/\/$/, '')

  if (configuredBaseUrl) {
    return `${configuredBaseUrl}/`
  }

  if (window.location.port === '5175') {
    return `${window.location.protocol}//${window.location.hostname}:5174/platform/`
  }

  return `${window.location.origin}/platform/`
}

export default {
  extends: DefaultTheme,
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
