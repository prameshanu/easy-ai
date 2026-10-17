/* Easyy Job Alerts — view components.
   Small UI pieces use inline templates; the five views use in-DOM templates
   (<template id="tpl-…"> in index.html). In-DOM templates are parsed by the HTML
   parser, so props are bound kebab-case (:model-value, @update:model-value).
   Loaded after lib.js, before app.js; app.js registers window.EasyyViews. */
(function () {
  "use strict";
  const { inject, computed, ref, watch, onMounted, onUnmounted } = Vue;
  const L = window.EasyyLib;

  // ------------------------------------------------------------- ui pieces
  const UiSwitch = {
    props: { modelValue: Boolean, disabled: Boolean, label: String, size: String },
    emits: ["update:modelValue"],
    template: `<button type="button" role="switch" class="switch" :class="{ on: modelValue, lg: size === 'lg' }"
      :aria-checked="String(!!modelValue)" :aria-label="label || null" :disabled="disabled"
      @click="$emit('update:modelValue', !modelValue)"><span class="knob"></span></button>`,
  };

  // Text input + suggestion list styled like the app's menus (the native <datalist> popup can't be themed).
  const UiSuggest = {
    props: { modelValue: String, suggestions: { type: Array, default: () => [] }, placeholder: String, inputClass: String, id: String, maxlength: [String, Number], label: String },
    emits: ["update:modelValue"],
    data() { return { open: false, hi: -1 }; },
    computed: {
      list() {
        const q = (this.modelValue || "").trim().toLowerCase();
        const all = this.suggestions.filter((s) => s.toLowerCase() !== q);
        return (q ? all.filter((s) => s.toLowerCase().indexOf(q) !== -1) : all).slice(0, 8);
      },
    },
    methods: {
      pick(s) { this.$emit("update:modelValue", s); this.open = false; this.hi = -1; },
      onKey(e) {
        if (!this.open || !this.list.length) { if (e.key === "ArrowDown") { this.open = true; e.preventDefault(); } return; }
        if (e.key === "ArrowDown") { this.hi = (this.hi + 1) % this.list.length; e.preventDefault(); }
        else if (e.key === "ArrowUp") { this.hi = (this.hi - 1 + this.list.length) % this.list.length; e.preventDefault(); }
        else if (e.key === "Enter" && this.hi >= 0) { this.pick(this.list[this.hi]); e.preventDefault(); }
        else if (e.key === "Escape") { this.open = false; }
      },
      onBlur() { setTimeout(() => { this.open = false; this.hi = -1; }, 120); },
    },
    template: `<div class="suggest">
      <input :id="id" type="text" :class="inputClass" :value="modelValue" :placeholder="placeholder" :maxlength="maxlength" :aria-label="label || null"
        autocomplete="off" role="combobox" :aria-expanded="String(open && list.length > 0)"
        @input="$emit('update:modelValue', $event.target.value.trimStart()); open = true; hi = -1" @focus="open = true" @blur="onBlur" @keydown="onKey" />
      <div v-if="open && list.length" class="suggest-menu" role="listbox">
        <div class="suggest-k">From your resume and searches</div>
        <button v-for="(s, i) in list" :key="s" type="button" role="option" class="suggest-opt" :class="{ hi: i === hi }" :aria-selected="String(i === hi)" @mousedown.prevent="pick(s)">{{ s }}</button>
      </div>
    </div>`,
  };

  const UiChip = {
    props: { modelValue: { type: Array, default: () => [] }, value: { type: String, required: true }, label: String },
    emits: ["update:modelValue"],
    computed: { on() { return this.modelValue.indexOf(this.value) !== -1; } },
    methods: {
      toggle() {
        const next = this.on ? this.modelValue.filter((v) => v !== this.value) : this.modelValue.concat(this.value);
        this.$emit("update:modelValue", next);
      },
    },
    template: `<button type="button" class="chip" :class="{ on: on }" :aria-pressed="String(on)" @click="toggle">
      <span v-if="on" class="tick" aria-hidden="true">✓</span>{{ label }}</button>`,
  };

  const UiTags = {
    props: { modelValue: { type: Array, default: () => [] }, placeholder: String },
    emits: ["update:modelValue"],
    data() { return { draft: "" }; },
    methods: {
      commit() {
        const items = L.parseList(this.draft);
        if (!items.length) { this.draft = ""; return; }
        const next = this.modelValue.slice();
        for (const it of items) if (next.indexOf(it) === -1) next.push(it);
        this.$emit("update:modelValue", next);
        this.draft = "";
      },
      remove(i) {
        const next = this.modelValue.slice();
        next.splice(i, 1);
        this.$emit("update:modelValue", next);
      },
      onKey(e) {
        if (e.key === "Enter" || e.key === ",") { e.preventDefault(); this.commit(); }
        else if (e.key === "Backspace" && !this.draft && this.modelValue.length) { this.remove(this.modelValue.length - 1); }
      },
    },
    template: `<div class="tags" @click="$refs.inp.focus()">
      <span v-for="(t, i) in modelValue" :key="t" class="tag">{{ t }}<button type="button" class="x" :aria-label="'Remove ' + t" @click.stop="remove(i)">×</button></span>
      <input ref="inp" type="text" v-model="draft" :placeholder="modelValue.length ? '' : placeholder" @keydown="onKey" @blur="commit" />
    </div>`,
  };

  const UiDialog = {
    props: {
      open: Boolean, title: String, body: String,
      confirmLabel: { type: String, default: "Confirm" }, cancelLabel: { type: String, default: "Cancel" }, danger: Boolean,
    },
    emits: ["confirm", "cancel"],
    watch: { open(v) { if (v) this.$nextTick(() => { if (this.$refs.cancel) this.$refs.cancel.focus(); }); } },
    template: `<div v-if="open" class="dialog-backdrop" @click.self="$emit('cancel')" @keydown.esc="$emit('cancel')">
      <div class="dialog" role="dialog" aria-modal="true" :aria-label="title">
        <h2>{{ title }}</h2>
        <p>{{ body }}</p>
        <div class="dialog-actions">
          <button type="button" class="btn secondary" ref="cancel" @click="$emit('cancel')">{{ cancelLabel }}</button>
          <button type="button" class="btn" :class="{ danger: danger }" @click="$emit('confirm')">{{ confirmLabel }}</button>
        </div>
      </div>
    </div>`,
  };

  // ------------------------------------------------------- staging feedback
  // Port of maverix-agentic FeedbackCapture.vue + composables/useScreenCapture.js +
  // utils/pageContext.js, minus voice dictation, duplicate detection and the retry queue.
  // Mounted only when FEATURES.feedback (config.js turns it on for the staging backend only).
  const FB_HTML_TO_IMAGE = "https://cdn.jsdelivr.net/npm/html-to-image@1.11.13/+esm";
  const fbActions = [];   // last 10 clicks / page changes
  const fbErrors = [];    // last 10 console.error calls
  let fbTrackerInstalled = false;
  let fbCapturing = false;  // html-to-image logs harmless Google-Fonts cssRules errors while capturing; don't record those

  function fbInstallTracker() {
    if (fbTrackerInstalled) return;
    fbTrackerInstalled = true;
    const at = () => Date.now();
    window.addEventListener("hashchange", () => {
      L.pushCapped(fbActions, { kind: "navigate", label: location.hash || "#/", route: location.hash || "#/", at: at() });
    });
    // Clicks only — never typed text (inputs may hold secrets).
    window.addEventListener("click", (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement) || t.closest(".fb-root")) return;
      if (t.matches("input, textarea, select, [contenteditable='true']")) return;
      // Only real controls — a click on a container would log the whole page's text as the label.
      const ctl = t.closest("button, a, [role='button'], [role='tab'], label, summary, select");
      if (!ctl) return;
      const label = L.clickLabel(ctl);
      if (label) L.pushCapped(fbActions, { kind: "click", label, route: location.hash || "#/", at: at() });
    }, true);
    const originalError = console.error.bind(console);
    console.error = (...args) => {
      try { if (!fbCapturing) L.pushCapped(fbErrors, { message: L.errorText(args), at: at() }); } catch (_) { /* never break console.error */ }
      originalError(...args);
    };
  }

  function fbPageContext() {
    // First open dialog that isn't the feedback dialog itself.
    const dlg = Array.from(document.querySelectorAll(".dialog-backdrop .dialog h2, .tr-modal-t, .modal-x"))
      .find((el) => !el.closest(".fb-backdrop") && el.offsetParent !== null);
    // Signed out: the auth card's heading ("Sign in", "Create your account", …); signed in: the page title.
    const head = document.querySelector(".auth-card h1, .auth-card h2, .content-inner h1");
    return {
      route: location.hash || "#/",
      screen: head ? (head.textContent || "").trim().replace(/\s+/g, " ").slice(0, 120) : null,
      activeModal: dlg ? (dlg.textContent || "").trim().slice(0, 120) || "dialog" : null,
      viewport: { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio || 1 },
      theme: document.documentElement.getAttribute("data-theme") || "auto",
      lastUserActions: fbActions.slice(),
      consoleErrors: fbErrors.slice(),
      userAgent: navigator.userAgent,
      capturedAt: new Date().toISOString(),
    };
  }

  // Viewport → PNG blob, with `exclude` elements hidden (visibility, so layout doesn't shift).
  // Google Fonts <link>s are filtered out: Safari refuses to read their cross-origin rules and the
  // whole capture fails (Maverix's fix). Returns { blob } or { error }.
  async function fbCaptureViewport(exclude) {
    const prior = exclude.map((el) => [el, el.style.visibility]);
    exclude.forEach((el) => { el.style.visibility = "hidden"; });
    fbCapturing = true;
    try {
      const { toBlob } = await import(FB_HTML_TO_IMAGE);
      const blob = await toBlob(document.documentElement, {
        backgroundColor: getComputedStyle(document.body).backgroundColor || "#ffffff",
        pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        width: window.innerWidth,
        height: window.innerHeight,
        cacheBust: false,
        filter: (node) => {
          if (!(node instanceof HTMLElement)) return true;
          if (node.tagName === "LINK") {
            const href = node.getAttribute("href") || "";
            if (href.includes("fonts.googleapis.com") || href.includes("fonts.gstatic.com")) return false;
          }
          return true;
        },
      });
      if (!blob) throw new Error("html-to-image returned no image");
      return { blob };
    } catch (e) {
      return { error: (e && e.message) || String(e) };
    } finally {
      fbCapturing = false;
      prior.forEach(([el, v]) => { el.style.visibility = v; });
    }
  }

  const UiFeedback = {
    setup() {
      const actions = inject("actions");
      const open = ref(false), capturing = ref(false), sending = ref(false);
      const text = ref(""), severity = ref("bug");
      const shotUrl = ref(""), shotError = ref(""), sendError = ref(""), sent = ref(null);
      const wrap = ref(null);
      let shotBlob = null;
      onMounted(fbInstallTracker);
      const revoke = () => { if (shotUrl.value) URL.revokeObjectURL(shotUrl.value); shotUrl.value = ""; };

      async function show() {
        // Keep typed text across an accidental close; reset everything else.
        severity.value = "bug"; sendError.value = ""; shotError.value = ""; sent.value = null;
        shotBlob = null; revoke();
        open.value = true; capturing.value = true;
        await Vue.nextTick();
        const r = await fbCaptureViewport(wrap.value ? [wrap.value] : []);
        capturing.value = false;
        if (r.blob) { shotBlob = r.blob; shotUrl.value = URL.createObjectURL(r.blob); } else shotError.value = r.error || "";
      }
      function close() { open.value = false; revoke(); if (sent.value) text.value = ""; }

      async function submit() {
        const t = text.value.trim();
        if (!t) { sendError.value = "Tell us what's going on first."; return; }
        if (t.length > 4000) { sendError.value = "Please keep it under 4000 characters."; return; }
        sending.value = true; sendError.value = "";
        const fd = new FormData();
        fd.append("text", t);
        fd.append("severity", severity.value);
        fd.append("page_context", JSON.stringify(fbPageContext()));
        fd.append("reporter_url", location.href);
        if (shotBlob) fd.append("screenshot", shotBlob, "feedback-" + Date.now() + ".png");
        const r = await actions.submitFeedback(fd);
        sending.value = false;
        if (r.error) { sendError.value = r.error; return; }
        sent.value = r;
        text.value = "";
      }
      return { open, capturing, sending, text, severity, shotUrl, shotError, sendError, sent, wrap, show, close, submit };
    },
    template: `<div class="fb-root">
      <button v-if="!open" type="button" class="fb-fab" title="Send feedback to the team" aria-label="Send feedback" @click="show">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
      </button>
      <div ref="wrap" v-show="open" class="dialog-backdrop fb-backdrop" @click.self="close" @keydown.esc="close">
        <div class="dialog fb-dialog" role="dialog" aria-modal="true" aria-label="Send feedback">
          <h2>Send feedback</h2>
          <template v-if="sent">
            <p>Thanks, that's with the team.<template v-if="sent.number"> Filed as #{{ sent.number }}.</template></p>
            <div class="dialog-actions"><button type="button" class="btn" @click="close">Close</button></div>
          </template>
          <template v-else>
            <p class="fb-helper">What's broken or confusing? A sentence or two is plenty. We attach a screenshot and the page you're on automatically.</p>
            <label class="fb-label" for="fb-text">What happened <span class="fb-count">{{ text.length }} / 4000</span></label>
            <textarea id="fb-text" v-model="text" rows="5" maxlength="4000" placeholder="e.g. Save and close did nothing after I added a role."></textarea>
            <label class="fb-label" for="fb-sev">How bad is it?</label>
            <select id="fb-sev" v-model="severity">
              <option value="minor">Minor: confusing, but I worked around it</option>
              <option value="bug">Bug: something doesn't behave right</option>
              <option value="broken">Broken: I can't do what I came to do</option>
            </select>
            <span class="fb-label">Screen capture</span>
            <div v-if="capturing" class="fb-shot-state">Capturing…</div>
            <img v-else-if="shotUrl" :src="shotUrl" alt="Screenshot of the page you're on" class="fb-shot-img" />
            <div v-else class="fb-shot-state fb-shot-warn">Couldn't capture a screenshot. Sending without one is fine.<code v-if="shotError">{{ shotError }}</code></div>
            <p v-if="sendError" class="fb-error" role="alert">{{ sendError }}</p>
            <div class="dialog-actions">
              <button type="button" class="btn secondary" :disabled="sending" @click="close">Cancel</button>
              <button type="button" class="btn" :disabled="sending || capturing || !text.trim()" @click="submit">{{ sending ? 'Sending…' : 'Send feedback' }}</button>
            </div>
          </template>
        </div>
      </div>
    </div>`,
  };

  // ------------------------------------------------------------------ views
  const ViewHome = {
    template: "#tpl-home",
    setup() {
      const store = inject("store");
      const actions = inject("actions");
      const nav = inject("nav");
      // Overview: pull real counts for the hero, setup cards and flow row.
      onMounted(() => {
        actions.loadHistory(false);
        if (store.features.masterResume) actions.loadMaster(false);
        if (store.features.tailorResume) actions.loadTailored(false);
        actions.loadMailbox(false);
      });
      const ovJobs = computed(() => ((store.history.data && store.history.data.jobs) || []).length);
      const ovTailored = computed(() => ((store.tailored && store.tailored.rows) || []).length);
      const ovFiles = computed(() => ((store.master.data && store.master.data.files) || []).length);
      const ovFilesCap = computed(() => L.fileCap(store.profile.plan));
      const ovRoles = computed(() => store.searches.length);
      const ovRolesCap = computed(() => L.planLimit(store.profile.plan));
      const ovFacts = computed(() => (store.master.data && store.master.data.item_count) || 0);
      const telegramLinked = computed(() => !!store.telegramLinked);
      // Setup step 3 = alert delivery ("Configure connections"): done once any channel is on.
      // Step 3 opens the Connections card on Your profile.
      const openConnections = () => { store.focusSection = "connections"; nav.go("settings"); };
      const connState = computed(() => {
        const on = [store.telegramLinked && "Telegram", store.profile.email_enabled && "Email digest", store.mailbox.data && store.mailbox.data.status === "verified" && "Gmail"].filter(Boolean);
        return on.length ? on.join(" + ") + " on" : "Not connected";
      });
      const setupDone = computed(() => [ovFiles.value > 0, ovRoles.value > 0, telegramLinked.value || !!store.profile.email_enabled].filter(Boolean).length);
      // V17 hero: today / this week / last 14 days, all counted off real history + tailored rows.
      const ov = computed(() => L.overviewCounts(store.history.data && store.history.data.jobs, store.tailored && store.tailored.rows));
      const weekOf = computed(() => L.weekOfLabel());
      const plural = (n, one, many) => n + " " + (n === 1 ? one : many);
      const heroLede = computed(() => {
        const c = ov.value;
        if (!c.today) return "Your searches run every morning across LinkedIn, Indeed and Google Jobs. New matches land here ranked by fit, each one a click away from a resume tailored from your master.";
        const ready = c.tailoredToday;
        const rest = c.today - ready;
        return "All of it while you were at work. " +
          (ready ? plural(ready, "resume is", "resumes are") + " already tailored and ready to read" + (rest > 0 ? "; the other " + plural(rest, "job is", "jobs are") + " one click from theirs." : ".")
                 : "Open any job to see what easyy read, and tailor a resume for it in one click.");
      });
      const handTime = computed(() => L.handTimeText(ov.value.tailoredToday));
      // V17 headline: "Five jobs found. Five resumes already tailored." Honest zero states instead of "0 jobs found".
      const headline = computed(() => {
        const c = ov.value, W = (n) => L.numberWord(n, true);
        const noun = (n, one, many) => (n === 1 ? one : many);
        if (c.today) {
          return { main: W(c.today) + " " + noun(c.today, "job", "jobs") + " found.",
                   lift: c.tailoredToday ? W(c.tailoredToday) + " " + noun(c.tailoredToday, "resume", "resumes") + " already tailored."
                                         : "None tailored yet." };
        }
        if (c.week) return { main: "No new jobs yet today.", lift: W(c.week) + " found this week." };
        return { main: "No new jobs yet.", lift: "Your next run is on its way." };
      });
      // Run card row 3 detail: "Pulled from master v1 — 63 facts, built 3 Sept from 4 source resumes".
      const masterLine = computed(() => {
        const d = store.master.data || {};
        if (!d.master || !d.master.current_build_id) return "Build your master resume to start tailoring";
        const files = (d.files || []).filter((f) => f.in_master);
        const at = d.build && d.build.finished_at ? new Date(d.build.finished_at) : null;
        return "Pulled from master v" + (d.master.version || 1) + ", " + plural(ovFacts.value, "fact", "facts") +
          (at && !isNaN(at) ? ", built " + at.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "") +
          (files.length ? " from " + plural(files.length, "source resume", "source resumes") : "");
      });
      // Run card: this run's own new-job count (runs.new_jobs); falls back to today's count.
      const runJobs = computed(() => (store.lastRun && store.lastRun.newJobs != null ? store.lastRun.newJobs : ov.value.today));
      const runTitle = computed(() => {
        const r = store.lastRun;
        if (!r || !r.at) return "Your latest run";
        const d = new Date(r.at), n = new Date();
        return d.toDateString() === n.toDateString() && d.getHours() < 12 ? "This morning's run" : "Your latest run";
      });
      return {
        store, actions, nav,
        features: store.features,
        countries: store.countries,
        status: computed(() => store.status),
        ovJobs, ovTailored, ovFiles, ovFilesCap, ovRoles, ovRolesCap, ovFacts, telegramLinked, setupDone,
        ov, weekOf, heroLede, handTime, runTitle, plural, runJobs, masterLine, headline, openConnections, connState,
        myInitials: computed(() => L.initials(store.profile.full_name, store.userEmail)),
        lastRun: computed(() => store.lastRun),
        searchNames: computed(() => store.searches.map((s) => s.name || s.query).filter(Boolean).join(" · ")),
      };
    },
  };

  const ViewHistory = {
    template: "#tpl-history",
    setup() {
      const store = inject("store");
      const actions = inject("actions");
      const nav = inject("nav");
      const filter = ref("");
      const h = computed(() => store.history);
      const grouped = computed(() => L.groupHistory((store.history.data && store.history.data.jobs) || [], { filterSearch: filter.value, alerts: (store.history.data && store.history.data.alerts) || null }));
      const lastRun = computed(() => store.lastRun);
      const channels = computed(() => L.channelsText(store.telegramLinked, store.profile.email_enabled) || "you");
      const opened = ref({});
      const touched = ref(false);
      const selectedId = ref(null);
      const job = computed(() => store.job || {});
      const windowDays = computed(() => L.historyWindowDays(store.profile.plan));
      const isPremium = computed(() => store.profile.plan === "premium");
      const jobs = computed(() => {
        const g = grouped.value, out = [], seen = new Set();
        const push = (arr) => { for (const j of arr || []) if (j && !seen.has(j.id)) { seen.add(j.id); out.push(j); } };
        if (g.pending) push(g.pending.jobs);
        for (const day of g.days || []) for (const ev of day.events || []) push(ev.jobs);
        // Plan-gated window (UX mirror of the server clamp in my_alert_history). Keep undated rows.
        const cut = Date.now() - windowDays.value * 86400000;
        return out.filter((j) => { const t = Date.parse(j.matched_at || j.notified_at); return isNaN(t) || t >= cut; });
      });
      const sel = computed(() => jobs.value.find((j) => j.id === selectedId.value) || null);
      const jobGroups = computed(() => {
        const now = Date.now();
        const order = ["Today", "Yesterday", "This week", "Last week", "This month", "Earlier"];
        const buckets = {};
        for (const j of jobs.value) {
          const label = L.timeBucket(j.matched_at || j.notified_at, now);
          (buckets[label] = buckets[label] || []).push(j);
        }
        return order.filter((l) => buckets[l]).map((l) => ({ label: l, jobs: buckets[l] }));
      });
      const bucketFilter = ref("");
      const visibleGroups = computed(() => bucketFilter.value ? jobGroups.value.filter((g) => g.label === bucketFilter.value) : jobGroups.value);
      const collapsed = ref({});
      const bucketsTouched = ref(false);
      watch(jobGroups, (groups) => {
        if (bucketsTouched.value) return;
        const c = {};
        (groups || []).forEach((g, i) => { if (i > 0) c[g.label] = true; });   // collapse all but the newest
        collapsed.value = c;
      }, { immediate: true });
      const toggleBucket = (label) => { bucketsTouched.value = true; collapsed.value = Object.assign({}, collapsed.value, { [label]: !collapsed.value[label] }); };
      const isCollapsed = (label) => !!collapsed.value[label] && !bucketFilter.value;
      const masterTerms = computed(() => {
        const items = (store.review && store.review.items) || [];
        const raw = [];
        for (const it of items) if (it && it.kind === "skill" && it.text) raw.push(it.text);
        return L.cleanTerms(raw);   // splits compound phrases + drops filler/one-char/dupes
      });
      const select = (j) => { if (!j) return; selectedId.value = j.id; if (store.features.jdView) actions.loadJob(j.id); };
      watch(jobs, (list) => { if (!selectedId.value && list.length) select(list[0]); if (list.length) actions.loadJobJds(list); }, { immediate: true });

      // "What you're targeting" — saved searches as role chips; "Manage roles" opens the full
      // search editor + filters (moved here from the Overview). Opens by itself until a search is saved.
      const targetOpen = ref(store.dbSearchIds.length === 0);
      watch(() => store.dbSearchIds.length, (n, was) => { if (n === 0) targetOpen.value = true; else if (!was) targetOpen.value = false; });
      const planLimit = computed(() => L.planLimit(store.profile.plan));
      // "Done" saves (with the same validation as the save bar) and only closes when everything is valid,
      // so a half-filled search can't be hidden behind the collapsed card.
      async function toggleManage() {
        if (!targetOpen.value) { targetOpen.value = true; return; }
        if (store.isDirty) {
          await actions.save();
          if (store.saveState === "invalid" || store.saveState === "error") {
            setTimeout(() => { const el = document.querySelector(".target-editor .search.invalid"); if (el) el.scrollIntoView({ behavior: "smooth", block: "center" }); }, 30);
            return;
          }
        }
        targetOpen.value = false;
      }
      // A failed save (from the save bar too) re-opens the editor so the highlighted fields are visible.
      watch(() => store.searches.some((s) => s._err), (bad) => { if (bad) targetOpen.value = true; });
      // GCC location picker + role suggestions for the search editor.
      const locOf = (s) => L.parseGccLocation(s.location);
      const gccOf = (s) => L.GCC.find((c) => c.name === locOf(s).country);
      const setCountry = (s, country) => { s.location = country ? L.composeGccLocation(country, "") : s.location; };
      const setCity = (s, city) => { const p = locOf(s); if (p.country && p.country !== "GCC") s.location = L.composeGccLocation(p.country, city); };
      // Job description preview: first ~12 lines, "View the full job description ▾" expands (no LLM).
      const jdOpen = ref(false);
      const jdLong = computed(() => {
        const t = (job.value.jd && job.value.jd.text) || "";
        return t.split("\n").length > 12 || t.length > 1100;
      });
      watch(selectedId, () => { jdOpen.value = false; });
      const roleSuggest = computed(() => L.roleSuggestions(store.review && store.review.items, store.searches));
      const removeTarget = (i) => actions.removeSearch(i);
      watch(grouped, (g) => {
        if (touched.value) return;
        const first = g.pending ? "pending" : (g.days[0] && g.days[0].events[0] ? g.days[0].events[0].key : null);
        opened.value = first ? { [first]: true } : {};
      }, { immediate: true });
      onMounted(() => { actions.loadHistory(false); if (store.features.masterResume) actions.loadReview(false); if (store.features.tailorResume) actions.loadTailored(false); });
      const SITES = { linkedin: "LinkedIn", indeed: "Indeed", google: "Google" };
      const scoreFor = (j) => {
        if (!j) return null;
        const terms = masterTerms.value;
        if (!terms.length) return null;
        const jd = (j.id === selectedId.value && job.value.jd && job.value.jd.text) || store.jobJds[j.id];
        return jd ? L.matchScore(jd, terms) : null;
      };
      return {
        store, actions, nav, filter, h, grouped, lastRun, channels,
        features: store.features,
        jobs, jobGroups, visibleGroups, bucketFilter, toggleBucket, isCollapsed, sel, job, selectedId, select, masterTerms, targetOpen, planLimit, removeTarget, toggleManage,
        gcc: L.GCC, locOf, setCountry, setCity, roleSuggest, jdOpen, jdLong, locLabel: L.locationLabel,
        citiesOf: (s) => (gccOf(s) ? gccOf(s).cities : []), cityLabel: (s) => (gccOf(s) ? gccOf(s).label : "City"), countryShort: (s) => (gccOf(s) ? gccOf(s).short : "the country"),
        freeLimit: L.planLimit("free"), premiumLimit: L.planLimit("premium"), freeDays: L.historyWindowDays("free"), premiumDays: L.historyWindowDays("premium"), premiumPrice: L.PREMIUM_PRICE, countries: store.countries, windowDays, isPremium,
        scoreFor,
        scoreBand: (j) => L.scoreBand(scoreFor(j)),
        postedAgo: (j) => L.timeAgo(j && (j.matched_at || j.notified_at)),
        postedOn: (j) => L.formatDateTime(j && (j.matched_at || j.notified_at)),
        jdHtml: () => {
          const jd = job.value.jd && job.value.jd.text;
          return jd ? L.highlightTerms(jd, masterTerms.value) : "";
        },
        resumeFor: (j) => {
          if (!j) return null;
          const rows = (store.tailored && store.tailored.rows) || [];
          return rows.find((r) => r.job_id === j.id) || null;
        },
        checklist: (j) => {
          const rows = (store.tailored && store.tailored.rows) || [];
          const tailored = j ? rows.find((r) => r.job_id === j.id) : null;
          const jdReady = !!(j && j.id === selectedId.value && job.value.jd);
          const facts = tailored ? L.factsUsedCount(tailored) : null;
          const st = tailored && tailored.status;
          const open = () => nav.go("tailored", tailored.id);
          // The resume row is the action: tailor / follow progress / open the result.
          let resume;
          if (!tailored) {
            resume = store.features.tailorResume
              ? { key: "resume", label: "Tailor resume", cta: "→", done: false, act: () => actions.tailorFromJob(j), primary: true }
              : { key: "resume", label: "Tailor resume (being connected)", done: false };
          } else if (st === "ready") {
            resume = { key: "resume", label: "Resume tailored" + (facts != null ? " · " + facts + " facts" : ""), cta: "See →", done: true, act: open };
          } else if (st === "failed" || st === "cancelled") {
            resume = { key: "resume", label: "Tailoring stopped", cta: "See why →", done: false, act: open, warn: true };
          } else {
            resume = { key: "resume", label: "Tailoring your resume…", cta: "Progress →", done: false, act: open, busy: true };
          }
          return [
            { key: "jd", label: "Full JD read and parsed", done: jdReady },
            resume,
            { key: "pdf", label: "PDF ready to attach", done: !!(tailored && tailored.pdf_path), act: tailored && tailored.pdf_path ? open : null, cta: tailored && tailored.pdf_path ? "Open →" : "" },
            { key: "mail", label: "Outreach email drafted", done: false, soon: true },
          ];
        },
        isOpen: (k) => !!opened.value[k],
        toggle(k) { touched.value = true; opened.value = Object.assign({}, opened.value, { [k]: !opened.value[k] }); },
        salary: (j) => L.formatSalary(j.salary_min, j.salary_max, j.currency),
        siteLabel: (s) => SITES[s] || (s || ""),
        srcClass: (s) => ({ linkedin: "src-li", indeed: "src-in" }[s] || ""),
        meta: (j) => [j.company, j.location, L.formatSalary(j.salary_min, j.salary_max, j.currency)].filter(Boolean).join(" · "),
        chanParts: (ev) => L.channelParts(ev.channels),
        eventTitle: (ev) => ev.kind === "daily"
          ? "Daily digest · " + ev.jobCount + " " + (ev.jobCount === 1 ? "job" : "jobs")
          : ev.jobCount + " new " + (ev.jobCount === 1 ? "job" : "jobs"),
      };
    },
  };

  const ViewJob = {
    template: "#tpl-job",
    setup() {
      const store = inject("store");
      const actions = inject("actions");
      const nav = inject("nav");
      const job = computed(() => store.job);
      const SITES = { linkedin: "LinkedIn", indeed: "Indeed", google: "Google" };
      // Reload whenever the routed job id changes (the view instance is reused).
      watch(() => store.jobId, (id) => { if (id) actions.loadJob(id); }, { immediate: true });
      return {
        store, actions, nav, job, features: store.features,
        siteLabel: (s) => SITES[s] || (s || ""),
        metaLine: (m) => (m ? [m.company, m.location, SITES[m.site] || m.site].filter(Boolean).join(" · ") : ""),
      };
    },
  };

  const ViewResume = {
    template: "#tpl-resume",
    setup() {
      const store = inject("store"), actions = inject("actions"), nav = inject("nav");
      onMounted(() => { if (store.features.masterResume) actions.loadMaster(false); });
      return { store, actions, nav, features: store.features };
    },
  };

  // Shared "Source resumes" card (Tailored resumes screen, empty and filled): upload / paste /
  // drag-drop + plan cap + master build status. Logic moved unchanged from the old Resumes page.
  const UiSources = {
    template: "#tpl-sources",
    setup() {
      const store = inject("store"), actions = inject("actions");
      const pasteOpen = ref(false), pasteText = ref(""), pasteName = ref("");
      const picker = ref(null);
      const ov = computed(() => store.master.data || {});
      const files = computed(() => (store.master.data && store.master.data.files) || []);
      const stage = computed(() => L.buildStageLabel(store.master.data && store.master.data.build));
      const building = computed(() => stage.value.state === "queued" || stage.value.state === "running");
      const failCopy = computed(() => L.buildFailureCopy(store.master.data && store.master.data.build));
      const dragging = ref(false);
      async function onPick(e) {
        const list = Array.from(e.target.files || []);
        e.target.value = "";
        for (const f of list) { const ok = await actions.uploadResumeFile(f); if (!ok) break; }
      }
      async function onDrop(e) {
        dragging.value = false;
        if (building.value || store.upload.busy) return;
        const list = Array.from((e.dataTransfer && e.dataTransfer.files) || []);
        for (const f of list) { const ok = await actions.uploadResumeFile(f); if (!ok) break; }
      }
      const planKey = computed(() => store.profile.plan || "free");
      const fileCap = computed(() => L.fileCap(planKey.value));
      async function doPaste() {
        const ok = await actions.pasteResumeText(pasteText.value, pasteName.value);
        if (ok) { pasteOpen.value = false; pasteText.value = ""; pasteName.value = ""; }
      }
      return {
        store, actions, ov, files, stage, building, failCopy, pasteOpen, pasteText, pasteName, picker,
        onPick, onDrop, dragging, planKey, fileCap, doPaste, premiumPrice: L.PREMIUM_PRICE,
        size: (b) => L.fileSizeText(b || 0),
        when: (iso) => (iso ? new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""),
      };
    },
  };

  // Tailored resumes landing: opens the latest tailored resume (one-screen model, latest prototype).
  // With none yet it shows the paste card, the source resumes and an empty state.
  const ViewResumes = {
    template: "#tpl-resumes",
    setup() {
      const store = inject("store"), actions = inject("actions"), nav = inject("nav");
      const ov = computed(() => store.master.data || {});
      const masterFiles = computed(() => ((store.master.data && store.master.data.files) || []).filter((f) => f.in_master).length);
      onMounted(() => {
        if (store.features.masterResume) actions.loadMaster(true);
        if (store.features.tailorResume) actions.loadTailored(true);
      });
      watch(() => [store.tailored.status, store.tailored.rows.length], () => {
        const rows = store.tailored.rows || [];
        if (store.route === "resumes" && store.tailored.status === "ready" && rows.length) nav.replace("tailored", rows[0].id);
      }, { immediate: true });
      return {
        store, actions, nav, features: store.features, ov, masterFiles,
        plural: (n, one, many) => (n === 1 ? "one " + one : (L.numberWord(n) + " " + many)),
      };
    },
  };

  const KIND_LABELS = { numeric: "Different figures", title: "Job title", dates: "Dates", cert_date: "Certification date", education: "Education", entity: "Employer name" };

  const ViewMaster = {
    template: "#tpl-master",
    setup() {
      const store = inject("store"), actions = inject("actions"), nav = inject("nav");
      const r = computed(() => store.review);
      const choice = ref({}), custom = ref({}), open = ref({}), addOpen = ref(""), addText = ref({});
      const focusId = ref(null);
      const openConflicts = computed(() => r.value.conflicts.filter((c) => c.status === "open"));
      const progress = computed(() => L.conflictProgress(r.value.conflicts));
      const sections = computed(() => L.groupItemsBySection(r.value.items));
      const factCount = computed(() => r.value.items.filter((i) => i.status !== "rejected").length);
      const filesById = computed(() => { const o = {}; ((store.master.data && store.master.data.files) || []).forEach((f) => { o[f.id] = f.filename; }); return o; });
      onMounted(() => { actions.loadReview(true); });
      watch(openConflicts, (list) => { focusId.value = list[0] ? list[0].id : null; }, { immediate: true });
      function rulingFor(c) {
        const v = choice.value[c.id];
        if (!v) return null;
        if (v === "both") return L.rulingFromForm("both");
        if (v === "custom") return L.rulingFromForm("custom", null, custom.value[c.id]);
        return L.rulingFromForm("option", parseInt(v.slice(1), 10));
      }
      async function save(c) {
        const ruling = rulingFor(c);
        if (!ruling) return;
        const ok = await actions.resolveConflict(c, ruling);
        if (ok) { delete choice.value[c.id]; delete custom.value[c.id]; }
      }
      async function addFact(kind, parent) {
        const key = kind === "bullet" ? "bullet:" + parent.id : kind;
        const ok = await actions.addUserItem(kind, parent ? parent.position_key : null, addText.value[key]);
        if (ok) { addText.value[key] = ""; addOpen.value = ""; }
      }
      const secCol = ref({});   // per-section collapse (keyed by sec.kind); default expanded
      return {
        store, actions, nav, r, choice, custom, open, addOpen, addText, focusId, openConflicts, progress, sections, factCount,
        rulingFor, save, addFact, secCol,
        toggleSec(k) { secCol.value = Object.assign({}, secCol.value, { [k]: !secCol.value[k] }); },
        toggle(id) { open.value = Object.assign({}, open.value, { [id]: !open.value[id] }); },
        kindLabel: (k) => KIND_LABELS[k] || k,
        fileName: (id) => filesById.value[id] || "a removed file",
        fileNames(ids) { return (ids || []).map((id) => filesById.value[id]).filter(Boolean).slice(0, 3).join(", "); },
        posLabel(it) { const d = it.data || {}; return [d.employer, d.title, [d.start, d.end].filter(Boolean).join(" – ")].filter(Boolean).join(" · ") || it.canonical; },
      };
    },
  };

  const ViewTailored = {
    template: "#tpl-tailored",
    setup() {
      const store = inject("store"), actions = inject("actions"), nav = inject("nav");
      const run = computed(() => store.tailorRun);
      const stage = computed(() => L.tailorStageLabel(store.tailorRun.row));
      const running = computed(() => stage.value.state === "queued" || stage.value.state === "running");
      const failCopy = computed(() => L.tailorFailureCopy(store.tailorRun.row));
      const fitText = computed(() => L.fitLine((store.tailorRun.row || {}).fit));
      const ats = computed(() => (store.tailorRun.row || {}).ats || {});
      const gaps = computed(() => L.gapLists(store.tailorRun.row, store.tailorRun.answers));
      const facts = computed(() => L.usedFacts(store.tailorRun.row));
      const jdMeta = computed(() => (store.tailorRun.row || {}).jd_meta || {});
      // per-gap local form state: which gap is answering, its note + position pick
      const answering = ref(""), note = ref(""), posKey = ref("");
      const editing = ref(null), editText = ref("");     // draft being edited (answer id)
      const guide = ref("");                              // regenerate guidance
      watch(() => store.tailoredId, (id) => {
        answering.value = ""; editing.value = null; guide.value = "";
        if (id) actions.loadTailorRun(id);
      }, { immediate: true });
      function startYes(g) { answering.value = g.keyword; note.value = ""; posKey.value = ""; }
      async function sendYes(g, skip) {
        await actions.answerGap(g, "yes", skip ? "" : note.value, skip ? null : posKey.value);
        answering.value = "";
      }
      function startEdit(a) { editing.value = a.id; editText.value = a.draft_text || ""; }
      async function approve(a, edited) {
        await actions.approveDraft(a, edited ? editText.value : a.draft_text);
        editing.value = null;
      }
      const answeredSinceReady = computed(() =>
        (store.tailorRun.answers || []).some((a) => a.tailor_id === (store.tailorRun.row || {}).id
          && (a.status === "approved" || (a.status === "recorded" && a.answer === "yes"))));

      // Inline PDF viewer (blob object URL) + pop-out modals.
      const pdfUrl = ref(null), pdfLoading = ref(false);
      const openReport = ref(false), openMaster = ref(false), openFull = ref(false);
      function revokePdf() { if (pdfUrl.value) { URL.revokeObjectURL(pdfUrl.value); pdfUrl.value = null; } }
      watch(() => [store.tailoredId, stage.value.state], async ([id, st]) => {
        if (st !== "ready" || !store.tailorRun.row || pdfUrl.value || pdfLoading.value) return;
        pdfLoading.value = true;
        const u = await actions.tailorPdfUrl(store.tailorRun.row);
        pdfLoading.value = false;
        if (store.tailorRun.row && store.tailorRun.row.id === id) pdfUrl.value = u;
        else if (u) URL.revokeObjectURL(u);
      }, { immediate: true });
      watch(() => store.tailoredId, () => { revokePdf(); openReport.value = false; openMaster.value = false; openFull.value = false; });
      onUnmounted(revokePdf);
      function openResumeInTab() { if (pdfUrl.value) window.open(pdfUrl.value, "_blank", "noopener"); }
      // One-screen model (latest prototype): source card, job switcher, JD pop-out, master panel.
      onMounted(() => {
        if (store.features.masterResume) actions.loadMaster(false);
        actions.loadTailored(false);
      });
      const rows = computed(() => (store.tailored && store.tailored.rows) || []);
      const ctxIndex = computed(() => rows.value.findIndex((t) => t.id === store.tailoredId));
      const step = (d) => { const t = rows.value[ctxIndex.value + d]; if (t) nav.go("tailored", t.id); };
      const chipLabel = (t) => { const m = t.jd_meta || {}; return m.company || m.title || "Pasted job"; };
      const jdOpen = ref(false);
      watch(() => store.tailoredId, () => { jdOpen.value = false; });
      // Job-linked resumes open the job (highlighted JD, actions); pasted ones show the JD in a pop-out.
      const openJd = () => { const r = store.tailorRun.row || {}; if (r.job_id) nav.go("job", r.job_id); else jdOpen.value = true; };
      const masterData = computed(() => store.master.data || {});
      const masterTotal = computed(() => masterData.value.item_count || 0);
      const openQuestions = computed(() => masterData.value.open_conflicts || 0);
      const sourceNames = computed(() => ((masterData.value.files || []).filter((f) => f.in_master)).map((f) => String(f.filename || "").replace(/\.(pdf|docx|txt)$/i, "")));
      const filesWord = computed(() => { const n = sourceNames.value.length; return n === 1 ? "one resume" : L.numberWord(n) + " resumes"; });
      const masterBuilt = computed(() => { const b = masterData.value.build; return b && b.finished_at ? new Date(b.finished_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""; });
      // Compact master summary for the right rail / browse modal.
      const masterInfo = computed(() => {
        const r = store.tailorRun.row || {};
        return { version: r.master_version, facts: (facts.value || []).reduce((n, p) => n + (p.bullets || []).length, 0) };
      });

      return {
        store, actions, nav, features: store.features, run, stage, running, failCopy, fitText, ats,
        gaps, facts, jdMeta, answering, note, posKey, editing, editText, guide,
        startYes, sendYes, startEdit, approve, answeredSinceReady,
        pdfUrl, pdfLoading, openReport, openMaster, openFull, openResumeInTab, masterInfo,
        rows, ctxIndex, step, chipLabel, jdOpen, openJd, masterTotal, openQuestions, sourceNames, filesWord, masterBuilt,
        paperMeta: computed(() => {
          const fit = (store.tailorRun.row || {}).fit || {};
          const pages = fit.pages ? fit.pages + (fit.pages === 1 ? " page" : " pages") : "";
          return [masterInfo.value.facts + (masterTotal.value ? " of " + masterTotal.value : "") + " facts used", pages, "ready to attach"].filter(Boolean).join(" · ");
        }),
        posLabel: (p) => { const d = p.data || {}; return [d.employer, d.title].filter(Boolean).join(" · ") || p.text; },
        when: (iso) => (iso ? new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""),
      };
    },
  };

  const ViewSettings = {
    template: "#tpl-settings",
    setup() {
      const store = inject("store");
      const actions = inject("actions");
      const pwOpen = ref(false), pw = ref(""), showPw = ref(false), pwBusy = ref(false), pwMsg = ref(""), pwMsgType = ref("ok");
      async function submitPw() {
        if (pw.value.length < 8) { pwMsgType.value = "warn"; pwMsg.value = "Password must be at least 8 characters."; return; }
        pwBusy.value = true; pwMsg.value = "";
        const error = await actions.updatePassword(pw.value);
        pwBusy.value = false;
        if (error) {
          pwMsgType.value = "warn";
          pwMsg.value = L.friendlyAuthError(error);
          return;
        }
        pwMsgType.value = "ok"; pwMsg.value = "Password updated ✓";
        pw.value = ""; pwOpen.value = false;
      }
      function cancelPw() { pwOpen.value = false; pw.value = ""; pwMsg.value = ""; }

      // Identity + usage (prototype "Your profile" ID card + meters).
      onMounted(() => {
        if (store.features.masterResume) actions.loadMaster(false);
        if (store.features.tailorResume) actions.loadTailored(false);
        actions.loadMailbox(false);
        if (store.focusSection) {           // e.g. Overview step 3 → the Connections card
          const id = store.focusSection; store.focusSection = null;
          setTimeout(() => { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }, 60);
        }
      });
      // Gmail inbox connection form (Connections card).
      const mb = computed(() => store.mailbox);
      const mbConn = computed(() => store.mailbox.data);
      const mbOpen = ref(false), mbEmail = ref(""), mbPw = ref(""), mbShow = ref(false), mbBusy = ref(false), mbMsg = ref("");
      function openMb() {
        mbEmail.value = (mbConn.value && mbConn.value.email) || (/@(gmail|googlemail)\.com$/i.test(store.userEmail || "") ? store.userEmail : "");
        mbPw.value = ""; mbMsg.value = ""; mbShow.value = false; mbOpen.value = true;
      }
      function closeMb() { mbOpen.value = false; mbPw.value = ""; mbMsg.value = ""; }
      async function saveMb() {
        if (mbBusy.value || !mbEmail.value || !mbPw.value) return;
        mbBusy.value = true; mbMsg.value = "";
        const err = await actions.connectMailbox(mbEmail.value, mbPw.value);
        mbBusy.value = false;
        if (err) { mbMsg.value = err; return; }
        closeMb();
      }
      async function disconnectMb() {
        mbBusy.value = true;
        const err = await actions.disconnectMailbox();
        mbBusy.value = false;
        if (err) mbMsg.value = err;
      }
      // A pending check older than 10 min means the worker is offline — say so instead of spinning.
      const mbStale = computed(() => {
        const c = mbConn.value, t = c && Date.parse(c.updated_at);
        return !!(c && c.status === "pending" && t && Date.now() - t > 10 * 60 * 1000);
      });
      const mbWhen = (iso) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
      const planKey = computed(() => store.profile.plan || "free");
      const planLabel = computed(() => ({ premium: "Premium", closed: "Closed" }[planKey.value] || "Free"));
      const idInitials = computed(() => L.initials(store.profile.full_name, store.userEmail));
      const roleLimit = computed(() => L.planLimit(planKey.value));
      const usage = computed(() => {
        const files = (store.master.data && store.master.data.files) || [];
        const rawFileCap = L.fileCap(store.profile.plan);
        const filesCap = isFinite(rawFileCap) ? rawFileCap : null;
        const tailored = (store.tailored && store.tailored.rows) || [];
        return [
          { key: "roles", label: "Roles", used: store.searches.length, cap: roleLimit.value },
          { key: "files", label: "Source files", used: files.length, cap: filesCap },
          { key: "tailored", label: "Tailored resumes", used: tailored.length, cap: null },
        ];
      });

      return { store, actions, features: store.features, pwOpen, pw, showPw, pwBusy, pwMsg, pwMsgType, submitPw, cancelPw, dialCountries: window.EASYY_DIAL_COUNTRIES || [],
        planKey, planLabel, idInitials, roleLimit, usage,
        mb, mbConn, mbOpen, mbEmail, mbPw, mbShow, mbBusy, mbMsg, openMb, closeMb, saveMb, disconnectMb, mbWhen, mbStale };
    },
  };

  // Placeholder for prototype sections that aren't built yet. Copy is the
  // prototype's (V17) eyebrow / title / lede for each section.
  const SOON_PAGES = {
    outreach: { eyebrow: "Outreach drafts", title: "Written, attached, waiting in your drafts",
      lede: "easyy writes the note and saves it to your own mailbox. It never sends anything. You read it over coffee and press send when you're ready." },
    funnel: { eyebrow: "After the send", title: "Your job search funnel",
      lede: "Every application easyy wrote, from the ones still waiting to go out to the offer. Move a card as things happen. The reply rate on your Overview is calculated from this board." },
    prep: { eyebrow: "Between the reply and the offer", title: "Interview prep",
      lede: "Practise against the actual interviewer, the actual job description and the resume they'll be holding. One question at a time, scored out of 5, with what to fix before the next one." },
    guide: { eyebrow: "Job search guide", title: "Habits that get replies",
      lede: "Here's where you stand, and the quickest thing to do next." },
    community: { eyebrow: "Community", title: "The part software can't do",
      lede: "Members searching the same roles in the same market, plus people already inside the companies your alerts keep surfacing." },
    plans: { eyebrow: "Plans & pricing", title: "Start free. Upgrade when the replies start coming.",
      lede: "Every feature is on both plans. Premium lifts the limits." },
  };
  const ViewSoon = {
    template: "#tpl-soon",
    setup() {
      const store = inject("store");
      const nav = inject("nav");
      const page = computed(() => SOON_PAGES[store.route] || { eyebrow: "", title: "Coming soon", lede: "" });
      return { store, nav, page };
    },
  };

  window.EasyyViews = {
    "ui-switch": UiSwitch, "ui-suggest": UiSuggest, "ui-sources": UiSources, "ui-chip": UiChip, "ui-tags": UiTags, "ui-dialog": UiDialog, "ui-feedback": UiFeedback,
    "view-home": ViewHome, "view-history": ViewHistory, "view-job": ViewJob, "view-resume": ViewResume, "view-resumes": ViewResumes, "view-master": ViewMaster, "view-tailored": ViewTailored, "view-settings": ViewSettings,
    "view-outreach": ViewSoon, "view-funnel": ViewSoon, "view-prep": ViewSoon, "view-guide": ViewSoon, "view-community": ViewSoon, "view-plans": ViewSoon,
  };
})();
