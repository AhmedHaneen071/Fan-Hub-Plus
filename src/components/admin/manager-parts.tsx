// ---------------------------------------------------------------------------
// Fan Hub Plus — shared admin manager primitives
//
// The catalogue managers (content / merchandise / events) differ only in their
// form fields. Everything around them — the header, the row shell, the fandom
// picker, the destructive-action confirm, and the mapping of a server-side
// validation failure back onto React Hook Form — is identical, so it lives here
// once instead of three times.
// ---------------------------------------------------------------------------

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AdminResult } from "@/lib/admin-actions";

export type CategoryOption = { id: string; name: string };

// --------------------------------------------------------------- header/rows
export function ManagerHeader({
  description,
  count,
  total,
  addLabel,
  onAdd,
}: {
  description: string;
  count: number;
  total: number;
  addLabel: string;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">{description}</p>
        <p className="text-xs text-muted-foreground">
          {count === total ? `${count} shown` : `Showing the first ${count} of ${total}.`}
        </p>
      </div>
      <Button type="button" onClick={onAdd}>
        <Plus aria-hidden="true" />
        {addLabel}
      </Button>
    </div>
  );
}

export function ManagerRow({
  children,
  onEdit,
  onDelete,
  deleteLabel,
}: {
  children: React.ReactNode;
  onEdit: () => void;
  onDelete: () => void;
  deleteLabel: string;
}) {
  return (
    <li className="rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">{children}</div>
        <div className="flex shrink-0 items-center gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
            <Pencil aria-hidden="true" />
            Edit
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={onDelete}
            aria-label={deleteLabel}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
      </div>
    </li>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <li className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
      {message}
    </li>
  );
}

// ------------------------------------------------------------- fandom picker
/**
 * Category rows are referenced by id, not by the CategoryName enum, so the
 * client needs the real ids. The page passes them in rather than re-querying.
 */
export function FandomSelect<TFieldValues extends FieldValues>({
  form,
  name = "categoryId" as Path<TFieldValues>,
  categories,
  label = "Fandom",
  required = true,
  optionalLabel = "No fandom",
}: {
  form: UseFormReturn<TFieldValues>;
  name?: Path<TFieldValues>;
  categories: CategoryOption[];
  label?: string;
  required?: boolean;
  optionalLabel?: string;
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <Select value={String(field.value ?? "")} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={required ? "Pick a fandom" : optionalLabel} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {!required && <SelectItem value="">{optionalLabel}</SelectItem>}
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// ------------------------------------------------------------ delete confirm
/**
 * Catalogue rows own their engagement rows, and the schema cascades, so a
 * delete can discard real fan data. The wording is passed in by the caller so
 * it can state exactly what goes away.
 */
export function DeleteConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  pending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  pending: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Keep it
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? "Removing…" : "Delete for good"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ----------------------------------------------------------- result handling
/**
 * Toast + refresh for a completed write. A successful write returns true, which
 * is the caller's cue to close its dialog.
 */
export function useReporter() {
  const router = useRouter();

  return function report(result: AdminResult): boolean {
    if (result.ok) {
      toast.success(result.message);
      // The list is server-rendered, so the refresh is what makes an added or
      // deleted row appear or disappear.
      router.refresh();
      return true;
    }
    toast.error(result.error);
    return false;
  };
}

/**
 * Bridges a server `AdminResult` back into a form. A server-side Zod failure
 * carries per-field messages, so the form shows them under the right input
 * instead of only in a toast that vanishes.
 */
export function useServerResult() {
  const report = useReporter();

  return function settle<TFieldValues extends FieldValues>(
    form: UseFormReturn<TFieldValues>,
    result: AdminResult,
  ): boolean {
    if (result.ok) return report(result);

    if (result.fieldErrors) {
      for (const [field, messages] of Object.entries(result.fieldErrors)) {
        const message = messages?.[0];
        if (message) form.setError(field as unknown as Path<TFieldValues>, { message });
      }
    }

    toast.error(result.error);
    return false;
  };
}

/** Shared "a destructive request is running" state for the delete dialog. */
export function useDeleteFlow(run: (id: string) => Promise<AdminResult>) {
  const report = useReporter();
  const [target, setTarget] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [, startTransition] = useTransition();

  function ask(id: string) {
    setTarget(id);
  }

  function confirm() {
    if (!target) return;
    const id = target;
    setPending(true);
    startTransition(async () => {
      const result = await run(id);
      setPending(false);
      if (report(result)) setTarget(null);
    });
  }

  return { target, pending, ask, confirm, close: () => setTarget(null) };
}
