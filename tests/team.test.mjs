import test from "node:test";
import assert from "node:assert/strict";
import {
  copyBusinessHoursToStaff,
  createDefaultDraft,
  createStaffDraft,
  getTeamReadinessIssues,
  normalizeDraftV2,
  removeStaffAndOwnedAssets,
  setAllBookableServicesForStaff,
} from "../assets/domain.js";
import { buildWebsiteHtml } from "../assets/website.js";

test("staff without explicit hours normalizes to closed days", () => {
  const draft = createDefaultDraft("2026-07-17T12:00:00.000Z");
  const normalized = normalizeDraftV2({
    ...draft,
    staff: [{
      clientId: "staff-1",
      name: "Anna",
      email: "",
      role: "Coiffeurin",
      bio: "",
      specialties: [],
      active: true,
      serviceClientIds: [draft.services[0].clientId],
      portraitAssetLocalId: null,
    }],
  });
  assert.equal(normalized.staff[0].workingHours.every((day) => day.closed), true);
});

test("team readiness requires explicit services, hours and coverage", () => {
  const draft = createDefaultDraft("2026-07-17T12:00:00.000Z");
  draft.staff.push(createStaffDraft());
  let issues = getTeamReadinessIssues(draft);
  assert.ok(issues.some((issue) => issue.code === "STAFF_WITHOUT_SERVICE"));
  assert.ok(issues.some((issue) => issue.code === "STAFF_WITHOUT_HOURS"));
  assert.ok(issues.some((issue) => issue.code === "SERVICE_WITHOUT_STAFF"));

  setAllBookableServicesForStaff(draft, draft.staff[0].clientId, true);
  copyBusinessHoursToStaff(draft, draft.staff[0].clientId);
  issues = getTeamReadinessIssues(draft);
  assert.equal(issues.length, 0);
});

test("removing staff cascades owned asset metadata", () => {
  const draft = createDefaultDraft("2026-07-17T12:00:00.000Z");
  const person = createStaffDraft();
  person.portraitAssetLocalId = "portrait-1";
  draft.staff.push(person);
  draft.assets.push({
    localId: "portrait-1",
    kind: "PORTRAIT",
    ownerClientId: person.clientId,
    fileName: "portrait.jpg",
    mimeType: "image/jpeg",
    bytes: 123,
    width: 512,
    height: 512,
    alt: "Anna",
    focalPoint: null,
    uploadedAssetId: null,
  });
  removeStaffAndOwnedAssets(draft, person.clientId);
  assert.equal(draft.staff.length, 0);
  assert.equal(draft.assets.length, 0);
});

test("website projects Musikraum section order, visibility and offer schema", () => {
  const draft = createDefaultDraft("2026-07-17T12:00:00.000Z");
  draft.layout.order = ["contact", "offers", "intro", "why", "story"];
  draft.layout.visibility.story = false;
  const html = buildWebsiteHtml(draft);
  assert.match(html, /id="kontakt"/);
  assert.match(html, /id="angebote"/);
  assert.doesNotMatch(html, /id="geschichte"/);
  assert.ok(html.indexOf('id="kontakt"') < html.indexOf('id="angebote"'));
  assert.match(html, /"makesOffer"/);
  assert.match(html, /Viele Instrumente/);
});
