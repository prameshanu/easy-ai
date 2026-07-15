/* Easyy Job Alerts — config SPA. Vue 3 + supabase-js, no build step. */
const CFG = window.EASYY_CONFIG;
const sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);

const COUNTRIES = [
  "united arab emirates", "india", "usa", "united kingdom", "singapore",
  "saudi arabia", "qatar", "canada", "australia", "germany",
  "netherlands", "ireland", "worldwide",
];

const blankSearch = () => ({
  id: null, name: "", query: "", location: "",
  is_remote: false, sites: ["linkedin", "indeed"],
  linkedin_query: "", indeed_query: "", google_search_term: "",
  require_kw_input: "", _err: "",
});

const parseList = (str) => (str || "").split(",").map((x) => x.trim()).filter(Boolean);

Vue.createApp({
  data() {
    return {
      booting: true,
      session: null,
      countries: COUNTRIES,
      // auth
      authEmail: "", sending: false, authMsg: "",
      // profile
      profile: { id: null, telegram_link_code: null, telegram_linked_at: null, telegram_chat_id: null,
                 name: "My job search", country_indeed: "united arab emirates",
                 email_enabled: true, notify_when_empty: false, is_active: true },
      salaryInput: "", excludeInput: "",
      searches: [],
      _dbSearchIds: [],
      // ui
      saving: false, saveMsg: "", errorMsg: "",
      polling: false, pollTimer: null,
    };
  },

  computed: {
    userEmail() { return this.session?.user?.email || ""; },
    telegramLinked() { return !!this.profile.telegram_linked_at; },
  },

  async mounted() {
    const { data } = await sb.auth.getSession();
    this.session = data.session;
    sb.auth.onAuthStateChange((_evt, sess) => {
      const had = !!this.session;
      this.session = sess;
      if (sess && !had) {
        // clean magic-link tokens out of the URL
        history.replaceState(null, "", location.pathname + location.search);
        this.loadProfile();
      }
      if (!sess) this.resetProfile();
    });
    if (this.session) await this.loadProfile();
    this.booting = false;
  },

  methods: {
    async sendMagicLink() {
      if (!this.authEmail) return;
      this.sending = true; this.authMsg = "";
      const redirect = location.origin + location.pathname;
      const { error } = await sb.auth.signInWithOtp({
        email: this.authEmail,
        options: { emailRedirectTo: redirect },
      });
      this.sending = false;
      this.authMsg = error
        ? "Couldn't send: " + error.message
        : "Check your inbox — we sent a sign-in link to " + this.authEmail + ".";
    },

    async signOut() { this.stopPolling(); await sb.auth.signOut(); this.resetProfile(); },

    resetProfile() {
      this.profile = { id: null, telegram_link_code: null, telegram_linked_at: null, telegram_chat_id: null,
        name: "My job search", country_indeed: "united arab emirates",
        email_enabled: true, notify_when_empty: false, is_active: true };
      this.salaryInput = ""; this.excludeInput = ""; this.searches = []; this._dbSearchIds = [];
      this.saveMsg = ""; this.errorMsg = "";
    },

    async loadProfile() {
      this.errorMsg = "";
      let { data, error } = await sb.from("profiles").select("*, searches(*)").maybeSingle();
      if (error) { this.errorMsg = error.message; return; }
      if (!data) {
        const ins = await sb.from("profiles")
          .insert({ name: "My job search", email_to: [this.userEmail], email_enabled: true })
          .select("*, searches(*)").single();
        if (ins.error) {
          // a row already exists (e.g. another tab created it first) -> just load it
          const re = await sb.from("profiles").select("*, searches(*)").maybeSingle();
          if (re.error || !re.data) { this.errorMsg = ins.error.message; return; }
          data = re.data;
        } else {
          data = ins.data;
        }
      }
      this.mapDbToState(data);
    },

    mapDbToState(row) {
      this.profile = {
        id: row.id, name: row.name, country_indeed: row.country_indeed,
        telegram_chat_id: row.telegram_chat_id, telegram_link_code: row.telegram_link_code,
        telegram_linked_at: row.telegram_linked_at,
        email_enabled: row.email_enabled, notify_when_empty: row.notify_when_empty,
        is_active: row.is_active,
      };
      this.salaryInput = row.min_salary_monthly_aed ?? "";
      this.excludeInput = (row.exclude_title_keywords || []).join(", ");
      const list = (row.searches || []).slice().sort((a, b) => (a.position || 0) - (b.position || 0));
      this.searches = list.map((s) => ({
        id: s.id, name: s.name, query: s.query, location: s.location,
        is_remote: !!s.is_remote, sites: s.sites || [],
        linkedin_query: s.linkedin_query || "", indeed_query: s.indeed_query || "",
        google_search_term: s.google_search_term || "",
        require_kw_input: (s.require_title_keywords || []).join(", "),
        _err: "",
      }));
      this._dbSearchIds = list.map((s) => s.id);
      if (!this.searches.length) this.addSearch();
    },

    addSearch() { if (this.searches.length < 5) this.searches.push(blankSearch()); },
    removeSearch(i) { this.searches.splice(i, 1); },

    validate() {
      let ok = true;
      if (!this.searches.length) { this.errorMsg = "Add at least one search."; return false; }
      for (const s of this.searches) {
        s._err = "";
        if (!s.name || !s.query || !s.location) s._err = "Label, query and location are required.";
        else if (!s.sites.length) s._err = "Pick at least one job site.";
        else if (s.sites.includes("google") && !s.google_search_term) s._err = "Google needs a search phrase.";
        if (s._err) ok = false;
      }
      if (!ok) this.errorMsg = "Please fix the highlighted searches.";
      return ok;
    },

    async save() {
      this.saveMsg = ""; this.errorMsg = "";
      if (!this.validate()) return;
      this.saving = true;
      try {
        const payload = {
          name: this.profile.name || "My job search",
          country_indeed: this.profile.country_indeed,
          min_salary_monthly_aed:
            this.salaryInput === "" || this.salaryInput == null ? null : Number(this.salaryInput),
          exclude_title_keywords: parseList(this.excludeInput),
          email_enabled: this.profile.email_enabled,
          email_to: this.profile.email_enabled ? [this.userEmail] : [],
          notify_when_empty: this.profile.notify_when_empty,
          is_active: this.profile.is_active,
        };
        const upd = await sb.from("profiles").update(payload).eq("id", this.profile.id);
        if (upd.error) throw upd.error;

        // sync searches: delete removed, then upsert current
        const currentIds = this.searches.filter((s) => s.id).map((s) => s.id);
        const toDelete = this._dbSearchIds.filter((id) => !currentIds.includes(id));
        if (toDelete.length) {
          const del = await sb.from("searches").delete().in("id", toDelete);
          if (del.error) throw del.error;
        }
        const rows = this.searches.map((s, i) => {
          const row = {
            profile_id: this.profile.id,
            name: s.name, query: s.query, location: s.location,
            is_remote: !!s.is_remote, sites: s.sites,
            linkedin_query: s.linkedin_query || null,
            indeed_query: s.indeed_query || null,
            google_search_term: s.sites.includes("google") ? (s.google_search_term || null) : null,
            require_title_keywords: parseList(s.require_kw_input),
            position: i,
          };
          if (s.id) row.id = s.id;
          return row;
        });
        const up = await sb.from("searches").upsert(rows).select();
        if (up.error) throw up.error;

        await this.loadProfile();  // resync ids + link code
        this.saveMsg = "Saved ✓ Alerts will start within the hour."
          + (this.telegramLinked ? "" : " Connect Telegram above for instant pings.");
      } catch (e) {
        this.errorMsg = e.message || String(e);
      } finally {
        this.saving = false;
      }
    },

    connectTelegram() {
      const code = this.profile.telegram_link_code;
      if (!code) { this.errorMsg = "Save your profile first."; return; }
      window.open(`https://t.me/${CFG.TELEGRAM_BOT_USERNAME}?start=${code}`, "_blank");
      this.startPolling();
    },

    startPolling() {
      if (this.pollTimer) return;
      this.polling = true;
      this.pollTimer = setInterval(async () => {
        const { data } = await sb.from("profiles")
          .select("telegram_chat_id, telegram_linked_at").eq("id", this.profile.id).single();
        if (data && data.telegram_linked_at) {
          this.profile.telegram_linked_at = data.telegram_linked_at;
          this.profile.telegram_chat_id = data.telegram_chat_id;
          this.saveMsg = "Telegram connected ✓";
          this.stopPolling();
        }
      }, 3000);
      setTimeout(() => this.stopPolling(), 120000);  // give up after 2 min
    },

    stopPolling() {
      if (this.pollTimer) clearInterval(this.pollTimer);
      this.pollTimer = null; this.polling = false;
    },
  },
}).mount("#app");
