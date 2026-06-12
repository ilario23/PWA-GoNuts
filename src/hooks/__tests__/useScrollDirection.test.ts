import { renderHook, act } from "@testing-library/react";
import { useScrollDirection } from "../useScrollDirection";

// The hook batches reads via requestAnimationFrame; run callbacks synchronously
// so each dispatched scroll event is observable in the assertion that follows.
beforeEach(() => {
  jest
    .spyOn(window, "requestAnimationFrame")
    .mockImplementation((cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
  setScrollY(0);
});

afterEach(() => {
  jest.restoreAllMocks();
});

function setScrollY(y: number) {
  Object.defineProperty(window, "scrollY", { value: y, configurable: true });
}

function scrollTo(y: number) {
  act(() => {
    setScrollY(y);
    window.dispatchEvent(new Event("scroll"));
  });
}

describe("useScrollDirection", () => {
  it("starts expanded", () => {
    const { result } = renderHook(() => useScrollDirection());
    expect(result.current).toBe(false);
  });

  it("collapses when scrolling down past the threshold", () => {
    const { result } = renderHook(() => useScrollDirection());
    scrollTo(200);
    expect(result.current).toBe(true);
  });

  it("expands again when scrolling back up", () => {
    const { result } = renderHook(() => useScrollDirection());
    scrollTo(200);
    expect(result.current).toBe(true);
    scrollTo(150); // up by 50px, past threshold
    expect(result.current).toBe(false);
  });

  it("always expands near the top regardless of direction", () => {
    const { result } = renderHook(() => useScrollDirection());
    scrollTo(200);
    expect(result.current).toBe(true);
    scrollTo(10); // within topOffset
    expect(result.current).toBe(false);
  });

  it("ignores sub-threshold jitter", () => {
    const { result } = renderHook(() => useScrollDirection());
    scrollTo(200);
    expect(result.current).toBe(true);
    scrollTo(196); // only 4px up, below threshold -> no change
    expect(result.current).toBe(true);
  });

  it("removes its listener on unmount", () => {
    const remove = jest.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useScrollDirection());
    unmount();
    expect(remove).toHaveBeenCalledWith("scroll", expect.any(Function));
  });
});
