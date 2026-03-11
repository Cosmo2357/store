"use client";

import Link from "next/link";
import { useFeatureFlags } from "@/context/FeatureFlagContext";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ModeToggle } from "@/components/ModeToggle";
import { MdStorefront } from "react-icons/md";

export function Header() {
  const activeItems = useFeatureFlags().filter((f) => f.purchased);

  return (
    <header className="w-full bg-background border-b">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-6">
        <Link href="/" className="text-lg font-bold text-primary">
          MyApp
        </Link>

        <Separator orientation="vertical" className="h-6" />

        {/* Dynamic menu: subscribed plugins only */}
        <NavigationMenu>
          <NavigationMenuList>
            {activeItems.map((item) => (
              <NavigationMenuItem key={item.id}>
                <NavigationMenuLink
                  asChild
                  className={navigationMenuTriggerStyle()}
                >
                  <Link href={item.href}>{item.label}</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="ml-auto flex items-center gap-2">
          <Button asChild variant="default" size="sm">
            <Link href="/store" className="flex items-center gap-1.5">
              <MdStorefront className="text-base" />
              Store
            </Link>
          </Button>
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
