import {
  buildInviteLink,
  claimGuestInvite,
  clearPendingInvite,
  createGuestInvite,
  getPendingInvite,
  InviteError,
  previewGuestInvite,
  savePendingInvite,
  toInviteError,
} from "../guestInvites";

const rpc = jest.fn();
jest.mock("@/lib/supabase", () => ({
  supabase: { rpc: (...args: unknown[]) => rpc(...args) },
}));

describe("guestInvites", () => {
  beforeEach(() => {
    rpc.mockReset();
    localStorage.clear();
  });

  it("maps Postgres exception messages to typed error codes", () => {
    expect(toInviteError("invite_expired").code).toBe("invite_expired");
    expect(toInviteError("already_member").code).toBe("already_member");
    expect(toInviteError("something odd").code).toBe("unknown");
    expect(toInviteError(undefined).code).toBe("unknown");
  });

  it("builds an origin-relative link and encodes the token", () => {
    expect(buildInviteLink("abc", "https://app.test")).toBe(
      "https://app.test/join/abc"
    );
    expect(buildInviteLink("a/b", "https://app.test")).toBe(
      "https://app.test/join/a%2Fb"
    );
  });

  it("createGuestInvite returns the token", async () => {
    rpc.mockResolvedValue({ data: "tok123", error: null });
    await expect(createGuestInvite("member-1")).resolves.toBe("tok123");
    expect(rpc).toHaveBeenCalledWith("create_guest_invite", {
      p_member_id: "member-1",
    });
  });

  it("createGuestInvite throws a typed error on failure", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "not_allowed" } });
    await expect(createGuestInvite("member-1")).rejects.toMatchObject({
      name: "InviteError",
      code: "not_allowed",
    });
  });

  it("previewGuestInvite normalises the jsonb payload", async () => {
    rpc.mockResolvedValue({
      data: { status: "valid", group_name: "Casa", guest_name: "Giulia" },
      error: null,
    });
    await expect(previewGuestInvite("t")).resolves.toEqual({
      status: "valid",
      groupName: "Casa",
      guestName: "Giulia",
    });
  });

  it("previewGuestInvite defaults to not_found on empty payload", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    const res = await previewGuestInvite("t");
    expect(res.status).toBe("not_found");
  });

  it("claimGuestInvite returns the group id", async () => {
    rpc.mockResolvedValue({ data: "group-9", error: null });
    await expect(claimGuestInvite("t")).resolves.toBe("group-9");
  });

  it("claimGuestInvite surfaces already_member", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "already_member" } });
    const err = await claimGuestInvite("t").catch((e) => e);
    expect(err).toBeInstanceOf(InviteError);
    expect(err.code).toBe("already_member");
  });

  it("persists the pending token across the auth detour", () => {
    expect(getPendingInvite()).toBeNull();
    savePendingInvite("tok");
    expect(getPendingInvite()).toBe("tok");
    clearPendingInvite();
    expect(getPendingInvite()).toBeNull();
  });
});
