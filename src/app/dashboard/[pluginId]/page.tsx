import { getEnabledPlugins } from "@/actions/plugin";
import { PluginLoader } from "@/components/PluginLoader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ pluginId: string }>;
}

export default async function DashboardPage({ params }: Props) {
  const { pluginId } = await params;
  const enabledPlugins = await getEnabledPlugins();
  const isEnabled = enabledPlugins.some((p) => p.id === pluginId);

  if (!isEnabled) {
    return (
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-4">
        <Badge variant="destructive">This plugin is not subscribed</Badge>
        <p className="text-muted-foreground">
          Subscribe in the store to access this plugin.
        </p>
        <Button asChild variant="outline">
          <Link href="/store">Go to Store</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <PluginLoader pluginId={pluginId} />
    </main>
  );
}
