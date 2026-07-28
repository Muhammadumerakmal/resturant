import { cn } from "@/lib/cn";
import { Avatar } from "./Avatar";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export function ChatBubble({ role, content }: ChatMessage) {
  const isUser = role === "user";
  return (
    <div
      className={cn(
        "animate-rise-in flex items-start gap-3",
        isUser && "flex-row-reverse",
      )}
    >
      <Avatar role={role} />
      <div
        className={cn(
          "max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm shadow-sm",
          isUser
            ? "rounded-tr-sm bg-primary text-primary-foreground"
            : "rounded-tl-sm border border-border bg-card text-card-foreground",
        )}
      >
        {content}
      </div>
    </div>
  );
}
