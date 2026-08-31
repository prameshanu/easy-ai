/* Easyy Job Alerts — root app: config, Supabase client, auth, hash router, shared store.
   Pure functions live in lib.js (window.EasyyLib); views in views.js (window.EasyyViews).
   No build step: Vue 3 + supabase-js from CDN (pinned in index.html). */
const CFG = window.EASYY_CONFIG;
const FEATURES = Object.assign({ searchPause: false, deleteAccount: false, jdView: false, masterResume: false }, CFG.FEATURES || {});
const L = window.EasyyLib;
const sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);

// Capture the URL hash at load, before supabase-js consumes it, so we can
// surface expired/invalid auth-link errors and read a deep-linked route.
const URL_HASH = window.location.hash || "";

// Indeed country options. `v` is the value the jobs backend expects (must stay
// lowercase — do not change); `l` is the capitalized label shown to the user.
const COUNTRIES = [
  { v: "united arab emirates", l: "United Arab Emirates" },
  { v: "india", l: "India" },
  { v: "usa", l: "United States" },
  { v: "united kingdom", l: "United Kingdom" },
  { v: "singapore", l: "Singapore" },
  { v: "saudi arabia", l: "Saudi Arabia" },
  { v: "qatar", l: "Qatar" },
  { v: "canada", l: "Canada" },
  { v: "australia", l: "Australia" },
  { v: "germany", l: "Germany" },
  { v: "netherlands", l: "Netherlands" },
  { v: "ireland", l: "Ireland" },
  { v: "worldwide", l: "Worldwide" },
];

const ICONS = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>',
  history: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  resume: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 16h6"/></svg>',
  resumes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h16v5H4z"/><path d="M4 13h16v5H4z"/></svg>',
};
const NAV_ITEMS = [
  { name: "home", label: "Home", short: "Home", hash: "#/", icon: ICONS.home },
  { name: "history", label: "History", short: "History", hash: "#/history", icon: ICONS.history },
  { name: "resume", label: "Resume builder", short: "Resume", hash: "#/resume", icon: ICONS.resume },
  { name: "resumes", label: "Resumes", short: "Resumes", hash: "#/resumes", icon: ICONS.resumes },
];

let searchSeq = 0;
const blankSearch = () => ({
  id: null, _key: "new-" + (++searchSeq), name: "", query: "", location: "",
  is_remote: false, sites: ["linkedin", "indeed"],
  linkedin_query: "", indeed_query: "", google_search_term: "",
  require_kw: [], is_active: true, _err: "",
});
const defaultProfile = () => ({
  id: null, name: "My job search", full_name: "", phone: "", country_indeed: "united arab emirates",
  email_enabled: true, notify_when_empty: false, is_active: true,
  telegram_chat_id: null, telegram_link_code: null, telegram_linked_at: null,
});

// Reusable international phone input: a searchable country picker (flag + dial
// code) next to the local number. v-model is the full "+<code><digits>" string.
const IntlPhone = {
  props: {
    modelValue: { type: String, default: "" },
    countries: { type: Array, default: () => [] },
  },
  data() {
    return { open: false, query: "", iso: "AE", local: "", _lastEmit: null };
  },
  computed: {
    dial() {
      const c = this.countries.find((x) => x.i === this.iso);
      return c ? c.d : "";
    },
    filtered() {
      const q = (this.query || "").trim().toLowerCase().replace(/^\+/, "");
      if (!q) return this.countries;
      return this.countries.filter(
        (c) => c.n.toLowerCase().includes(q) || c.d.includes(q) || c.i.toLowerCase() === q
      );
    },
  },
  watch: {
    modelValue(v) { if (v !== this._lastEmit) this.parse(v); },
  },
  created() { this.parse(this.modelValue); },
  methods: {
    parse(v) {
      const digits = (v || "").replace(/[^\d]/g, "");
      if (!digits) { this.local = ""; return; }
      let best = null;
      for (const c of this.countries) {
        if (digits.startsWith(c.d) && (!best || c.d.length > best.d.length)) best = c;
      }
      if (best) { this.iso = best.i; this.local = digits.slice(best.d.length); }
      else { this.local = digits; }
    },
    flagOf(iso) {
      if (!iso || iso.length !== 2) return "🏳️";
      const base = 0x1f1e6;
      const cc = iso.toUpperCase();
      return String.fromCodePoint(base + (cc.charCodeAt(0) - 65), base + (cc.charCodeAt(1) - 65));
    },
    emit() {
      const digits = (this.local || "").replace(/\D/g, "");
      const val = digits ? "+" + this.dial + digits : "";
      this._lastEmit = val;
      this.$emit("update:modelValue", val);
    },
    onLocal(e) { this.local = e.target.value; this.emit(); },
    select(iso) { this.iso = iso; this.open = false; this.query = ""; this.emit(); },
    toggle() {
      this.open = !this.open;
      if (this.open) this.$nextTick(() => { if (this.$refs.s) this.$refs.s.focus(); });
    },
  },
  template: `
    <div class="phone">
      <div class="phone-cc" role="button" tabindex="0" @click="toggle" @keyup.enter="toggle">
        <span class="flag">{{ flagOf(iso) }}</span>
        <span class="dial">+{{ dial }}</span>
        <span class="caret">▾</span>
      </div>
      <input type="tel" class="phone-num" :value="local" @input="onLocal" placeholder="50 123 4567" autocomplete="tel-national" />
      <div v-if="open" class="cc-backdrop" @click="open = false"></div>
      <div v-if="open" class="cc-menu">
        <div class="cc-search-wrap">
          <input type="text" class="cc-search" v-model="query" ref="s" placeholder="Search country or code…" @click.stop />
        </div>
        <div class="cc-list">
          <div v-for="c in filtered" :key="c.i" class="cc-item" :class="{ sel: c.i === iso }" @click="select(c.i)">
            <span class="flag">{{ flagOf(c.i) }}</span>
            <span class="cc-name">{{ c.n }}</span>
            <span class="cc-dial">+{{ c.d }}</span>
          </div>
          <div v-if="!filtered.length" class="cc-empty">No match — try another spelling or code.</div>
        </div>
      </div>
    </div>
  `,
};

