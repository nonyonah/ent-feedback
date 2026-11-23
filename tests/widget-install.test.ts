import assert from "node:assert/strict";
import test from "node:test";
import { widgetSnippet } from "../src/lib/widget-snippet";
import { widgetInstallPrompt } from "../src/server/widget-install";

test("the AI install prompt embeds the manual loader and the workspace's public key", () => {
  const args = ["https://feedback.example", "acme-tools", "mobile-app"] as const;
  const snippet = widgetSnippet(...args);
  assert.equal(snippet, '<script src="https://feedback.example/widget.js" data-project="acme-tools" data-board="mobile-app" defer></script>');
  const prompt = widgetInstallPrompt(...args);
  assert.ok(prompt.includes("Project key: acme-tools"));
  assert.equal(prompt.split(snippet).length, 2);
});
