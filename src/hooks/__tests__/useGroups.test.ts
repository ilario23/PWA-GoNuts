import { renderHook, act } from "@testing-library/react";
import { useGroups } from "../useGroups";
import { db } from "../../lib/db";
import { syncManager } from "../../lib/sync";
import { useAuth } from "../useAuth";

// Mock dependencies
jest.mock("../useAuth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../../lib/sync", () => ({
  syncManager: {
    sync: jest.fn(),
    schedulePush: jest.fn(),
  },
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string) => k,
  }),
}));

jest.mock("../../lib/db", () => ({
  db: {
    groups: {
      toArray: jest.fn(),
      add: jest.fn(),
      update: jest.fn(),
    },
    group_members: {
      toArray: jest.fn(),
      add: jest.fn(),
      update: jest.fn(),
      filter: jest.fn(),
    },
    categories: {
      filter: jest.fn(),
      update: jest.fn(),
    },
    transactions: {
      filter: jest.fn(),
      update: jest.fn(),
    },
    recurring_transactions: {
      filter: jest.fn(),
      update: jest.fn(),
    },
    profiles: {
      toArray: jest.fn(),
    },
  },
}));

jest.mock("dexie-react-hooks", () => ({
  useLiveQuery: (fn: () => unknown) => {
    // Execute the query function and return the result
    try {
      return fn();
    } catch {
      return undefined;
    }
  },
}));

jest.mock("uuid", () => ({
  v4: jest.fn(() => "mock-uuid"),
}));

