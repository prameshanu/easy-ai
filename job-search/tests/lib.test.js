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
