import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "SynthAPI",
  description: "Agentic Mock API Platform",
  base: '/docs/',
  appearance: 'force-dark', // Force dark mode matching the landing page
  srcDir: '.', // Source directory is docs
  head: [
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,500;14..32,600;14..32,700&family=JetBrains+Mono:wght@400;500;600&display=swap' }],
  ],
  themeConfig: {
    logo: '/favicon.svg',
    colorModeSwitch: false, // Hide the dark mode toggle
    nav: [],
    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Introduction', link: '/' },
          { text: 'Quickstart', link: '/quickstart' }
        ]
      },
      {
        text: 'Platform Overview',
        items: [
          { text: 'Overview', link: '/platform-overview/' },
          { text: 'Responses and Ordering', link: '/platform-overview/responses-and-ordering' },
          { text: 'Rule Trees and Post-Response Actions', link: '/platform-overview/rule-trees-and-post-actions' }
        ]
      },
      {
        text: 'Core Concepts',
        items: [
          { text: 'Mock APIs', link: '/core-concepts/mock-apis' },
          { text: 'Variables', link: '/core-concepts/variables' },
          { text: 'Imports & Templates', link: '/core-concepts/imports-and-templates' },
          { text: 'Request Logs', link: '/core-concepts/request-logs' }
        ]
      },
      {
        text: 'Agentic Orchestration',
        items: [
          { text: 'Capabilities', link: '/agent/capabilities' }
        ]
      },
      {
        text: 'Examples',
        items: [
          { text: 'Blog CRUD API', link: '/examples/blog-crud-api' },
          { text: 'LLM SSE Events', link: '/examples/llm-sse-events' }
        ]
      }
    ]
  }
})
