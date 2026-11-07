import { source } from '@/lib/source';
import { PageProps } from 'waku/router';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
} from 'fumadocs-ui/layouts/docs/page';
import { unstable_notFound } from 'waku/router/server';
import { getMDXComponents } from '@/components/mdx';
import { getPageImageUrl, getPageMarkdownUrl } from '@/lib/shared';

export default function Page({ slugs }: PageProps<'/docs/[...slugs]'>) {
  const page = source.getPage(slugs);
  if (!page) unstable_notFound();

  const MDX = page.data.body;
  const markdownUrl = getPageMarkdownUrl(page).url;
  return (
    <DocsPage toc={page.data.toc}>
      <meta property="og:image" content={getPageImageUrl(page).url} />
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription className="mb-0">{page.data.description}</DocsDescription>
      <div className="flex flex-row gap-2 items-center border-b pt-2 pb-6">
        <MarkdownCopyButton markdownUrl={markdownUrl} />
      </div>
      <DocsBody>
        <MDX
          components={getMDXComponents({
            a: createRelativeLink(source, page),
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}

export async function getConfig() {
  const pages = source
    .generateParams()
    .map((item) => (item.lang ? [item.lang, ...item.slug] : item.slug));

  return {
    render: 'static' as const,
    staticPaths: pages,
  } as const;
}