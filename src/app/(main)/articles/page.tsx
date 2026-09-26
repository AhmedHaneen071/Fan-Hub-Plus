// ---------------------------------------------------------------------------
// Fan Hub Plus — featured articles  (/articles)
// Long-form fandom features. An optional ?category= query narrows the page to
// one fandom, mirroring the characters and explorer URL pattern.
// ---------------------------------------------------------------------------

import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/explore/breadcrumbs";
import { ArticleCard } from "@/components/articles/article-card";
import { Button } from "@/components/ui/button";
import { getArticleList } from "@/lib/queries/articles";
import {
  CATEGORY_LABELS,
  CATEGORY_NAMES,
  type CategoryValue,
} from "@/lib/constants";

export const metadata: Metadata = {
  title: "Articles",
  description: "Long-form features and retrospectives from across the fandoms.",
};

type ArticlesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ArticlesPage({ searchParams }: ArticlesPageProps) {
  const raw = await searchParams;
  const requested = Array.isArray(raw.category) ? raw.category[0] : raw.category;
  const category = CATEGORY_NAMES.includes(requested as CategoryValue)
    ? (requested as CategoryValue)
    : undefined;

  const articles = await getArticleList(category);

  return (
    <div className="space-y-8">
      <Breadcrumbs crumbs={[{ label: "Articles" }]} />

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-wide sm:text-4xl">
            {category ? `${CATEGORY_LABELS[category]} features` : "Featured articles"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {category
              ? "Retrospectives and explainers from this fandom."
              : "Retrospectives, explainers and the long reads behind the fandom chatter."}
          </p>
        </div>
        {category ? (
          <Button asChild variant="outline">
            <Link href="/articles">All fandoms</Link>
          </Button>
        ) : null}
      </header>

      {category ? (
        <nav aria-label="Filter articles by fandom" className="flex flex-wrap gap-2">
          {CATEGORY_NAMES.map((name) => (
            <Button
              key={name}
              asChild
              size="sm"
              variant={name === category ? "secondary" : "outline"}
            >
              <Link href={`/articles?category=${name}`}>{CATEGORY_LABELS[name]}</Link>
            </Button>
          ))}
        </nav>
      ) : null}

      {articles.length === 0 ? (
        <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          No articles here yet.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <li key={article.id}>
              <ArticleCard article={article} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
