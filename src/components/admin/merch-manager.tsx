// ---------------------------------------------------------------------------
// Fan Hub Plus — merchandise manager (client)
//
// Admin CRUD for MerchandiseItem rows. Prices here are display-only: this
// project has no cart, no orders and no payment provider, and this phase does
// not add one. The form says so where an operator might otherwise wonder why
// nothing happens after saving a price.
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
import { deleteMerch, saveMerch } from "@/lib/admin-actions";
import { formatPrice } from "@/lib/queries/merch";
import { MERCH_TAGS, MERCH_TAG_LABELS, merchSchema, type MerchInput } from "@/lib/validations/admin";

export type MerchRow = {
  id: string;
  name: string;
  image_url: string | null;
  tag: string;
  is_upcoming: boolean;
  view_count: number;
  price: string | null;
  category_id: string;
  category_name: string;
  bookmarks: number;
};

const BLANK: MerchInput = {
  categoryId: "",
  name: "",
  imageUrl: "",
  tag: "COLLECTIBLE",
  isUpcoming: false,
  price: "",
};

/** Decimal comes back from Prisma as a Decimal; the input wants a string. */
function toPriceInput(value: string | null): string {
  return value === null || value === "" ? "" : String(value);
}

export function MerchManager({
  rows,
  total,
  categories,
}: {
  rows: MerchRow[];
  total: number;
  categories: CategoryOption[];
}) {
  const [editing, setEditing] = useState<MerchRow | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const settle = useServerResult();
  const del = useDeleteFlow(deleteMerch);

  const form = useForm<MerchInput>({
    resolver: zodResolver(merchSchema),
    defaultValues: BLANK,
  });

  function openCreate() {
    setEditing(null);
    form.reset(BLANK);
    setOpen(true);
  }

  function openEdit(row: MerchRow) {
    setEditing(row);
    form.reset({
      id: row.id,
      categoryId: row.category_id,
      name: row.name,
      imageUrl: row.image_url ?? "",
      tag: row.tag as MerchInput["tag"],
      isUpcoming: row.is_upcoming,
      price: toPriceInput(row.price),
    });
    setOpen(true);
  }

  async function onSubmit(values: MerchInput) {
    setPending(true);
    const result = await saveMerch(values);
    setPending(false);
    if (settle(form, result)) setOpen(false);
  }

  const deleting = del.target ? rows.find((row) => row.id === del.target) : undefined;

  return (
    <div className="space-y-4">
      <ManagerHeader
        description="Stock shown on the merch page. Upcoming items appear in their own rail."
        count={rows.length}
        total={total}
        addLabel="Add item"
        onAdd={openCreate}
      
        paged
      />

      <ul className="space-y-3">
        {rows.length === 0 && <EmptyState message="No merch yet. Add the first item." />}
        {rows.map((row) => (
          <ManagerRow
            key={row.id}
            onEdit={() => openEdit(row)}
            onDelete={() => del.ask(row.id)}
            deleteLabel={`Delete ${row.name}`}
          >
            <p className="font-medium">{row.name}</p>
            <div className="flex flex-wrap gap-1 pt-1">
              <Badge variant="secondary" className="text-xs">
                {MERCH_TAG_LABELS[row.tag as keyof typeof MERCH_TAG_LABELS] ?? row.tag}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {row.category_name}
              </Badge>
              {row.is_upcoming && (
                <Badge variant="outline" className="text-xs">
                  Upcoming
                </Badge>
              )}
            </div>
            <p className="pt-1 text-sm text-muted-foreground">
              {row.price === null || row.price === ""
                ? "No price listed"
                : formatPrice(row.price)}{" "}
              · {row.view_count} view(s) · {row.bookmarks} bookmark(s)
            </p>
          </ManagerRow>
        ))}
      </ul>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit item" : "Add item"}</DialogTitle>
            <DialogDescription>
              Items appear on the merch page and on the fandom shelves.
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
                      <Input {...field} placeholder="e.g. Arcane crewneck hoodie" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="tag"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tag</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pick a tag" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {MERCH_TAGS.map((tag) => (
                            <SelectItem key={tag} value={tag}>
                              {MERCH_TAG_LABELS[tag]}
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
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (optional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          inputMode="decimal"
                          placeholder="49.99"
                          onChange={(event) => {
                            field.onChange(event.target.value.replace(/[^0-9.]/g, ""));
                          }}
                        />
                      </FormControl>
                      <FormDescription>Display only — there is no checkout.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="isUpcoming"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start gap-3 rounded-lg border p-3">
                    <input
                      id="merch-upcoming"
                      type="checkbox"
                      checked={field.value}
                      onChange={(event) => field.onChange(event.target.checked)}
                      className="mt-1 size-4 accent-primary"
                    />
                    <div className="space-y-1">
                      <label htmlFor="merch-upcoming" className="text-sm font-medium leading-none">
                        Upcoming release
                      </label>
                      <p className="text-xs text-muted-foreground">
                        Moves this item into the &quot;Upcoming releases&quot; rail.
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://…/hoodie.png" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="submit" disabled={pending}>
                  {editing ? "Save changes" : "Add item"}
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
        title={deleting ? `Delete "${deleting.name}"?` : "Delete this item?"}
        description={
          deleting && deleting.bookmarks > 0
            ? `${deleting.bookmarks} bookmark(s) point at this item and will be removed with it. This cannot be undone.`
            : "This removes the item from the merch page. This cannot be undone."
        }
        pending={del.pending}
        onConfirm={del.confirm}
      />
    </div>
  );
}
