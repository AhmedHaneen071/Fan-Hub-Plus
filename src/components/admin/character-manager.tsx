// ---------------------------------------------------------------------------
// Fan Hub Plus — character manager (client)
//
// Admin CRUD for CharacterProfile rows. Characters are grouped under a fandom
// on /characters and appear on the detail page, so a write revalidates both.
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
import { deleteCharacter, saveCharacter } from "@/lib/admin-actions";
import { characterSchema, type CharacterInput } from "@/lib/validations/admin";

export type CharacterRow = {
  id: string;
  name: string;
  bio: string;
  image_url: string | null;
  category_id: string;
  category_name: string;
  bookmarks: number;
};

const BLANK: CharacterInput = {
  id: "",
  categoryId: "",
  name: "",
  bio: "",
  imageUrl: "",
};

export function CharacterManager({
  rows,
  total,
  categories,
}: {
  rows: CharacterRow[];
  total: number;
  categories: CategoryOption[];
}) {
  const [editing, setEditing] = useState<CharacterRow | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const settle = useServerResult();
  const del = useDeleteFlow(deleteCharacter);

  const form = useForm<CharacterInput>({
    resolver: zodResolver(characterSchema),
    defaultValues: BLANK,
  });

  function openCreate() {
    setEditing(null);
    form.reset(BLANK);
    setOpen(true);
  }

  function openEdit(row: CharacterRow) {
    setEditing(row);
    form.reset({
      id: row.id,
      categoryId: row.category_id,
      name: row.name,
      bio: row.bio,
      imageUrl: row.image_url ?? "",
    });
    setOpen(true);
  }

  async function onSubmit(values: CharacterInput) {
    setPending(true);
    const result = await saveCharacter(values);
    setPending(false);
    if (settle(form, result)) setOpen(false);
  }

  const deleting = del.target ? rows.find((row) => row.id === del.target) : undefined;

  return (
    <div className="space-y-4">
      <ManagerHeader
        description="Add, edit or remove the character profiles listed under each fandom."
        count={rows.length}
        total={total}
        addLabel="Add character"
        onAdd={openCreate}
      
        paged
      />

      <ul className="space-y-3">
        {rows.length === 0 && <EmptyState message="No characters yet. Add the first one." />}
        {rows.map((row) => (
          <ManagerRow
            key={row.id}
            onEdit={() => openEdit(row)}
            onDelete={() => del.ask(row.id)}
            deleteLabel={`Delete ${row.name}`}
          >
            <p className="font-medium">{row.name}</p>
            <div className="flex flex-wrap gap-1 pt-1">
              <Badge variant="outline" className="text-xs">
                {row.category_name}
              </Badge>
              {row.image_url && (
                <Badge variant="outline" className="text-xs">
                  Has image
                </Badge>
              )}
            </div>
            <p className="pt-1 text-sm text-muted-foreground">{row.bio}</p>
            <p className="text-xs text-muted-foreground">
              {row.bookmarks} bookmark(s)
            </p>
          </ManagerRow>
        ))}
      </ul>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit character" : "Add character"}</DialogTitle>
            <DialogDescription>
              Characters are grouped under a fandom and shown on the characters page.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FandomSelect form={form} categories={categories} />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Yor Forger" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={4} />
                    </FormControl>
                    <FormDescription>Shown on the profile card, so keep it to a few sentences.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL (optional)</FormLabel>
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
                  {pending ? "Saving…" : editing ? "Save changes" : "Add character"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(next) => !next && del.close()}
        title={deleting ? `Delete "${deleting.name}"?` : "Delete this character?"}
        description={
          deleting && deleting.bookmarks > 0
            ? `This cannot be undone, and it also removes ${deleting.bookmarks} bookmark(s) that fans left on this character.`
            : "This cannot be undone."
        }
        pending={del.pending}
        onConfirm={del.confirm}
      />
    </div>
  );
}
