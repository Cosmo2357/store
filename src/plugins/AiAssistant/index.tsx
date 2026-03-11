"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { getMessages, sendMessage, clearMessages, type Message } from "@/actions/ai";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function AiAssistant() {
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getMessages().then(setMessages);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || pending) return;
    const text = input.trim();
    setInput("");
    startTransition(async () => {
      const reply = await sendMessage(text);
      setMessages((prev) => [
        ...(prev ?? []),
        { id: Date.now(), role: "user", content: text, created_at: "" },
        reply,
      ]);
    });
  };

  const handleClear = () => {
    startTransition(async () => {
      await clearMessages();
      setMessages([]);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">AI Assistant</h1>
        <Badge>Pro</Badge>
      </div>

      <Separator />

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Chat</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={pending}
            >
              Clear
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Mention "email", "blog", "tweet", or "summary" for optimized output
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="h-72 overflow-y-auto space-y-3 pr-1">
            {messages === null ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-10 w-1/2 ml-auto" />
              </div>
            ) : messages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center pt-8">
                Send a message to get started
              </p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))
            )}
            {pending && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-3 py-2">
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <Separator />

          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend();
              }}
              placeholder="Type a message… (Cmd+Enter to send)"
              rows={2}
              disabled={pending}
              className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
            />
            <Button
              onClick={handleSend}
              disabled={pending || !input.trim()}
              className="self-end"
            >
              Send
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
