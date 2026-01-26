import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";
import { MemoryList } from "@/components/memory/MemoryList";
import { AddMemoryForm } from "@/components/memory/AddMemoryForm";
import { ChefHat, ArrowLeft, LogOut, Bug } from "lucide-react";
import { Link } from "react-router-dom";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { Id } from "../../convex/_generated/dataModel";

export function SettingsPage() {
  const { signOut } = useAuthActions();
  const debugCompaction = useAction(api.memoryCompaction.debugCompaction);
  const [conversationId, setConversationId] = useState("");
  const [debugResult, setDebugResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleDebugCompaction = async () => {
    if (!conversationId.trim()) {
      alert("Please enter a conversation ID");
      return;
    }

    setLoading(true);
    try {
      const result = await debugCompaction({
        conversationId: conversationId.trim() as Id<"conversations">,
      });
      setDebugResult(result);
    } catch (error: any) {
      setDebugResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

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

          {/* Debug Compaction Section */}
          <section className="pt-8 border-t">
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              <Bug className="h-6 w-6" />
              Debug Memory Compaction
            </h2>
            <p className="text-muted-foreground mb-4">
              Test memory compaction for a specific conversation
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Conversation ID
                </label>
                <input
                  type="text"
                  value={conversationId}
                  onChange={(e) => setConversationId(e.target.value)}
                  placeholder="jx715ztfd4z3hpyrctmywp0weh7zp1kt"
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <Button onClick={handleDebugCompaction} disabled={loading}>
                {loading ? "Running..." : "Run Compaction Debug"}
              </Button>

              {debugResult && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Debug Results:</h3>
                  <pre className="text-sm overflow-auto">
                    {JSON.stringify(debugResult, null, 2)}
                  </pre>
                </div>
              )}
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
