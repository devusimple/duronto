import { createGetUrl } from 'fumadocs-core/source';

export const appName = 'duronto';
export const docsRoute = '/docs';
export const docsImageRoute = '/og/docs';
export const docsContentRoute = '/llms.mdx/docs';

const getContentUrl = createGetUrl(docsContentRoute);

export function getPageMarkdownUrl(page: { slugs: string[]; locale?: string }) {
  return { url: getContentUrl([...page.slugs, 'content.md'], page.locale) };
}

const getImageUrl = createGetUrl(docsImageRoute);

export function getPageImageUrl(page: { slugs: string[]; locale?: string }) {
  return { url: getImageUrl([...page.slugs, 'image.webp'], page.locale) };
}