// ------------------------------------------------------------ shared store
// One reactive object; getters recompute from reactive state on access.
function payloadState(s) {
  return { profileId: s.profile.id, userEmail: s.userEmail, profile: s.profile, salaryInput: s.salaryInput, excludeList: s.excludeList, searches: s.searches };
}
function noFieldErrors() { return { full_name: "", phone: "", salary: "" }; }
function emptyHistory() { return { status: "idle", data: null, error: "", loadedAt: 0 }; }
function emptyJob() { return { status: "idle", id: null, meta: null, jd: null, error: "" }; }
function emptyMaster() { return { status: "idle", data: null, error: "" }; }
function emptyReview() { return { status: "idle", items: [], conflicts: [], error: "" }; }

// Job meta for the JD page, taken from already-loaded history when possible.
function jobMetaFromHistory(id) {
  const jobs = (store.history.data && store.history.data.jobs) || [];
  const j = jobs.find((x) => x.id === id);
  return j ? { id: j.id, title: j.title, company: j.company, location: j.location, url: j.url, site: j.site, search: j.search } : null;
}

const store = Vue.reactive({
  booting: true, session: null, recoveryMode: false,
  route: "home", jobId: null,
  countries: COUNTRIES, features: FEATURES,
  profile: defaultProfile(), salaryInput: "", excludeList: [], searches: [], dbSearchIds: [], lastRow: null,
  loadError: "",
  snapshot: "", saving: false, saveState: "idle", saveError: "", fieldErrors: noFieldErrors(),
  polling: false, pollTimedOut: false,
  history: emptyHistory(),
  job: emptyJob(),
  master: emptyMaster(), review: emptyReview(), masterTab: "conflicts",
  upload: { busy: false, error: "", notice: "" }, buildBusy: false, buildError: "",
  reviewBusy: {}, reviewError: "",
  checklistDismissed: false,
  dialog: null,
  deleting: false, deleteError: "",
  signedOutNotice: "",   // shown on the sign-in panel after a sign-out we caused (e.g. account deleted)
  get userEmail() { return (this.session && this.session.user && this.session.user.email) || ""; },
  get telegramLinked() { return !!this.profile.telegram_linked_at; },
  get payloadJson() { return JSON.stringify(L.buildPayload(payloadState(this), FEATURES)); },
  get isDirty() { return !!this.profile.id && this.payloadJson !== this.snapshot; },
  get lastRun() { return L.lastRunInfo(this.history.data && this.history.data.last_run); },
  get openConflicts() { return (this.master.data && this.master.data.open_conflicts) || 0; },
  get hasReadyMaster() { return !!(this.master.data && this.master.data.master && this.master.data.master.current_build_id); },
  get status() {
    return L.statusFor({
      loading: !this.profile.id, savedSearchCount: this.dbSearchIds.length, isActive: this.profile.is_active,
      telegramLinked: this.telegramLinked, emailEnabled: this.profile.email_enabled,
      lastRunAt: this.lastRun ? this.lastRun.at : null,
      activeSearchCount: ((this.lastRow && this.lastRow.searches) || []).filter((x) => x.is_active !== false).length,
    });
  },
  get showChecklist() {
    return !!this.profile.id && (this.dbSearchIds.length === 0 || (!this.telegramLinked && !this.checklistDismissed));
  },
});

let savedTimer = null;
let pollTimer = null;
let buildPollTimer = null;
let pollGiveUp = null;
let loadPromise = null;

