// ---------------------------------------------------------------------------
// Fan Hub Plus — user manager (client)
//
// The one admin screen that is not CRUD over catalogue rows: users are created
// by registration and must not be deletable from here, because deleting one
// cascades their bookmarks, ratings, submissions and feedback. So the row's
// controls are role and suspension, both of which are reversible.
//
// The two lockout guards (no self-demotion, no demoting the last admin) are
// enforced in the server action. This file hides the controls that would be
// refused, but that is presentation: the action re-checks both.
// ---------------------------------------------------------------------------

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, ShieldCheck, UserCog } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { setUserRole, setUserSuspension } from "@/lib/admin-actions";
import { USER_ROLES, type UserRoleValue } from "@/lib/validations/admin";

export type UserAdminRow = {
  id: string;
  name: string;
  email: string;
  role: UserRoleValue;
  createdAt: string;
  /** ISO timestamp or null; already filtered to live suspensions by the page. */
  suspendedUntil: string | null;
  suspensionReason: string | null;
  counts: { bookmarks: number; submissions: number; feedback: number };
};

const ROLE_LABEL: Record<UserRoleValue, string> = {
  ADMIN: "Admin",
  USER: "Member",
  VISITOR: "Visitor",
};

const ROLE_HELP: Record<UserRoleValue, string> = {
  ADMIN: "Full access, including this console.",
  USER: "Registered member: bookmarks, ratings, submissions and feedback.",
  VISITOR: "Read-only. Registered, but may not save or rate anything.",
};

/** The ban ladder offered in the dialog. 0 lifts instead of banning. */
const SUSPENSION_PRESETS = [
  { days: 1, label: "1 day" },
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 365, label: "1 year" },
] as const;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function UserManager({
  rows,
  selfId,
  adminCount,
}: {
  rows: UserAdminRow[];
  selfId: string;
  adminCount: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [suspending, setSuspending] = useState<UserAdminRow | null>(null);
  const [days, setDays] = useState<string>("7");
  const [reason, setReason] = useState("");

  const isLastAdmin = adminCount <= 1;

  async function changeRole(row: UserAdminRow, role: UserRoleValue) {
    setBusy(row.id);
    const result = await setUserRole({ userId: row.id, role });
    setBusy(null);
    if (result.ok) {
      toast.success(result.message);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  async function submitSuspension() {
    if (!suspending) return;
    setBusy(suspending.id);
    const result = await setUserSuspension({
      userId: suspending.id,
      days: Number(days),
      reason,
    });
    setBusy(null);
    if (result.ok) {
      toast.success(result.message);
      setSuspending(null);
      setReason("");
      setDays("7");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            Change a member&apos;s role or suspend an account. Neither action
            deletes anything, and both can be undone from here.
          </p>
          {/* The row range is the pager's job; this line only adds what the
              pager cannot know. */}
          <p className="text-xs text-muted-foreground">
            {adminCount} admin{adminCount === 1 ? "" : "s"} on record.
          </p>
        </div>
      </div>

      {isLastAdmin ? (
        <p className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          This is the only admin account, so it cannot be demoted or suspended.
          Promote somebody else first if you need to step back.
        </p>
      ) : null}

      <ul className="space-y-3">
        {rows.length === 0 && (
          <li className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            No accounts yet.
          </li>
        )}
        {rows.map((row) => {
          const isSelf = row.id === selfId;
          return (
            <li key={row.id} className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    {row.name}
                    {isSelf ? (
                      <Badge variant="outline" className="text-xs">
                        You
                      </Badge>
                    ) : null}
                    {row.suspendedUntil ? (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <ShieldAlert className="size-3" aria-hidden="true" />
                        Suspended
                      </Badge>
                    ) : null}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">{row.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Joined {formatDate(row.createdAt)} · {row.counts.bookmarks}{" "}
                    bookmark{row.counts.bookmarks === 1 ? "" : "s"} ·{" "}
                    {row.counts.submissions} submission
                    {row.counts.submissions === 1 ? "" : "s"} ·{" "}
                    {row.counts.feedback} message{row.counts.feedback === 1 ? "" : "s"}
                  </p>
                  {row.suspendedUntil ? (
                    <p className="text-xs text-destructive">
                      Lifts {formatDate(row.suspendedUntil)}
                      {row.suspensionReason ? ` · ${row.suspensionReason}` : ""}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Select
                    value={row.role}
                    disabled={busy === row.id || isSelf}
                    onValueChange={(next) => void changeRole(row, next as UserRoleValue)}
                  >
                    <SelectTrigger
                      className="w-32"
                      aria-label={`Role for ${row.email}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {USER_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {ROLE_LABEL[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {row.suspendedUntil ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy === row.id}
                      onClick={() => {
                        setBusy(row.id);
                        void (async () => {
                          const result = await setUserSuspension({
                            userId: row.id,
                            days: 0,
                          });
                          setBusy(null);
                          if (result.ok) {
                            toast.success(result.message);
                            router.refresh();
                          } else {
                            toast.error(result.error);
                          }
                        })();
                      }}
                    >
                      <ShieldCheck aria-hidden="true" />
                      Lift
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isSelf || (isLastAdmin && row.role === "ADMIN")}
                      onClick={() => setSuspending(row)}
                    >
                      <ShieldAlert aria-hidden="true" />
                      Suspend
                    </Button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <Dialog open={Boolean(suspending)} onOpenChange={(open) => !open && setSuspending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Suspend {suspending?.name ?? "this account"}?
            </DialogTitle>
            <DialogDescription>
              They can still sign in, but bookmarks, ratings, submissions and
              feedback are blocked and their member pages redirect to a notice
              explaining the ban. Nothing is deleted.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="suspension-days">Length</Label>
              <Select value={days} onValueChange={setDays}>
                <SelectTrigger id="suspension-days">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUSPENSION_PRESETS.map((preset) => (
                    <SelectItem key={preset.days} value={String(preset.days)}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="suspension-reason">Reason (optional)</Label>
              <Input
                id="suspension-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={300}
                placeholder="Shown to the member on the notice screen"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSuspending(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy === suspending?.id}
              onClick={() => void submitSuspension()}
            >
              <UserCog aria-hidden="true" />
              {busy === suspending?.id ? "Suspending…" : "Suspend account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <p className="text-xs text-muted-foreground">
        {ROLE_HELP.ADMIN} {ROLE_HELP.USER} {ROLE_HELP.VISITOR}
      </p>
    </div>
  );
}
