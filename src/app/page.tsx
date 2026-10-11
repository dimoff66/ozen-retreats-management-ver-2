import AppShell from "@/components/layout/AppShell";
import LoginScreen from "@/components/layout/LoginScreen";
import { CurrentUserProvider } from "@/contexts/CurrentUserContext";
import { getAuthenticatedUser } from "@/server/auth/session";
import authUserStore from "@/server/auth/userStore";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return <LoginScreen />;
  }

  const users = await authUserStore.getAll();
  const userDirectory = users.map((item) => ({ id: item.id, name: item.name }));

  return (
    <CurrentUserProvider initialUser={user} initialUsers={userDirectory}>
      <AppShell />
    </CurrentUserProvider>
  );
}
