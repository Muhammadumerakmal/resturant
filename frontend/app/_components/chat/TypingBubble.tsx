import { Avatar } from "./Avatar";

export function TypingBubble() {
  return (
    <div className="animate-rise-in flex items-start gap-3">
      <Avatar role="assistant" />
      <div className="flex gap-1 rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
            style={{
              animation: "typing-bounce 1.2s infinite",
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
