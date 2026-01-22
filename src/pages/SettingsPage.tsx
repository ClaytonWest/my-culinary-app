import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";
import { MemoryList } from "@/components/memory/MemoryList";
import { AddMemoryForm } from "@/components/memory/AddMemoryForm";
import { ChefHat, ArrowLeft, LogOut } from "lucide-react";
import { Link } from "react-router-dom";

export function SettingsPage() {
  const { signOut } = useAuthActions();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/" className="hover:opacity-70">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <ChefHat className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">Settings</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Memory Section */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">
              My Dietary Profile
            </h2>
            <p className="text-muted-foreground mb-6">
              I remember your allergies, dietary restrictions, and preferences
              to give you better recipe recommendations.
            </p>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <AddMemoryForm />
              </div>
              <div>
                <MemoryList />
              </div>
            </div>
          </section>

          {/* Account Section */}
          <section className="pt-8 border-t">
            <h2 className="text-2xl font-semibold mb-4">Account</h2>
            <Button variant="outline" onClick={() => signOut()}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </section>
        </div>
      </main>
    </div>
  );
}
