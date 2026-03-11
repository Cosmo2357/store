"use server";

import { getDb } from "@/lib/db";
import { revalidatePath } from "next/cache";

export type Plugin = {
  id: string;
  label: string;
  description: string;
  price: string;
  href: string;
  purchased: boolean;
};

export async function getStore(): Promise<Plugin[]> {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM plugins ORDER BY id").all() as Array<{
    id: string;
    label: string;
    description: string;
    price: string;
    href: string;
    purchased: number;
  }>;
  return rows.map((r) => ({ ...r, purchased: r.purchased === 1 }));
}

export async function getEnabledPlugins(): Promise<Plugin[]> {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM plugins WHERE purchased = 1 ORDER BY id")
    .all() as Array<{
    id: string;
    label: string;
    description: string;
    price: string;
    href: string;
    purchased: number;
  }>;
  return rows.map((r) => ({ ...r, purchased: true }));
}

export async function purchase(pluginId: string): Promise<void> {
  const db = getDb();
  db.prepare("UPDATE plugins SET purchased = 1 WHERE id = ?").run(pluginId);
  revalidatePath("/store");
  revalidatePath("/");
}

export async function cancel(pluginId: string): Promise<void> {
  const db = getDb();
  db.prepare("UPDATE plugins SET purchased = 0 WHERE id = ?").run(pluginId);
  revalidatePath("/store");
  revalidatePath("/");
}
