import { createGetUrl } from 'fumadocs-core/source';

export const appName = 'duronto';
export const docsRoute = '/docs';
export const docsContentRoute = '/llms.mdx/docs';

const getContentUrl = createGetUrl(docsContentRoute);

export function getPageMarkdownUrl(page: { slugs: string[]; locale?: string }) {
  return { url: getContentUrl([...page.slugs, 'content.md'], page.locale) };
}
