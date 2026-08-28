// Run from job-search/:  node --test tests/
const test = require("node:test");
const assert = require("node:assert/strict");
const L = require("../lib.js");

// ---- routing ----
test("parseRoute: empty and #/ are home", () => {
  assert.deepEqual(L.parseRoute(""), { name: "home", rewrite: false });
  assert.deepEqual(L.parseRoute("#"), { name: "home", rewrite: false });
  assert.deepEqual(L.parseRoute("#/"), { name: "home", rewrite: false });
});
test("parseRoute: known routes", () => {
  for (const r of ["history", "resume", "resumes", "settings"]) {
    assert.deepEqual(L.parseRoute("#/" + r), { name: r, rewrite: false });
  }
  assert.deepEqual(L.parseRoute("#/history/"), { name: "history", rewrite: false });
  assert.deepEqual(L.parseRoute("#/history?x=1"), { name: "history", rewrite: false });
});
test("parseRoute: unknown #/ path → home with rewrite", () => {
  assert.deepEqual(L.parseRoute("#/nope"), { name: "home", rewrite: true });
});
test("parseRoute: Supabase auth hashes are not routes", () => {
  assert.equal(L.parseRoute("#access_token=abc&refresh_token=def&type=recovery"), null);
  assert.equal(L.parseRoute("#error=access_denied&error_description=Email+link+is+invalid+or+has+expired"), null);
  assert.equal(L.parseRoute("#foo"), null);
});
test("routeHash", () => {
  assert.equal(L.routeHash("home"), "#/");
  assert.equal(L.routeHash("history"), "#/history");
});
test("parseHashError", () => {
  assert.equal(L.parseHashError("#error=access_denied&error_description=Email+link+is+invalid+or+has+expired"), "Email link is invalid or has expired");
  assert.equal(L.parseHashError("#/history"), null);
  assert.equal(L.parseHashError(""), null);
});

// ---- status ----
test("statusFor: priority order", () => {
  const base = { loading: false, savedSearchCount: 2, isActive: true, telegramLinked: true, emailEnabled: true, lastRunAt: null };
  assert.equal(L.statusFor({ ...base, loading: true }).key, "loading");
  assert.equal(L.statusFor({ ...base, savedSearchCount: 0, isActive: false }).key, "no-search");
  assert.equal(L.statusFor({ ...base, isActive: false, telegramLinked: false, emailEnabled: false }).key, "paused");
  assert.equal(L.statusFor({ ...base, telegramLinked: false, emailEnabled: false }).key, "no-channel");
  const on = L.statusFor(base);
  assert.equal(on.key, "on");
  assert.equal(on.title, "Your alerts are on");
  assert.equal(on.line, "2 searches · checked every hour · sent to Telegram and email");
});
test("statusFor: singular search, single channel, last check", () => {
  const s = L.statusFor({ loading: false, savedSearchCount: 1, isActive: true, telegramLinked: false, emailEnabled: true, lastRunAt: new Date(2026, 7, 28, 9, 14) });
  assert.equal(s.line, "1 search · checked every hour · sent to email · last check 09:14");
});
test("channelsText", () => {
  assert.equal(L.channelsText(true, true), "Telegram and email");
  assert.equal(L.channelsText(true, false), "Telegram");
  assert.equal(L.channelsText(false, true), "email");
  assert.equal(L.channelsText(false, false), "");
});
test("shortStatus", () => {
  assert.equal(L.shortStatus("on"), "Alerts on · hourly");
  assert.equal(L.shortStatus("paused"), "Alerts paused");
  assert.equal(L.shortStatus("no-search"), "Not running yet");
  assert.equal(L.shortStatus("no-channel"), "Not running yet");
  assert.equal(L.shortStatus("loading"), "");
});