function readDismissed(profileId) {
  try { return localStorage.getItem("easyy.checklist." + profileId) === "1"; } catch (e) { return false; }
}

const actions = {
  resetProfile() {
    store.profile = defaultProfile();
    store.salaryInput = ""; store.excludeList = []; store.searches = []; store.dbSearchIds = []; store.lastRow = null;
    store.snapshot = ""; store.saveState = "idle"; store.saveError = ""; store.fieldErrors = noFieldErrors(); store.loadError = "";
    store.history = emptyHistory(); store.job = emptyJob(); store.jobId = null; store.checklistDismissed = false; store.dialog = null;
    store.deleting = false; store.deleteError = "";
    actions.stopBuildPolling();
    store.master = emptyMaster(); store.review = emptyReview(); store.masterTab = "conflicts";
    store.upload = { busy: false, error: "", notice: "" }; store.buildBusy = false; store.buildError = ""; store.reviewBusy = {}; store.reviewError = "";
    loadPromise = null;
  },

  loadProfile() {
    if (loadPromise) return loadPromise;
    loadPromise = (async () => {
      store.loadError = "";
      let { data, error } = await sb.from("profiles").select("*, searches(*)").maybeSingle();
      if (error) { store.loadError = error.message; return; }
      if (!data) {
        const md = (store.session && store.session.user && store.session.user.user_metadata) || {};
        const ins = await sb.from("profiles")
          .insert({
            name: "My job search",
            full_name: md.full_name || null,
            phone: md.phone || null,
            country_indeed: "united arab emirates",
            email_to: [store.userEmail], email_enabled: true,
          })
          .select("*, searches(*)").single();
        if (ins.error) {
          // a row already exists (e.g. another tab created it first) -> just load it
          const re = await sb.from("profiles").select("*, searches(*)").maybeSingle();
          if (re.error || !re.data) { store.loadError = ins.error.message; return; }
          data = re.data;
        } else {
          data = ins.data;
        }
      }
      actions.mapDbToState(data);
    })().finally(() => { loadPromise = null; });
    return loadPromise;
  },

  mapDbToState(row) {
    store.lastRow = row;
    store.profile = {
      id: row.id, name: row.name, country_indeed: row.country_indeed,
      full_name: row.full_name || "", phone: row.phone || "",
      telegram_chat_id: row.telegram_chat_id, telegram_link_code: row.telegram_link_code,
      telegram_linked_at: row.telegram_linked_at,
      email_enabled: !!row.email_enabled, notify_when_empty: !!row.notify_when_empty,
      is_active: !!row.is_active,
    };
    store.salaryInput = row.min_salary_monthly_aed ?? "";
    store.excludeList = (row.exclude_title_keywords || []).slice();
    const list = (row.searches || []).slice().sort((a, b) => (a.position || 0) - (b.position || 0));
    store.searches = list.map((s) => ({
      id: s.id, _key: s.id, name: s.name, query: s.query, location: s.location,
      is_remote: !!s.is_remote, sites: (s.sites || []).slice(),
      linkedin_query: s.linkedin_query || "", indeed_query: s.indeed_query || "",
      google_search_term: s.google_search_term || "",
      require_kw: (s.require_title_keywords || []).slice(),
      is_active: s.is_active !== false,
      _err: "",
    }));
    store.dbSearchIds = list.map((s) => s.id);
    if (!store.searches.length) store.searches.push(blankSearch());
    store.fieldErrors = noFieldErrors();
    store.checklistDismissed = readDismissed(row.id);
    store.snapshot = store.payloadJson;
    store.saveState = "idle"; store.saveError = "";
  },

  discard() { if (store.lastRow) actions.mapDbToState(store.lastRow); },
  addSearch() { if (store.searches.length < 5) store.searches.push(blankSearch()); },
  removeSearch(i) { store.searches.splice(i, 1); },

  async save() {
    store.saveError = "";
    const v = L.validate({ searches: store.searches, full_name: store.profile.full_name, phone: store.profile.phone, salaryInput: store.salaryInput });
    store.searches.forEach((s, i) => { s._err = v.errors.searches[i] || ""; });
    store.fieldErrors = { full_name: v.errors.full_name, phone: v.errors.phone, salary: v.errors.salary };
    if (!v.ok) { store.saveState = "invalid"; store.saveError = v.errors.summary; return; }
    store.saving = true;
    try {
      const { profile, searches } = L.buildPayload(payloadState(store), FEATURES);
      const upd = await sb.from("profiles").update(profile).eq("id", store.profile.id);
      if (upd.error) throw upd.error;

      // sync searches: delete removed, then upsert current
      const currentIds = searches.filter((s) => s.id).map((s) => s.id);
      const toDelete = store.dbSearchIds.filter((id) => !currentIds.includes(id));
      if (toDelete.length) {
        const del = await sb.from("searches").delete().in("id", toDelete);
        if (del.error) throw del.error;
      }
      const up = await sb.from("searches").upsert(searches).select();
      if (up.error) throw up.error;

      await actions.loadProfile();  // resync ids + snapshot
      store.saveState = "saved";
      clearTimeout(savedTimer);
      savedTimer = setTimeout(() => { if (store.saveState === "saved") store.saveState = "idle"; }, 4000);
    } catch (e) {
      store.saveState = "error";
      store.saveError = (e && e.message) || String(e);
    } finally {
      store.saving = false;
    }
  },

  // ---- Telegram ----
  connectTelegram() {
    const code = store.profile.telegram_link_code;
    if (!code) return;
    window.open("https://t.me/" + CFG.TELEGRAM_BOT_USERNAME + "?start=" + code, "_blank", "noopener");
    actions.startPolling();
  },
  startPolling() {
    if (pollTimer) return;
    store.polling = true; store.pollTimedOut = false;
    pollTimer = setInterval(async () => {
      const { data } = await sb.from("profiles")
        .select("telegram_chat_id, telegram_linked_at").eq("id", store.profile.id).single();
      if (data && data.telegram_linked_at) {
        store.profile.telegram_linked_at = data.telegram_linked_at;
        store.profile.telegram_chat_id = data.telegram_chat_id;
        if (store.lastRow) { store.lastRow.telegram_linked_at = data.telegram_linked_at; store.lastRow.telegram_chat_id = data.telegram_chat_id; }
        actions.stopPolling();
      }
    }, 3000);
    pollGiveUp = setTimeout(() => { if (pollTimer) { actions.stopPolling(); store.pollTimedOut = true; } }, 120000);
  },
  stopPolling() {
    if (pollTimer) clearInterval(pollTimer);
    if (pollGiveUp) clearTimeout(pollGiveUp);
    pollTimer = null; pollGiveUp = null; store.polling = false;
  },
  dismissChecklist() {
    store.checklistDismissed = true;
    try { localStorage.setItem("easyy.checklist." + store.profile.id, "1"); } catch (e) { /* storage unavailable — checklist just shows again next visit */ }
  },

  // ---- History (Phase 2a RPC) ----
  async loadHistory(force) {
    const h = store.history;
    if (!force && h.status === "ready" && Date.now() - h.loadedAt < 60000) return;
    if (!force && h.status === "missing") return;
    h.status = "loading"; h.error = "";
    const { data, error } = await sb.rpc("my_alert_history");
    if (error) {
      h.status = L.isRpcMissing(error) ? "missing" : "error";
      h.error = error.message || "";
      return;
    }
    h.data = data || { last_run: null, jobs: [] };
    h.status = "ready"; h.loadedAt = Date.now();
  },

  // ---- one job's JD (job_details, gated by FEATURES.jdView) ----
  // Meta comes from loaded history when available; a deep link falls back to the
  // jobs table (both under the "you matched this job" RLS policies).
  async loadJob(id) {
    const j = store.job;
    j.status = "loading"; j.error = ""; j.id = id; j.jd = null;
    j.meta = jobMetaFromHistory(id);
    const jdReq = sb.from("job_details").select("jd_text,jd_source,char_count").eq("job_id", id).maybeSingle();
    const metaReq = j.meta ? null : sb.from("jobs").select("id,title,company,location,url,site").eq("id", id).maybeSingle();
    const [jdRes, metaRes] = await Promise.all([jdReq, metaReq]);
    if (store.job !== j || j.id !== id) return;   // navigated away while awaiting
    if (jdRes.error) { j.status = "error"; j.error = jdRes.error.message || "Couldn't load this job."; return; }
    if (!j.meta) {
      if ((metaRes && metaRes.error) || !metaRes || !metaRes.data) {
        j.status = "error"; j.error = "We couldn't find this job — it may have been removed."; return;
      }
      const m = metaRes.data;
      j.meta = { id: m.id, title: m.title, company: m.company, location: m.location, url: m.url, site: m.site, search: null };
    }
    if (jdRes.data && jdRes.data.jd_text) {
      j.jd = { text: jdRes.data.jd_text, source: jdRes.data.jd_source, chars: jdRes.data.char_count };
      j.status = "ready";
      return;
    }
    // Not captured yet → fetch it on demand (the fetch-jd Edge Function does the
    // LinkedIn guest fetch server-side and saves it). Show a working state meanwhile.
    j.status = "fetching";
    const { data: fetched, error: fnErr } = await sb.functions.invoke("fetch-jd", { body: { job_id: id } });
    if (store.job !== j || j.id !== id) return;   // navigated away while awaiting
    if (!fnErr && fetched && fetched.jd_text) {
      j.jd = { text: fetched.jd_text, source: fetched.jd_source, chars: fetched.char_count };
      j.status = "ready";
    } else {
      j.status = "unavailable";   // couldn't fetch (rare / non-LinkedIn) → "open on LinkedIn" fallback
    }
  },

  // ---- master resume (gated by FEATURES.masterResume) ----
  async loadMaster(force) {
    if (!FEATURES.masterResume) return;
    const m = store.master;
    if (!force && m.status === "loading") return;
    if (m.status !== "ready") m.status = "loading";
    m.error = "";
    const { data, error } = await sb.rpc("master_overview");
    if (error) { m.status = "error"; m.error = L.masterError(error); return; }
    m.data = data; m.status = "ready";
    const b = data && data.build;
    if (b && ["queued", "extracting", "merging", "detecting"].indexOf(b.status) !== -1) actions.startBuildPolling();
    else actions.stopBuildPolling();
  },
  startBuildPolling() {
    if (buildPollTimer) return;
    buildPollTimer = setInterval(() => { if (store.route === "resumes") actions.loadMaster(true); else actions.stopBuildPolling(); }, 5000);
  },
  stopBuildPolling() {
    if (buildPollTimer) clearInterval(buildPollTimer);
    buildPollTimer = null;
  },

  async sha256Hex(blob) {
    const buf = await blob.arrayBuffer();
    const hash = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
  },

  // register (caps) → upload → on failure discard the row
  async addResumeBlob(blob, filename, kind) {
    const u = store.upload;
    u.error = ""; u.notice = ""; u.busy = true;
    try {
      const files = (store.master.data && store.master.data.files) || [];
      const cap = (store.master.data && store.master.data.files_cap) || 20;
      const sha = await actions.sha256Hex(blob);
      const local = L.fileCapCheck({ files, cap, size: blob.size, sha256: sha });
      if (local) { u.error = L.masterError(local); return false; }
      const reg = await sb.rpc("register_resume_file", { p_filename: filename, p_kind: kind, p_size_bytes: blob.size, p_sha256: sha });
      if (reg.error) { u.error = L.masterError(reg.error); return false; }
      const { file_id, storage_path } = reg.data;
      const mime = kind === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : kind === "pdf" ? "application/pdf" : "text/plain";
      const up = await sb.storage.from("resumes").upload(storage_path, blob, { contentType: mime, upsert: false });
      if (up.error) {
        const dis = await sb.rpc("discard_resume_file", { p_file_id: file_id });
        if (dis.error) await actions.loadMaster(true);   // cleanup failed → surface the orphan, don't leave it silent
        u.error = L.masterError(up.error, "Upload didn't finish — try again.");
        return false;
      }
      u.notice = "Added " + filename;
      await actions.loadMaster(true);
      return true;
    } catch (e) {
      u.error = L.masterError(e, "Upload didn't finish — try again.");
      return false;
    } finally {
      u.busy = false;
    }
  },
  async uploadResumeFile(file) {
    const kind = L.kindForFile(file && file.name);
    if (!kind) { store.upload.error = L.masterError("bad_kind"); return false; }
    return actions.addResumeBlob(file, file.name, kind);
  },
  async pasteResumeText(text, name) {
    const t = (text || "").trim();
    if (!t) { store.upload.error = "Paste the resume text first."; return false; }
    const blob = new Blob([t], { type: "text/plain" });
    return actions.addResumeBlob(blob, (name || "Pasted resume").trim().slice(0, 120) + ".txt", "text");
  },
  removeResumeFile(file) {
    store.dialog = {
      title: "Remove " + file.filename + "?",
      body: "It stays in your master resume until you rebuild.",
      confirmLabel: "Remove file", cancelLabel: "Keep it", danger: true,
      onConfirm: async () => {
        store.upload.error = "";
        const { data: path, error } = await sb.rpc("remove_resume_file", { p_file_id: file.id });
        if (error) { store.upload.error = L.masterError(error); return; }
        if (path) await sb.storage.from("resumes").remove([path]);   // object removal failure is harmless: row is already soft-deleted
        await actions.loadMaster(true);
      },
    };
  },

  async requestBuild() {
    if (store.buildBusy) return;
    store.buildBusy = true; store.buildError = "";
    try {
      const { error } = await sb.rpc("request_master_build");
      if (error) { store.buildError = L.masterError(error); return; }
      await actions.loadMaster(true);
    } finally {
      store.buildBusy = false;
    }
  },
  async cancelBuild() {
    const b = store.master.data && store.master.data.build;
    if (!b || store.buildBusy) return;
    store.buildBusy = true; store.buildError = "";
    try {
      const { error } = await sb.rpc("cancel_master_build", { p_build_id: b.id });
      if (error) { store.buildError = L.masterError(error); }
      await actions.loadMaster(true);
    } finally {
      store.buildBusy = false;
    }
  },
  openMaster(tab) {
    store.masterTab = tab === "master" ? "master" : "conflicts";
    nav.go("master");
  },

  async loadReview(force) {
    if (!FEATURES.masterResume) return;
    const r = store.review;
    if (!force && r.status === "loading") return;
    if (r.status !== "ready") r.status = "loading";
    r.error = ""; store.reviewError = "";
    if (!store.master.data) await actions.loadMaster(true);
    const master = store.master.data && store.master.data.master;
    if (!master) { r.items = []; r.conflicts = []; r.status = "ready"; return; }
    const [items, conflicts] = await Promise.all([
      sb.from("master_items").select("*, master_item_sources(*)").eq("master_id", master.id).order("sort_order"),
      sb.from("master_conflicts").select("*").eq("master_id", master.id).order("created_at"),
    ]);
    if (items.error || conflicts.error) { r.status = "error"; r.error = L.masterError(items.error || conflicts.error); return; }
    r.items = items.data || []; r.conflicts = conflicts.data || []; r.status = "ready";
  },
  async resolveConflict(conflict, ruling) {
    if (store.reviewBusy[conflict.id]) return false;
    store.reviewBusy = Object.assign({}, store.reviewBusy, { [conflict.id]: true }); store.reviewError = "";
    try {
      const { error } = await sb.rpc("resolve_conflict", { p_conflict_id: conflict.id, p_ruling: ruling });
      if (error) { store.reviewError = L.masterError(error); return false; }
      await actions.loadReview(true);
      actions.loadMaster(true);
      return true;
    } finally {
      const b = Object.assign({}, store.reviewBusy); delete b[conflict.id]; store.reviewBusy = b;
    }
  },
  async setItemStatus(item, status) {
    if (store.reviewBusy[item.id]) return;
    const row = store.review.items.find((x) => x.id === item.id) || item;   // reactive store row
    const prev = row.status;
    row.status = status === "rejected" ? "rejected" : (item.userAdded ? "confirmed" : "extracted");   // optimistic (reactive row)
    store.reviewBusy = Object.assign({}, store.reviewBusy, { [item.id]: true }); store.reviewError = "";
    try {
      const { data, error } = await sb.rpc("set_item_status", { p_item_id: item.id, p_status: status });
      if (error) { row.status = prev; store.reviewError = L.masterError(error); return; }
      row.status = data;
      actions.loadMaster(true);
    } finally {
      const b = Object.assign({}, store.reviewBusy); delete b[item.id]; store.reviewBusy = b;
    }
  },
  async addUserItem(kind, positionKey, text) {
    const t = (text || "").trim();
    if (!t) return false;
    store.reviewError = "";
    const { error } = await sb.rpc("add_user_item", { p_kind: kind, p_position_key: positionKey || null, p_text: t, p_data: {} });
    if (error) { store.reviewError = L.masterError(error); return false; }
    await actions.loadReview(true);
    actions.loadMaster(true);
    return true;
  },

  // ---- account ----
  async updatePassword(password) {
    const { error } = await sb.auth.updateUser({ password });
    return error || null;
  },
  async signOut() {
    actions.stopPolling();
    actions.stopBuildPolling();
    await sb.auth.signOut();
    actions.resetProfile();
    store.route = "home";
    history.replaceState(null, "", location.pathname + location.search + "#/");
  },

  // ---- delete account (Edge Function `delete-account`, gated by FEATURES.deleteAccount) ----
  deleteAccount() {
    if (!FEATURES.deleteAccount || store.deleting) return;
    store.deleteError = "";
    store.dialog = {
      title: "Delete your account?",
      body: "Your searches, alert history and account will be removed and Telegram alerts will stop. This can't be undone.",
      confirmLabel: "Delete my account", cancelLabel: "Keep my account", danger: true,
      onConfirm: () => actions.runDeleteAccount(),
    };
  },
  async runDeleteAccount() {
    store.deleting = true;
    try {
      const { error } = await sb.functions.invoke("delete-account", { method: "POST" });
      if (error) {
        let body = null;
        try { body = error.context && typeof error.context.json === "function" ? await error.context.json() : null; } catch (e) { body = null; }
        store.deleteError = L.deleteAccountError(error, body);
        return;
      }
      // The user no longer exists server-side; clear the local session. supabase-js
      // drops the session even when /logout answers 401/403/404 for a vanished user.
      actions.stopPolling();
      store.signedOutNotice = "Your account has been deleted.";
      await sb.auth.signOut();
      store.session = null;
      actions.resetProfile();
      store.route = "home";
      history.replaceState(null, "", location.pathname + location.search + "#/");
    } finally {
      store.deleting = false;
    }
  },

  // ---- dialog ----
  confirmLeave(onConfirm) {
    store.dialog = {
      title: "You have unsaved changes",
      body: "Leave this page and lose them, or keep editing?",
      confirmLabel: "Discard changes and leave", cancelLabel: "Keep editing", danger: true, onConfirm,
    };
  },
  dialogConfirm() { const d = store.dialog; store.dialog = null; if (d && d.onConfirm) d.onConfirm(); },
  dialogCancel() { store.dialog = null; },
};

