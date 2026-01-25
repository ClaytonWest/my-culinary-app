import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Trash2, AlertTriangle, Ban, Heart, Target, Wrench } from "lucide-react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useToast } from "@/components/common/Toast";

const categoryIcons = {
  allergy: AlertTriangle,
  intolerance: AlertTriangle,
  restriction: Ban,
  preference: Heart,
  goal: Target,
  equipment: Wrench,
};

const categoryLabels = {
  allergy: "Allergies",
  intolerance: "Intolerances",
  restriction: "Dietary Restrictions",
  preference: "Preferences",
  goal: "Goals",
  equipment: "Kitchen Equipment",
};

const categoryColors = {
  allergy: "text-red-500",
  intolerance: "text-orange-500",
  restriction: "text-purple-500",
  preference: "text-blue-500",
  goal: "text-green-500",
  equipment: "text-gray-500",
};

export function MemoryList() {
  const memories = useQuery(api.memories.getMemories, {});
  const deleteMemory = useMutation(api.memories.deleteMemory);
  const { showToast } = useToast();

  const handleDelete = async (id: typeof memories extends undefined ? never : typeof memories[0]["_id"]) => {
    try {
      await deleteMemory({ id });
      showToast("Memory removed", "success");
    } catch {
      showToast("Failed to remove memory", "error");
    }
  };

  if (memories === undefined) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (memories.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No memories yet</CardTitle>
          <CardDescription>
            As you chat, I'll remember your allergies, dietary preferences, and
            cooking goals. You can also add them manually below.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Group by category
  const grouped = memories.reduce(
    (acc, memory) => {
      if (!acc[memory.category]) {
        acc[memory.category] = [];
      }
      acc[memory.category].push(memory);
      return acc;
    },
    {} as Record<string, typeof memories>
  );

  const categories = [
    "allergy",
    "intolerance",
    "restriction",
    "equipment",
    "goal",
    "preference",
  ] as const;

  return (
    <div className="space-y-4">
      {categories.map((category) => {
        const items = grouped[category];
        if (!items || items.length === 0) return null;

        const Icon = categoryIcons[category];
        const label = categoryLabels[category];
        const colorClass = categoryColors[category];

        return (
          <Card key={category}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Icon className={`h-5 w-5 ${colorClass}`} />
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {items.map((memory) => (
                  <li
                    key={memory._id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <span>{memory.fact}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(memory._id)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
