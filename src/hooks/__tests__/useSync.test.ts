import { renderHook, act } from "@testing-library/react";
import { useSync } from "../useSync";
import { syncManager, SyncStatus } from "../../lib/sync";

// Mock the sync module
jest.mock("../../lib/sync", () => {
  const mockStatus: SyncStatus = {
    isSyncing: false,
    lastSyncAt: null,
    pendingCount: 0,
    errorCount: 0,
    errors: [],
    initialSyncComplete: false,
  };

  return {
    syncManager: {
      sync: jest.fn().mockResolvedValue(undefined),
      getStatus: jest.fn(() => ({ ...mockStatus })),
      onSyncChange: jest.fn((_callback: (status: SyncStatus) => void) => {
        return jest.fn(); // unsubscribe function
      }),
      retryError: jest.fn().mockResolvedValue(undefined),
      retryAllErrors: jest.fn().mockResolvedValue(undefined),
    },
  };
});

describe("useSync", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should return initial sync status", () => {
    const { result } = renderHook(() => useSync());

    expect(result.current.isSyncing).toBe(false);
    expect(result.current.lastSyncAt).toBeNull();
    expect(result.current.pendingCount).toBe(0);
    expect(result.current.errorCount).toBe(0);
    expect(result.current.errors).toEqual([]);
  });



  it("should subscribe to sync changes on mount", () => {
    renderHook(() => useSync());

    expect(syncManager.onSyncChange).toHaveBeenCalledTimes(1);
    expect(
      typeof (syncManager.onSyncChange as jest.Mock).mock.calls[0][0]
    ).toBe("function");
  });

  it("should unsubscribe from sync changes on unmount", () => {
    const unsubscribeMock = jest.fn();
    (syncManager.onSyncChange as jest.Mock).mockReturnValueOnce(
      unsubscribeMock
    );

    const { unmount } = renderHook(() => useSync());
    unmount();

    expect(unsubscribeMock).toHaveBeenCalledTimes(1);
  });

  it("should trigger sync when sync() is called", async () => {
    const { result } = renderHook(() => useSync());

    // Clear the initial mount sync call
    jest.clearAllMocks();

    await act(async () => {
      await result.current.sync();
    });

    expect(syncManager.sync).toHaveBeenCalledTimes(1);
  });

  it("should call retryError with correct key", async () => {
    const { result } = renderHook(() => useSync());

    await act(async () => {
      await result.current.retryError("test-error-key");
    });

    expect(syncManager.retryError).toHaveBeenCalledWith("test-error-key");
  });

  it("should call retryAllErrors", async () => {
    const { result } = renderHook(() => useSync());

    await act(async () => {
      await result.current.retryAllErrors();
    });

    expect(syncManager.retryAllErrors).toHaveBeenCalledTimes(1);
  });

  it("should expose sync, retryError, and retryAllErrors functions", () => {
    const { result } = renderHook(() => useSync());

    expect(typeof result.current.sync).toBe("function");
    expect(typeof result.current.retryError).toBe("function");
    expect(typeof result.current.retryAllErrors).toBe("function");
  });

  it("should update status when syncManager emits changes", async () => {
    const { result } = renderHook(() => useSync());

    // Get the callback that was passed to onSyncChange
    const statusCallback = (syncManager.onSyncChange as jest.Mock).mock
      .calls[0][0];

    act(() => {
      statusCallback({
        isSyncing: true,
        lastSyncAt: "2024-01-15T10:00:00Z",
        pendingCount: 5,
        errorCount: 2,
        errors: [
          {
            key: "err1",
            table: "transactions",
            operation: "push",
            message: "Network error",
            attempts: 1,
            lastAttempt: "2024-01-15T10:00:00Z",
          },
        ],
      });
    });

    expect(result.current.isSyncing).toBe(true);
    expect(result.current.lastSyncAt).toBe("2024-01-15T10:00:00Z");
    expect(result.current.pendingCount).toBe(5);
    expect(result.current.errorCount).toBe(2);
    expect(result.current.errors).toHaveLength(1);
  });


});
