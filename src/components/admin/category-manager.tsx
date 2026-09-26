// ---------------------------------------------------------------------------
// Fan Hub Plus — fandom manager (client)
//
// Presentation settings for the fandom cards and the home page shelf.
//
// This manager deliberately has no Add and no Delete. `Category.name` is the
// CategoryName enum and the unique key of the row, so the eight fandoms are
// fixed by the schema rather than by data, and the migration puts every
// referencing table on ON DELETE RESTRICT — deleting a fandom that any content,
// character, article, merch item or event points at is refused by the database.
// Changing the set of fandoms is a schema + seed change, not an admin edit.
// ---------------------------------------------------------------------------

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Star } from "lucide-react";
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
import { ManagerHeader, ManagerRow, useServerResult } from "@/components/admin/manager-parts";
import { saveCategory } from "@/lib/admin-actions";
import { CATEGORY_LABELS, type CategoryValue } from "@/lib/constants";
import { categorySchema, type CategoryInput } from "@/lib/validations/admin";

export type CategoryRow = {
  id: string;
  name: string;
  description: string;
  cover_image: string | null;
  featured: boolean;
  counts: {
    contents: number;
    characters: number;
    merch: number;
    events: number;
  };
};

/** "TV_SHOWS" -> "TV Shows", falling back to the raw value for safety. */
function label(name: string): string {
  return CATEGORY_LABELS[name as CategoryValue] ?? name;
}

export function CategoryManager({ rows, total }: { rows: CategoryRow[]; total: number }) {
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const settle = useServerResult();

  const form = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: { id: "", description: "", coverImage: "", featured: false },
  });

  function openEdit(row: CategoryRow) {
    setEditing(row);
    form.reset({
      id: row.id,
      description: row.description,
      coverImage: row.cover_image ?? "",
      featured: row.featured,
    });
    setOpen(true);
  }

  async function onSubmit(values: CategoryInput) {
    setPending(true);
    const result = await saveCategory(values);
    setPending(false);
    if (settle(form, result)) setOpen(false);
  }

  return (
    <div className="space-y-4">
      <ManagerHeader
        description="Edit how each fandom presents itself on the category cards and the home page shelf. The set of fandoms itself is fixed by the database enum."
        count={rows.length}
        total={total}
      />

      <ul className="space-y-3">
        {rows.map((row) => (
          <ManagerRow key={row.id} onEdit={() => openEdit(row)}>
            <p className="font-medium">{label(row.name)}</p>
            <div className="flex flex-wrap gap-1 pt-1">
              {row.featured && (
                <Badge className="gap-1 text-xs">
                  <Star className="size-3" aria-hidden="true" />
                  On the home shelf
                </Badge>
              )}
              {row.cover_image && (
                <Badge variant="outline" className="text-xs">
                  Has cover
                </Badge>
              )}
            </div>
            <p className="pt-1 text-sm text-muted-foreground">{row.description}</p>
            <p className="text-xs text-muted-foreground">
              {row.counts.contents} title(s) · {row.counts.characters} character(s) ·{" "}
              {row.counts.merch} merch item(s) · {row.counts.events} event(s)
            </p>
          </ManagerRow>
        ))}
      </ul>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editing ? label(editing.name) : "fandom"}</DialogTitle>
            <DialogDescription>
              The fandom name is fixed by the database enum, so only its presentation can change.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} />
                    </FormControl>
                    <FormDescription>The blurb on the category card.</FormDescription>
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

              <FormField
                control={form.control}
                name="featured"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start gap-3 rounded-lg border p-3">
                    <input
                      id="category-featured"
                      type="checkbox"
                      checked={field.value}
                      onChange={(event) => field.onChange(event.target.checked)}
                      className="mt-1 size-4 accent-primary"
                    />
                    <div className="space-y-1">
                      <label htmlFor="category-featured" className="text-sm font-medium leading-none">
                        Feature on the home page shelf
                      </label>
                      <p className="text-xs text-muted-foreground">
                        Featured fandoms appear in the shelf at the top of the home page.
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "Saving…" : "Save changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
