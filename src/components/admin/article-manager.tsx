// ---------------------------------------------------------------------------
// Fan Hub Plus — article manager (client)
//
// Admin CRUD for FeaturedArticle rows: the long-form features on /articles.
//
// The body is a plain textarea of HTML. It is stored as typed and sanitized at
// render time (lib/safe-html.ts), so what an admin sees here is what they get
// after the allow-list strips anything unsafe — the form says so, because
// silently losing markup is worse than saying it up front.
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
import { Textarea } from "@/components/ui/textarea";
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
import { deleteArticle, saveArticle } from "@/lib/admin-actions";
import {
  articleSchema,
  timelineToText,
  type ArticleInput,
} from "@/lib/validations/admin";

export type ArticleRow = {
  id: string;
  title: string;
  cover_image: string | null;
  category_id: string;
  category_name: string;
  // Carried on the row so the edit dialog can pre-fill the body and the
  // timeline. Article bodies are short-form and the admin list is capped, so
  // shipping them is cheaper than a second fetch on every edit.
  rich_text_body: string;
  event_timeline: string;
  timelineCount: number;
};

const BLANK: ArticleInput = {
  id: "",
  categoryId: "",
  title: "",
  richTextBody: "",
  coverImage: "",
  timeline: "",
};

export function ArticleManager({
  rows,
  total,
  categories,
}: {
  rows: ArticleRow[];
  total: number;
  categories: CategoryOption[];
}) {
  const [editing, setEditing] = useState<ArticleRow | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const settle = useServerResult();
  const del = useDeleteFlow(deleteArticle);

  const form = useForm<ArticleInput>({
    resolver: zodResolver(articleSchema),
    defaultValues: BLANK,
  });

  function openCreate() {
    setEditing(null);
    form.reset(BLANK);
    setOpen(true);
  }

  function openEdit(row: ArticleRow) {
    setEditing(row);
    form.reset({
      id: row.id,
      categoryId: row.category_id,
      title: row.title,
      richTextBody: row.rich_text_body,
      coverImage: row.cover_image ?? "",
      timeline: timelineToText(row.event_timeline),
    });
    setOpen(true);
  }

  async function onSubmit(values: ArticleInput) {
    setPending(true);
    const result = await saveArticle(values);
    setPending(false);
    if (settle(form, result)) setOpen(false);
  }

  const deleting = del.target ? rows.find((row) => row.id === del.target) : undefined;

  return (
    <div className="space-y-4">
      <ManagerHeader
        description="Publish the long-form features shown on the articles page."
        count={rows.length}
        total={total}
        addLabel="Add article"
        onAdd={openCreate}
      
        paged
      />

      <ul className="space-y-3">
        {rows.length === 0 && <EmptyState message="No articles yet. Publish the first one." />}
        {rows.map((row) => (
          <ManagerRow
            key={row.id}
            onEdit={() => openEdit(row)}
            onDelete={() => del.ask(row.id)}
            deleteLabel={`Delete ${row.title}`}
          >
            <p className="font-medium">{row.title}</p>
            <div className="flex flex-wrap gap-1 pt-1">
              <Badge variant="outline" className="text-xs">
                {row.category_name}
              </Badge>
              {row.cover_image && (
                <Badge variant="outline" className="text-xs">
                  Has cover
                </Badge>
              )}
              {row.timelineCount > 0 && (
                <Badge variant="outline" className="text-xs">
                  {row.timelineCount} timeline stop(s)
                </Badge>
              )}
            </div>
          </ManagerRow>
        ))}
      </ul>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit article" : "Add article"}</DialogTitle>
            <DialogDescription>
              The body is a small subset of HTML. Anything outside it — scripts, inline styles,
              embedded media — is stripped when the page renders.
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
                      <Input {...field} placeholder="e.g. 10 Years of the Anime Boom" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="richTextBody"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Body (HTML)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={10}
                        placeholder="<p>Streaming opened the floodgates…</p>"
                        className="font-mono text-xs"
                      />
                    </FormControl>
                    <FormDescription>
                      Allowed: p, br, strong, em, u, h2–h4, ul, ol, li, blockquote, a, img, code,
                      pre, hr.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="timeline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Timeline (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={4}
                        placeholder={"2015 | The Breakout | First anime tops the charts.\n2024 | Mainstream | Streaming is the default."}
                      />
                    </FormControl>
                    <FormDescription>
                      One stop per line, as Date | Label | Body. Any part may be left out.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="coverImage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cover image URL (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://…" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "Saving…" : editing ? "Save changes" : "Publish article"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(next) => !next && del.close()}
        title={deleting ? `Delete "${deleting.title}"?` : "Delete this article?"}
        description="The article and its timeline are removed from the public articles page. This cannot be undone."
        pending={del.pending}
        onConfirm={del.confirm}
      />
    </div>
  );
}
