// Public front-end configuration — safe to commit and expose.
// The anon key is meant for browsers; Row-Level Security protects the data.
// (The service_role key must NEVER appear here — it lives only in the cron env.)
//
// One file serves both sites; the host picks the backend:
//   www.easyy-ai.com / easyy-ai.com           → production
//   anything else (staging.easyy-ai.com,
//   *.pages.dev, localhost, 127.0.0.1)       → staging
// Unknown hosts default to staging so a local or preview copy can never write to live data.
(function () {
  var ENVS = {
    production: {
      // From Supabase → Project Settings → API
      SUPABASE_URL: "https://fjapdcizkaeektqgsfdz.supabase.co",
      SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqYXBkY2l6a2FlZWt0cWdzZmR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwNDU5MjksImV4cCI6MjA5OTYyMTkyOX0.EV9F5g5cUjoTJmGK3bhlsizx-rzN5StfrREy5LidJ6U",
      // The shared bot's username WITHOUT the @ (e.g. "EasyyJobAlerts_bot")
      TELEGRAM_BOT_USERNAME: "EasyyJobAlerts_bot",
    },
    staging: {
      // Fill in from the staging project (runbook step 1) and the staging bot (step 6).
      SUPABASE_URL: "https://cmigyrkhcgwkoqzwdnnk.supabase.co",
      SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtaWd5cmtoY2d3a29xendkbm5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxNjUwNzEsImV4cCI6MjEwNzc0MTA3MX0.n5q8duTilyOsIapEI6a9jqYMshtuQKJa7A8mRzjGM9k",
      TELEGRAM_BOT_USERNAME: "EasyyJobAlertsStaging_bot",
    },
  };

  var host = window.location.hostname;
  var env = host === "www.easyy-ai.com" || host === "easyy-ai.com" ? "production" : "staging";
  document.documentElement.setAttribute("data-env", env);
  if (env === "staging") {
    // Keep staging out of search engines.
    var robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex, nofollow";
    document.head.appendChild(robots);
  }

  window.EASYY_CONFIG = Object.assign({ ENV: env }, ENVS[env], {
    // Feature flags. Flip only when the backend behind them exists — on BOTH projects.
    FEATURES: {
      // Per-search "Paused" switch; writes searches.is_active.
      // true only after (a) the Phase 2a runbook added the column AND (b) Phase 2b made the runner skip inactive searches.
      searchPause: true,
      // Settings → "Delete my account…" calls the `delete-account` Edge Function.
      // true only after that function is deployed to the Supabase project (see the
      // delete-account runbook in easyy-job-alerts / docs).
      deleteAccount: true,
      // History job rows open a JD detail page (#/job/<id>) that reads job_details.
      // true only after the job_details table exists and the runner captures JDs
      // (see the jd-capture runbooks in easyy-job-alerts / docs). Resume tailoring
      // stays a "coming soon" placeholder until that pipeline ships.
      jdView: true,
      // Resumes page becomes the master-resume builder (#/resumes + #/master).
      // true only after migration 0006 is applied AND the master worker is running
      // (see the master-resume runbooks in easy-ai/docs/specs). Ships false.
      masterResume: true,
      // Tailor buttons + #/tailored/<id> + the Tailored-resumes card become live.
      // true only after 0007 is applied AND the tailor worker update is deployed
      // (see the 2026-09-01 tailor-resume runbooks). Ships false.
      tailorResume: true,
      // Floating "Send feedback" button → GitHub issue in prameshanu/easyy-feedback via the
      // submit-feedback Edge Function, which exists on the staging project only. Never on production.
      feedback: env === "staging",
    },
  });
})();
