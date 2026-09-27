// ---------------------------------------------------------------------------
// Fan Hub Plus — knowledge-base manager (client)  (Phase 11)
// CRUD for the chatbot's FAQ rules: add, edit and delete entries. Forms use
// React Hook Form + Zod and the same schema is re-validated server-side.
// ---------------------------------------------------------------------------

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { deleteFaq, saveFaq } from "@/lib/admin-actions";
import { FandomSelect, type CategoryOption } from "@/components/admin/manager-parts";

export type FaqRow = {
  id: string;
  category_id: string | null;
  category_name: string | null;
  question: string;
  answer: string;
  keywords: string;
};

const faqFormSchema = z.object({
  categoryId: z.string().trim().max(60),
  question: z.string().trim().min(3, "Ask a real question.").max(200),
  answer: z.string().trim().min(3, "Answer is required.").max(1000),
  keywords: z
    .string()
    .trim()
    .max(200)
    .transform((value) => value)
    .or(z.literal("")),
});

export function FaqManager({ rows, categories }: { rows: FaqRow[]; categories: CategoryOption[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<FaqRow | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [, startTransition] = useTransition();

  const form = useForm({
    resolver: zodResolver(faqFormSchema),
    defaultValues: { categoryId: "", question: "", answer: "", keywords: "" },
  });

  function openCreate() {
    setEditing(null);
    form.reset({ categoryId: "", question: "", answer: "", keywords: "" });
    setOpen(true);
  }

  function openEdit(row: FaqRow) {
    setEditing(row);
    form.reset({ categoryId: row.category_id ?? "", question: row.question, answer: row.answer, keywords: row.keywords });
    setOpen(true);
  }

  async function onSubmit(values: z.infer<typeof faqFormSchema>) {
    setPending(true);
    const result = await saveFaq({
      id: editing?.id,
      categoryId: values.categoryId,
      question: values.question,
      answer: values.answer,
      keywords: values.keywords,
    });
    setPending(false);
    if (result.ok) {
      toast.success(result.message);
      setOpen(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  function onDelete(id: string) {
    startTransition(async () => {
      const result = await deleteFaq(id);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" onClick={openCreate}>
          <Plus aria-hidden="true" />
          Add rule
        </Button>
      </div>

      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.id} className="rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="font-medium">{row.question}</p>
                <p className="text-sm text-muted-foreground">{row.answer}</p>
                {row.category_name && <Badge variant="secondary" className="text-xs">{row.category_name}</Badge>}
                <div className="flex flex-wrap gap-1 pt-1">
                  {row.keywords
                    .split(",")
                    .map((keyword) => keyword.trim())
                    .filter(Boolean)
                    .map((keyword) => (
                      <Badge key={keyword} variant="outline" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => openEdit(row)}
                >
                  <Pencil aria-hidden="true" />
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => onDelete(row.id)}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit rule" : "Add rule"}</DialogTitle>
            <DialogDescription>
              Rows here power the chat hub&apos;s keyword matcher.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FandomSelect
                form={form}
                name="categoryId"
                categories={categories}
                label="Fandom (optional)"
                required={false}
              />
              <FormField
                control={form.control}
                name="question"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Question</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. How do I reset my password?" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="answer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Answer</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="keywords"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Keywords</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="comma, separated, words"
                        aria-describedby="keywords-hint"
                      />
                    </FormControl>
                    <p id="keywords-hint" className="text-xs text-muted-foreground">
                      Words the chat matches against the visitor&apos;s question.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={pending}>
                  {editing ? "Save changes" : "Add rule"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
