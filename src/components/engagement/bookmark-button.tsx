// ---------------------------------------------------------------------------
// Fan Hub Plus — bookmark button (client)
// One-click save for content, characters and merchandise. Signed-in members
// can attach a private note inside a dialog; the action runs server-side so
// nobody can act on another person's bookmark.
// ---------------------------------------------------------------------------

"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  toggleBookmark,
  updateBookmarkNote,
  type ActionOutcome,
} from "@/lib/engagement-actions";
import type { BookmarkTarget } from "@/lib/validations/engagement";

type BookmarkButtonProps = {
  targetType: BookmarkTarget;
  targetId: string;
  /** The bookmark row id (present only when already saved). */
  bookmarkId: string | null;
  initialBookmarked: boolean;
  note: string | null;
  signedIn: boolean;
};

export function BookmarkButton({
  targetType,
  targetId,
  bookmarkId,
  initialBookmarked,
  note,
  signedIn,
}: BookmarkButtonProps) {
  const router = useRouter();
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [open, setOpen] = useState(false);
  const [noteValue, setNoteValue] = useState(note ?? "");
  const [isPending, startTransition] = useTransition();

  function notify(result: ActionOutcome) {
    if (result.ok) {
      toast.success(result.message ?? "Saved.");
      router.refresh();
    } else {
      toast.error(result.error);
      if (result.redirectTo) router.push(result.redirectTo);
    }
  }

  function onToggle() {
    startTransition(async () => {
      const result = await toggleBookmark(targetType, targetId);
      if (result.ok && typeof result.bookmarked === "boolean") {
        setBookmarked(result.bookmarked);
        // Unsaved -> saved: there is now a row; refresh so the wrapper can
        // hand us the new bookmark id (and hence the note dialog).
        if (result.bookmarked) router.refresh();
      }
      notify(result);
    });
  }

  function onSaveNote() {
    if (!bookmarkId) return;
    startTransition(async () => {
      const result = await updateBookmarkNote(bookmarkId, noteValue);
      if (result.ok) {
        setOpen(false);
        toast.success("Note saved.");
      } else {
        toast.error(result.error);
      }
    });
  }

  if (!signedIn) {
    return (
      <Button asChild variant="outline">
        <Link href="/login">
          <Bookmark aria-hidden="true" />
          Save
        </Link>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant={bookmarked ? "secondary" : "outline"}
        onClick={onToggle}
        disabled={isPending}
        aria-pressed={bookmarked}
      >
        <Bookmark
          className={bookmarked ? "fill-primary text-primary" : ""}
          aria-hidden="true"
        />
        {bookmarked ? "Saved" : "Save"}
      </Button>

      {bookmarked && bookmarkId ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="ghost" size="icon" aria-label="Edit note">
              <StickyNote aria-hidden="true" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Private note</DialogTitle>
              <DialogDescription>
                A note only you can see, pinned to this bookmark.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="bookmark-note">Note</Label>
              <Input
                id="bookmark-note"
                value={noteValue}
                onChange={(event) => setNoteValue(event.target.value)}
                maxLength={500}
                placeholder="e.g. Watch the finale before the meetup."
              />
            </div>
            <DialogFooter>
              <Button onClick={onSaveNote} disabled={isPending}>
                Save note
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}