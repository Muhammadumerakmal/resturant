import { Bot, User } from "lucide-react";
import { cn } from "@/lib/cn";

export function Avatar({ role }: { role: "user" | "assistant" }) {
  return (
    <span
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
        role === "assistant"
          ? "bg-primary/10 text-primary"
          : "bg-foreground text-background",
      )}
    >
      {role === "assistant" ? (
        <Bot className="h-4 w-4" />
      ) : (
        <User className="h-4 w-4" />
      )}
    </span>
  );
}
