import { render, screen, waitFor } from "@testing-library/react";
import { db } from "@/lib/db";
import { SyncConflictsCard } from "../SyncConflictsCard";

// t(key, defaultValue) -> defaultValue so assertions use the English copy.
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (_k: string, d?: string) => d ?? _k }),
}));

beforeEach(async () => {
  await db.sync_conflicts.clear();
});

describe("SyncConflictsCard", () => {
  it("renders nothing when there are no unresolved conflicts", async () => {
    const { container } = render(<SyncConflictsCard />);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it("shows the count and summary when an unresolved conflict exists", async () => {
    await db.sync_conflicts.put({
      key: "transactions:c1",
      table: "transactions",
      itemId: "c1",
      remoteData: JSON.stringify({ description: "Coffee (remote)", amount: 4.5 }),
      detectedAt: new Date().toISOString(),
      resolvedAt: null,
    });

    render(<SyncConflictsCard />);

    expect(await screen.findByText("Sync conflicts")).toBeInTheDocument();
    expect(await screen.findByText("1")).toBeInTheDocument();
  });

  it("ignores already-resolved conflicts", async () => {
    await db.sync_conflicts.put({
      key: "transactions:c2",
      table: "transactions",
      itemId: "c2",
      remoteData: "{}",
      detectedAt: new Date().toISOString(),
      resolvedAt: new Date().toISOString(),
    });

    const { container } = render(<SyncConflictsCard />);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});
