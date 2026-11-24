const test = require("node:test");
const assert = require("node:assert/strict");
const presentation = require("../src/services/leadActivityPresentation");
const profiles = require("../src/services/profileService");

test("activity labels use stored event types and metadata, never remark wording", () => {
  assert.equal(presentation.actionLabel("manager_remark", null), "Added a remark");
  assert.equal(presentation.actionLabel("execution_submitted", null), "Submitted work for review");
  assert.equal(presentation.actionLabel("manager_status_changed", { from: "Final", to: "On Hold" }), "Changed status from Final to On Hold");
  assert.equal(presentation.actionLabel("business_details_updated", null), "Updated CP / SM");
  assert.equal(presentation.actionLabel("legacy_unknown", { message: "done" }), "Activity update");
  assert.equal(presentation.eventRoleLabel("legacy_unknown"), null);
  assert.equal(presentation.eventRoleLabel("system_reconciliation"), "System");
});

test("activity recipients come only from stored metadata and missing actors stay unknown", () => {
  assert.equal(presentation.actionLabel("execution_started", { assignees: [{ fullName: "A. Employee" }, {}] }), "Assigned work to A. Employee");
  const event = presentation.presentActivity({ id: 1, event_type: "legacy_unknown", actor_user_id: 4, actor_name: null, created_at: "2026-11-24 08:00:00", message: "done", metadata: null });
  assert.equal(event.actorName, null);
  assert.equal(event.actorRoleLabel, null);
  assert.equal(event.actionLabel, "Activity update");
  assert.equal(event.text, "done");
});

test("profile avatar updates accept only one allowlisted preset field", () => {
  assert.equal(profiles.validatePatch({ avatarPresetId: "face-12" }), "face-12");
  assert.throws(() => profiles.validatePatch({ avatarPresetId: "../../photo.svg" }), { code: "INVALID_AVATAR_PRESET", statusCode: 400 });
  assert.throws(() => profiles.validatePatch({ avatarPresetId: "face-01", userId: 99 }), { code: "INVALID_PROFILE_UPDATE", statusCode: 400 });
  assert.throws(() => profiles.validatePatch({}), { code: "INVALID_PROFILE_UPDATE", statusCode: 400 });
});
