import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import LoginScreen from "@/components/layout/LoginScreen";
import { CurrentUserProvider } from "@/contexts/CurrentUserContext";
import { getAuthenticatedUser } from "@/server/auth/session";
import authUserStore from "@/server/auth/userStore";

export const dynamic = "force-dynamic";

type HomePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getSearchParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const user = await getAuthenticatedUser();

  if (!user) {
    const linkCode = getSearchParam(params.link).trim();

    if (linkCode) {
      redirect(`/api/auth/link?link=${encodeURIComponent(linkCode)}`);
    }

    return <LoginScreen invalidLink={getSearchParam(params.linkError) === "1"} />;
  }

  const users = await authUserStore.getAll();
  const userDirectory = users.map((item) => ({ id: item.id, name: item.name }));

  return (
    <CurrentUserProvider initialUser={user} initialUsers={userDirectory}>
      <AppShell />
    </CurrentUserProvider>
  );
}
