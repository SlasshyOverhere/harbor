import { expect, test } from "vite-plus/test";
import { createParentalGuideClient, type ParentalGuide } from "../src/lib/parental-guide.ts";

function guide(id: string, itemCount: number): ParentalGuide {
  return {
    id,
    mpa_rating: "PG-13",
    mpa_rating_reason: null,
    categories: [
      {
        id: "violence",
        title: "Violence & Gore",
        severity: null,
        severity_breakdown: [],
        total_severity_votes: 0,
        total_items: itemCount,
        items: Array.from({ length: itemCount }, (_, index) => ({
          id: `violence-${index + 1}`,
          is_spoiler: false,
          text: `Note ${index + 1}`,
          html: "",
        })),
      },
    ],
  };
}

function response(body: ParentalGuide, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 500,
    json: async () => body,
  } as Response;
}

test("does not cache failed parental-guide requests", async () => {
  let calls = 0;
  const client = createParentalGuideClient(async () => {
    calls += 1;
    return calls === 1 ? response(guide("tt1234567", 5), false) : response(guide("tt1234567", 5));
  });

  expect(await client.fetchParentalGuide("tt1234567", "movie")).toBeNull();
  expect((await client.fetchParentalGuide("tt1234567", "movie"))?.id).toBe("tt1234567");
  expect(calls).toBe(2);
});

test("deduplicates concurrent initial guide requests", async () => {
  let calls = 0;
  let resolveResponse!: (value: Response) => void;
  const pendingResponse = new Promise<Response>((resolve) => {
    resolveResponse = resolve;
  });
  const client = createParentalGuideClient(async () => {
    calls += 1;
    return pendingResponse;
  });

  const first = client.fetchParentalGuide("tt1234567", "movie");
  const second = client.fetchParentalGuide("tt1234567", "movie");
  resolveResponse(response(guide("tt1234567", 5)));

  expect((await first)?.id).toBe("tt1234567");
  expect((await second)?.id).toBe("tt1234567");
  expect(calls).toBe(1);
});

test("refreshes guide recency before evicting the least recently used entry", async () => {
  const calls = new Map<string, number>();
  const client = createParentalGuideClient(async (input) => {
    const id = new URL(String(input)).pathname.split("/")[2];
    calls.set(id, (calls.get(id) ?? 0) + 1);
    return response(guide(id, 5));
  }, 2);

  await client.fetchParentalGuide("tt0000001", "movie");
  await client.fetchParentalGuide("tt0000002", "movie");
  await client.fetchParentalGuide("tt0000001", "movie");
  await client.fetchParentalGuide("tt0000003", "movie");
  await client.fetchParentalGuide("tt0000002", "movie");

  expect(calls.get("tt0000001")).toBe(1);
  expect(calls.get("tt0000002")).toBe(2);
  expect(calls.get("tt0000003")).toBe(1);
});

test("retains expanded guide results and avoids fetching them again", async () => {
  let calls = 0;
  const client = createParentalGuideClient(async (input) => {
    calls += 1;
    const limit = Number(new URL(String(input)).searchParams.get("items_per_category"));
    return response(guide("tt1234567", limit));
  });

  expect((await client.fetchParentalGuide("tt1234567", "movie"))?.categories[0].items.length).toBe(
    5,
  );
  expect(
    (
      await client.fetchParentalGuideMore("tt1234567", "movie", [
        { id: "violence", total_items: 10 },
      ])
    )?.categories[0].items.length,
  ).toBe(10);
  expect((await client.fetchParentalGuide("tt1234567", "movie"))?.categories[0].items.length).toBe(
    10,
  );
  await client.fetchParentalGuideMore("tt1234567", "movie", [{ id: "violence", total_items: 10 }]);

  expect(calls).toBe(2);
});

test("retries a failed expanded-guide request without discarding cached items", async () => {
  let calls = 0;
  const client = createParentalGuideClient(async (input) => {
    calls += 1;
    const limit = Number(new URL(String(input)).searchParams.get("items_per_category"));
    return calls === 2
      ? response(guide("tt1234567", limit), false)
      : response(guide("tt1234567", limit));
  });

  await client.fetchParentalGuide("tt1234567", "movie");
  expect(
    await client.fetchParentalGuideMore("tt1234567", "movie", [
      { id: "violence", total_items: 10 },
    ]),
  ).toBeNull();
  expect((await client.fetchParentalGuide("tt1234567", "movie"))?.categories[0].items.length).toBe(
    5,
  );
  expect(
    (
      await client.fetchParentalGuideMore("tt1234567", "movie", [
        { id: "violence", total_items: 10 },
      ])
    )?.categories[0].items.length,
  ).toBe(10);
  expect(calls).toBe(3);
});
