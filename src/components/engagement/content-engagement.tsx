// ---------------------------------------------------------------------------
// Fan Hub Plus — content engagement (server)
// Fetches the viewer's bookmark + rating plus the live community aggregate,
// then hands all of it to the client widgets. Unauthenticated visitors see
// the guides to sign in instead.
// ---------------------------------------------------------------------------

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { RatingWidget } from "./rating-widget";
import { BookmarkButton } from "./bookmark-button";

export async function ContentEngagement({ contentId }: { contentId: string }) {
  const session = await auth();
  const userId = session?.user?.id;
  const signedIn = Boolean(userId);

  const [stars, thumbs, myRating, myBookmark] = await Promise.all([
    prisma.rating.findMany({
      where: { content_id: contentId, ratingType: "STARS" },
      select: { value: true },
    }),
    prisma.rating.findMany({
      where: { content_id: contentId, ratingType: "THUMBS" },
      select: { value: true },
    }),
    userId
      ? prisma.rating.findUnique({
          where: { user_id_content_id: { user_id: userId, content_id: contentId } },
          select: { value: true, ratingType: true },
        })
      : null,
    userId
      ? prisma.bookmark.findFirst({
          where: { user_id: userId, content_id: contentId },
          select: { id: true, note: true },
        })
      : null,
  ]);

  const starsAvg =
    stars.length > 0
      ? stars.reduce((sum, rating) => sum + rating.value, 0) / stars.length
      : null;
  const thumbsUp = thumbs.filter((rating) => rating.value === 1).length;
  const thumbsDown = thumbs.length - thumbsUp;

  return (
    <Card className="border-rose-100 dark:border-rose-500/20">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-lg font-semibold tracking-wide">
            Your engagement
          </h2>
          <BookmarkButton
            targetType="content"
            targetId={contentId}
            bookmarkId={myBookmark?.id ?? null}
            initialBookmarked={Boolean(myBookmark)}
            note={myBookmark?.note ?? null}
            signedIn={signedIn}
          />
        </div>
        <RatingWidget
          contentId={contentId}
          signedIn={signedIn}
          initial={myRating}
          community={{ starsAvg, starsCount: stars.length, thumbsUp, thumbsDown }}
        />
      </CardContent>
    </Card>
  );
}