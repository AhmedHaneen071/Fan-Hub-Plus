// ---------------------------------------------------------------------------
// Fan Hub Plus — content manager (client)
//
// Admin CRUD for catalogue Content. The seed script was previously the only way
// a title could exist. This is the missing management surface.
//
// The form imports its Zod schema from the server module rather than
// redeclaring it, so a field can never be validated on screen but not on write.
// ---------------------------------------------------------------------------

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DeleteConfirmDialog,
  EmptyState,
  FandomSelect,
  ManagerHeader,
  ManagerRow,
  useDeleteFlow,
  useServerResult,
  type CategoryOption,
} from "@/components/admin/manager-parts";
import { deleteContent, saveContent } from "@/lib/admin-actions";
import { CONTENT_TYPES, CONTENT_TYPE_LABELS } from "@/lib/constants";
import { contentSchema, type ContentInput } from "@/lib/validations/admin";

export type ContentRow = {
  id: string;
  title: string;
  type: string;
  tags: string;
  genre: string | null;
  description: string;
  release_date: Date | null;
  media_url: string | null;
  trailer_url: string | null;
  popularity_score: number;
  is_upcoming: boolean;
  category_id: string;
  category_name: string;
  bookmarks: number;
  ratings: number;
};

/** A <input type="date"> wants YYYY-MM-DD; Prisma hands back a Date. */
function toDateInput(value: Date | null): string {
  return value ? value.toISOString().slice(0, 10) : "";
}

const BLANK: ContentInput = {
  categoryId: "",
  title: "",
  type: "ARTICLE",
  tags: "",
  genre: "",
  description: "",
  releaseDate: "",
  mediaUrl: "",
  trailerUrl: "",
  popularityScore: "",
  isUpcoming: false,
};

export function ContentManager({
  rows,
  total,
  categories,
}: {
  rows: ContentRow[];
  total: number;
  categories: CategoryOption[];
}) {
  const [editing, setEditing] = useState<ContentRow | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const settle = useServerResult();
  const del = useDeleteFlow(deleteContent);

  const form = useForm<ContentInput>({
    resolver: zodResolver(contentSchema),
    defaultValues: BLANK,
  });

  function openCreate() {
    setEditing(null);
    form.reset(BLANK);
    setOpen(true);
  }

  function openEdit(row: ContentRow) {
    setEditing(row);
    form.reset({
      id: row.id,
      categoryId: row.category_id,
      title: row.title,
      type: row.type as ContentInput["type"],
      tags: row.tags,
      genre: row.genre ?? "",
      description: row.description,
      releaseDate: toDateInput(row.release_date),
      mediaUrl: row.media_url ?? "",
      trailerUrl: row.trailer_url ?? "",
      popularityScore: row.popularity_score === 0 ? "" : String(row.popularity_score),
      isUpcoming: row.is_upcoming,
    });
    setOpen(true);
  }

  async function onSubmit(values: ContentInput) {
    setPending(true);
    const result = await saveContent(values);
    setPending(false);
    if (settle(form, result)) setOpen(false);
  }

  const deleting = del.target ? rows.find((row) => row.id === del.target) : undefined;

  return (
    <div className="space-y-4">
      <ManagerHeader
        description="Manage articles, images, audio and video shown in the explore lanes and fandom shelves."
        count={rows.length}
        total={total}
        addLabel="Add title"
        onAdd={openCreate}
      
        paged
      />

      <ul className="space-y-3">
        {rows.length === 0 && <EmptyState message="No titles yet. Add the first one." />}
        {rows.map((row) => (
          <ManagerRow
            key={row.id}
            onEdit={() => openEdit(row)}
            onDelete={() => del.ask(row.id)}
            deleteLabel={`Delete ${row.title}`}
          >
            <p className="font-medium">{row.title}</p>
            <div className="flex flex-wrap gap-1 pt-1">
              <Badge variant="secondary" className="text-xs">
                {CONTENT_TYPE_LABELS[row.type as keyof typeof CONTENT_TYPE_LABELS] ?? row.type}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {row.category_name}
              </Badge>
              {row.tags.split(",").map((tag) => tag.trim()).filter(Boolean).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {row.genre && (
                <Badge variant="outline" className="text-xs">
                  {row.genre}
                </Badge>
              )}
              {row.release_date && (
                <Badge variant="outline" className="text-xs">
                  {toDateInput(row.release_date)}
                </Badge>
              )}
              {row.trailer_url && (
                <Badge variant="outline" className="text-xs">
                  Has trailer
                </Badge>
              )}
              {row.is_upcoming ? <Badge variant="outline">Upcoming</Badge> : null}
            </div>
            <p className="pt-1 text-sm text-muted-foreground">{row.description}</p>
            <p className="text-xs text-muted-foreground">
              Heat {row.popularity_score} · {row.bookmarks} bookmark(s) · {row.ratings} rating(s)
            </p>
          </ManagerRow>
        ))}
      </ul>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit title" : "Add title"}</DialogTitle>
            <DialogDescription>
              Titles drive the explorer, the fandom shelves and the content detail page.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FandomSelect form={form} categories={categories} />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Arcane season 2 breakdown" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="action, season 1, interview" />
                    </FormControl>
                    <FormDescription>Separate discovery tags with commas.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Format</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pick a format" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CONTENT_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {CONTENT_TYPE_LABELS[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="genre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Genre</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Action" />
                    </FormControl>
                    <FormDescription>
                      Free text. Existing filters use seeded values like Action or Comedy.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} />
                    </FormControl>
                    <FormDescription>Shown on the card, so keep it to a sentence or two.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="releaseDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Release date</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="popularityScore"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Heat score</FormLabel>
                      <FormControl>
                        <Input {...field} inputMode="numeric" placeholder="0" />
                      </FormControl>
                      <FormDescription>0–100. Drives the &quot;Hot&quot; badges and sort order.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField control={form.control} name="isUpcoming" render={({ field }) => (
                <FormItem className="flex items-center gap-3 rounded-lg border p-3">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <div><FormLabel>Upcoming release</FormLabel><FormDescription>Include this title in the Coming soon shelf.</FormDescription></div>
                </FormItem>
              )} />

              <FormField
                control={form.control}
                name="mediaUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Media URL</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://…/media-file-or-image" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="trailerUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trailer URL</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://www.youtube.com/watch?v=…" />
                    </FormControl>
                    <FormDescription>
                      YouTube only — the in-page player needs a video ID it can read.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="submit" disabled={pending}>
                  {editing ? "Save changes" : "Add title"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={del.target !== null}
        onOpenChange={(next) => {
          if (!next) del.close();
        }}
        title={deleting ? `Delete "${deleting.title}"?` : "Delete this title?"}
        description={
          deleting && deleting.bookmarks + deleting.ratings > 0
            ? `${deleting.bookmarks} bookmark(s) and ${deleting.ratings} rating(s) belong to this title and will be removed with it. This cannot be undone.`
            : "This removes the title from the catalogue. This cannot be undone."
        }
        pending={del.pending}
        onConfirm={del.confirm}
      />
    </div>
  );
}