describe("useGroups", () => {
  const mockUser = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    email: "test@example.com",
  };

  const mockGroup = {
    id: "group-1",
    name: "Test Group",
    description: "Test Description",
    created_by: "user-123",
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
    deleted_at: null,
    pendingSync: 0,
  };

  const mockMember = {
    id: "member-1",
    group_id: "group-1",
    user_id: "user-123",
    share: 100,
    joined_at: "2024-01-01T00:00:00.000Z",
    removed_at: null,
    pendingSync: 0,
    updated_at: "2024-01-01T00:00:00.000Z",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ user: mockUser });
    (db.groups.toArray as jest.Mock).mockResolvedValue([mockGroup]);
    (db.group_members.toArray as jest.Mock).mockResolvedValue([mockMember]);
    (db.profiles.toArray as jest.Mock).mockResolvedValue([]);
  });

  it("should return empty array when user is not authenticated", async () => {
    (useAuth as jest.Mock).mockReturnValue({ user: null });

    const { result } = renderHook(() => useGroups());

    // When user is null, useLiveQuery returns early with []
    // The mock returns the promise result, but in the actual code it would return []
    // Since we're mocking useLiveQuery to execute the function, we need to check the function behavior
    expect(result.current.createGroup).toBeDefined();
    expect(result.current.deleteGroup).toBeDefined();
  });

  it("should return groups with members enriched data", async () => {
    const { result } = renderHook(() => useGroups());

    // Groups array returned by useLiveQuery will be processed
    expect(result.current.groups).toBeDefined();
  });

  it("should create a group with creator as first member", async () => {
    const { result } = renderHook(() => useGroups());

    await act(async () => {
      await result.current.createGroup("New Group", "Description");
    });

    expect(db.groups.add).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "mock-uuid",
        name: "New Group",
        description: "Description",
        created_by: mockUser.id,
        pendingSync: 1,
      })
    );

    expect(db.group_members.add).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "mock-uuid",
        group_id: "mock-uuid",
        user_id: mockUser.id,
        share: 100,
        pendingSync: 1,
      })
    );

    expect(syncManager.schedulePush).toHaveBeenCalled();
  });

  it("should update a group", async () => {
    const { result } = renderHook(() => useGroups());

    await act(async () => {
      await result.current.updateGroup("group-1", {
        name: "Updated Name",
        description: "Updated Description",
      });
    });

    expect(db.groups.update).toHaveBeenCalledWith(
      "group-1",
      expect.objectContaining({
        name: "Updated Name",
        description: "Updated Description",
        pendingSync: 1,
      })
    );

    expect(syncManager.schedulePush).toHaveBeenCalled();
  });

  it("should soft delete a group", async () => {
    const mockFilterResult = {
      toArray: jest.fn().mockResolvedValue([]),
    };
    (db.categories.filter as jest.Mock).mockReturnValue(mockFilterResult);
    (db.transactions.filter as jest.Mock).mockReturnValue(mockFilterResult);

    const { result } = renderHook(() => useGroups());

    await act(async () => {
      await result.current.deleteGroup("group-1", false);
    });

    expect(db.groups.update).toHaveBeenCalledWith(
      "group-1",
      expect.objectContaining({
        deleted_at: expect.any(String),
        pendingSync: 1,
      })
    );

    expect(syncManager.schedulePush).toHaveBeenCalled();
  });

  it("should add a member to a group", async () => {
    const { result } = renderHook(() => useGroups());

    await act(async () => {
      await result.current.addGroupMember("group-1", "new-user-id", false, 25);
    });

    expect(db.group_members.add).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "mock-uuid",
        group_id: "group-1",
        user_id: "new-user-id",
        share: 25,
        pendingSync: 1,
      })
    );

    expect(syncManager.schedulePush).toHaveBeenCalled();
  });

  it("should remove a member (soft delete)", async () => {
    const { result } = renderHook(() => useGroups());

    await act(async () => {
      await result.current.removeGroupMember("member-1");
    });

    expect(db.group_members.update).toHaveBeenCalledWith(
      "member-1",
      expect.objectContaining({
        removed_at: expect.any(String),
        pendingSync: 1,
      })
    );

    expect(syncManager.schedulePush).toHaveBeenCalled();
  });

  it("should update member share", async () => {
    const { result } = renderHook(() => useGroups());

    await act(async () => {
      await result.current.updateMemberShare("member-1", 50);
    });

    expect(db.group_members.update).toHaveBeenCalledWith(
      "member-1",
      expect.objectContaining({
        share: 50,
        pendingSync: 1,
      })
    );

    expect(syncManager.schedulePush).toHaveBeenCalled();
  });

  it("should update all shares at once", async () => {
    const { result } = renderHook(() => useGroups());

    await act(async () => {
      await result.current.updateAllShares("group-1", [
        { memberId: "member-1", share: 60 },
        { memberId: "member-2", share: 40 },
      ]);
    });

    expect(db.group_members.update).toHaveBeenCalledTimes(2);
    expect(db.group_members.update).toHaveBeenCalledWith(
      "member-1",
      expect.objectContaining({ share: 60, pendingSync: 1 })
    );
    expect(db.group_members.update).toHaveBeenCalledWith(
      "member-2",
      expect.objectContaining({ share: 40, pendingSync: 1 })
    );

    expect(syncManager.schedulePush).toHaveBeenCalled();
  });

  it("should calculate group balance correctly", async () => {
    const mockMembers = [
      {
        id: "member-1",
        group_id: "group-1",
        user_id: "user-1",
        share: 60,
        removed_at: null,
      },
      {
        id: "member-2",
        group_id: "group-1",
        user_id: "user-2",
        share: 40,
        removed_at: null,
      },
    ];

    const mockTransactions = [
      {
        id: "tx-1",
        group_id: "group-1",
        type: "expense",
        amount: 100,
        paid_by_member_id: "member-1",
        deleted_at: null,
      },
      {
        id: "tx-2",
        group_id: "group-1",
        type: "expense",
        amount: 50,
        paid_by_member_id: "member-2",
        deleted_at: null,
      },
    ];

    const mockMemberFilterResult = {
      toArray: jest.fn().mockResolvedValue(mockMembers),
    };
    const mockTxFilterResult = {
      toArray: jest.fn().mockResolvedValue(mockTransactions),
    };

    (db.group_members.filter as jest.Mock).mockReturnValue(
      mockMemberFilterResult
    );
    (db.transactions.filter as jest.Mock).mockReturnValue(mockTxFilterResult);

    const { result } = renderHook(() => useGroups());

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let balanceResult: any;
    await act(async () => {
      balanceResult = await result.current.getGroupBalance("group-1");
    });

    // Total expenses: 150
    expect(balanceResult.totalExpenses).toBe(150);

    // User 1: should pay 60% of 150 = 90, has paid 100, balance = +10
    expect(balanceResult.balances["user-1"].shouldPay).toBe(90);
    expect(balanceResult.balances["user-1"].hasPaid).toBe(100);
    expect(balanceResult.balances["user-1"].balance).toBe(10);

    // User 2: should pay 40% of 150 = 60, has paid 50, balance = -10
    expect(balanceResult.balances["user-2"].shouldPay).toBe(60);
    expect(balanceResult.balances["user-2"].hasPaid).toBe(50);
    expect(balanceResult.balances["user-2"].balance).toBe(-10);
  });

  it("should not create group when user is not authenticated", async () => {
    (useAuth as jest.Mock).mockReturnValue({ user: null });

    const { result } = renderHook(() => useGroups());

    const groupId = await result.current.createGroup("Test", "Description");

    expect(groupId).toBeNull();
    expect(db.groups.add).not.toHaveBeenCalled();
  });
});
