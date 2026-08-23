/* Easyy Job Alerts — config SPA. Vue 3 + supabase-js, no build step. */
const CFG = window.EASYY_CONFIG;
const sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);

// Capture the URL hash at load, before supabase-js consumes it, so we can
// surface expired/invalid auth-link errors to the user.
const URL_HASH = window.location.hash || "";
function parseHashError(hash) {
  if (!hash || hash.indexOf("error") === -1) return null;
  const p = new URLSearchParams(hash.replace(/^#/, ""));
  const desc = p.get("error_description") || p.get("error");
  return desc ? desc.replace(/\+/g, " ") : null;
}

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
      authView: "signin", authEmail: "", authPassword: "", authPassword2: "",
      sending: false, authMsg: "", authMsgType: "warn", recoveryMode: false,
      signup: { full_name: "", agree: false },
      showPw: false,
      // phone country picker
      dialCountries: window.EASYY_DIAL_COUNTRIES || [],
      dialIso: "AE", phoneLocal: "", countryQuery: "", countryOpen: false,
      // profile
      profile: { id: null, telegram_link_code: null, telegram_linked_at: null, telegram_chat_id: null,
                 name: "My job search", full_name: "", phone: "", country_indeed: "united arab emirates",
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
    selectedDial() {
      const c = this.dialCountries.find((x) => x.i === this.dialIso);
      return c ? c.d : "";
    },
    filteredCountries() {
      const q = (this.countryQuery || "").trim().toLowerCase().replace(/^\+/, "");
      if (!q) return this.dialCountries;
      return this.dialCountries.filter(
        (c) => c.n.toLowerCase().includes(q) || c.d.includes(q) || c.i.toLowerCase() === q
      );
    },
  },

  async mounted() {
    sb.auth.onAuthStateChange((evt, sess) => {
      if (evt === "PASSWORD_RECOVERY") {
        // Arrived via a reset link — show the "set new password" form,
        // not the config page, even though a session now exists.
        this.session = sess;
        this.recoveryMode = true;
        this.authView = "reset";
        this.authMsg = "";
        this.booting = false;
        return;
      }
      if (evt === "SIGNED_IN") {
        this.session = sess;
        if (!this.recoveryMode) {
          // clean auth tokens out of the URL
          history.replaceState(null, "", location.pathname + location.search);
          this.loadProfile();
        }
      } else if (evt === "SIGNED_OUT") {
        this.session = null;
        this.resetProfile();
      } else if (evt === "USER_UPDATED" || evt === "TOKEN_REFRESHED") {
        this.session = sess;
      }
    });

    const { data } = await sb.auth.getSession();
    if (!this.recoveryMode) {
      this.session = data.session;
      if (this.session) await this.loadProfile();
    }

    // Surface an expired/invalid link that landed us back here signed-out.
    const hashErr = parseHashError(URL_HASH);
    if (hashErr && !this.session) {
      this.authMsg = /expired|invalid/i.test(hashErr)
        ? "That link has expired or was already used. Request a new one below."
        : hashErr;
      this.authMsgType = "warn";
      history.replaceState(null, "", location.pathname + location.search);
    }

    this.booting = false;
  },

  methods: {
    // ---- auth ----
    go(view) {
      this.authView = view;
      this.authMsg = "";
      this.authPassword = ""; this.authPassword2 = "";
      this.countryOpen = false;
    },

    // ---- phone country picker ----
    flagOf(iso) {
      if (!iso || iso.length !== 2) return "🏳️";
      const base = 0x1f1e6; // regional indicator "A"
      const cc = iso.toUpperCase();
      return String.fromCodePoint(base + (cc.charCodeAt(0) - 65), base + (cc.charCodeAt(1) - 65));
    },
    countryName(iso) {
      const c = this.dialCountries.find((x) => x.i === iso);
      return c ? c.n : "";
    },
    selectCountry(iso) {
      this.dialIso = iso;
      this.countryOpen = false;
      this.countryQuery = "";
    },
    toggleCountry() {
      this.countryOpen = !this.countryOpen;
      if (this.countryOpen) {
        this.$nextTick(() => { if (this.$refs.ccSearch) this.$refs.ccSearch.focus(); });
      }
    },

    authRedirect() { return location.origin + location.pathname; },

    friendlyAuthError(error) {
      const m = ((error && error.message) || "").toLowerCase();
      if (m.includes("invalid login")) return "That email or password doesn't match. Try again, or reset your password.";
      if (m.includes("email not confirmed")) return "Please confirm your email first — check your inbox for the confirmation link.";
      if (m.includes("already registered") || m.includes("already been registered")) return "You already have an account with that email — try signing in instead.";
      if (m.includes("rate limit")) return "Too many attempts just now. Please wait a minute and try again.";
      if (m.includes("password should be") || m.includes("at least")) return "Password must be at least 8 characters.";
      return (error && error.message) || "Something went wrong. Please try again.";
    },

    authErr(msg) { this.authMsg = msg; this.authMsgType = "warn"; },

    async signIn() {
      if (!this.authEmail || !this.authPassword) return;
      this.sending = true; this.authMsg = "";
      const { error } = await sb.auth.signInWithPassword({ email: this.authEmail, password: this.authPassword });
      this.sending = false;
      if (error) { this.authMsg = this.friendlyAuthError(error); this.authMsgType = "warn"; }
      // success → onAuthStateChange('SIGNED_IN') loads the profile
    },

    async signUp() {
      const s = this.signup;
      const digits = (this.phoneLocal || "").replace(/\D/g, "");
      if (!s.full_name) return this.authErr("Please enter your full name.");
      if (digits.length < 5) return this.authErr("Please enter a valid mobile number.");
      if (!this.authEmail) return this.authErr("Please enter your email.");
      if (!this.authPassword || this.authPassword.length < 8) return this.authErr("Password must be at least 8 characters.");
      if (this.authPassword !== this.authPassword2) return this.authErr("Those passwords don't match.");
      if (!s.agree) return this.authErr("Please agree to the Terms and Privacy Policy to continue.");
      const phone = "+" + this.selectedDial + digits;
      const country = this.countryName(this.dialIso);
      this.sending = true; this.authMsg = "";
      const { data, error } = await sb.auth.signUp({
        email: this.authEmail, password: this.authPassword,
        options: {
          emailRedirectTo: this.authRedirect(),
          data: { full_name: s.full_name, phone, country },
        },
      });
      this.sending = false;
      if (error) { this.authMsg = this.friendlyAuthError(error); this.authMsgType = "warn"; return; }
      if (!data.session) {
        // Email confirmation required — no session yet.
        this.authView = "signin";
        this.authPassword = ""; this.authPassword2 = "";
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
      if (error) { this.authMsg = this.friendlyAuthError(error); this.authMsgType = "warn"; }
      else { this.authMsg = "Check your inbox — we sent a sign-in link to " + this.authEmail + "."; this.authMsgType = "ok"; }
    },

    async sendReset() {
      if (!this.authEmail) return;
      this.sending = true; this.authMsg = "";
      const { error } = await sb.auth.resetPasswordForEmail(this.authEmail, { redirectTo: this.authRedirect() });
      this.sending = false;
      if (error) { this.authMsg = this.friendlyAuthError(error); this.authMsgType = "warn"; }
      // Don't reveal whether the email exists.
      else { this.authMsg = "If that email has an account, we've sent a password-reset link. Check your inbox."; this.authMsgType = "ok"; }
    },

    async setNewPassword() {
      if (!this.authPassword || !this.authPassword2) return;
      if (this.authPassword.length < 8) { this.authMsg = "Password must be at least 8 characters."; this.authMsgType = "warn"; return; }
      if (this.authPassword !== this.authPassword2) { this.authMsg = "Those passwords don't match."; this.authMsgType = "warn"; return; }
      this.sending = true; this.authMsg = "";
      const { error } = await sb.auth.updateUser({ password: this.authPassword });
      this.sending = false;
      if (error) { this.authMsg = this.friendlyAuthError(error); this.authMsgType = "warn"; return; }
      this.recoveryMode = false;
      this.authPassword = ""; this.authPassword2 = "";
      history.replaceState(null, "", location.pathname + location.search);
      this.saveMsg = "Password updated ✓";
      await this.loadProfile();
    },

    async signOut() {
      this.stopPolling();
      await sb.auth.signOut();
      this.resetProfile();
      this.authView = "signin"; this.authEmail = ""; this.authPassword = ""; this.authPassword2 = "";
      this.authMsg = ""; this.recoveryMode = false;
    },

    resetProfile() {
      this.profile = { id: null, telegram_link_code: null, telegram_linked_at: null, telegram_chat_id: null,
        name: "My job search", full_name: "", phone: "", country_indeed: "united arab emirates",
        email_enabled: true, notify_when_empty: false, is_active: true };
      this.salaryInput = ""; this.excludeInput = ""; this.searches = []; this._dbSearchIds = [];
      this.saveMsg = ""; this.errorMsg = "";
    },

    async loadProfile() {
      this.errorMsg = "";
      let { data, error } = await sb.from("profiles").select("*, searches(*)").maybeSingle();
      if (error) { this.errorMsg = error.message; return; }
      if (!data) {
        const md = (this.session && this.session.user && this.session.user.user_metadata) || {};
        const ins = await sb.from("profiles")
          .insert({
            name: "My job search",
            full_name: md.full_name || null,
            phone: md.phone || null,
            country_indeed: md.country || "united arab emirates",
            email_to: [this.userEmail], email_enabled: true,
          })
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
        full_name: row.full_name || "", phone: row.phone || "",
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
          full_name: this.profile.full_name || null,
          phone: this.profile.phone || null,
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
