import AppShell from "@/components/layout/AppShell";
import { CurrentUserProvider } from "@/contexts/CurrentUserContext";

export default function HomePage() {
  return (
    <CurrentUserProvider>
      <AppShell />
    </CurrentUserProvider>
  );
}