"use client";

import { cancel } from "@/actions/plugin";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";

export function CancelButton({ pluginId }: { pluginId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={() => startTransition(() => cancel(pluginId))}
      disabled={pending}
      className="w-full"
    >
      {pending ? "Processing..." : "Cancel Subscription"}
    </Button>
  );
}
