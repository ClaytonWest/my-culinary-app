import { useState } from "react";
import { SignInForm } from "@/components/auth/SignInForm";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { ChefHat } from "lucide-react";

export function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-muted p-4">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <ChefHat className="h-10 w-10 text-primary" />
          <h1 className="text-3xl font-bold">Culinary AI</h1>
        </div>
        <p className="text-muted-foreground">
          Your personal AI cooking assistant
        </p>
      </div>

      {isSignUp ? (
        <SignUpForm onToggleMode={() => setIsSignUp(false)} />
      ) : (
        <SignInForm onToggleMode={() => setIsSignUp(true)} />
      )}
    </div>
  );
}
