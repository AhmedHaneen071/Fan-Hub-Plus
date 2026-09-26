// ---------------------------------------------------------------------------
// Fan Hub Plus — feedback tab (client)
//
// The chatbot FAQ tells members that a registered user can "send feedback", so
// this is where that promise is kept. The form creates a new message or edits
// the member's own unresolved one; the history underneath shows the status an
// admin has set, and anything not yet resolved can be withdrawn.
// ---------------------------------------------------------------------------

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MessageSquarePlus, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deleteOwnFeedback, sendFeedback } from "@/lib/engagement-actions";
import { feedbackSchema, type FeedbackInput } from "@/lib/validations/engagement";

export type FeedbackRow = {
  id: string;
  type: "BUG" | "SUGGESTION" | "QUERY";
  message: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  createdAt: string;
};

const TYPE_OPTIONS = [
  { value: "BUG", label: "Bug report" },
  { value: "SUGGESTION", label: "Suggestion" },
  { value: "QUERY", label: "Question" },
] as const;

const STATUS_VARIANT: Record<FeedbackRow["status"], "outline" | "secondary"> = {
  OPEN: "outline",
  IN_PROGRESS: "secondary",
  RESOLVED: "secondary",
};

const STATUS_HELP: Record<FeedbackRow["status"], string> = {
  OPEN: "Waiting for the team to pick it up.",
  IN_PROGRESS: "The team is working on it.",
  RESOLVED: "Closed. Send a new message if there is more to say.",
};

const EMPTY: FeedbackInput = { feedbackId: "", type: "SUGGESTION", message: "" };

export function FeedbackTab({ rows }: { rows: FeedbackRow[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [withdrawing, setWithdrawing] = useState<string | null>(null);

  const form = useForm<FeedbackInput>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: EMPTY,
  });

  // The form is in "edit" mode exactly when a feedbackId is loaded, which is
  // how the heading, the submit label and the cancel button all stay in sync
  // without a second piece of state to keep in step. useWatch (rather than
  // form.watch) is the subscribing form — it re-renders on the field change
  // instead of reading a stale value.
  const editingId = useWatch({ control: form.control, name: "feedbackId" });

  function editFeedback(row: FeedbackRow) {
    form.reset({ feedbackId: row.id, type: row.type, message: row.message });
    form.setFocus("message");
  }

  async function withdraw(row: FeedbackRow) {
    setWithdrawing(row.id);
    const result = await deleteOwnFeedback(row.id);
    setWithdrawing(null);
    if (result.ok) {
      toast.success(result.message);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquarePlus className="size-4 text-primary" aria-hidden="true" />
            {editingId ? "Update your message" : "Send feedback"}
          </CardTitle>
          <CardDescription>
            Tell us what broke, what you would build next, or what you could not
            find. Admins triage the queue from the admin console.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit(async (values) => {
                setPending(true);
                const result = await sendFeedback(values);
                setPending(false);
                if (result.ok) {
                  toast.success(result.message);
                  form.reset(EMPTY);
                  router.refresh();
                } else {
                  toast.error(result.error);
                }
              })}
            >
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pick a type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
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
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={5}
                        placeholder="The merch page shows the price twice on my phone…"
                      />
                    </FormControl>
                    <FormDescription>
                      Between 10 and 2000 characters. Plain text — no formatting
                      needed.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={pending}>
                  {pending
                    ? "Sending…"
                    : editingId
                      ? "Update message"
                      : "Send message"}
                </Button>
                {editingId ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => form.reset(EMPTY)}
                  >
                    Cancel edit
                  </Button>
                ) : null}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="font-heading text-lg font-semibold">Your messages</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing sent yet. Bugs, ideas and questions all land in the same
            queue — the team triages them together.
          </p>
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => (
              <li key={row.id} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {TYPE_OPTIONS.find((option) => option.value === row.type)?.label ??
                      row.type}
                  </Badge>
                  <Badge variant={STATUS_VARIANT[row.status]} className="text-xs">
                    {row.status.toLowerCase().replace("_", " ")}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(row.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm">{row.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {STATUS_HELP[row.status]}
                </p>
                {row.status !== "RESOLVED" ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => editFeedback(row)}
                    >
                      <Pencil aria-hidden="true" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      disabled={withdrawing === row.id}
                      onClick={() => void withdraw(row)}
                    >
                      <X aria-hidden="true" />
                      Withdraw
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
