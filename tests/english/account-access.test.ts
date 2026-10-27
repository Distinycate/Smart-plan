import { test } from "node:test";
import assert from "node:assert/strict";
import { accountGrants, has } from "../../lib/english-mastery/policy";

test("Smart Plan self-study grants only learner access when explicitly enabled", () => {
  assert.deepEqual(accountGrants([], false), []);
  const actor = { id: "verified-host-user", grants: accountGrants([], true) };
  assert(has(actor, "english.learn", "A1-01"));
  assert(has(actor, "english.preview", "C2-16"));
  for (const permission of ["english.author", "english.review", "english.publish", "english.manage_production"] as const)
    assert.equal(has(actor, permission), false);
});

test("self-study defaults respect revocation and scoped invitations", () => {
  const rows = [
    { data: { permission: "english.learn", units: ["A1-01"], reviewTypes: [] } },
    { data: { permission: "english.preview", units: ["*"], reviewTypes: [], revokedAt: "2026-10-27" } },
  ];
  const actor = { id: "verified-host-user", grants: accountGrants(rows, true) };
  assert(has(actor, "english.learn", "A1-01"));
  assert.equal(has(actor, "english.learn", "A2-01"), false);
  assert.equal(has(actor, "english.preview"), false);
});
