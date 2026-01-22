import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus } from "lucide-react";
import { useToast } from "@/components/common/Toast";

type MemoryCategory =
  | "allergy"
  | "intolerance"
  | "restriction"
  | "preference"
  | "goal"
  | "equipment";

const categoryOptions: { value: MemoryCategory; label: string }[] = [
  { value: "allergy", label: "Allergy (critical)" },
  { value: "intolerance", label: "Intolerance" },
  { value: "restriction", label: "Dietary Restriction" },
  { value: "preference", label: "Preference" },
  { value: "goal", label: "Goal" },
  { value: "equipment", label: "Kitchen Equipment" },
];

export function AddMemoryForm() {
  const [fact, setFact] = useState("");
  const [category, setCategory] = useState<MemoryCategory>("preference");
  const [adding, setAdding] = useState(false);
  const addMemory = useMutation(api.memories.addMemoryManual);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fact.trim()) return;

    setAdding(true);
    try {
      await addMemory({ fact: fact.trim(), category });
      setFact("");
      showToast("Memory added successfully!", "success");
    } catch {
      showToast("Failed to add memory", "error");
    } finally {
      setAdding(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Memory</CardTitle>
        <CardDescription>
          Manually add dietary information for me to remember
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as MemoryCategory)}
              className="w-full mt-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <Input
              value={fact}
              onChange={(e) => setFact(e.target.value)}
              placeholder={
                category === "allergy"
                  ? "e.g., I'm allergic to peanuts"
                  : category === "restriction"
                    ? "e.g., I'm vegetarian"
                    : category === "equipment"
                      ? "e.g., I don't have an oven"
                      : "e.g., I prefer spicy food"
              }
              className="mt-1"
            />
          </div>
          <Button type="submit" disabled={!fact.trim() || adding}>
            <Plus className="h-4 w-4 mr-2" />
            {adding ? "Adding..." : "Add Memory"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
