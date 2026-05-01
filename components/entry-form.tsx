"use client";

import { useActionState, useEffect, useRef } from "react";

import { createEntry } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const today = new Date().toISOString().slice(0, 10);

type EntryState = {
  id: string;
  title: string;
};

export function EntryForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [createdEntry, formAction, pending] = useActionState(
    createEntry,
    null as EntryState | null,
  );

  useEffect(() => {
    if (createdEntry) {
      formRef.current?.reset();
    }
  }, [createdEntry]);

  return (
    <Card className="mx-auto w-full max-w-xl shadow-sm">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl">Add entry</CardTitle>
        <CardDescription>
          Track the real cost, the alternative cost, and the amount saved.
        </CardDescription>
      </CardHeader>

      <form ref={formRef} action={formAction}>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              placeholder="Coffee machine"
              autoComplete="off"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              name="category"
              placeholder="Home, food, travel"
              autoComplete="off"
              required
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="realCost">Real cost</Label>
              <Input
                id="realCost"
                name="realCost"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="120.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="alternativeCost">Alternative cost</Label>
              <Input
                id="alternativeCost"
                name="alternativeCost"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="160.00"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" name="date" type="date" defaultValue={today} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              name="note"
              placeholder="Optional note"
              className="min-h-28"
            />
          </div>

          {createdEntry ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              Saved entry: {createdEntry.title}
            </div>
          ) : null}
        </CardContent>

        <CardFooter className="flex-col gap-3 sm:flex-row sm:justify-end">
          <Button
            type="submit"
            className="h-11 w-full px-5 sm:w-auto"
            disabled={pending}
          >
            {pending ? "Saving..." : "Save entry"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
