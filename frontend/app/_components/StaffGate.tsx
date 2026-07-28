"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { HomeLink } from "./ui/PageHeader";
import { Input } from "./ui/Input";

export function StaffGate({
  title,
  onSubmit,
}: {
  title: string;
  onSubmit: (key: string) => void;
}) {
  const [value, setValue] = useState("");
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <Card className="p-6">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Lock className="h-5 w-5" />
        </span>
        <h1 className="mt-4 text-xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Staff access — enter your key to continue.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (value.trim()) onSubmit(value);
          }}
          className="mt-5 space-y-2"
        >
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            type="password"
            placeholder="Staff key"
            autoFocus
          />
          <Button type="submit" className="w-full">
            Enter
          </Button>
        </form>
      </Card>
      <div className="mt-4 text-center text-sm">
        <HomeLink />
      </div>
    </main>
  );
}
