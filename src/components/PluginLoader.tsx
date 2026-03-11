"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

function PluginSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-48" />
      <Separator />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  );
}

const PLUGIN_MAP = {
  "ai-assistant": () => import("@/plugins/AiAssistant"),
  "space-shooter": () => import("@/plugins/SpaceShooter"),
  tetris: () => import("@/plugins/Tetris"),
  platformer: () => import("@/plugins/Platformer"),
} as const;

export function PluginLoader({ pluginId }: { pluginId: string }) {
  const loader = PLUGIN_MAP[pluginId as keyof typeof PLUGIN_MAP];

  if (!loader) {
    return (
      <div className="p-6">
        <Badge variant="destructive">Page not found</Badge>
      </div>
    );
  }

  const Plugin = dynamic(loader, {
    loading: () => <PluginSkeleton />,
    ssr: false,
  });

  return <Plugin />;
}
