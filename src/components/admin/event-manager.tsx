// ---------------------------------------------------------------------------
// Fan Hub Plus — events manager (client)
//
// Admin CRUD for Event rows. The events map places a pin from latitude and
// longitude, so both are required here even though the model would accept a
// default: an event with no coordinates renders a card that cannot do anything
// useful on the map view.
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
  DeleteConfirmDialog,
  EmptyState,
  FandomSelect,
  ManagerHeader,
  ManagerRow,
  useDeleteFlow,
  useServerResult,
  type CategoryOption,
} from "@/components/admin/manager-parts";
import { deleteEvent, saveEvent } from "@/lib/admin-actions";
import { eventSchema, type EventInput } from "@/lib/validations/admin";

export type EventRow = {
  id: string;
  name: string;
  city: string;
  date: Date;
  ticket_link: string | null;
  latitude: number;
  longitude: number;
  category_id: string | null;
  category_name: string | null;
};

const BLANK: EventInput = {
  name: "",
  city: "",
  date: "",
  time: "",
  ticketLink: "",
  latitude: "",
  longitude: "",
  categoryId: "",
};

function toDateInput(value: Date): string {
  return new Date(value).toISOString().slice(0, 10);
}

/** "HH:MM" in UTC, which is how the event is stored. */
function toTimeInput(value: Date): string {
  const date = new Date(value);
  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
}

function formatDate(value: Date): string {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function EventManager({
  rows,
  total,
  categories,
}: {
  rows: EventRow[];
  total: number;
  categories: CategoryOption[];
}) {
  const [editing, setEditing] = useState<EventRow | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const settle = useServerResult();
  const del = useDeleteFlow(deleteEvent);

  const form = useForm<EventInput>({
    resolver: zodResolver(eventSchema),
    defaultValues: BLANK,
  });

  function openCreate() {
    setEditing(null);
    form.reset(BLANK);
    setOpen(true);
  }

  function openEdit(row: EventRow) {
    setEditing(row);
    form.reset({
      id: row.id,
      name: row.name,
      city: row.city,
      date: toDateInput(row.date),
      time: toTimeInput(row.date),
      ticketLink: row.ticket_link ?? "",
      latitude: String(row.latitude),
      longitude: String(row.longitude),
      categoryId: row.category_id ?? "",
    });
    setOpen(true);
  }

  async function onSubmit(values: EventInput) {
    setPending(true);
    const result = await saveEvent(values);
    setPending(false);
    if (settle(form, result)) setOpen(false);
  }

  const deleting = del.target ? rows.find((row) => row.id === del.target) : undefined;

  return (
    <div className="space-y-4">
      <ManagerHeader
        description="Screens, signings and cons. Events feed both the calendar list and the map pins."
        count={rows.length}
        total={total}
        addLabel="Add event"
        onAdd={openCreate}
      
        paged
      />

      <ul className="space-y-3">
        {rows.length === 0 && <EmptyState message="No events yet. Add the first one." />}
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
                {formatDate(row.date)}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {row.city}
              </Badge>
              {row.category_name && (
                <Badge variant="secondary" className="text-xs">
                  {row.category_name}
                </Badge>
              )}
            </div>
            <p className="pt-1 text-xs text-muted-foreground">
              {row.latitude.toFixed(4)}, {row.longitude.toFixed(4)}
              {row.ticket_link ? " · tickets linked" : " · no ticket link"}
            </p>
          </ManagerRow>
        ))}
      </ul>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit event" : "Add event"}</DialogTitle>
            <DialogDescription>
              Coordinates place the pin on the events map. Copy them from the venue listing.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Anime Expo 2027" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Los Angeles" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start time (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} type="time" />
                    </FormControl>
                    <FormDescription>
                      The events page prints this, e.g. &quot;9:00 AM&quot;. Leave it blank on an
                      edit to keep the time the event already had.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FandomSelect
                form={form}
                categories={categories}
                required={false}
                optionalLabel="No fandom"
              />

              <FormField
                control={form.control}
                name="ticketLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ticket link</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://…" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latitude</FormLabel>
                      <FormControl>
                        <Input {...field} inputMode="decimal" placeholder="34.0522" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="longitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Longitude</FormLabel>
                      <FormControl>
                        <Input {...field} inputMode="decimal" placeholder="-118.2437" />
                      </FormControl>
                      <FormDescription>Between −180 and 180.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="submit" disabled={pending}>
                  {editing ? "Save changes" : "Add event"}
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
        title={deleting ? `Delete "${deleting.name}"?` : "Delete this event?"}
        description="This removes the event from the calendar and drops its map pin. This cannot be undone."
        pending={del.pending}
        onConfirm={del.confirm}
      />
    </div>
  );
}