// Any edit clears stale validation/save messages so the bar reads "Unsaved changes" again.
Vue.watch(() => store.payloadJson, () => {
  if (store.saveState !== "idle") { store.saveState = "idle"; store.saveError = ""; }
  store.searches.forEach((s) => { if (s._err) s._err = ""; });
  if (store.fieldErrors.full_name || store.fieldErrors.phone || store.fieldErrors.salary) store.fieldErrors = noFieldErrors();
});

// ------------------------------------------------------------------ router
const nav = {
  go(name, id) {
    if (name === store.route && (name !== "job" || id === store.jobId)) return;
    if (store.isDirty) { actions.confirmLeave(() => { actions.discard(); nav.apply(name, id); }); return; }
    nav.apply(name, id);
  },
  apply(name, id) {
    if (name !== "resumes") actions.stopBuildPolling();
    store.route = name;
    if (name === "job" && id !== undefined) store.jobId = id;
    const h = L.routeHash(name, store.jobId);
    if (location.hash !== h) location.hash = h;   // pushes a history entry; the hashchange handler sees name === route and does nothing
    window.scrollTo(0, 0);
  },
};

window.addEventListener("hashchange", () => {
  const r = L.parseRoute(location.hash);
  if (!r) return;                                  // Supabase auth hash or foreign — leave it alone
  if (r.rewrite) history.replaceState(null, "", location.pathname + location.search + "#/");
  if (r.name === store.route && (r.name !== "job" || r.id === store.jobId)) return;
  if (!store.session || store.recoveryMode) { store.route = r.name; if (r.name === "job") store.jobId = r.id; return; }   // auth panel shows; route applies after sign-in
  if (store.isDirty) {
    history.replaceState(null, "", location.pathname + location.search + L.routeHash(store.route, store.jobId));   // put the URL back, then ask
    actions.confirmLeave(() => { actions.discard(); nav.apply(r.name, r.id); });
    return;
  }
  nav.apply(r.name, r.id);
});

