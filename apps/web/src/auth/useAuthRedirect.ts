import { fetchAuthSession } from "aws-amplify/auth";
import { useNavigate } from "react-router-dom";

/**
 * Reads Cognito group claims from the JWT and redirects after login:
 *   - admin group  → /admin/dashboard
 *   - customer (default) → /dashboard
 */
export async function redirectAfterLogin(
  navigate: ReturnType<typeof useNavigate>
) {
  const session = await fetchAuthSession();
  const groups =
    (session.tokens?.idToken?.payload["cognito:groups"] as string[]) ?? [];

  if (groups.includes("admin")) {
    navigate("/admin/dashboard", { replace: true });
  } else {
    navigate("/dashboard", { replace: true });
  }
}
