"use server";

import { getDb } from "@/lib/db";

export type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export async function getMessages(): Promise<Message[]> {
  const db = getDb();
  return db
    .prepare("SELECT * FROM ai_messages ORDER BY id ASC LIMIT 50")
    .all() as Message[];
}

export async function sendMessage(content: string): Promise<Message> {
  const db = getDb();

  db.prepare("INSERT INTO ai_messages (role, content) VALUES (?, ?)").run(
    "user",
    content
  );

  const reply = generateReply(content);

  const result = db
    .prepare("INSERT INTO ai_messages (role, content) VALUES (?, ?)")
    .run("assistant", reply);

  return {
    id: Number(result.lastInsertRowid),
    role: "assistant",
    content: reply,
    created_at: new Date().toLocaleString("en-US"),
  };
}

export async function clearMessages(): Promise<void> {
  const db = getDb();
  db.prepare("DELETE FROM ai_messages").run();
}

function generateReply(input: string): string {
  const lower = input.toLowerCase();

  if (lower.includes("email") || lower.includes("mail")) {
    return `Subject: Re: ${input.slice(0, 30)}...\n\nHello,\n\nThank you for reaching out regarding "${input}". I wanted to follow up and ensure everything is proceeding smoothly.\n\nPlease don't hesitate to reach out if you have any questions.\n\nBest regards,\nMyApp AI Assistant`;
  }
  if (lower.includes("blog") || lower.includes("article") || lower.includes("post")) {
    return `# ${input}\n\n## Introduction\nIn this article, we'll explore "${input}" in depth and uncover key insights for modern businesses.\n\n## Main Content\n${input} has become an increasingly important topic. Many organizations are investing heavily in this area, and the results speak for themselves.\n\n## Conclusion\nBy leveraging ${input}, businesses can significantly improve their efficiency and outcomes.`;
  }
  if (lower.includes("tweet") || lower.includes("twitter") || lower.includes("social")) {
    return `🚀 ${input.slice(0, 60)}${input.length > 60 ? "..." : ""}\n\nStay ahead of the curve with the latest insights! 💡\n\nCheck the link in bio for more 👇\n\n#${input.split(" ")[0]} #MyApp #Innovation`;
  }
  if (lower.includes("summar") || lower.includes("tldr") || lower.includes("brief")) {
    return `**Summary of "${input}"**\n\n• Key Point 1: ${input.slice(0, 40)} is a critical focus area\n• Key Point 2: A practical, iterative approach yields the best results\n• Key Point 3: Continuous improvement is the cornerstone of long-term success`;
  }

  return `Thanks for your message about "${input}".\n\nThis is a rich topic with multiple dimensions to consider. I'd recommend starting with a clear framework, then moving to practical implementation.\n\nTip: Specify a format (email, blog post, tweet, or summary) to get a tailored response!`;
}
