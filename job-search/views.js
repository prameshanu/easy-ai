/* Easyy Job Alerts — view components.
   Small UI pieces use inline templates; the five views use in-DOM templates
   (<template id="tpl-…"> in index.html). In-DOM templates are parsed by the HTML
   parser, so props are bound kebab-case (:model-value, @update:model-value).
   Loaded after lib.js, before app.js; app.js registers window.EasyyViews. */
(function () {
  "use strict";
  const { inject, computed, ref, watch, onMounted } = Vue;
  const L = window.EasyyLib;

  // ------------------------------------------------------------- ui pieces
  const UiSwitch = {
    props: { modelValue: Boolean, disabled: Boolean, label: String, size: String },
    emits: ["update:modelValue"],
    template: `<button type="button" role="switch" class="switch" :class="{ on: modelValue, lg: size === 'lg' }"
      :aria-checked="String(!!modelValue)" :aria-label="label || null" :disabled="disabled"
      @click="$emit('update:modelValue', !modelValue)"><span class="knob"></span></button>`,
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

  // ------------------------------------------------------------------ views
  const ViewHome = {
    template: "#tpl-home",
    setup() {
      const store = inject("store");
      const actions = inject("actions");
      const nav = inject("nav");
      return {
        store, actions, nav,
        features: store.features,
        countries: store.countries,
        status: computed(() => store.status),
        showChecklist: computed(() => store.showChecklist),
        hasSavedSearch: computed(() => store.dbSearchIds.length > 0),
        maskedPhone: computed(() => L.maskPhone(store.profile.phone)),
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
      watch(grouped, (g) => {
        if (touched.value) return;
        const first = g.pending ? "pending" : (g.days[0] && g.days[0].events[0] ? g.days[0].events[0].key : null);
        opened.value = first ? { [first]: true } : {};
      }, { immediate: true });
      onMounted(() => { actions.loadHistory(false); });
      const SITES = { linkedin: "LinkedIn", indeed: "Indeed", google: "Google" };
      return {
        store, actions, nav, filter, h, grouped, lastRun, channels,
        features: store.features,
        isOpen: (k) => !!opened.value[k],
        toggle(k) { touched.value = true; opened.value = Object.assign({}, opened.value, { [k]: !opened.value[k] }); },
        salary: (j) => L.formatSalary(j.salary_min, j.salary_max, j.currency),
        siteLabel: (s) => SITES[s] || (s || ""),
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

  const ViewResumes = {
    template: "#tpl-resumes",
    setup() {
      const store = inject("store"), actions = inject("actions"), nav = inject("nav");
      const pasteOpen = ref(false), pasteText = ref(""), pasteName = ref("");
      const picker = ref(null);
      const m = computed(() => store.master);
      const ov = computed(() => store.master.data || {});
      const files = computed(() => (store.master.data && store.master.data.files) || []);
      const stage = computed(() => L.buildStageLabel(store.master.data && store.master.data.build));
      const building = computed(() => stage.value.state === "queued" || stage.value.state === "running");
      const failCopy = computed(() => L.buildFailureCopy(store.master.data && store.master.data.build));
      onMounted(() => {
        if (store.features.masterResume) actions.loadMaster(true);
        if (store.features.tailorResume) actions.loadTailored(false);
      });
      async function onPick(e) {
        const list = Array.from(e.target.files || []);
        e.target.value = "";
        for (const f of list) { const ok = await actions.uploadResumeFile(f); if (!ok) break; }
      }
      async function doPaste() {
        const ok = await actions.pasteResumeText(pasteText.value, pasteName.value);
        if (ok) { pasteOpen.value = false; pasteText.value = ""; pasteName.value = ""; }
      }
      return {
        store, actions, nav, features: store.features, m, ov, files, stage, building, failCopy,
        pasteOpen, pasteText, pasteName, picker, onPick, doPaste,
        size: (b) => L.fileSizeText(b || 0),
        when: (iso) => (iso ? new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""),
        tWhen: (iso) => (iso ? new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""),
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
      return {
        store, actions, nav, r, choice, custom, open, addOpen, addText, focusId, openConflicts, progress, sections, factCount,
        rulingFor, save, addFact,
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
      return {
        store, actions, nav, features: store.features, run, stage, running, failCopy, fitText, ats,
        gaps, facts, jdMeta, answering, note, posKey, editing, editText, guide,
        startYes, sendYes, startEdit, approve, answeredSinceReady,
        posLabel: (p) => { const d = p.data || {}; return [d.employer, d.title].filter(Boolean).join(" — ") || p.text; },
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
      return { store, actions, features: store.features, pwOpen, pw, showPw, pwBusy, pwMsg, pwMsgType, submitPw, cancelPw, dialCountries: window.EASYY_DIAL_COUNTRIES || [] };
    },
  };

  window.EasyyViews = {
    "ui-switch": UiSwitch, "ui-chip": UiChip, "ui-tags": UiTags, "ui-dialog": UiDialog,
    "view-home": ViewHome, "view-history": ViewHistory, "view-job": ViewJob, "view-resume": ViewResume, "view-resumes": ViewResumes, "view-master": ViewMaster, "view-tailored": ViewTailored, "view-settings": ViewSettings,
  };
})();