// ---- formatting ----
test("formatSalary", () => {
  assert.equal(L.formatSalary(32000, 38000, "AED"), "AED 32–38k");
  assert.equal(L.formatSalary(25000, null, "AED"), "AED 25k");
  assert.equal(L.formatSalary(null, 25000, null), "AED 25k");
  assert.equal(L.formatSalary(null, null, "AED"), "");
  assert.equal(L.formatSalary("32000", "32000", "USD"), "USD 32k");
});
test("initials", () => {
  assert.equal(L.initials("Pramesh Anuragi", "x@y.z"), "PA");
  assert.equal(L.initials("Cher", "x@y.z"), "CH");
  assert.equal(L.initials("", "pramesh@themaverix.ai"), "P");
  assert.equal(L.initials("", ""), "?");
});
test("maskPhone", () => {
  assert.equal(L.maskPhone("+971501234567"), "+971 50 ··· 67");
  assert.equal(L.maskPhone("12345"), "");
  assert.equal(L.maskPhone(""), "");
});
test("parseIsoZ / dayLabel", () => {
  const d = L.parseIsoZ("2026-08-28T05:14:00Z");
  assert.ok(d instanceof Date);
  assert.equal(L.parseIsoZ("nope"), null);
  assert.equal(L.parseIsoZ(null), null);
  const now = new Date(2026, 7, 28, 12, 0);
  assert.equal(L.dayLabel(new Date(2026, 7, 28, 1, 0), now), "Today");
  assert.equal(L.dayLabel(new Date(2026, 7, 27, 23, 0), now), "Yesterday");
  const older = L.dayLabel(new Date(2026, 7, 26, 9, 0), now);
  assert.ok(older.includes("26"), older);
});
test("cleanList / parseList / uniq", () => {
  assert.deepEqual(L.cleanList([" intern ", "", "junior"]), ["intern", "junior"]);
  assert.deepEqual(L.parseList("intern, junior,, graduate "), ["intern", "junior", "graduate"]);
  assert.deepEqual(L.uniq(["a", "b", "a", "", null]), ["a", "b"]);
});

// ---- validation ----
const goodSearch = { name: "DS", query: "\"data scientist\"", location: "Dubai", sites: ["linkedin"], google_search_term: "" };
const goodState = { searches: [goodSearch], full_name: "Pramesh Anuragi", phone: "+971501234567", salaryInput: "" };
test("validate: passes a good state", () => {
  const v = L.validate(goodState);
  assert.equal(v.ok, true);
  assert.deepEqual(v.errors.searches, [""]);
  assert.equal(v.errors.summary, "");
});
test("validate: no searches", () => {
  const v = L.validate({ ...goodState, searches: [] });
  assert.equal(v.ok, false);
  assert.equal(v.errors.summary, "Add at least one search.");
});
test("validate: missing fields, no sites, google without phrase", () => {
  const v = L.validate({ ...goodState, searches: [
    { ...goodSearch, location: "" },
    { ...goodSearch, sites: [] },
    { ...goodSearch, sites: ["google"], google_search_term: "  " },
  ] });
  assert.equal(v.ok, false);
  assert.match(v.errors.searches[0], /name, search terms and a location/);
  assert.match(v.errors.searches[1], /at least one site/);
  assert.match(v.errors.searches[2], /Google Jobs needs/);
  assert.equal(v.errors.summary, "Fix the highlighted fields.");
});
test("validate: salary must be a whole non-negative number", () => {
  assert.equal(L.validate({ ...goodState, salaryInput: "25000" }).ok, true);
  assert.equal(L.validate({ ...goodState, salaryInput: 0 }).ok, true);
  assert.equal(L.validate({ ...goodState, salaryInput: "-5" }).ok, false);
  assert.equal(L.validate({ ...goodState, salaryInput: "12.5" }).ok, false);
});
test("validate: account fields → points to Profile & settings when that is the only problem", () => {
  const v = L.validate({ ...goodState, full_name: "", phone: "123" });
  assert.equal(v.ok, false);
  assert.equal(v.errors.full_name, "Enter your full name.");
  assert.equal(v.errors.phone, "Enter a valid mobile number.");
  assert.match(v.errors.summary, /Profile & settings/);
});

