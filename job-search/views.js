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
        jobHash: (id) => L.routeHash("job", id),
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

  const ViewResume = { template: "#tpl-resume", setup() { return { nav: inject("nav") }; } };
  const ViewResumes = { template: "#tpl-resumes", setup() { return { nav: inject("nav") }; } };

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
    "view-home": ViewHome, "view-history": ViewHistory, "view-job": ViewJob, "view-resume": ViewResume, "view-resumes": ViewResumes, "view-settings": ViewSettings,
  };
})();
