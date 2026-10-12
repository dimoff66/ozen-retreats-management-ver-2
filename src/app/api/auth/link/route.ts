import { NextResponse } from "next/server";
import { getAuthenticatedStoredUser, setSessionCookie } from "@/server/auth/session";
import authUserStore from "@/server/auth/userStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const redirectUrl = new URL("/", requestUrl.origin);

  try {
    const currentUser = await getAuthenticatedStoredUser();

    if (currentUser) {
      return NextResponse.redirect(redirectUrl);
    }

    const linkCode = requestUrl.searchParams.get("link")?.trim() ?? "";

    if (!linkCode) {
      redirectUrl.searchParams.set("linkError", "1");
      return NextResponse.redirect(redirectUrl);
    }

    const user = await authUserStore.getByLinkCode(linkCode);

    if (!user) {
      redirectUrl.searchParams.set("linkError", "1");
      return NextResponse.redirect(redirectUrl);
    }

    const response = NextResponse.redirect(redirectUrl);
    setSessionCookie(response, user);
    return response;
  } catch {
    redirectUrl.searchParams.set("linkError", "1");
    return NextResponse.redirect(redirectUrl);
  }
}
