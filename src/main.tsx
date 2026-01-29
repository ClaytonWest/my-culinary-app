import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { ToastProvider } from "@/components/common/Toast";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { MotionProvider } from "@/providers/MotionProvider";
import { SidebarProvider } from "@/providers/SidebarProvider";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <MotionProvider>
          <ConvexAuthProvider client={convex}>
            <SidebarProvider>
              <ToastProvider>
                <App />
              </ToastProvider>
            </SidebarProvider>
          </ConvexAuthProvider>
        </MotionProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>
);
