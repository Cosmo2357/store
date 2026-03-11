import { getStore } from "@/actions/plugin";
import type { Plugin } from "@/actions/plugin";
import { CancelButton } from "@/components/CancelButton";
import { StripeCheckout } from "@/components/StripeCheckout";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MdSmartToy, MdRocketLaunch, MdGridView, MdVideogameAsset } from "react-icons/md";
import type { IconType } from "react-icons";

/* Icon + accent colour per plugin */
const PLUGIN_META: Record<string, { Icon: IconType; bg: string; text: string }> = {
  "ai-assistant": {
    Icon: MdSmartToy,
    bg: "bg-violet-100 dark:bg-violet-950",
    text: "text-violet-600 dark:text-violet-400",
  },
  "space-shooter": {
    Icon: MdRocketLaunch,
    bg: "bg-orange-100 dark:bg-orange-950",
    text: "text-orange-600 dark:text-orange-400",
  },
  tetris: {
    Icon: MdGridView,
    bg: "bg-pink-100 dark:bg-pink-950",
    text: "text-pink-600 dark:text-pink-400",
  },
  platformer: {
    Icon: MdVideogameAsset,
    bg: "bg-green-100 dark:bg-green-950",
    text: "text-green-600 dark:text-green-400",
  },
};

function PluginCard({ plugin }: { plugin: Plugin }) {
  const meta = PLUGIN_META[plugin.id];

  return (
    <Card className="flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        {meta && (
          <div
            className={`mb-4 w-12 h-12 rounded-xl flex items-center justify-center ${meta.bg}`}
          >
            <meta.Icon className={`text-2xl ${meta.text}`} />
          </div>
        )}
        <CardTitle className="text-base">{plugin.label}</CardTitle>
        <CardDescription className="text-sm leading-relaxed">
          {plugin.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="pb-3">
        <p className="text-2xl font-bold text-foreground">{plugin.price}</p>
      </CardContent>

      <CardFooter className="flex flex-col gap-2 items-stretch mt-auto pt-0">
        {plugin.purchased ? (
          <>
            <Badge variant="secondary" className="justify-center py-1.5">
              ✓ Subscribed
            </Badge>
            <Button asChild variant="outline" size="sm">
              <Link href={plugin.href}>Open</Link>
            </Button>
            <CancelButton pluginId={plugin.id} />
          </>
        ) : (
          <StripeCheckout plugin={plugin} />
        )}
      </CardFooter>
    </Card>
  );
}

export default async function StorePage() {
  const plugins = await getStore();

  return (
    <main className="max-w-5xl mx-auto px-6 py-14">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Plugin Store</h1>
        <p className="text-muted-foreground mt-1">
          Extend MyApp with powerful plugins. Cancel any time.
        </p>
      </div>

      <Separator className="mb-8" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {plugins.map((p) => (
          <PluginCard key={p.id} plugin={p} />
        ))}
      </div>
    </main>
  );
}
