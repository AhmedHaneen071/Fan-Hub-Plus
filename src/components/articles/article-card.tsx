// ---------------------------------------------------------------------------
// Fan Hub Plus — article card
// Tile used on the /articles index.
// ---------------------------------------------------------------------------

import Link from "next/link";
import Image from "next/image";
import { Newspaper } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_LABELS, type CategoryValue } from "@/lib/constants";

export type ArticleCardItem = {
  id: string;
  title: string;
  cover_image: string | null;
  category: { name: string };
};

export function ArticleCard({ article }: { article: ArticleCardItem }) {
  return (
    <Link
      href={`/articles/${article.id}`}
      className="group block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="flex h-full flex-col overflow-hidden transition-shadow group-hover:shadow-lg">
        <CardContent className="relative aspect-[16/10] p-0">
          {article.cover_image ? (
            <Image
              src={article.cover_image}
              alt=""
              fill
              sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex size-full items-center justify-center bg-gradient-to-br from-primary/25 via-rose-100 to-accent/25"
            >
              <Newspaper className="size-12 text-primary/70" strokeWidth={1.5} />
            </div>
          )}
        </CardContent>
        <CardHeader className="flex-1">
          <Badge variant="secondary" className="w-fit">
            {CATEGORY_LABELS[article.category.name as CategoryValue] ?? article.category.name}
          </Badge>
          <CardTitle className="text-lg">{article.title}</CardTitle>
        </CardHeader>
      </Card>
    </Link>
  );
}
