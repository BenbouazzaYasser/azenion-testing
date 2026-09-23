import { GridPageSkeleton } from "@/components/ui/loading-skeleton";

// App-shell route boundary: shows skeleton immediately on slower client-side
// navigations instead of holding the previous page. Navbar stays mounted in
// the parent (app)/layout — only the page area below swaps.
export default function AppShellLoading() {
  return <GridPageSkeleton />;
}