window.addEventListener("beforeunload", (e) => {
  if (store.isDirty) { e.preventDefault(); e.returnValue = ""; }
});

// -------------------------------------------------------------------- root
const app = Vue.createApp({
  setup() { return { store, actions, nav, features: FEATURES }; },
  data() {
    return {
      // auth (signed-out panel)
      authView: "signin", authEmail: "", authPassword: "",
      sending: false, authMsg: "", authMsgType: "warn",
      signup: { full_name: "", agree: false },
      signupPhone: "",
      showPw: false,
      dialCountries: window.EASYY_DIAL_COUNTRIES || [],
      // shell
      menuOpen: false,
      navItems: NAV_ITEMS,
    };
  },

  computed: {
    initials() { return L.initials(store.profile.full_name, store.userEmail); },
    shortStatus() { return L.shortStatus(store.status.key); },
    saveLabel() { return store.route === "home" && store.showChecklist ? "Save and continue" : "Save changes"; },
  },

  watch: {
    "store.session"(s) {
      if (!s) {
        this.authView = "signin"; this.authEmail = ""; this.authPassword = ""; this.showPw = false; this.menuOpen = false;
        // A sign-out we caused (account deleted) leaves a one-shot notice for the sign-in panel.
        this.authMsg = store.signedOutNotice || "";
        this.authMsgType = store.signedOutNotice ? "ok" : "warn";
        store.signedOutNotice = "";
      }
    },
  },

  async mounted() {
    const r = L.parseRoute(URL_HASH);
    if (r) {
      store.route = r.name;
      if (r.name === "job") store.jobId = r.id;
      if (r.rewrite) history.replaceState(null, "", location.pathname + location.search + "#/");
    }

    sb.auth.onAuthStateChange((evt, sess) => {
      if (evt === "PASSWORD_RECOVERY") {
        // Arrived via a reset link — show the "set new password" form,
        // not the app, even though a session now exists.
        store.session = sess;
        store.recoveryMode = true;
        this.authView = "reset";
        this.authMsg = "";
        store.booting = false;
        return;
      }
      if (evt === "SIGNED_IN") {
        store.session = sess;
        if (store.recoveryMode) return;
        // supabase-js re-emits SIGNED_IN when the tab regains focus; never reload over unsaved edits.
        if (store.profile.id && store.lastRow && store.lastRow.user_id === sess.user.id) return;
        history.replaceState(null, "", location.pathname + location.search);   // clean auth tokens out of the URL
        actions.loadProfile().then(() => { nav.apply(store.route); actions.loadHistory(false); });
      } else if (evt === "SIGNED_OUT") {
        store.session = null;
        actions.resetProfile();
      } else if (evt === "USER_UPDATED" || evt === "TOKEN_REFRESHED") {
        store.session = sess;
      }
    });

    const { data } = await sb.auth.getSession();
    if (!store.recoveryMode) {
      store.session = data.session;
      if (store.session) {
        await actions.loadProfile();
        if (location.hash !== L.routeHash(store.route, store.jobId)) history.replaceState(null, "", location.pathname + location.search + L.routeHash(store.route, store.jobId));
        actions.loadHistory(false);
      }
    }

    // Surface an expired/invalid link that landed us back here signed-out.
    const hashErr = L.parseHashError(URL_HASH);
    if (hashErr && !store.session) {
      this.authMsg = /expired|invalid/i.test(hashErr)
        ? "That link has expired or was already used. Request a new one below."
        : hashErr;
      this.authMsgType = "warn";
      history.replaceState(null, "", location.pathname + location.search);
    }

    store.booting = false;
  },

  methods: {
    // ---- auth ----
    go(view) {
      this.authView = view;
      this.authMsg = "";
      this.authPassword = ""; this.showPw = false;
    },

    authRedirect() { return location.origin + location.pathname; },

    friendlyAuthError(error) { return L.friendlyAuthError(error); },

    authErr(msg) { this.authMsg = msg; this.authMsgType = "warn"; },

    async signIn() {
      if (!this.authEmail || !this.authPassword) return;
      this.sending = true; this.authMsg = "";
      const { error } = await sb.auth.signInWithPassword({ email: this.authEmail, password: this.authPassword });
      this.sending = false;
      if (error) this.authErr(this.friendlyAuthError(error));
      // success → onAuthStateChange('SIGNED_IN') loads the profile
    },

    async signUp() {
      const s = this.signup;
      const phone = this.signupPhone || "";
      if (!s.full_name) return this.authErr("Please enter your full name.");
      if (!this.authEmail) return this.authErr("Please enter your email.");
      if (!this.authPassword || this.authPassword.length < 8) return this.authErr("Password must be at least 8 characters.");
      if (phone.replace(/\D/g, "").length < 7) return this.authErr("Please enter a valid mobile number.");
      if (!s.agree) return this.authErr("Please agree to the Terms and Privacy Policy to continue.");
      this.sending = true; this.authMsg = "";
      const { data, error } = await sb.auth.signUp({
        email: this.authEmail, password: this.authPassword,
        options: {
          emailRedirectTo: this.authRedirect(),
          data: { full_name: s.full_name, phone },
        },
      });
      this.sending = false;
      if (error) return this.authErr(this.friendlyAuthError(error));
      if (!data.session) {
        // Email confirmation required — no session yet.
        this.authView = "signin";
        this.authPassword = ""; this.showPw = false;
        this.authMsg = "Account created — check your inbox and click the link to confirm your email, then sign in.";
        this.authMsgType = "ok";
      }
      // else onAuthStateChange('SIGNED_IN') takes over
    },

    async sendMagicLink() {
      if (!this.authEmail) return;
      this.sending = true; this.authMsg = "";
      const { error } = await sb.auth.signInWithOtp({
        email: this.authEmail,
        options: { emailRedirectTo: this.authRedirect() },
      });
      this.sending = false;
      if (error) this.authErr(this.friendlyAuthError(error));
      else { this.authMsg = "Check your inbox — we sent a sign-in link to " + this.authEmail + "."; this.authMsgType = "ok"; }
    },

    async sendReset() {
      if (!this.authEmail) return;
      this.sending = true; this.authMsg = "";
      const { error } = await sb.auth.resetPasswordForEmail(this.authEmail, { redirectTo: this.authRedirect() });
      this.sending = false;
      if (error) this.authErr(this.friendlyAuthError(error));
      // Don't reveal whether the email exists.
      else { this.authMsg = "If that email has an account, we've sent a password-reset link. Check your inbox."; this.authMsgType = "ok"; }
    },

    async setNewPassword() {
      if (!this.authPassword) return;
      if (this.authPassword.length < 8) return this.authErr("Password must be at least 8 characters.");
      this.sending = true; this.authMsg = "";
      const { error } = await sb.auth.updateUser({ password: this.authPassword });
      this.sending = false;
      if (error) return this.authErr(this.friendlyAuthError(error));
      store.recoveryMode = false;
      this.authPassword = ""; this.showPw = false;
      history.replaceState(null, "", location.pathname + location.search + "#/");
      await actions.loadProfile();
      actions.loadHistory(false);
    },
  },
});

app.provide("store", store);
app.provide("actions", actions);
app.provide("nav", nav);
app.component("intl-phone", IntlPhone);
Object.keys(window.EasyyViews).forEach((name) => app.component(name, window.EasyyViews[name]));
app.mount("#app");
const bootFail = document.getElementById("boot-fail");
if (bootFail) bootFail.remove();
