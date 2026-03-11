"use client";

import { purchase } from "@/actions/plugin";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";

export function PurchaseButton({ pluginId }: { pluginId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      onClick={() => startTransition(() => purchase(pluginId))}
      disabled={pending}
      className="w-full"
    >
      {pending ? "Processing..." : "Subscribe"}
    </Button>
  );
}
