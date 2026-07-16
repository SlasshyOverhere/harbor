import assert from "node:assert/strict";
import test from "node:test";
import { buildStreamIds } from "../src/lib/streams/stream-ids.ts";

test("builds MAL movie stream ids without episode metadata", () => {
  assert.deepEqual(buildStreamIds("mal:32281", undefined, "tt5311514"), ["mal:32281", "tt5311514"]);
});
