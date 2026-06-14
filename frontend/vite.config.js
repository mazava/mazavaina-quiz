import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// IMPORTANT :
// Remplace "quiz-react-reveal-github-ready" par le nom exact de ton repo GitHub.
// Exemple : si ton repo s'appelle "mazavaina-reveal", mets base: "/mazavaina-reveal/"
export default defineConfig({
  plugins: [react()],
  base: "/mazavaina-quiz/"
});
