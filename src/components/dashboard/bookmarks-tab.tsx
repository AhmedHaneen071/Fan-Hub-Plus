// ---------------------------------------------------------------------------
// Fan Hub Plus — bookmarks tab (client)
// The signed-in user's personal bookmark collection, grouped by item kind.
// Each entry supports an editable private note and removal.
// ---------------------------------------------------------------------------

"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookmarkX, Pencil, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateBookmarkNote, removeBookmark } from "@/lib/engagement-actions";

export type BookmarkRow = {
  id: string;
  note: string | null;
  createdAt: string;
  target: {
    kind: "content" | "character" | "merchandise";
    href: string;
    title: string;
  };
};

const KIND_LABELS: Record<BookmarkRow["target"]["kind"], string> = {
  content: "Content",
  character: "Character",
  merchandise: "Merch",
};

export function BookmarksTab({ rows }: { rows: BookmarkRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<BookmarkRow | null>(null);
  const [noteValue, setNoteValue] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openNote(row: BookmarkRow) {
    setEditing(row);
    setNoteValue(row.note ?? "");
  }

  function saveNote() {
    if (!editing) return;
    startTransition(async () => {
      const result = await updateBookmarkNote(editing.id, noteValue);
      setEditing(null);
      if (result.ok) {
        toast.success("Note saved.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function onRemove(id: string) {
    setRemoving(id);
    startTransition(async () => {
      const result = await removeBookmark(id);
      setRemoving(null);
      if (result.ok) {
        toast.success(result.message ?? "Bookmark removed.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nothing saved yet. Tap the <StickyNote className="inline size-4" />{" "}
        bookmark button on any content, character or merchandise page to build
        your collection.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <article
          key={row.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {KIND_LABELS[row.target.kind]}
              </Badge>
              <Badge variant="outline" className="text-xs text-muted-foreground">
                {new Date(row.createdAt).toLocaleDateString()}
              </Badge>
            </div>
            <Link
              href={row.target.href}
              className="mt-1 block truncate font-medium hover:text-primary hover:underline"
            >
              {row.target.title}
            </Link>
            {row.note ? (
              <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
                <StickyNote className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                {row.note}
              </p>
            ) : null}
          </div>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => openNote(row)}
              disabled={isPending}
            >
              <Pencil aria-hidden="true" />
              Note
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => onRemove(row.id)}
              disabled={isPending && removing === row.id}
            >
              <BookmarkX aria-hidden="true" />
              Remove
            </Button>
          </div>
        </article>
      ))}

      {/* Note editor dialog */}
      <Dialog
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        {editing ? (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit note</DialogTitle>
              <DialogDescription>
                The note is only visible to you.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="edit-note">Note</Label>
              <Input
                id="edit-note"
                value={noteValue}
                onChange={(event) => setNoteValue(event.target.value)}
                maxLength={500}
              />
            </div>
            <DialogFooter>
              <Button onClick={saveNote} disabled={isPending}>
                Save note
              </Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}