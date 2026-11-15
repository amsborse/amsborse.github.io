-- D1 schema for the design experiment Worker. Apply with:
--   npx wrangler d1 execute portfolio-experiments --remote --file worker/schema.sql
-- No column holds an IP address, user agent, cookie or anything typed by the visitor.

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY,
  received_at INTEGER NOT NULL, -- server time in ms, used only to delete old rows
  vid TEXT NOT NULL,            -- random visitor id made in the browser (localStorage)
  sid TEXT NOT NULL,            -- random id for one tab session (sessionStorage)
  assigned TEXT,                -- design the visitor was automatically assigned, if any
  source TEXT NOT NULL,         -- why this design is shown: auto, url, picker, fallback, default
  t TEXT NOT NULL,              -- event type
  ts INTEGER NOT NULL,          -- browser time in ms
  design TEXT NOT NULL,         -- design on screen when the event happened
  path TEXT,                    -- site path, query string and hash stripped
  value REAL,                   -- number for the event (ms, percent, LCP, CLS)
  label TEXT                    -- click kind, error message head, or target design
);
CREATE INDEX IF NOT EXISTS events_sid ON events (sid);
CREATE INDEX IF NOT EXISTS events_type_design ON events (t, design);
CREATE INDEX IF NOT EXISTS events_received ON events (received_at);

CREATE TABLE IF NOT EXISTS weights (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  doc TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS weight_log (
  id INTEGER PRIMARY KEY,
  at TEXT NOT NULL,
  entry TEXT NOT NULL
);
