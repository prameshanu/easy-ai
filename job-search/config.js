// Public front-end configuration — safe to commit and expose.
// The anon key is meant for browsers; Row-Level Security protects the data.
// (The service_role key must NEVER appear here — it lives only in the cron env.)
window.EASYY_CONFIG = {
  // From Supabase → Project Settings → API
  SUPABASE_URL: "https://fjapdcizkaeektqgsfdz.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqYXBkY2l6a2FlZWt0cWdzZmR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwNDU5MjksImV4cCI6MjA5OTYyMTkyOX0.EV9F5g5cUjoTJmGK3bhlsizx-rzN5StfrREy5LidJ6U",

  // The shared bot's username WITHOUT the @ (e.g. "EasyyJobAlerts_bot")
  TELEGRAM_BOT_USERNAME: "EasyyJobAlerts_bot",
};