// ---- payload ----
const payloadState = {
  profileId: "p-1", userEmail: "me@x.io",
  profile: { name: "My job search", full_name: " Pramesh Anuragi ", phone: "+971501234567", country_indeed: "united arab emirates",
             email_enabled: true, notify_when_empty: false, is_active: true },
  salaryInput: "25000", excludeList: ["intern", " junior "],
  searches: [
    { id: "s-1", name: "DS", query: "q", location: "Dubai", is_remote: false, sites: ["linkedin", "google"], linkedin_query: "", indeed_query: "x",
      google_search_term: "data scientist jobs", require_kw: ["data"], is_active: false },
    { id: null, name: "ML", query: "q2", location: "UAE", is_remote: true, sites: ["indeed"], linkedin_query: "", indeed_query: "",
      google_search_term: "ignored", require_kw: [], is_active: true },
  ],
};
test("buildPayload: profile never contains name; email_to follows email_enabled", () => {
  const { profile } = L.buildPayload(payloadState, { searchPause: false });
  assert.equal("name" in profile, false);
  assert.equal(profile.full_name, "Pramesh Anuragi");
  assert.deepEqual(profile.email_to, ["me@x.io"]);
  assert.deepEqual(profile.exclude_title_keywords, ["intern", "junior"]);
  assert.equal(profile.min_salary_monthly_aed, 25000);
  const off = L.buildPayload({ ...payloadState, profile: { ...payloadState.profile, email_enabled: false }, salaryInput: "" }, {});
  assert.deepEqual(off.profile.email_to, []);
  assert.equal(off.profile.min_salary_monthly_aed, null);
});
test("buildPayload: searches carry position, id only when present, google term only when google selected", () => {
  const { searches } = L.buildPayload(payloadState, { searchPause: false });
  assert.equal(searches[0].id, "s-1");
  assert.equal("id" in searches[1], false);
  assert.equal(searches[0].position, 0);
  assert.equal(searches[1].position, 1);
  assert.equal(searches[0].google_search_term, "data scientist jobs");
  assert.equal(searches[1].google_search_term, null);
  assert.equal(searches[0].indeed_query, "x");
  assert.equal(searches[0].linkedin_query, null);
  assert.deepEqual(searches[0].require_title_keywords, ["data"]);
});
test("buildPayload: is_active on searches only when FEATURES.searchPause", () => {
  const off = L.buildPayload(payloadState, { searchPause: false });
  assert.equal("is_active" in off.searches[0], false);
  const on = L.buildPayload(payloadState, { searchPause: true });
  assert.equal(on.searches[0].is_active, false);
  assert.equal(on.searches[1].is_active, true);
});
test("buildPayload: stable JSON for dirty-checking", () => {
  const a = JSON.stringify(L.buildPayload(payloadState, {}));
  const b = JSON.stringify(L.buildPayload(JSON.parse(JSON.stringify(payloadState)), {}));
  assert.equal(a, b);
});

// ---- history ----
test("isRpcMissing", () => {
  assert.equal(L.isRpcMissing({ code: "PGRST202", message: "x" }), true);
  assert.equal(L.isRpcMissing({ code: "42501", message: "Could not find the function public.my_alert_history" }), true);
  assert.equal(L.isRpcMissing({ code: "42501", message: "permission denied" }), false);
  assert.equal(L.isRpcMissing(null), false);
});
test("lastRunInfo", () => {
  assert.equal(L.lastRunInfo(null), null);
  const ok = L.lastRunInfo({ status: "success", started_at: "2026-08-28T05:00:00Z", finished_at: "2026-08-28T05:03:00Z" });
  assert.equal(ok.status, "success"); assert.equal(ok.note, ""); assert.ok(ok.at instanceof Date);
  assert.equal(L.lastRunInfo({ status: "partial", started_at: "2026-08-28T05:00:00Z" }).note, "some sites didn't respond");
  assert.equal(L.lastRunInfo({ status: "failed", started_at: "2026-08-28T05:00:00Z" }).note, "last check failed — we'll retry");
});
const jobs = [
  { id: "a", title: "A", search: "DS", matched_at: "2026-08-28T05:00:10Z", notified_at: "2026-08-28T05:01:00Z" },
  { id: "b", title: "B", search: "ML", matched_at: "2026-08-28T05:00:20Z", notified_at: "2026-08-28T05:01:00Z" },
  { id: "c", title: "C", search: "DS", matched_at: "2026-08-27T09:00:00Z", notified_at: "2026-08-27T09:01:00Z" },
  { id: "d", title: "D", search: "DS", matched_at: "2026-08-28T06:00:00Z", notified_at: null },
];
test("groupHistory: pending first, events keyed by notified_at, newest first, day buckets", () => {
  const now = new Date("2026-08-28T12:00:00Z");
  const g = L.groupHistory(jobs, { now });
  assert.equal(g.total, 4);
  assert.deepEqual(g.searches, ["DS", "ML"]);
  assert.equal(g.pending.jobs.length, 1);
  assert.equal(g.pending.jobs[0].id, "d");
  assert.equal(g.days.length, 2);
  assert.equal(g.days[0].events.length, 1);
  assert.equal(g.days[0].events[0].jobs.length, 2);
  assert.deepEqual(g.days[0].events[0].searches, ["ML", "DS"]);  // sorted newest matched first
  assert.equal(g.days[0].events[0].jobs[0].id, "b");
  assert.equal(g.days[1].events[0].jobs[0].id, "c");
  assert.ok(g.days[0].events[0].at > g.days[1].events[0].at);
});
test("groupHistory: search filter and empty input", () => {
  const g = L.groupHistory(jobs, { filterSearch: "ML" });
  assert.equal(g.total, 1);
  assert.equal(g.pending, null);
  assert.deepEqual(g.searches, ["DS", "ML"]);  // filter options always list every search
  const e = L.groupHistory([], {});
  assert.deepEqual(e, { pending: null, days: [], total: 0, searches: [] });
  assert.deepEqual(L.groupHistory(null, {}).days, []);
});
