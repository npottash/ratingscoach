import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/',
        '/api/',
        '/dashboard',
        '/intake',
        '/narrative',
        '/simulation',
        '/scorecard',
        '/login',
        '/signup',
      ],
    },
    sitemap: 'https://www.theratingscoach.com/sitemap.xml',
  }
}
