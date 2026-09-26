// ---------------------------------------------------------------------------
// Fan Hub Plus — feedback moderation (client)
//
// Members send feedback from the dashboard; this is the other half of that loop.
// Unlike the catalogue managers there is no create form — a message only exists
// because a member wrote it — so the row's primary control is the status,
// which is the only thing triage actually changes.
// ---------------------------------------------------------------------------

"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  ManagerHeader,
  useDeleteFlow,
  useReporter,
} from "@/components/admin/manager-parts";
import { deleteFeedback, setFeedbackStatus } from "@/lib/admin-actions";
import {
  FEEDBACK_STATUSES,
  type FeedbackStatus,
} from "@/lib/validations/admin";

export type FeedbackAdminRow = {
  id: string;
  type: "BUG" | "SUGGESTION" | "QUERY";
  message: string;
  status: FeedbackStatus;
  createdAt: string;
  user: { id: string; name: string; email: string; role: string };
};

const TYPE_LABEL: Record<FeedbackAdminRow["type"], string> = {
  BUG: "Bug",
  SUGGESTION: "Suggestion",
  QUERY: "Question",
};

// The order is the triage order: the queue is worked from the top.
const STATUS_LABEL: Record<FeedbackStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
};

const TYPE_VARIANT: Record<FeedbackAdminRow["type"], "outline" | "secondary"> = {
  BUG: "secondary",
  SUGGESTION: "outline",
  QUERY: "outline",
};

export function FeedbackManager({
  rows,
  total,
  openCount,
}: {
  rows: FeedbackAdminRow[];
  total: number;
  openCount: number;
}) {
  const report = useReporter();
  const [busy, setBusy] = useState<string | null>(null);
  const del = useDeleteFlow(deleteFeedback);

  async function changeStatus(id: string, status: FeedbackStatus) {
    setBusy(id);
    const result = await setFeedbackStatus({ feedbackId: id, status });
    setBusy(null);
    report(result);
  }

  const deleting = del.target ? rows.find((row) => row.id === del.target) : undefined;

  return (
    <div className="space-y-4">
      <ManagerHeader
        description="Messages members send from their dashboard. Mark them as you work through the queue."
        count={rows.length}
        total={total}
      />

      <p className="text-xs text-muted-foreground">
        {openCount} still unresolved
        {openCount === 1 ? "" : "s"} · {total} in total.
      </p>

      <ul className="space-y-3">
        {rows.length === 0 && (
          <EmptyState message="No feedback yet. Members send it from Dashboard → Feedback." />
        )}
        {rows.map((row) => (
          <li key={row.id} className="rounded-xl border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={TYPE_VARIANT[row.type]} className="text-xs">
                    {TYPE_LABEL[row.type]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {row.user.name} · {row.user.email} ·{" "}
                    {new Date(row.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm">{row.message}</p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Select
                  value={row.status}
                  disabled={busy === row.id}
                  onValueChange={(next) => void changeStatus(row.id, next as FeedbackStatus)}
                >
                  <SelectTrigger
                    className="w-36"
                    aria-label={`Status for the message from ${row.user.name}`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FEEDBACK_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {STATUS_LABEL[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  aria-label={`Delete the message from ${row.user.name}`}
                  onClick={() => del.ask(row.id)}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <DeleteConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(next) => !next && del.close()}
        title="Delete this message?"
        description={
          deleting
            ? `The message from ${deleting.user.name} is removed from the queue. The member will not see it in their dashboard either.`
            : "The message is removed from the queue."
        }
        pending={del.pending}
        onConfirm={del.confirm}
      />
    </div>
  );
}
