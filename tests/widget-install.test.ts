import assert from "node:assert/strict";
import test from "node:test";
import { widgetSnippet } from "../src/lib/widget-snippet";
import { widgetInstallPrompt } from "../src/server/widget-install";

test("the AI install prompt is markdown that embeds the manual loader and the workspace's public key", () => {
  const args = ["https://feedback.example", "acme-tools", "mobile-app"] as const;
  const snippet = widgetSnippet(...args);
  assert.equal(snippet, '<script src="https://feedback.example/widget.js" data-project="acme-tools" data-board="mobile-app" defer></script>');
  const prompt = widgetInstallPrompt(...args);
  assert.ok(prompt.includes("Project key: `acme-tools`"));
  assert.equal(prompt.split(snippet).length, 2);
  assert.match(prompt, /^# Add the Ent Feedback feedback widget to this project/m);
  assert.match(prompt, /```html\n<script/);
  assert.ok(!prompt.includes("<html>") && !prompt.includes("<body>"));
});

test("the project key is the workspace handle passed in, not a shared one", () => {
  const first = widgetInstallPrompt("https://feedback.example", "acme-tools", "product");
  const second = widgetInstallPrompt("https://feedback.example", "northwind", "product");
  assert.ok(first.includes("Project key: `acme-tools`") && !first.includes("northwind"));
  assert.ok(second.includes("Project key: `northwind`") && !second.includes("acme-tools"));
  assert.ok(first.includes('data-project="acme-tools"') && second.includes('data-project="northwind"'));
});
