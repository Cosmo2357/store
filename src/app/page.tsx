import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function HomePage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <div className="space-y-4 mb-10">
        <h1 className="text-3xl font-bold">Welcome to MyApp</h1>
        <p className="text-muted-foreground">
          Subscribe to plugins in the store and they will automatically appear in the header menu.
        </p>
        <Button asChild>
          <Link href="/store">Browse Plugin Store</Link>
        </Button>
      </div>

      <Separator className="my-8" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>SQLite</CardTitle>
            <CardDescription>Persistent storage with better-sqlite3</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Plugin subscription state is stored in a local SQLite database.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Server Actions</CardTitle>
            <CardDescription>RPC-style server operations</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              All purchases and data fetches are handled via Server Actions.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Dynamic Import</CardTitle>
            <CardDescription>Lazy-load only subscribed plugins</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Plugin code is code-split with dynamic() and loaded on demand.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
