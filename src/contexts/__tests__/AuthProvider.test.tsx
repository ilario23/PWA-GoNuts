import { render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "../AuthProvider";

// AuthProvider reaches for supabase.auth, the router, the sync manager, cleanup
// and the db — stub them so the test exercises only the provider's own logic.
jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
  },
}));
jest.mock("react-router-dom", () => ({ useNavigate: () => jest.fn() }));
jest.mock("@/lib/sync", () => ({
  syncManager: { registerLogoutHandler: jest.fn(), fullSync: jest.fn() },
}));
jest.mock("@/lib/cleanup", () => ({ cleanupSoftDeletedRecords: jest.fn().mockResolvedValue(undefined) }));
jest.mock("@/lib/db", () => ({ db: { clearLocalCache: jest.fn().mockResolvedValue(undefined) } }));
jest.mock("@/components/auth/SessionExpiredModal", () => ({ SessionExpiredModal: () => null }));

const CACHED_USER_KEY = "expense_tracker_cached_user";

function Consumer() {
  const { user, loading } = useAuth();
  if (loading) return <div>loading</div>;
  return <div>user:{user ? user.email : "none"}</div>;
}

afterEach(() => {
  localStorage.clear();
});

describe("AuthProvider", () => {
  it("throws when useAuth is used outside the provider", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Consumer />)).toThrow(/useAuth must be used within an AuthProvider/);
    spy.mockRestore();
  });

  it("boots from the cached user when offline (no network needed)", async () => {
    localStorage.setItem(
      CACHED_USER_KEY,
      JSON.stringify({ id: "u1", email: "dev@example.com" })
    );
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    expect(await screen.findByText("user:dev@example.com")).toBeInTheDocument();

    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  });

  it("resolves to no user when offline with no cache", async () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByText("user:none")).toBeInTheDocument());

    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  });
});
