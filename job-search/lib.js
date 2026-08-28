/* Easyy Job Alerts — pure functions shared by the browser app and node tests.
   No DOM, no Vue, no Supabase in this file.
   Browser: window.EasyyLib · Node: require("./lib.js") */
(function (root, factory) {
  const lib = factory();
  if (typeof module === "object" && module.exports) module.exports = lib;
  else root.EasyyLib = lib;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const ROUTES = ["home", "history", "resume", "resumes", "settings"];

  // ---------------------------------------------------------------- routing
  // A hash is a route only when it starts with "#/". Anything else (Supabase
  // puts "#access_token=…" and "#error=…" in the hash) returns null = not ours.
  function parseRoute(hash) {
    const h = hash || "";
    if (h === "" || h === "#" || h === "#/") return { name: "home", rewrite: false };
    if (h.slice(0, 2) !== "#/") return null;
    const path = h.slice(2).split(/[?&]/)[0].replace(/\/+$/, "");
    if (path === "") return { name: "home", rewrite: false };
    if (ROUTES.indexOf(path) !== -1) return { name: path, rewrite: false };
    return { name: "home", rewrite: true };
  }

  function routeHash(name) {
    return name === "home" ? "#/" : "#/" + name;
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

  // s = { loading, savedSearchCount, isActive, telegramLinked, emailEnabled, lastRunAt: Date|null }
  // Priority order is the spec's table (§9.1). "no-channel" mirrors the runner's
  // own skip rule: no Telegram chat AND no email → the profile is never run.
  function statusFor(s) {
    if (s.loading) return { key: "loading", title: "", line: "" };
    if (!s.savedSearchCount) {
      return { key: "no-search", title: "Not running yet", line: "Add your first search below to start." };
    }
    if (!s.isActive) {
      return { key: "paused", title: "Your alerts are paused", line: "Turn them back on when you're ready — your searches are saved." };
    }
    if (!s.telegramLinked && !s.emailEnabled) {
      return { key: "no-channel", title: "Not running yet", line: "Connect Telegram or turn on email digests so alerts have somewhere to go." };
    }
    const n = s.savedSearchCount;
    let line = n + " " + (n === 1 ? "search" : "searches") + " · checked every hour · sent to " + channelsText(s.telegramLinked, s.emailEnabled);
    if (s.lastRunAt instanceof Date && !isNaN(s.lastRunAt.getTime())) line += " · last check " + formatTime(s.lastRunAt);
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
      : status === "failed" ? "last check failed — we'll retry" : "";
    return { at, time: formatTime(at), status, note };
  }

  // jobs = the RPC's `jobs` array. One event = every job sharing a notified_at
  // (one deliver() = one Telegram message + one email with a single timestamp).
  // Returns { pending, days:[{key,label,events:[{key,at,time,jobs,searches}]}], total, searches }
  function groupHistory(jobs, opts) {
    opts = opts || {};
    const now = opts.now || new Date();
    const filter = opts.filterSearch || "";
    const all = jobs || [];
    const list = all.filter((j) => !filter || j.search === filter);

    const byEvent = new Map();
    const pendingJobs = [];
    for (const j of list) {
      if (!j.notified_at) { pendingJobs.push(j); continue; }
      if (!byEvent.has(j.notified_at)) byEvent.set(j.notified_at, []);
      byEvent.get(j.notified_at).push(j);
    }

    const events = [];
    byEvent.forEach((evJobs, key) => {
      const at = parseIsoZ(key);
      if (!at) return;
      evJobs.sort((a, b) => String(b.matched_at || "").localeCompare(String(a.matched_at || "")));
      events.push({ key, at, time: formatTime(at), jobs: evJobs, searches: uniq(evJobs.map((j) => j.search)) });
    });
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

  return {
    ROUTES, parseRoute, routeHash, parseHashError,
    parseIsoZ, formatTime, dayLabel, dayKey, formatSalary, initials, maskPhone, cleanList, parseList, uniq,
    channelsText, statusFor, shortStatus,
    validate, buildPayload,
    isRpcMissing, lastRunInfo, groupHistory,
  };
});
