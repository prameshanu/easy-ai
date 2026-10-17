/* Easyy Job Alerts — pure functions shared by the browser app and node tests.
   No DOM, no Vue, no Supabase in this file.
   Browser: window.EasyyLib · Node: require("./lib.js") */
(function (root, factory) {
  const lib = factory();
  if (typeof module === "object" && module.exports) module.exports = lib;
  else root.EasyyLib = lib;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const ROUTES = ["home", "history", "resume", "resumes", "master", "settings", "outreach", "funnel", "prep", "guide", "community", "plans"];

  // ---------------------------------------------------------------- routing
  // A hash is a route only when it starts with "#/". Anything else (Supabase
  // puts "#access_token=…" and "#error=…" in the hash) returns null = not ours.
  function parseRoute(hash) {
    const h = hash || "";
    if (h === "" || h === "#" || h === "#/") return { name: "home", rewrite: false };
    if (h.slice(0, 2) !== "#/") return null;
    const path = h.slice(2).split(/[?&]/)[0].replace(/\/+$/, "");
    if (path === "") return { name: "home", rewrite: false };
    if (path.slice(0, 4) === "job/") {
      const id = decodeURIComponent(path.slice(4));
      return id ? { name: "job", id, rewrite: false } : { name: "home", rewrite: true };
    }
    if (path.slice(0, 9) === "tailored/") {
      const id = decodeURIComponent(path.slice(9));
      return id ? { name: "tailored", id, rewrite: false } : { name: "home", rewrite: true };
    }
    if (ROUTES.indexOf(path) !== -1) return { name: path, rewrite: false };
    return { name: "home", rewrite: true };
  }

  // routeHash("job", id) → "#/job/<id>"; id is ignored for the flat routes.
  function routeHash(name, id) {
    if (name === "home") return "#/";
    if (name === "job") return "#/job/" + encodeURIComponent(id || "");
    if (name === "tailored") return "#/tailored/" + encodeURIComponent(id || "");
    return "#/" + name;
  }

  // Surfaces expired/invalid auth-link errors Supabase returns in the hash.
  function parseHashError(hash) {
    if (!hash || hash.indexOf("error") === -1) return null;
    const p = new URLSearchParams(hash.replace(/^#/, ""));
    const desc = p.get("error_description") || p.get("error");
    return desc ? desc.replace(/\+/g, " ") : null;
  }

  // ------------------------------------------------------------ formatting
  function parseIsoZ(str) {
    if (!str) return null;
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }

  function formatTime(d) {
    return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
  }

  function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function dayKey(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function dayLabel(d, now) {
    const diff = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    return new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short" }).format(d);
  }

  // Absolute date, e.g. "19 Sep 2026". "" when the timestamp is missing or unparseable.
  function formatDate(iso) {
    const d = parseIsoZ(iso);
    return d ? new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).format(d) : "";
  }

  // Absolute date + clock time, e.g. "19 Sep 2026, 22:00". "" when missing or unparseable.
  function formatDateTime(iso) {
    const d = parseIsoZ(iso);
    return d ? formatDate(iso) + ", " + formatTime(d) : "";
  }

  // "AED 32–38k" · "AED 25k" · "" when nothing usable
  function formatSalary(min, max, currency) {
    const lo = Number(min), hi = Number(max);
    const okLo = isFinite(lo) && lo > 0, okHi = isFinite(hi) && hi > 0;
    if (!okLo && !okHi) return "";
    const cur = currency || "AED";
    const one = (n) => (n >= 1000 ? Math.round(n / 1000) + "k" : String(Math.round(n)));
    if (okLo && okHi && lo !== hi) {
      if (lo >= 1000 && hi >= 1000) return cur + " " + Math.round(lo / 1000) + "–" + Math.round(hi / 1000) + "k";
      return cur + " " + one(lo) + "–" + one(hi);
    }
    return cur + " " + one(okHi ? hi : lo);
  }

  function initials(fullName, email) {
    const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    const e = (email || "").trim();
    return e ? e[0].toUpperCase() : "?";
  }

  // "+971501234567" → "+971 50 ··· 67"; "" when too short to be a number
  function maskPhone(phone) {
    const digits = (phone || "").replace(/\D/g, "");
    if (digits.length < 7) return "";
    if (digits.length >= 9) return "+" + digits.slice(0, 3) + " " + digits.slice(3, 5) + " ··· " + digits.slice(-2);
    return "+" + digits.slice(0, 3) + " ··· " + digits.slice(-2);
  }

  function cleanList(arr) {
    return (arr || []).map((x) => String(x).trim()).filter(Boolean);
  }

  function parseList(str) {
    return cleanList((str || "").split(","));
  }

  function uniq(arr) {
    return arr.filter((x, i) => x != null && x !== "" && arr.indexOf(x) === i);
  }

  // ---------------------------------------------------------------- status
  function channelsText(telegramLinked, emailEnabled) {
    if (telegramLinked && emailEnabled) return "Telegram and email";
    if (telegramLinked) return "Telegram";
    if (emailEnabled) return "email";
    return "";
  }

  // s = { loading, savedSearchCount, isActive, telegramLinked, emailEnabled, lastRunAt: Date|null, activeSearchCount: number|null }
  // Priority order is the spec's table (§9.1). "no-channel" mirrors the runner's
  // own skip rule: no Telegram chat AND no email → the profile is never run.
  function statusFor(s) {
    if (s.loading) return { key: "loading", title: "", line: "" };
    if (!s.savedSearchCount) {
      return { key: "no-search", title: "Not running yet", line: "Add your first search below to start." };
    }
    if (!s.isActive) {
      return { key: "paused", title: "Your alerts are paused", line: "Turn them back on when you're ready. Your searches are saved." };
    }
    const active = s.activeSearchCount == null ? s.savedSearchCount : s.activeSearchCount;
    if (active === 0) {
      return { key: "paused", title: "Your alerts are paused", line: "All your searches are paused. Turn one back on to resume." };
    }
    if (!s.telegramLinked && !s.emailEnabled) {
      return { key: "no-channel", title: "Not running yet", line: "Connect Telegram or turn on email digests so alerts have somewhere to go." };
    }
    const n = s.savedSearchCount;
    const paused = n - active;
    let line = n + " " + (n === 1 ? "search" : "searches") + " · checked every hour · sent to " + channelsText(s.telegramLinked, s.emailEnabled);
    if (s.lastRunAt instanceof Date && !isNaN(s.lastRunAt.getTime())) line += " · last check " + formatTime(s.lastRunAt);
    if (paused > 0) line += " · " + paused + " paused";
    return { key: "on", title: "Your alerts are on", line };
  }

  // Sidebar / rail line under the wordmark.
  function shortStatus(key) {
    if (key === "on") return "Alerts on · hourly";
    if (key === "paused") return "Alerts paused";
    if (key === "loading") return "";
    return "Not running yet";
  }

  // ------------------------------------------------------------ validation
  // state = { searches:[{name,query,location,sites,google_search_term}], full_name, phone, salaryInput }
  function validate(state) {
    const errors = { searches: [], full_name: "", phone: "", salary: "", summary: "" };
    let ok = true;
    if (!state.searches || !state.searches.length) { errors.summary = "Add at least one search."; ok = false; }
    for (const s of state.searches || []) {
      let e = "";
      if (!(s.name || "").trim() || !(s.query || "").trim() || !(s.location || "").trim()) {
        e = "Give this search a name, search terms and a location.";
      } else if (!s.sites || !s.sites.length) {
        e = "Pick at least one site to look on.";
      } else if (s.sites.indexOf("google") !== -1 && !(s.google_search_term || "").trim()) {
        e = "Google Jobs needs the plain phrase you'd type into Google.";
      }
      errors.searches.push(e);
      if (e) ok = false;
    }
    if (state.salaryInput !== "" && state.salaryInput != null) {
      const n = Number(state.salaryInput);
      if (!Number.isInteger(n) || n < 0) { errors.salary = "Enter a whole number of AED per month, or leave it empty."; ok = false; }
    }
    let accountProblem = false;
    if (!(state.full_name || "").trim()) { errors.full_name = "Enter your full name."; ok = false; accountProblem = true; }
    if ((state.phone || "").replace(/\D/g, "").length < 7) { errors.phone = "Enter a valid mobile number."; ok = false; accountProblem = true; }
    if (!ok && !errors.summary) {
      const onlyAccount = accountProblem && errors.searches.every((e) => !e) && !errors.salary;
      errors.summary = onlyAccount
        ? "Add your name and mobile number in Profile & settings, then save."
        : "Fix the highlighted fields.";
    }
    return { ok, errors };
  }

  // --------------------------------------------------------------- payload
  // state = { profileId, userEmail, profile:{full_name,phone,country_indeed,email_enabled,notify_when_empty,is_active},
  //           salaryInput, excludeList:[], searches:[{id,name,query,location,is_remote,sites,linkedin_query,indeed_query,google_search_term,require_kw:[],is_active}] }
  // features = { searchPause: bool }
  // `profiles.name` is deliberately never here: it is the key of `profile_jobs` in the runner's blob.
  function buildPayload(state, features) {
    const p = state.profile || {};
    const profile = {
      full_name: (p.full_name || "").trim() || null,
      phone: p.phone || null,
      country_indeed: p.country_indeed,
      min_salary_monthly_aed: state.salaryInput === "" || state.salaryInput == null ? null : Number(state.salaryInput),
      exclude_title_keywords: cleanList(state.excludeList),
      email_enabled: !!p.email_enabled,
      email_to: p.email_enabled ? [state.userEmail] : [],
      notify_when_empty: !!p.notify_when_empty,
      is_active: !!p.is_active,
    };
    const searches = (state.searches || []).map((s, i) => {
      const sites = (s.sites || []).slice();
      const row = {
        profile_id: state.profileId,
        name: (s.name || "").trim(),
        query: (s.query || "").trim(),
        location: (s.location || "").trim(),
        is_remote: !!s.is_remote,
        sites: sites,
        linkedin_query: (s.linkedin_query || "").trim() || null,
        indeed_query: (s.indeed_query || "").trim() || null,
        google_search_term: sites.indexOf("google") !== -1 ? ((s.google_search_term || "").trim() || null) : null,
        require_title_keywords: cleanList(s.require_kw),
        position: i,
      };
      if (s.id) row.id = s.id;
      if (features && features.searchPause) row.is_active = s.is_active !== false;
      return row;
    });
    return { profile, searches };
  }

  // --------------------------------------------------------------- history
  function isRpcMissing(error) {
    if (!error) return false;
    if (error.code === "PGRST202") return true;
    return /could not find the function/i.test(error.message || "");
  }

  // lastRun = the RPC's `last_run` object ({mode, started_at, finished_at, status, new_jobs, errors}) or null
  function lastRunInfo(lastRun) {
    if (!lastRun) return null;
    const at = parseIsoZ(lastRun.finished_at || lastRun.started_at);
    if (!at) return null;
    const status = lastRun.status || "success";
    const note = status === "partial" ? "some sites didn't respond"
      : status === "failed" ? "last check failed, we'll retry" : "";
    const newJobs = typeof lastRun.new_jobs === "number" ? lastRun.new_jobs : null;
    return { at, time: formatTime(at), status, note, newJobs };
  }

  // jobs = the RPC's `jobs` array; opts.alerts = the RPC's `alerts` array (Phase 2b) or undefined.
  // With alerts: one event per alert row (hourly or daily digest), jobs attached by alert_id
  // (hourly) or job_ids (daily re-lists). Without: one event per distinct notified_at (Phase 2a).
  // Returns { pending, days:[{key,label,events:[{key,at,time,kind,channels,jobs,jobCount,searches}]}], total, searches }
  function groupHistory(jobs, opts) {
    opts = opts || {};
    const now = opts.now || new Date();
    const filter = opts.filterSearch || "";
    const all = jobs || [];
    const list = all.filter((j) => !filter || j.search === filter);
    const byId = new Map(all.map((j) => [j.id, j]));

    const pendingJobs = list.filter((j) => !j.notified_at);
    const events = [];

    if (opts.alerts && opts.alerts.length) {
      const byAlert = new Map();
      for (const j of list) {
        if (j.alert_id == null) continue;
        if (!byAlert.has(j.alert_id)) byAlert.set(j.alert_id, []);
        byAlert.get(j.alert_id).push(j);
      }
      for (const a of opts.alerts) {
        const at = parseIsoZ(a.sent_at);
        if (!at) continue;
        let evJobs = byAlert.get(a.id) || [];
        if (!evJobs.length && a.job_ids) evJobs = a.job_ids.map((id) => byId.get(id)).filter((j) => j && (!filter || j.search === filter));
        if (filter && !evJobs.length) continue;
        evJobs.sort((x, y) => String(y.matched_at || "").localeCompare(String(x.matched_at || "")));
        events.push({
          key: "a" + a.id, at, time: formatTime(at), kind: a.kind === "daily" ? "daily" : "hourly",
          channels: a.channels && a.channels.length ? a.channels.slice() : null,
          jobs: evJobs, jobCount: evJobs.length || a.job_count || 0, searches: uniq(evJobs.map((j) => j.search)),
        });
      }
    } else {
      const byEvent = new Map();
      for (const j of list) {
        if (!j.notified_at) continue;
        if (!byEvent.has(j.notified_at)) byEvent.set(j.notified_at, []);
        byEvent.get(j.notified_at).push(j);
      }
      byEvent.forEach((evJobs, key) => {
        const at = parseIsoZ(key);
        if (!at) return;
        evJobs.sort((a, b) => String(b.matched_at || "").localeCompare(String(a.matched_at || "")));
        events.push({ key, at, time: formatTime(at), kind: "hourly", channels: null, jobs: evJobs, jobCount: evJobs.length, searches: uniq(evJobs.map((j) => j.search)) });
      });
    }
    events.sort((a, b) => b.at - a.at);

    const days = [];
    for (const ev of events) {
      const k = dayKey(ev.at);
      let day = days[days.length - 1];
      if (!day || day.key !== k) { day = { key: k, label: dayLabel(ev.at, now), events: [] }; days.push(day); }
      day.events.push(ev);
    }

    let pending = null;
    if (pendingJobs.length) {
      const times = pendingJobs.map((j) => parseIsoZ(j.matched_at)).filter(Boolean).sort((a, b) => a - b);
      pending = { jobs: pendingJobs, matchedAt: times[0] || null, time: times[0] ? formatTime(times[0]) : "" };
    }

    return { pending, days, total: list.length, searches: uniq(all.map((j) => j.search)).sort() };
  }

  const CHANNEL_LABELS = { telegram: "Telegram", email: "email" };
  // [{channel,status}] → [{label,status}] for the History event row; null when unknown.
  function channelParts(channels) {
    if (!channels || !channels.length) return null;
    return channels.map((c) => ({ label: CHANNEL_LABELS[c.channel] || c.channel, status: c.status }));
  }

  // ------------------------------------------------------------ auth errors
  // Supabase auth errors → plain English. Prefer error.code (supabase-js v2 AuthApiError),
  // fall back to the message text. Bug fixed 28 Aug: "New password should be different from
  // the old password" (code same_password) used to be reported as a length problem.
  function friendlyAuthError(error) {
    if (!error) return "Something went wrong. Please try again.";
    const code = error.code || "";
    const m = (error.message || "").toLowerCase();
    if (code === "same_password" || m.indexOf("should be different from the old password") !== -1) {
      return "That's your current password. Choose a new one.";
    }
    if (code === "weak_password" || m.indexOf("password should") !== -1) {
      if (m.indexOf("at least") !== -1 && /\d+ characters/.test(m)) return "Password must be at least 8 characters.";
      return "Choose a stronger password. Mix letters and numbers.";
    }
    if (code === "invalid_credentials" || m.indexOf("invalid login") !== -1) return "That email or password doesn't match. Try again, or reset your password.";
    if (code === "email_not_confirmed" || m.indexOf("email not confirmed") !== -1) return "Please confirm your email first. Check your inbox for the confirmation link.";
    if (code === "user_already_exists" || m.indexOf("already registered") !== -1 || m.indexOf("already been registered") !== -1) return "You already have an account with that email. Try signing in instead.";
    if (code === "over_request_rate_limit" || code === "over_email_send_rate_limit" || m.indexOf("rate limit") !== -1) return "Too many attempts just now. Please wait a minute and try again.";
    if (code === "reauthentication_needed" || m.indexOf("reauth") !== -1 || m.indexOf("recent login") !== -1) return "For security, sign out and sign in again, then retry.";
    return error.message || "Something went wrong. Please try again.";
  }

  // ---------------------------------------------------------- delete account
  // Failures from `sb.functions.invoke('delete-account')` → plain English.
  // `error` is a FunctionsFetchError / FunctionsRelayError / FunctionsHttpError
  // (the latter carries the Response as `context`); `body` is the function's
  // parsed JSON ({ error }) when the caller managed to read it, else null.
  function deleteAccountError(error, body) {
    const support = " Email support@easyy-ai.com and we'll do it for you.";
    if (!error) return "Couldn't delete your account." + support;
    if (error.name === "FunctionsFetchError") return "Couldn't reach the server. Check your connection and try again.";
    const status = error.context && error.context.status;
    if (status === 401) return "Your session has expired. Sign out, sign in again, then retry.";
    const reason = (body && body.error) || error.message || "";
    return "Couldn't delete your account" + (reason ? ": " + reason : "") + "." + support;
  }

  // ------------------------------------------------------- master resume ----
  const MASTER_ERRORS = {
    cap_files: "You've reached your file limit. Remove one to add another.",
    cap_size: "Files must be under 5 MB.",
    cap_builds: "That's 5 builds today. Try again tomorrow.",
    duplicate: "You've already added this file.",
    build_active: "A build is already running.",
    bad_kind: "We can read DOCX, PDF or pasted text.",
    no_files: "Add at least one resume first.",
    not_cancellable: "This build has already started and can't be cancelled.",
    bad_ruling: "That answer didn't save. Pick an option or write your own.",
    bad_status: "That change didn't save. Please try again.",
    not_found: "We couldn't find that. Refresh and try again.",
  };
  const GENERIC_ERROR = "Something went wrong. Please try again.";
  const SECTION_LABELS = [
    ["contact", "Contact"], ["headline", "Headline"], ["summary", "Summaries"], ["position", "Positions"],
    ["skill", "Skills"], ["education", "Education"], ["cert", "Certifications"], ["award", "Awards"],
  ];
  const MAX_FILE_BYTES = 5242880;

  function kindForFile(name) {
    const m = /\.([a-z0-9]+)$/i.exec(name || "");
    const ext = m ? m[1].toLowerCase() : "";
    return ext === "docx" ? "docx" : ext === "pdf" ? "pdf" : null;
  }

  function fileCapCheck(o) {
    const files = o.files || [];
    if (files.length >= (o.cap || 20)) return "cap_files";
    if (!o.size || o.size > MAX_FILE_BYTES) return "cap_size";
    if (o.sha256 && files.some((f) => f.sha256 === o.sha256)) return "duplicate";
    return null;
  }

  function masterError(err, fallback) {
    const code = typeof err === "string" ? err : (err && err.message) || "";
    if (MASTER_ERRORS[code]) return MASTER_ERRORS[code];
    return fallback || GENERIC_ERROR;
  }

  function buildFailureCopy(build) {
    if (build && build.error_kind === "worker_lost") return "Our builder went offline mid-way. It will retry automatically.";
    return "Something went wrong on our side. We've been notified.";
  }

  function buildStageLabel(build, now) {
    const steps = [
      { key: "extract", label: "Reading your resumes", detail: "", state: "todo" },
      { key: "merge", label: "Combining what they say", detail: "", state: "todo" },
      { key: "check", label: "Checking for conflicts", detail: "", state: "todo" },
    ];
    if (!build) return { state: "none", steps, waiting: false };
    const s = build.status;
    const p = build.progress || {};
    if (s === "ready" || s === "failed" || s === "cancelled") return { state: s, steps: steps.map((x) => Object.assign({}, x, { state: "done" })), waiting: false };
    if (s === "queued") {
      const age = (now || Date.now()) - Date.parse(build.created_at || 0);
      return { state: "queued", steps, waiting: age > 120000 };
    }
    const idx = s === "extracting" ? 0 : s === "merging" ? 1 : 2;
    steps.forEach((x, i) => { x.state = i < idx ? "done" : i === idx ? "now" : "todo"; });
    if (p.files_total) steps[0].detail = (p.files_done || 0) + " of " + p.files_total + " files";
    if (p.positions_total) steps[1].detail = (p.positions_done || 0) + " of " + p.positions_total + " sections";
    return { state: "running", steps, waiting: false };
  }

  function conflictProgress(conflicts) {
    const list = conflicts || [];
    const resolved = list.filter((c) => c.status === "resolved").length;
    const total = list.length;
    const open = total - resolved;
    return { open, resolved, total, text: open === 0 ? "No open conflicts" : resolved + " of " + total + " resolved" };
  }

  function decorateItem(row) {
    const srcs = row.master_item_sources || [];
    const fileSrcs = srcs.filter((s) => s.source_kind === "file");
    const canonical = (srcs.find((s) => s.is_canonical) || {}).text || row.text;
    const variants = [];
    srcs.forEach((s) => { if (!s.is_canonical && s.text !== canonical && variants.indexOf(s.text) === -1) variants.push(s.text); });
    const userAdded = srcs.some((s) => s.source_kind === "user");
    const files = {};
    fileSrcs.forEach((s) => { files[s.file_id] = true; });
    return Object.assign({}, row, {
      canonical, variants, sources: fileSrcs, userAdded,
      singleSource: !userAdded && Object.keys(files).length === 1,
      children: [],
    });
  }

  function groupItemsBySection(items) {
    const byId = {};
    const decorated = (items || []).map(decorateItem);
    decorated.forEach((it) => { byId[it.id] = it; });
    const bySort = (a, b) => (a.sort_order || 0) - (b.sort_order || 0);
    decorated.forEach((it) => {
      if (it.kind === "bullet" && it.parent_id && byId[it.parent_id]) byId[it.parent_id].children.push(it);
    });
    decorated.forEach((it) => { it.children.sort(bySort); });
    return SECTION_LABELS.map(([kind, label]) => ({
      kind, label,
      items: decorated.filter((it) => it.kind === kind).sort(bySort),
    })).filter((s) => s.items.length);
  }

  function rulingFromForm(choice, optionIndex, customText) {
    if (choice === "option") return Number.isInteger(optionIndex) && optionIndex >= 0 ? { choice: "option", option_index: optionIndex } : null;
    if (choice === "both") return { choice: "both" };
    if (choice === "custom") { const t = (customText || "").trim(); return t ? { choice: "custom", custom_text: t } : null; }
    return null;
  }

  function fileSizeText(bytes) {
    if (bytes >= 1024 * 1024) return (Math.round(bytes / 1024 / 1024 * 10) / 10) + " MB";
    return Math.max(1, Math.round(bytes / 1024)) + " KB";
  }

  // ------------------------------------------------------ tailored resumes ----
  const TAILOR_ERRORS = {
    no_master: "Build your master resume first. It's what every tailored resume is made from.",
    conflicts_open: "Resolve your master-resume conflicts first, then tailor.",
    tailor_active: "A tailored resume is already being made. Wait for it to finish.",
    cap_tailors: "That's your limit for today. Try again tomorrow.",
    bad_jd: "That job description looks too short. Paste the full posting (at least a few paragraphs).",
    not_cancellable: "This one has already started and can't be cancelled.",
    not_deletable: "This one is still running. Wait for it to finish first.",
    answered: "You've already answered that one.",
    bad_answer: "That answer didn't save. Please try again.",
  };
  function tailorError(err, fallback) {
    const code = typeof err === "string" ? err : (err && err.message) || "";
    return TAILOR_ERRORS[code] || fallback || GENERIC_ERROR;
  }

  function canTailor(overview) {
    const master = overview && overview.master;
    if (!master || !master.current_build_id) return { ok: false, reason: "no_master", open: 0 };
    const open = (overview && overview.open_conflicts) || 0;
    if (open > 0) return { ok: false, reason: "conflicts", open };
    return { ok: true, reason: null, open: 0 };
  }

  const TAILOR_STEPS = [
    { key: "analyze", label: "Analyzing the job description" },
    { key: "plan", label: "Choosing and wording your facts" },
    { key: "render", label: "Laying out the PDF" },
  ];
  function tailorStageLabel(run, now) {
    const steps = TAILOR_STEPS.map((s) => ({ key: s.key, label: s.label, state: "todo" }));
    if (!run) return { state: "none", steps, waiting: false };
    const s = run.status;
    if (s === "ready" || s === "failed" || s === "cancelled") {
      return { state: s, steps: steps.map((x) => Object.assign({}, x, { state: "done" })), waiting: false };
    }
    if (s === "queued") {
      const age = (now || Date.now()) - Date.parse(run.created_at || 0);
      return { state: "queued", steps, waiting: age > 120000 };
    }
    const idx = s === "analyzing" ? 0 : s === "planning" ? 1 : 2;
    steps.forEach((x, i) => { x.state = i < idx ? "done" : i === idx ? "now" : "todo"; });
    return { state: "running", steps, waiting: false };
  }

  function tailorFailureCopy(run) {
    const kind = run && run.error_kind;
    if (kind === "fit") return "This one couldn't fit two pages. Regenerate with guidance about what to trim.";
    if (kind === "worker_lost") return "Our builder went offline mid-way. It will retry automatically.";
    return "Something went wrong on our side. We've been notified.";
  }

  function fitLine(fit) {
    if (!fit || !fit.pages) return "";
    let s = fit.pages + (fit.pages === 1 ? " page" : " pages") + " · " + fit.spacing + " · " + fit.font_pt + "pt";
    const n = (fit.dropped_item_ids || []).length;
    if (n) s += " · " + n + (n === 1 ? " bullet" : " bullets") + " trimmed to fit";
    return s;
  }

  function normalizeKeyword(k) {
    return String(k == null ? "" : k).trim().replace(/\s+/g, " ").toLowerCase();
  }

  // plan.gaps + master_answers → questionnaire model. done-states:
  // declined (no) · skill_added (yes, no note) · draft_pending · draft_ready · approved · discarded
  function gapLists(run, answers) {
    const gaps = ((run && run.plan && run.plan.gaps) || []);
    const byNorm = {};
    (answers || []).forEach((a) => { byNorm[a.keyword_norm] = a; });
    const open = [], done = [], structural = [];
    for (const g of gaps) {
      if (!g.askable) { structural.push({ keyword: g.keyword, question: g.question, state: "structural", answer: null }); continue; }
      const a = byNorm[normalizeKeyword(g.keyword)];
      if (!a) { open.push({ keyword: g.keyword, question: g.question, state: "unanswered", answer: null }); continue; }
      const state = a.status === "recorded" ? (a.answer === "no" ? "declined" : "skill_added") : a.status;
      done.push({ keyword: g.keyword, question: g.question, state, answer: a });
    }
    return { open, done, structural };
  }

  // How many master facts a tailored resume used (bullets kept after fitting). null = not known yet.
  function factsUsedCount(row) {
    const positions = ((row && row.plan) || {}).positions;
    if (!positions || !positions.length) return null;
    return usedFacts(row).reduce((n, p) => n + p.bullets.filter((b) => !b.dropped).length, 0);
  }

  function usedFacts(run) {
    const dropped = {};
    (((run && run.fit) || {}).dropped_item_ids || []).forEach((id) => { dropped[id] = true; });
    return (((run && run.plan) || {}).positions || []).map((p) => ({
      position_key: p.position_key,
      bullets: (p.bullets || []).map((b) => ({ id: b.id, text: b.text, dropped: !!dropped[b.id] })),
    }));
  }

  // Days of job history a plan can see. One source of truth for the UI filter + (mirrored) the
  // authoritative server clamp in my_alert_history. Premium = 30 days, everyone else = 7.
  function historyWindowDays(plan) {
    return plan === "premium" ? 30 : 7;
  }

  // Source résumé uploads allowed per plan. Free = 5; premium = 20.
  // One source of truth for UI + (mirrored) server enforcement.
  function fileCap(plan) {
    return plan === "premium" ? 20 : 5;
  }

  // Roles (searches) allowed per plan. One source of truth for UI + (mirrored) server enforcement.
  // ---- GCC locations (user decision 2026-10-03: GCC only for now) ----
  // Saved as "GCC", "<Country>" or "<City>, <Country>"; the runner fans "GCC" out to all six
  // and searches Indeed in the named country (easyy-job-alerts scraper.expand_location).
  const GCC = [
    { name: "United Arab Emirates", short: "UAE", label: "Emirate", cities: ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah", "Umm Al Quwain"] },
    { name: "Saudi Arabia", short: "Saudi Arabia", label: "City", cities: ["Riyadh", "Jeddah", "Dammam", "Al Khobar", "NEOM"] },
    { name: "Qatar", short: "Qatar", label: "City", cities: ["Doha", "Lusail", "Al Wakrah"] },
    { name: "Oman", short: "Oman", label: "City", cities: ["Muscat", "Sohar", "Salalah"] },
    { name: "Bahrain", short: "Bahrain", label: "City", cities: ["Manama", "Muharraq"] },
    { name: "Kuwait", short: "Kuwait", label: "City", cities: ["Kuwait City", "Hawalli", "Salmiya"] },
  ];
  const findCountry = (n) => GCC.find((c) => c.name.toLowerCase() === String(n || "").trim().toLowerCase());
  function composeGccLocation(country, city) {
    if (country === "GCC") return "GCC";
    return city ? city + ", " + country : country;
  }
  function parseGccLocation(loc) {
    const raw = String(loc || "").trim();
    if (!raw) return { country: "", city: "", known: false };
    if (/^(all )?gcc( countries)?$/i.test(raw)) return { country: "GCC", city: "", known: true };
    const parts = raw.split(",").map((x) => x.trim());
    const c = findCountry(parts[parts.length - 1]);
    if (c) {
      const city = parts.length > 1 ? (c.cities.find((x) => x.toLowerCase() === parts[0].toLowerCase()) || "") : "";
      return { country: c.name, city, known: parts.length === 1 || !!city };
    }
    for (const k of GCC) {                                     // old free text such as "Dubai"
      const city = k.cities.find((x) => x.toLowerCase() === raw.toLowerCase());
      if (city) return { country: k.name, city, known: true };
    }
    return { country: "", city: "", known: false };
  }
  function locationLabel(loc) {
    const p = parseGccLocation(loc);
    if (!p.known) return String(loc || "");
    if (p.country === "GCC") return "All GCC";
    return p.city || "Anywhere in " + findCountry(p.country).short;
  }

  // Job-title suggestions for the role field: the user's own master resume (positions,
  // headline) and past searches — never a fixed list for one profession.
  function roleSuggestions(items, searches) {
    const out = [], seen = {};
    const add = (t) => {
      const v = String(t || "").replace(/["']/g, "").replace(/\s+(NOT|OR|AND)\s+.*$/i, "")
        .replace(/\s+/g, " ").trim().replace(/[\s,;:.\-–]+$/, "");
      const k = v.toLowerCase();
      if (v && v.length <= 80 && !seen[k]) { seen[k] = true; out.push(v); }
    };
    (items || []).forEach((it) => {
      if (it.kind === "position") add(it.data && it.data.title);
      else if (it.kind === "headline") add(it.canonical || (it.data && it.data.text));
    });
    (searches || []).forEach((s) => { add(s.name); add(s.query); });
    return out.slice(0, 20);
  }

  // Premium price shown in the UI (user decision 2026-10-03). One place for every screen.
  const PREMIUM_PRICE = "$10/month";

  function planLimit(plan) {
    if (plan === "premium") return 25;
    if (plan === "closed") return 0;
    return 5; // free / default
  }

  // Recency bucket label for grouping a list. `now` injectable for tests.
  function timeBucket(iso, now) {
    const t = Date.parse(iso);
    if (isNaN(t)) return "Earlier";
    const n = now || Date.now();
    const d = new Date(n);
    const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    if (t >= midnight) return "Today";                                  // calendar days, like the sidebar count
    if (t >= new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1).getTime()) return "Yesterday";
    const h = (n - t) / 3600000;
    if (h < 24 * 7) return "This week";
    if (h < 24 * 14) return "Last week";
    if (h < 24 * 30) return "This month";
    return "Earlier";
  }

  // Short relative time, e.g. "6h ago". `now` is injectable for tests.
  function timeAgo(iso, now) {
    if (!iso) return "";
    const t = Date.parse(iso);
    if (isNaN(t)) return "";
    const s = Math.max(0, Math.floor(((now || Date.now()) - t) / 1000));
    if (s < 60) return "just now";
    const m = Math.floor(s / 60); if (m < 60) return m + "m ago";
    const h = Math.floor(m / 60); if (h < 24) return h + "h ago";
    const d = Math.floor(h / 24); if (d < 7) return d + "d ago";
    const w = Math.floor(d / 7); if (w < 5) return w + "w ago";
    const mo = Math.floor(d / 30); if (mo < 12) return mo + "mo ago";
    return Math.floor(d / 365) + "y ago";
  }

  // Theme: an explicit saved choice ("light"/"dark") wins; otherwise follow the system preference.
  function resolveTheme(saved, systemDark) {
    if (saved === "light" || saved === "dark") return saved;
    return systemDark ? "dark" : "light";
  }
  function nextTheme(effective) {
    return effective === "dark" ? "light" : "dark";
  }

  // Deterministic match score (no LLM): the fraction of the master's key terms the JD mentions,
  // 0-100. Word-boundary matching, tolerant of hyphen/space variants; case-insensitive, deduped.
  function _termHit(hayLower, term) {
    const esc = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/[\s-]+/g, "[\\s-]+");
    return new RegExp("(^|[^a-z0-9])" + esc + "($|[^a-z0-9])").test(hayLower);
  }
  function matchScore(jdText, terms) {
    const hay = String(jdText || "").toLowerCase();
    const seen = new Set();
    let hits = 0;
    for (const raw of terms || []) {
      const t = String(raw || "").trim().toLowerCase();
      if (!t || seen.has(t)) continue;
      seen.add(t);
      if (_termHit(hay, t)) hits++;
    }
    return seen.size === 0 ? 0 : Math.round((hits / seen.size) * 100);
  }

  // Wrap each occurrence of a master term in the JD with <mark class="hl">, HTML-escaping the rest.
  // Safe to render with v-html: nothing from the JD survives un-escaped.
  function _escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function highlightTerms(jdText, terms) {
    const text = String(jdText || "");
    const list = [], seen = new Set();
    for (const raw of terms || []) {
      const t = String(raw || "").trim().toLowerCase();
      if (t && !seen.has(t)) { seen.add(t); list.push(t); }
    }
    if (!text) return "";
    if (!list.length) return _escapeHtml(text);
    list.sort((a, b) => b.length - a.length); // prefer the longest match
    const alt = list.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/[\s-]+/g, "[\\s-]+")).join("|");
    const re = new RegExp("(^|[^a-zA-Z0-9])(" + alt + ")(?=$|[^a-zA-Z0-9])", "gi");
    let out = "", last = 0, m;
    while ((m = re.exec(text)) !== null) {
      const start = m.index + m[1].length, end = start + m[2].length;
      out += _escapeHtml(text.slice(last, start)) + '<mark class="hl">' + _escapeHtml(text.slice(start, end)) + "</mark>";
      last = end;
      re.lastIndex = end;
    }
    return out + _escapeHtml(text.slice(last));
  }

  const SKILL_STOPWORDS = new Set(("a an the and or of to in for with on at by as is are be from that this it its into per via " +
    "use used using build building manage managing develop developing create creating design designing work working " +
    "lead leading drive driving deliver delivering support supporting ensure run running own owning ship shipping " +
    "define defining maintain maintaining partner understand learn learning improve optimize scale execute implement " +
    "deploy monitor analyze identify apply help provide enable across within alongside " +
    "strong proficient excellent good great key real new fast senior junior technical measurable structured modern " +
    "relevant related similar various multiple " +
    "data system systems team teams role roles experience business product products customer customers project projects " +
    "tool tools platform platforms stakeholder stakeholders environment solution solutions skills ability years year day days week " +
    "you your we our they their").split(" "));
  // Keep only distinctive skill terms: drop common English words (verbs/adjectives/filler), one-char
  // tokens and duplicates. A stopgap until the master build stores a curated skill+alias list.
  function cleanTerms(raw) {
    const out = [], seen = new Set();
    for (const r of raw || []) {
      // split compound skill phrases into atomic terms ("SQL & Vector Databases", "ML: XGBoost",
      // "Python (pandas)") — but NOT on "/", so "A/B testing" and "CI/CD" stay whole.
      for (const piece of String(r || "").split(/[,;•|\n&:()]+/)) {
        const s = piece.trim(), key = s.toLowerCase();
        if (s.length >= 2 && /[a-z0-9]/i.test(s) && !SKILL_STOPWORDS.has(key) && !seen.has(key)) { seen.add(key); out.push(s); }
      }
    }
    return out;
  }

  // Band a match score for colour-coding the job list: high >= 85, mid >= 75, else low.
  // null/undefined/NaN pass through as null (no band shown).
  function scoreBand(n) {
    if (n == null || isNaN(n)) return null;
    if (n >= 85) return "high";
    if (n >= 75) return "mid";
    return "low";
  }

  // ---- Overview (V17 hero): real counts off the loaded history + tailored rows ----
  // today = same local calendar day as `now`; week / fortnight = rolling 7 / 14 days.
  function overviewCounts(jobs, tailoredRows, now) {
    const t0 = now == null ? Date.now() : now;
    const d = new Date(t0);
    const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const DAY = 86400000;
    const out = { today: 0, week: 0, fortnight: 0, tailoredToday: 0 };
    (jobs || []).forEach((j) => {
      const t = Date.parse(j.matched_at || j.notified_at);
      if (isNaN(t)) return;
      if (t >= midnight) out.today++;
      if (t0 - t < 7 * DAY) out.week++;
      if (t0 - t < 14 * DAY) out.fortnight++;
    });
    (tailoredRows || []).forEach((r) => {
      const t = Date.parse(r.created_at);
      if (!isNaN(t) && t >= midnight) out.tailoredToday++;
    });
    return out;
  }

  // "Week of 28 September" — the Monday that starts the week containing `now`.
  function weekOfLabel(now) {
    const d = new Date(now == null ? Date.now() : now);
    const back = (d.getDay() + 6) % 7;                         // Mon = 0 … Sun = 6
    const mon = new Date(d.getFullYear(), d.getMonth(), d.getDate() - back);
    return "Week of " + mon.getDate() + " " + mon.toLocaleString("en-GB", { month: "long" });
  }

  // V17 headline style: "Five jobs found." — words for 0–10, digits above.
  const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
  function numberWord(n, capital) {
    const w = n >= 0 && n <= 10 && Number.isInteger(n) ? NUMBER_WORDS[n] : String(n);
    return capital ? w.charAt(0).toUpperCase() + w.slice(1) : w;
  }

  // Hand-time estimate for N tailored applications (V17's stated rate: ~50 min each by hand,
  // ~2 min to read one). null when there's nothing to estimate.
  function handTimeText(n) {
    if (!n || n < 1) return null;
    const mins = n * 50;
    const byHand = mins < 90 ? "about " + mins + " minutes" : "about " + Math.round(mins / 60) + " hours";
    return { byHand, reading: "about " + n * 2 + " minutes" };
  }

  // ---- staging feedback (port of maverix-agentic utils/pageContext.js) ----
  const FB_MAX_ITEMS = 10;
  const FB_MAX_LABEL = 120;
  // Push into a ring buffer, keeping the newest `cap` items.
  function pushCapped(arr, item, cap) {
    arr.push(item);
    while (arr.length > (cap || FB_MAX_ITEMS)) arr.shift();
    return arr;
  }
  // Best human-readable label for a clicked element: aria-label > text > title > <tag>.
  // Takes anything with getAttribute/textContent/tagName so node tests can pass plain objects.
  function clickLabel(el) {
    if (!el) return "";
    const attr = (k) => (el.getAttribute && el.getAttribute(k)) || "";
    const aria = attr("aria-label");
    if (aria) return aria.slice(0, FB_MAX_LABEL);
    const text = String(el.textContent || "").trim().replace(/\s+/g, " ");
    if (text) return text.slice(0, FB_MAX_LABEL);
    const title = attr("title");
    if (title) return title.slice(0, FB_MAX_LABEL);
    return el.tagName ? "<" + String(el.tagName).toLowerCase() + ">" : "";
  }
  // console.error arguments → one short string (Errors become their message, objects JSON, capped).
  function errorText(args) {
    return Array.from(args || []).map((a) => {
      if (a && typeof a === "object" && typeof a.message === "string") return a.message;
      if (typeof a === "string") return a;
      try { return JSON.stringify(a).slice(0, 240); } catch (e) { return String(a); }
    }).join(" ").slice(0, 500);
  }

  return {
    ROUTES, parseRoute, routeHash, parseHashError,
    parseIsoZ, formatTime, dayLabel, formatDate, formatDateTime, dayKey, formatSalary, initials, maskPhone, cleanList, parseList, uniq,
    channelsText, statusFor, shortStatus,
    validate, buildPayload,
    isRpcMissing, lastRunInfo, groupHistory, channelParts,
    friendlyAuthError, deleteAccountError,
    kindForFile, fileCapCheck, masterError, buildFailureCopy, buildStageLabel, conflictProgress,
    groupItemsBySection, rulingFromForm, fileSizeText, MAX_FILE_BYTES,
    TAILOR_ERRORS, tailorError, canTailor, tailorStageLabel, tailorFailureCopy, fitLine, normalizeKeyword, gapLists, usedFacts, factsUsedCount,
    resolveTheme, nextTheme, matchScore, highlightTerms, cleanTerms, timeAgo, planLimit, timeBucket, scoreBand, historyWindowDays, fileCap, PREMIUM_PRICE,
    GCC, composeGccLocation, parseGccLocation, locationLabel, roleSuggestions,
    overviewCounts, weekOfLabel, handTimeText, numberWord,
    pushCapped, clickLabel, errorText,
  };
});
