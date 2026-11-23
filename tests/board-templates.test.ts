import assert from "node:assert/strict";
import { test } from "node:test";
import { buildSampleItems, type BoardTemplateId } from "../src/lib/board-templates";

const expected: Record<BoardTemplateId, string[]> = {
  saas: ["Dark mode:12","Export data to CSV:9","Team invites with roles:7","Slack notifications:6","Mobile-friendly dashboard:4","Single sign-on:15","Custom branding:8","Zapier integration:11","Faster page loading:14"],
  mobile: ["Dark mode:13","Home screen widgets:10","Offline mode:9","Face ID login:7","Share to other apps:5","Push notification settings:12","iPad layout:6","Faster startup time:11","Fix crash on launch:16"],
  developer: ["CLI autocomplete:11","TypeScript types:10","Webhooks:9","Better error messages:7","Dark mode for the docs:8","Python SDK:14","Rate limit dashboard:8","GitHub integration:12","API key rotation:13"],
  blank: [],
};

for (const [template, rows] of Object.entries(expected)) {
  test(`${template} seeds the welcome item and the requested roadmap and votes`, () => {
    const [welcome, ...samples] = buildSampleItems(template as BoardTemplateId, "A&B");
    assert.equal(welcome.title, "Welcome to A&B's feedback board");
    assert.equal(welcome.startingVotes, 0);
    assert.deepEqual(samples.map(row => row.title + ":" + row.startingVotes), rows);
    assert.ok([welcome, ...samples].every(row => row.isSample && row.body.length > 0));
    assert.deepEqual(samples.map(row => row.status), rows.length ? ["open", "open", "open", "open", "open", "planned", "planned", "in-progress", "shipped"] : []);
    assert.ok(samples.every(row => row.roadmapVisible && (row.shippedAt !== null) === (row.status === "shipped")));
  });
}
