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
  for (const r of ["outreach", "funnel", "prep", "guide", "community", "plans"]) assert.deepEqual(L.parseRoute("#/" + r), { name: r, rewrite: false });
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
test("parseRoute: job route carries the id", () => {
  assert.deepEqual(L.parseRoute("#/job/li-123"), { name: "job", id: "li-123", rewrite: false });
  assert.deepEqual(L.parseRoute("#/job/4256186272"), { name: "job", id: "4256186272", rewrite: false });
  assert.deepEqual(L.parseRoute("#/job/li-1/"), { name: "job", id: "li-1", rewrite: false });
  assert.deepEqual(L.parseRoute("#/job/li-1?x=1"), { name: "job", id: "li-1", rewrite: false });
});
test("parseRoute: job route without an id → home with rewrite", () => {
  assert.deepEqual(L.parseRoute("#/job"), { name: "home", rewrite: true });
  assert.deepEqual(L.parseRoute("#/job/"), { name: "home", rewrite: true });
});
test("routeHash: job route builds #/job/<id>", () => {
  assert.equal(L.routeHash("job", "li-123"), "#/job/li-123");
  assert.equal(L.routeHash("job", "4256186272"), "#/job/4256186272");
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
  assert.equal(L.lastRunInfo({ status: "failed", started_at: "2026-08-28T05:00:00Z" }).note, "last check failed, we'll retry");
});
test("lastRunInfo: exposes the run's new-job count (null when the run didn't report one)", () => {
  assert.equal(L.lastRunInfo({ status: "success", finished_at: "2026-08-28T05:03:00Z", new_jobs: 4 }).newJobs, 4);
  assert.equal(L.lastRunInfo({ status: "success", finished_at: "2026-08-28T05:03:00Z", new_jobs: 0 }).newJobs, 0);
  assert.equal(L.lastRunInfo({ status: "success", finished_at: "2026-08-28T05:03:00Z" }).newJobs, null);
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

// ---- auth error mapping (bug 28 Aug: "same password" was reported as "at least 8 characters") ----
test("friendlyAuthError: same password is not a length error", () => {
  const msg = L.friendlyAuthError({ code: "same_password", message: "New password should be different from the old password." });
  assert.match(msg, /current password/i);
  assert.doesNotMatch(msg, /8 characters/);
  // message-only fallback (older supabase-js without .code)
  assert.match(L.friendlyAuthError({ message: "New password should be different from the old password." }), /current password/i);
});
test("friendlyAuthError: weak password maps to the length rule only when it is about length", () => {
  assert.equal(L.friendlyAuthError({ code: "weak_password", message: "Password should be at least 6 characters." }), "Password must be at least 8 characters.");
  const strength = L.friendlyAuthError({ code: "weak_password", message: "Password should contain at least one character of each: abcdefghijklmnopqrstuvwxyz, ABCDEFGHIJKLMNOPQRSTUVWXYZ, 0123456789." });
  assert.match(strength, /letters and numbers|mix/i);
  assert.doesNotMatch(strength, /8 characters/);
});
test("friendlyAuthError: existing mappings still hold", () => {
  assert.match(L.friendlyAuthError({ message: "Invalid login credentials" }), /doesn't match/);
  assert.match(L.friendlyAuthError({ message: "Email not confirmed" }), /confirm your email/);
  assert.match(L.friendlyAuthError({ message: "User already registered" }), /already have an account/);
  assert.match(L.friendlyAuthError({ message: "Request rate limit reached" }), /wait a minute/);
  assert.match(L.friendlyAuthError({ message: "Reauthentication needed" }), /sign in again/i);
  assert.equal(L.friendlyAuthError({ message: "Something odd" }), "Something odd");
  assert.equal(L.friendlyAuthError(null), "Something went wrong. Please try again.");
});

// ---- delete account (Edge Function call) → plain-English error ----
test("deleteAccountError: network failure asks to check the connection", () => {
  const msg = L.deleteAccountError({ name: "FunctionsFetchError", message: "Failed to send a request to the Edge Function" }, null);
  assert.match(msg, /connection/i);
  assert.doesNotMatch(msg, /Failed to send/);
});
test("deleteAccountError: 401 means the session is stale", () => {
  const msg = L.deleteAccountError({ name: "FunctionsHttpError", message: "Edge Function returned a non-2xx status code", context: { status: 401 } }, { error: "not signed in" });
  assert.match(msg, /sign in again/i);
});
test("deleteAccountError: other failures carry the server's reason and the support address", () => {
  const msg = L.deleteAccountError({ name: "FunctionsHttpError", message: "Edge Function returned a non-2xx status code", context: { status: 500 } }, { error: "could not delete the account" });
  assert.match(msg, /could not delete the account/);
  assert.match(msg, /support@easyy-ai\.com/);
  // no parsed body → fall back to the error message
  const msg2 = L.deleteAccountError({ name: "FunctionsRelayError", message: "relay down" }, null);
  assert.match(msg2, /relay down/);
  assert.match(msg2, /support@easyy-ai\.com/);
});
test("deleteAccountError: nothing → generic", () => {
  assert.match(L.deleteAccountError(null, null), /support@easyy-ai\.com/);
});

// ---- Phase 2b groupHistory v2 & channelParts ----
const rpcJobs = [
  { id: "li-1", title: "DS 1", search: "DS", matched_at: "2026-08-28T17:59:53+00:00", notified_at: "2026-08-28T17:59:54+00:00", alert_id: 7 },
  { id: "li-2", title: "DS 2", search: "DS", matched_at: "2026-08-28T17:59:53+00:00", notified_at: "2026-08-28T17:59:54+00:00", alert_id: 7 },
  { id: "li-3", title: "ML 1", search: "ML", matched_at: "2026-08-28T19:00:20+00:00", notified_at: null, alert_id: null },
];
const rpcAlerts = [
  { id: 8, kind: "daily", sent_at: "2026-08-29T04:37:00+00:00", job_count: 2, channels: [{ channel: "email", status: "sent", error: null }], job_ids: ["li-1", "li-2"] },
  { id: 7, kind: "hourly", sent_at: "2026-08-28T17:59:54+00:00", job_count: 2,
    channels: [{ channel: "email", status: "failed", error: "brevo 401" }, { channel: "telegram", status: "sent", error: null }], job_ids: ["li-1", "li-2"] },
  { id: 3, kind: "hourly", sent_at: "2026-08-20T10:00:05+00:00", job_count: 1, channels: [], job_ids: ["gone"] },   // backfilled, job pruned
];

test("groupHistory v2: events come from alerts, newest first, with channels and kind", () => {
  const g = L.groupHistory(rpcJobs, { alerts: rpcAlerts, now: new Date("2026-08-29T10:00:00Z") });
  const events = g.days.flatMap((d) => d.events);
  assert.deepEqual(events.map((e) => e.key), ["a8", "a7", "a3"]);
  assert.equal(events[0].kind, "daily");
  assert.deepEqual(events[0].jobs.map((j) => j.id), ["li-1", "li-2"]);          // daily re-lists via job_ids
  assert.equal(events[1].kind, "hourly");
  assert.deepEqual(events[1].channels.map((c) => c.channel + ":" + c.status), ["email:failed", "telegram:sent"]);
  assert.deepEqual(events[1].searches, ["DS"]);
  assert.equal(events[2].channels, null);                                          // backfilled → unknown
  assert.equal(events[2].jobs.length, 0);
  assert.equal(events[2].jobCount, 1);                                             // header still says 1 job
  assert.equal(g.pending.jobs[0].id, "li-3");
});

test("groupHistory v2: search filter drops events with no matching jobs", () => {
  const g = L.groupHistory(rpcJobs, { alerts: rpcAlerts, filterSearch: "ML" });
  assert.equal(g.days.length, 0);
  assert.equal(g.pending.jobs.length, 1);
  assert.deepEqual(g.searches, ["DS", "ML"]);
});

test("groupHistory v2: without alerts falls back to notified_at grouping", () => {
  const g = L.groupHistory(rpcJobs, {});
  const ev = g.days[0].events[0];
  assert.equal(ev.key, "2026-08-28T17:59:54+00:00");
  assert.equal(ev.kind, "hourly");
  assert.equal(ev.channels, null);
  assert.equal(ev.jobCount, 2);
});

test("channelParts: labels and order as given; null stays null", () => {
  assert.deepEqual(L.channelParts([{ channel: "telegram", status: "sent" }, { channel: "email", status: "failed" }]),
    [{ label: "Telegram", status: "sent" }, { label: "email", status: "failed" }]);
  assert.equal(L.channelParts(null), null);
  assert.equal(L.channelParts([]), null);
});

test("statusFor: all searches paused reads as paused; some paused is counted", () => {
  const base = { loading: false, savedSearchCount: 2, isActive: true, telegramLinked: true, emailEnabled: true, lastRunAt: null };
  const allPaused = L.statusFor(Object.assign({}, base, { activeSearchCount: 0 }));
  assert.equal(allPaused.key, "paused");
  assert.match(allPaused.line, /All your searches are paused/);
  const some = L.statusFor(Object.assign({}, base, { activeSearchCount: 1 }));
  assert.equal(some.key, "on");
  assert.match(some.line, /2 searches · checked every hour · sent to Telegram and email · 1 paused$/);
  const none = L.statusFor(base);                                   // activeSearchCount omitted → all active
  assert.doesNotMatch(none.line, /paused/);
});

test("groupHistory v2: alert event survives filter with jobs narrowed to the search", () => {
  const jobs = [
    { id: "j1", title: "DS", search: "DS", matched_at: "2026-08-28T10:00:00+00:00", notified_at: "2026-08-28T12:00:00+00:00", alert_id: 5 },
    { id: "j2", title: "ML", search: "ML", matched_at: "2026-08-28T10:00:00+00:00", notified_at: "2026-08-28T12:00:00+00:00", alert_id: 5 },
  ];
  const alerts = [{ id: 5, kind: "daily", sent_at: "2026-08-28T12:00:00+00:00", job_count: 2, channels: [{channel:"email",status:"sent",error:null}], job_ids: ["j1", "j2"] }];
  const all = L.groupHistory(jobs, { alerts });
  assert.equal(all.days[0].events[0].jobs.length, 2);
  const filtered = L.groupHistory(jobs, { alerts, filterSearch: "DS" });
  const ev = filtered.days[0].events[0];
  assert.equal(ev.key, "a5");
  assert.deepEqual(ev.jobs.map((j) => j.id), ["j1"]);   // narrowed to the DS job, event kept
  assert.deepEqual(ev.searches, ["DS"]);
});

// ---- master resume (Plan 3) ----
test("routes: master", () => {
  assert.deepEqual(L.parseRoute("#/master"), { name: "master", rewrite: false });
  assert.equal(L.routeHash("master"), "#/master");
  assert.ok(L.ROUTES.includes("master"));
});

test("kindForFile by extension", () => {
  assert.equal(L.kindForFile("My Resume.DOCX"), "docx");
  assert.equal(L.kindForFile("cv.pdf"), "pdf");
  assert.equal(L.kindForFile("old.doc"), null);
  assert.equal(L.kindForFile("notes.txt"), null);
  assert.equal(L.kindForFile(""), null);
});

test("fileCapCheck", () => {
  const files = [{ sha256: "a".repeat(64) }, { sha256: "b".repeat(64) }];
  assert.equal(L.fileCapCheck({ files, cap: 2, size: 100, sha256: "c".repeat(64) }), "cap_files");
  assert.equal(L.fileCapCheck({ files, cap: 20, size: 5242881, sha256: "c".repeat(64) }), "cap_size");
  assert.equal(L.fileCapCheck({ files, cap: 20, size: 0, sha256: "c".repeat(64) }), "cap_size");
  assert.equal(L.fileCapCheck({ files, cap: 20, size: 100, sha256: "a".repeat(64) }), "duplicate");
  assert.equal(L.fileCapCheck({ files, cap: 20, size: 100, sha256: "c".repeat(64) }), null);
});

test("masterError maps codes and never leaks raw text", () => {
  assert.equal(L.masterError({ message: "cap_files" }), "You've reached your file limit. Remove one to add another.");
  assert.equal(L.masterError("cap_size"), "Files must be under 5 MB.");
  assert.equal(L.masterError({ message: "cap_builds" }), "That's 5 builds today. Try again tomorrow.");
  assert.equal(L.masterError({ message: "duplicate" }), "You've already added this file.");
  assert.equal(L.masterError({ message: "build_active" }), "A build is already running.");
  assert.equal(L.masterError({ message: "bad_kind" }), "We can read DOCX, PDF or pasted text.");
  assert.equal(L.masterError({ message: "no_files" }), "Add at least one resume first.");
  assert.equal(L.masterError({ message: "not_cancellable" }), "This build has already started and can't be cancelled.");
  assert.equal(L.masterError({ message: "relation does not exist blah" }), "Something went wrong. Please try again.");
  assert.equal(L.masterError(null, "Upload didn't finish. Try again."), "Upload didn't finish. Try again.");
  assert.equal(L.masterError({ name: "StorageApiError", message: "x" }, "Upload didn't finish. Try again."), "Upload didn't finish. Try again.");
});

test("buildFailureCopy by error_kind", () => {
  assert.equal(L.buildFailureCopy({ status: "failed", error_kind: "worker_lost" }), "Our builder went offline mid-way. It will retry automatically.");
  assert.equal(L.buildFailureCopy({ status: "failed", error_kind: "infra" }), "Something went wrong on our side. We've been notified.");
  assert.equal(L.buildFailureCopy({ status: "failed", error_kind: null }), "Something went wrong on our side. We've been notified.");
});

test("buildStageLabel states and steps", () => {
  assert.equal(L.buildStageLabel(null).state, "none");
  const q = L.buildStageLabel({ status: "queued", progress: {}, created_at: "2026-08-30T10:00:00Z" }, Date.parse("2026-08-30T10:01:00Z"));
  assert.equal(q.state, "queued"); assert.equal(q.waiting, false);
  assert.deepEqual(q.steps.map((s) => s.state), ["todo", "todo", "todo"]);
  const w = L.buildStageLabel({ status: "queued", progress: {}, created_at: "2026-08-30T10:00:00Z" }, Date.parse("2026-08-30T10:03:00Z"));
  assert.equal(w.waiting, true);
  const e = L.buildStageLabel({ status: "extracting", progress: { files_done: 4, files_total: 12 } });
  assert.equal(e.state, "running");
  assert.deepEqual(e.steps[0], { key: "extract", label: "Reading your resumes", detail: "4 of 12 files", state: "now" });
  assert.equal(e.steps[1].state, "todo");
  const m = L.buildStageLabel({ status: "merging", progress: { files_done: 12, files_total: 12, positions_done: 2, positions_total: 6 } });
  assert.deepEqual(m.steps.map((s) => s.state), ["done", "now", "todo"]);
  assert.equal(m.steps[1].detail, "2 of 6 sections");
  const d = L.buildStageLabel({ status: "detecting", progress: {} });
  assert.deepEqual(d.steps.map((s) => s.state), ["done", "done", "now"]);
  assert.equal(L.buildStageLabel({ status: "ready" }).state, "ready");
  assert.equal(L.buildStageLabel({ status: "failed" }).state, "failed");
  assert.equal(L.buildStageLabel({ status: "cancelled" }).state, "cancelled");
});

test("conflictProgress", () => {
  assert.deepEqual(L.conflictProgress([]), { open: 0, resolved: 0, total: 0, text: "No open conflicts" });
  const c = [{ status: "open" }, { status: "resolved" }, { status: "resolved" }];
  assert.deepEqual(L.conflictProgress(c), { open: 1, resolved: 2, total: 3, text: "2 of 3 resolved" });
});

test("groupItemsBySection nests bullets, variants, sources", () => {
  const items = [
    { id: "p1", kind: "position", parent_id: null, position_key: "maverix", text: "Maverix Lead AI Engineer", status: "extracted", sort_order: 0, data: { title: "Lead AI Engineer" }, master_item_sources: [] },
    { id: "b2", kind: "bullet", parent_id: "p1", position_key: "maverix", text: "Cut cost $16K", status: "extracted", sort_order: 1, data: {},
      master_item_sources: [{ source_kind: "file", file_id: "f2", lines: [8], text: "Cut cost $16K", is_canonical: true }] },
    { id: "b1", kind: "bullet", parent_id: "p1", position_key: "maverix", text: "Built 34 tables", status: "confirmed", sort_order: 0, data: {},
      master_item_sources: [{ source_kind: "file", file_id: "f1", lines: [5], text: "Built 34 tables", is_canonical: true },
                            { source_kind: "file", file_id: "f2", lines: [6, 7], text: "Built thirty-four tables", is_canonical: false },
                            { source_kind: "file", file_id: "f3", lines: [9], text: "Built 34 tables", is_canonical: false }] },
    { id: "s1", kind: "skill", parent_id: null, position_key: null, text: "Python", status: "extracted", sort_order: 0, data: {},
      master_item_sources: [{ source_kind: "file", file_id: "f1", lines: [9], text: "Python", is_canonical: true }] },
    { id: "u1", kind: "skill", parent_id: null, position_key: null, text: "Rust", status: "confirmed", sort_order: 1, data: {},
      master_item_sources: [{ source_kind: "user", file_id: null, lines: null, text: "Rust", is_canonical: true }] },
  ];
  const sections = L.groupItemsBySection(items);
  assert.deepEqual(sections.map((s) => s.kind), ["position", "skill"]);
  assert.equal(sections[0].label, "Positions"); assert.equal(sections[1].label, "Skills");
  const pos = sections[0].items[0];
  assert.equal(pos.id, "p1");
  assert.deepEqual(pos.children.map((c) => c.id), ["b1", "b2"]);
  const b1 = pos.children[0];
  assert.equal(b1.canonical, "Built 34 tables");
  assert.deepEqual(b1.variants, ["Built thirty-four tables"]);
  assert.equal(b1.sources.length, 3); assert.equal(b1.singleSource, false); assert.equal(b1.userAdded, false);
  assert.equal(pos.children[1].singleSource, true);
  const rust = sections[1].items[1];
  assert.equal(rust.userAdded, true); assert.equal(rust.singleSource, false);
});

test("rulingFromForm", () => {
  assert.deepEqual(L.rulingFromForm("option", 1, ""), { choice: "option", option_index: 1 });
  assert.deepEqual(L.rulingFromForm("both", null, ""), { choice: "both" });
  assert.deepEqual(L.rulingFromForm("custom", null, "  Built 40 tables "), { choice: "custom", custom_text: "Built 40 tables" });
  assert.equal(L.rulingFromForm("custom", null, "   "), null);
  assert.equal(L.rulingFromForm("option", null, ""), null);
  assert.equal(L.rulingFromForm("", null, ""), null);
});

test("fileSizeText", () => {
  assert.equal(L.fileSizeText(512), "1 KB");
  assert.equal(L.fileSizeText(153600), "150 KB");
  assert.equal(L.fileSizeText(2 * 1024 * 1024 + 300000), "2.3 MB");
});

// ---------------------------------------------------------------- tailored
test("parseRoute handles tailored ids", () => {
  assert.deepEqual(L.parseRoute("#/tailored/abc-1"), { name: "tailored", id: "abc-1", rewrite: false });
  assert.deepEqual(L.parseRoute("#/tailored/"), { name: "home", rewrite: true });
  assert.equal(L.routeHash("tailored", "x y"), "#/tailored/x%20y");
});

test("canTailor gates on master and conflicts", () => {
  assert.deepEqual(L.canTailor(null), { ok: false, reason: "no_master", open: 0 });
  assert.deepEqual(L.canTailor({ master: null, open_conflicts: 0 }), { ok: false, reason: "no_master", open: 0 });
  assert.deepEqual(L.canTailor({ master: { current_build_id: "b" }, open_conflicts: 2 }),
    { ok: false, reason: "conflicts", open: 2 });
  assert.deepEqual(L.canTailor({ master: { current_build_id: "b" }, open_conflicts: 0 }),
    { ok: true, reason: null, open: 0 });
});

test("tailorStageLabel maps statuses", () => {
  assert.equal(L.tailorStageLabel(null).state, "none");
  const run = (status) => ({ status, created_at: new Date().toISOString() });
  assert.equal(L.tailorStageLabel(run("queued")).state, "queued");
  const r = L.tailorStageLabel(run("planning"));
  assert.equal(r.state, "running");
  assert.deepEqual(r.steps.map((s) => s.state), ["done", "now", "todo"]);
  assert.equal(L.tailorStageLabel(run("ready")).state, "ready");
  const old = { status: "queued", created_at: new Date(Date.now() - 300000).toISOString() };
  assert.equal(L.tailorStageLabel(old, Date.now()).waiting, true);
});

test("tailorFailureCopy per error_kind", () => {
  assert.match(L.tailorFailureCopy({ error_kind: "fit" }), /couldn't fit/i);
  assert.match(L.tailorFailureCopy({ error_kind: "worker_lost" }), /offline/i);
  assert.match(L.tailorFailureCopy({ error_kind: "infra" }), /our side/i);
});

test("fitLine formats", () => {
  assert.equal(L.fitLine({}), "");
  assert.equal(L.fitLine({ pages: 2, spacing: "compact", font_pt: 10, dropped_item_ids: [] }),
    "2 pages · compact · 10pt");
  assert.equal(L.fitLine({ pages: 2, spacing: "normal", font_pt: 10.5, dropped_item_ids: ["a", "b"] }),
    "2 pages · normal · 10.5pt · 2 bullets trimmed to fit");
});

test("gapLists merges plan gaps with answers", () => {
  const run = { plan: { gaps: [
    { keyword: "Snowflake", askable: true, question: "Used Snowflake?" },
    { keyword: "dbt", askable: true, question: "Used dbt?" },
    { keyword: "10 years insurance", askable: false, question: "" },
  ] } };
  const answers = [
    { keyword_norm: "snowflake", keyword: "Snowflake", answer: "yes", status: "draft_ready", draft_text: "d" },
  ];
  const g = L.gapLists(run, answers);
  assert.equal(g.structural.length, 1);
  assert.deepEqual(g.open.map((x) => x.keyword), ["dbt"]);
  assert.equal(g.done.length, 1);
  assert.equal(g.done[0].state, "draft_ready");
});

test("gapLists maps answer states", () => {
  const run = { plan: { gaps: [{ keyword: "K", askable: true, question: "?" }] } };
  const mk = (status, answer) => L.gapLists(run, [{ keyword_norm: "k", answer, status }]).done[0].state;
  assert.equal(mk("recorded", "no"), "declined");
  assert.equal(mk("recorded", "yes"), "skill_added");
  assert.equal(mk("draft_pending", "yes"), "draft_pending");
  assert.equal(mk("approved", "yes"), "approved");
  assert.equal(mk("discarded", "yes"), "discarded");
});

test("usedFacts flags dropped bullets", () => {
  const run = { plan: { positions: [{ position_key: "p", bullets: [
    { id: "a", text: "kept", rank: 1 }, { id: "b", text: "cut", rank: 2 }] }] },
    fit: { dropped_item_ids: ["b"] } };
  const u = L.usedFacts(run);
  assert.deepEqual(u[0].bullets.map((b) => b.dropped), [false, true]);
});

test("tailorError maps codes", () => {
  assert.match(L.tailorError({ message: "cap_tailors" }), /today/);
  assert.match(L.tailorError({ message: "conflicts_open" }), /conflict/i);
  assert.equal(L.tailorError({ message: "wat" }, "fallback"), "fallback");
});

// ---- plan limits ----
test("planLimit: roles allowed per plan, defaulting to free", () => {
  assert.equal(L.planLimit("free"), 5);
  assert.equal(L.planLimit("premium"), 25);
  assert.equal(L.planLimit("closed"), 0);
  assert.equal(L.planLimit(undefined), 5);
  assert.equal(L.planLimit("bogus"), 5);
});

test("fileCap: premium 20, everyone else 5", () => {
  assert.equal(L.fileCap("premium"), 20);
  assert.equal(L.fileCap("free"), 5);
  assert.equal(L.fileCap("closed"), 5);
  assert.equal(L.fileCap(undefined), 5);
});

test("historyWindowDays: premium 30, everyone else 7", () => {
  assert.equal(L.historyWindowDays("premium"), 30);
  assert.equal(L.historyWindowDays("free"), 7);
  assert.equal(L.historyWindowDays("closed"), 7);
  assert.equal(L.historyWindowDays(undefined), 7);
});

test("scoreBand: 85+ high, 75+ mid, below mid low; null/NaN pass through", () => {
  assert.equal(L.scoreBand(92), "high");
  assert.equal(L.scoreBand(85), "high");
  assert.equal(L.scoreBand(84), "mid");
  assert.equal(L.scoreBand(75), "mid");
  assert.equal(L.scoreBand(74), "low");
  assert.equal(L.scoreBand(0), "low");
  assert.equal(L.scoreBand(null), null);
  assert.equal(L.scoreBand(undefined), null);
  assert.equal(L.scoreBand(NaN), null);
});

test("formatDate: absolute date for a valid ISO, empty for missing/bad", () => {
  assert.equal(L.formatDate(""), "");
  assert.equal(L.formatDate(null), "");
  assert.equal(L.formatDate("not-a-date"), "");
  const s = L.formatDate("2026-09-19T10:00:00Z");
  assert.ok(s.length > 0 && /2026/.test(s), "expected a dated string containing the year, got: " + s);
});

test("formatDateTime: date + clock time for a valid ISO, empty for missing/bad", () => {
  assert.equal(L.formatDateTime(""), "");
  assert.equal(L.formatDateTime("not-a-date"), "");
  const s = L.formatDateTime("2026-09-19T22:00:00Z");
  assert.ok(/2026/.test(s) && /\d{1,2}:\d{2}/.test(s) && s.indexOf(", ") !== -1,
    "expected 'date, HH:MM', got: " + s);
});

// ---- relative time ----
test("timeAgo: humanizes a past timestamp against a fixed now", () => {
  const now = Date.parse("2026-09-13T12:00:00Z");
  assert.equal(L.timeAgo("2026-09-13T11:00:00Z", now), "1h ago");
  assert.equal(L.timeAgo("2026-09-13T06:00:00Z", now), "6h ago");
  assert.equal(L.timeAgo("2026-09-11T12:00:00Z", now), "2d ago");
  assert.equal(L.timeAgo("2026-09-13T11:59:40Z", now), "just now");
  assert.equal(L.timeAgo(null, now), "");
  assert.equal(L.timeAgo("not-a-date", now), "");
});

test("timeBucket: buckets a timestamp by recency", () => {
  const now = Date.parse("2026-09-13T12:00:00Z");
  assert.equal(L.timeBucket("2026-09-13T06:00:00Z", now), "Today");
  assert.equal(L.timeBucket("2026-09-12T10:00:00Z", now), "Yesterday");
  assert.equal(L.timeBucket("2026-09-09T12:00:00Z", now), "This week");
  assert.equal(L.timeBucket("2026-09-02T12:00:00Z", now), "Last week");
  assert.equal(L.timeBucket("2026-08-20T12:00:00Z", now), "This month");
  assert.equal(L.timeBucket("2026-06-01T12:00:00Z", now), "Earlier");
  assert.equal(L.timeBucket(null, now), "Earlier");
});

// ---- theme ----
test("resolveTheme: an explicit saved choice wins over the system preference", () => {
  assert.equal(L.resolveTheme("light", true), "light");
  assert.equal(L.resolveTheme("dark", false), "dark");
});
test("resolveTheme: with no valid saved choice, follows the system preference", () => {
  assert.equal(L.resolveTheme(null, true), "dark");
  assert.equal(L.resolveTheme(null, false), "light");
  assert.equal(L.resolveTheme("", true), "dark");
  assert.equal(L.resolveTheme("sepia", false), "light"); // junk ignored
});
test("nextTheme: flips between light and dark", () => {
  assert.equal(L.nextTheme("dark"), "light");
  assert.equal(L.nextTheme("light"), "dark");
});

// ---- deterministic match score (master terms vs a JD, no LLM) ----
test("matchScore: percent of the master's terms the JD mentions", () => {
  assert.equal(L.matchScore("We use Python and SQL daily.", ["Python", "SQL", "Java"]), 67);
  assert.equal(L.matchScore("Python everywhere", ["Python"]), 100);
});
test("matchScore: word-boundary only — no partial hits, tolerant of spacing", () => {
  assert.equal(L.matchScore("A JavaScript ninja role", ["Java"]), 0); // not inside 'JavaScript'
  assert.equal(L.matchScore("cohort   analysis and testing", ["cohort analysis"]), 100); // space variants
  assert.equal(L.matchScore("deep cohort-analysis work", ["cohort analysis"]), 100); // hyphen variant
});
test("matchScore: empties and case-insensitive dedupe", () => {
  assert.equal(L.matchScore("", ["Python"]), 0);
  assert.equal(L.matchScore("Python", []), 0);
  assert.equal(L.matchScore("Python", ["Python", "python"]), 100); // deduped to one term
});

test("highlightTerms: wraps matched terms, preserving original case", () => {
  assert.equal(L.highlightTerms("We use Python daily", ["python"]),
    'We use <mark class="hl">Python</mark> daily');
});
test("cleanTerms: drops stopwords (verbs/adjectives/filler), short tokens and dupes; keeps skills", () => {
  assert.deepEqual(
    L.cleanTerms(["Python", "and", "a", "build", "strong", "data", "Machine Learning", "python", "SQL"]),
    ["Python", "Machine Learning", "SQL"]
  );
  assert.deepEqual(L.cleanTerms([]), []);
});

test("cleanTerms: splits compound skill phrases into atomic terms (keeps A/B, drops fillers)", () => {
  assert.deepEqual(
    L.cleanTerms(["SQL & Vector Databases", "Machine Learning: XGBoost", "A/B testing", "Python (pandas)"]),
    ["SQL", "Vector Databases", "Machine Learning", "XGBoost", "A/B testing", "Python", "pandas"]
  );
});

test("highlightTerms: escapes HTML and never marks partial words", () => {
  assert.equal(L.highlightTerms("a < b & Java", ["Java"]),
    'a &lt; b &amp; <mark class="hl">Java</mark>');
  assert.equal(L.highlightTerms("JavaScript role", ["Java"]), "JavaScript role"); // no partial hit
  assert.equal(L.highlightTerms("plain text", []), "plain text"); // no terms → escaped passthrough
});

// ---- Overview counts (V17 hero eyebrow / headline / funnel window) ----
test("overviewCounts: today is the local calendar day; week = 7 days, fortnight = 14 days", () => {
  const now = new Date(2026, 8, 29, 15, 0).getTime();          // 29 Sep 2026, 15:00 local
  const at = (d, h) => new Date(2026, 8, d, h, 0).toISOString();
  const jobs = [
    { matched_at: at(29, 7) }, { matched_at: at(29, 1) },       // today
    { matched_at: at(28, 23) },                                  // yesterday, within 24h but not today
    { notified_at: at(24, 9) },                                  // 5 days ago (falls back to notified_at)
    { matched_at: at(18, 9) },                                   // 11 days ago
    { matched_at: at(10, 9) },                                   // 19 days ago
    { matched_at: "not a date" },
  ];
  const tailored = [{ created_at: at(29, 8) }, { created_at: at(27, 8) }];
  assert.deepEqual(L.overviewCounts(jobs, tailored, now), { today: 2, week: 4, fortnight: 5, tailoredToday: 1 });
  assert.deepEqual(L.overviewCounts(null, null, now), { today: 0, week: 0, fortnight: 0, tailoredToday: 0 });
});

test("weekOfLabel: names the Monday of the current week", () => {
  assert.equal(L.weekOfLabel(new Date(2026, 8, 29, 10).getTime()), "Week of 28 September"); // Tue
  assert.equal(L.weekOfLabel(new Date(2026, 8, 28, 10).getTime()), "Week of 28 September"); // Mon
  assert.equal(L.weekOfLabel(new Date(2026, 9, 4, 10).getTime()), "Week of 28 September");  // Sun
});

test("handTimeText: 50 min per application by hand, 2 min to read one", () => {
  assert.deepEqual(L.handTimeText(5), { byHand: "about 4 hours", reading: "about 10 minutes" });
  assert.deepEqual(L.handTimeText(1), { byHand: "about 50 minutes", reading: "about 2 minutes" });
  assert.deepEqual(L.handTimeText(2), { byHand: "about 2 hours", reading: "about 4 minutes" });
  assert.equal(L.handTimeText(0), null);
});

test("numberWord: spells out 0–10 (capitalised on request), digits above", () => {
  assert.equal(L.numberWord(5), "five");
  assert.equal(L.numberWord(5, true), "Five");
  assert.equal(L.numberWord(10, true), "Ten");
  assert.equal(L.numberWord(0), "zero");
  assert.equal(L.numberWord(11, true), "11");
  assert.equal(L.numberWord(160), "160");
});

test("factsUsedCount: bullets kept in the tailored plan, minus ones dropped to fit", () => {
  const row = { plan: { positions: [{ bullets: [{ id: "a" }, { id: "b" }] }, { bullets: [{ id: "c" }] }] }, fit: { dropped_item_ids: ["b"] } };
  assert.equal(L.factsUsedCount(row), 2);
  assert.equal(L.factsUsedCount({ plan: {} }), null);          // nothing planned yet → unknown
  assert.equal(L.factsUsedCount(null), null);
});

test("timeBucket: Today / Yesterday are calendar days (agrees with the sidebar's today count)", () => {
  const now = new Date(2026, 8, 13, 1, 0).getTime();                       // 13 Sep, 01:00 local
  assert.equal(L.timeBucket(new Date(2026, 8, 13, 0, 30).toISOString(), now), "Today");
  assert.equal(L.timeBucket(new Date(2026, 8, 12, 23, 0).toISOString(), now), "Yesterday");   // 2h ago, but yesterday
  assert.equal(L.timeBucket(new Date(2026, 8, 11, 23, 0).toISOString(), now), "This week");   // 26h ago, two days back
});

// ---- GCC location picker ----
test("composeGccLocation: GCC / country / city, as the runner expects", () => {
  assert.equal(L.composeGccLocation("GCC", ""), "GCC");
  assert.equal(L.composeGccLocation("United Arab Emirates", ""), "United Arab Emirates");
  assert.equal(L.composeGccLocation("United Arab Emirates", "Dubai"), "Dubai, United Arab Emirates");
});
test("parseGccLocation: reads saved locations back, including old free-text ones", () => {
  assert.deepEqual(L.parseGccLocation("GCC"), { country: "GCC", city: "", known: true });
  assert.deepEqual(L.parseGccLocation("Dubai, United Arab Emirates"), { country: "United Arab Emirates", city: "Dubai", known: true });
  assert.deepEqual(L.parseGccLocation("Saudi Arabia"), { country: "Saudi Arabia", city: "", known: true });
  assert.deepEqual(L.parseGccLocation("dubai"), { country: "United Arab Emirates", city: "Dubai", known: true });   // old free text
  assert.deepEqual(L.parseGccLocation("London"), { country: "", city: "", known: false });
  assert.deepEqual(L.parseGccLocation(""), { country: "", city: "", known: false });
});
test("locationLabel: short label for chips", () => {
  assert.equal(L.locationLabel("GCC"), "All GCC");
  assert.equal(L.locationLabel("Dubai, United Arab Emirates"), "Dubai");
  assert.equal(L.locationLabel("United Arab Emirates"), "Anywhere in UAE");
  assert.equal(L.locationLabel("London"), "London");
});

// ---- role suggestions (any profession: from the user's own master + searches) ----
test("roleSuggestions: titles from the master resume and past searches, deduped", () => {
  const items = [
    { kind: "position", data: { title: "Senior Data Scientist", employer: "X" } },
    { kind: "position", data: { title: "senior data scientist" } },
    { kind: "headline", canonical: "Machine Learning Engineer" },
    { kind: "skill", canonical: "Python" },
  ];
  const searches = [{ name: "AI Engineer", query: '"AI Engineer" NOT "data analytics"' }, { name: "", query: "" }];
  assert.deepEqual(L.roleSuggestions(items, searches), ["Senior Data Scientist", "Machine Learning Engineer", "AI Engineer"]);
  assert.deepEqual(L.roleSuggestions(null, null), []);
});

test("roleSuggestions: tidies titles (stray punctuation, extra spaces)", () => {
  const items = [{ kind: "position", data: { title: "Risk Associate," } }, { kind: "position", data: { title: "  Senior   Manager " } }];
  assert.deepEqual(L.roleSuggestions(items, []), ["Risk Associate", "Senior Manager"]);
});

// ---- staging feedback helpers ----
test("pushCapped keeps the newest N", () => {
  const a = [];
  for (let i = 0; i < 13; i++) L.pushCapped(a, i, 10);
  assert.deepEqual(a, [3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
});
test("clickLabel: aria-label, then text, then title, then tag", () => {
  const el = (o) => ({ getAttribute: (k) => (o.attrs || {})[k] || null, textContent: o.text || "", tagName: o.tag || "DIV" });
  assert.equal(L.clickLabel(el({ attrs: { "aria-label": "Close" }, text: "✕" })), "Close");
  assert.equal(L.clickLabel(el({ text: "  Save   and\n close " })), "Save and close");
  assert.equal(L.clickLabel(el({ attrs: { title: "Theme" } })), "Theme");
  assert.equal(L.clickLabel(el({ tag: "SVG" })), "<svg>");
  assert.equal(L.clickLabel(el({ text: "x".repeat(300) })).length, 120);
  assert.equal(L.clickLabel(null), "");
});
test("errorText flattens console.error args", () => {
  assert.equal(L.errorText([new Error("boom"), "at load", { a: 1 }]), 'boom at load {"a":1}');
  assert.equal(L.errorText(["x".repeat(900)]).length, 500);
});
