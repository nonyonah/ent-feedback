import assert from "node:assert/strict";
import { test } from "node:test";
import { boardHandleBase, uniqueBoardHandle } from "../src/lib/board-slug";

test("board handles normalize names into the database format", () => {
  assert.equal(boardHandleBase("Product feedback"), "product-feedback");
  assert.equal(boardHandleBase("  Ünïcode ★ Ideas  "), "unicode-ideas");
  assert.equal(boardHandleBase("A"), "a-board");
  assert.equal(boardHandleBase("---"), "-board");
  assert.equal(boardHandleBase("x".repeat(80)).length, 50);
});

test("duplicate handles take the next free numeric suffix", () => {
  assert.equal(uniqueBoardHandle("Product feedback", []), "product-feedback");
  assert.equal(uniqueBoardHandle("Product feedback", ["product-feedback"]), "product-feedback-2");
  assert.equal(uniqueBoardHandle("Product feedback", ["product-feedback", "product-feedback-2"]), "product-feedback-3");
});
