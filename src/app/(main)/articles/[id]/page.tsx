// ---------------------------------------------------------------------------
// Fan Hub Plus — featured article detail  (/articles/[id])
// One long-form feature: cover, fandom badge, the rich-text body and the
// timeline stored alongside it.
//
// The body is admin-authored HTML. It is passed through sanitizeArticleHtml()
// before it reaches dangerouslySetInnerHTML — see src/lib/safe-html.ts for why
// that is an allow-list rebuild rather than a filter.
// ---------------------------------------------------------------------------

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Newspaper } from "lucide-react";
import { Breadcrumbs } from "@/components/explore/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getArticleDetail, getSiblingArticles } from "@/lib/queries/articles";
import { sanitizeArticleHtml } from "@/lib/safe-html";
import { ArticleTimeline } from "@/components/articles/article-timeline";
import { CATEGORY_LABELS, type CategoryValue } from "@/lib/constants";
import { ShareButton } from "@/components/engagement/share-button";

type ArticleDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: ArticleDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const article = await getArticleDetail(id);
  return {
    title: article ? `${article.title} · Fan Hub Plus` : "Article · Fan Hub Plus",
    description: article ? CATEGORY_LABELS[article.category.name as CategoryValue] : undefined,
  };
}

export default async function ArticleDetailPage({ params }: ArticleDetailPageProps) {
  const { id } = await params;
  const article = await getArticleDetail(id);
  if (!article) notFound();

  const siblings = await getSiblingArticles(article.id, article.category_id);
  const body = sanitizeArticleHtml(article.rich_text_body);

  return (
    <div className="space-y-10">
      <Breadcrumbs
        crumbs={[
          { label: "Articles", href: "/articles" },
          { label: article.title },
        ]}
      />

      <article className="space-y-6">
        <header className="space-y-3">
          <Badge variant="secondary">
            {CATEGORY_LABELS[article.category.name as CategoryValue] ?? article.category.name}
          </Badge>
          <h1 className="text-3xl font-heading font-bold tracking-wide sm:text-4xl">
            {article.title}
          </h1>
          <ShareButton title={article.title} />
        </header>

        {article.cover_image ? (
          <Card className="overflow-hidden">
            <CardContent className="relative aspect-[16/9] p-0">
              <Image
                src={article.cover_image}
                alt=""
                fill
                sizes="(min-width:1024px) 60vw, 100vw"
                className="object-cover"
                priority
              />
            </CardContent>
          </Card>
        ) : null}

        {/*
          Sanitized immediately above. The sanitizer rebuilds the markup from a
          tag/attribute allow-list, so nothing an admin typed can introduce a
          script, an event handler or a javascript: URL into a reader's page.
        */}
        {body ? (
          <div
            className="max-w-prose space-y-4 leading-relaxed text-foreground/90 [&_a]:font-medium [&_a]:text-accent [&_a]:underline-offset-2 [&_a:hover]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-accent [&_blockquote]:pl-4 [&_blockquote]:italic [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-heading [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-heading [&_h3]:font-semibold [&_img]:rounded-xl [&_li]:ml-5 [&_ol]:list-decimal [&_ul]:list-disc"
            dangerouslySetInnerHTML={{ __html: body }}
          />
        ) : (
          <p className="text-muted-foreground">This article has no body yet.</p>
        )}
      </article>

      <ArticleTimeline value={article.event_timeline} />

      {siblings.length > 0 ? (
        <section aria-labelledby="read-next-heading" className="space-y-4">
          <h2
            id="read-next-heading"
            className="text-2xl font-heading font-semibold tracking-wide"
          >
            More in {CATEGORY_LABELS[article.category.name as CategoryValue]}
          </h2>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {siblings.map((sibling) => (
              <li key={sibling.id}>
                <Link
                  href={`/articles/${sibling.id}`}
                  className="flex h-full items-start gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Newspaper className="mt-0.5 size-5 shrink-0 text-primary/70" aria-hidden="true" />
                  <span className="font-medium">{sibling.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
