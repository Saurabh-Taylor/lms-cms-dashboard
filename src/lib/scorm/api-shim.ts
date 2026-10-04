/**
 * SCORM runtime API shim. The SCO (iframe content) finds the LMS by walking
 * `window.parent` — so both vocab objects live on the host window:
 *   `window.API`         → SCORM 1.2 (LMSInitialize/LMSSetValue/…)
 *   `window.API_1484_11` → SCORM 2004 (Initialize/SetValue/…)
 * Two vocabularies, one CMI cache, one commit transport. Commits run through
 * the BFF (`PUT /api/learner/scorm-sessions/:id`) — the backend normalizes
 * per the attempt's declared version, so the shim stays vocab-agnostic.
 *
 * Error model (both vocabs share the same numeric codes): 301 not-
 * initialized, 403 read-only element, 404 write-only element, 0 no error.
 */
import type { ScormSessionInfo } from "@microshala/contracts";

export type { ScormSessionInfo };

export interface ScormApiHandle {
  /** Flush pending CMI (terminated) + tear down listeners/window globals. */
  teardown: () => void;
}

/** Window side-table for the two well-known API globals the SCO crawls for. */
type ScormHostWindow = Window & { API?: object; API_1484_11?: object };

// Elements the LMS owns — a SCO writing these gets "false" + error 403
// instead of silently corrupting the seeded snapshot (learner id, launch
// data, thresholds are all LMS-provided).
const RO_KEYS = new Set([
  // 1.2
  "cmi.core.student_id", "cmi.core.student_name", "cmi.core.credit",
  "cmi.core.entry", "cmi.core.total_time", "cmi.core.lesson_mode",
  "cmi.launch_data",
  // 2004
  "cmi.learner_id", "cmi.learner_name", "cmi.credit", "cmi.entry",
  "cmi.mode", "cmi.launch_data", "cmi.scaled_passing_score",
  "cmi.total_time", "cmi.completion_threshold", "cmi.max_time_allowed",
  "cmi.time_limit_action",
]);
const isReadOnly = (key: string) =>
  RO_KEYS.has(key) ||
  key.endsWith("._children") ||
  key.endsWith("._count") ||
  key.startsWith("cmi.student_data.") ||
  key.startsWith("cmi.comments_from_lms");

// Write-only — readable values leak back " " with error 404.
const WO_KEYS = new Set([
  "cmi.core.session_time", "cmi.core.exit", "cmi.comments",
  "cmi.session_time", "cmi.exit",
]);

const ERROR_STRINGS: Record<string, string> = {
  "0": "No error",
  "101": "General exception",
  "201": "Invalid argument error",
  "301": "Not initialized",
  "401": "Not implemented error",
  "402": "Invalid set value, element is a keyword",
  "403": "Element is read only",
  "404": "Element is write only",
  "405": "Incorrect data type",
};

export function installScormApi(win: Window, session: ScormSessionInfo): ScormApiHandle {
  const host = win as ScormHostWindow;
  const cache: Record<string, string> = Object.fromEntries(
    Object.entries(session.cmi).map(([k, v]) => [k, String(v)]),
  );
  const url = `/api/learner/scorm-sessions/${session.sessionId}`;
  let initialized = false;
  let done = false; // after Terminate/Finish the SCO gets "false" for everything
  let lastError = "0";

  function send(terminated: boolean, unload = false) {
    // keepalive only for the unload path — it survives pagehide but caps the
    // body ~64KB, so a normal Commit carrying fat suspend_data uses a plain
    // fetch; the BFF forwards the body verbatim either way.
    void fetch(url, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cmi: cache, terminated }),
      keepalive: unload,
    }).catch(() => {});
  }

  function getValue(key: string): string {
    if (done || !initialized) { lastError = "301"; return ""; }
    if (WO_KEYS.has(key)) { lastError = "404"; return ""; }
    lastError = "0";
    if (key in cache) return cache[key];
    // `_count` is computed, never stored: count distinct numeric indices the
    // SCO has written under the requested collection (cmi.interactions.0.* …)
    const m = /^(.*)\._count$/.exec(key);
    if (m) {
      const prefix = `${m[1]}.`;
      const idx = new Set(
        Object.keys(cache)
          .filter((k) => k.startsWith(prefix))
          .map((k) => k.slice(prefix.length).split(".")[0])
          .filter((s) => /^\d+$/.test(s)),
      );
      return String(idx.size);
    }
    return "";
  }

  function setValue(key: string, value: unknown): string {
    if (done || !initialized) { lastError = "301"; return "false"; }
    if (isReadOnly(key)) { lastError = "403"; return "false"; }
    lastError = "0";
    cache[key] = String(value);
    return "true";
  }

  function initialize(): string {
    if (done) { lastError = "101"; return "false"; }
    initialized = true;
    lastError = "0";
    return "true";
  }

  function terminate(): string {
    if (done || !initialized) { lastError = "301"; return "false"; }
    done = true;
    send(true);
    lastError = "0";
    return "true";
  }

  function commit(): string {
    if (done || !initialized) { lastError = "301"; return "false"; }
    send(false);
    lastError = "0";
    return "true";
  }

  const getLastError = () => lastError;
  const getErrorString = (code: string) => ERROR_STRINGS[code] ?? "Unknown error";
  const getDiagnostic = (code: string) => (code === "0" ? "" : (ERROR_STRINGS[code] ?? ""));

  // SCORM 1.2
  host.API = {
    LMSInitialize: initialize,
    LMSFinish: terminate,
    LMSGetValue: getValue,
    LMSSetValue: setValue,
    LMSCommit: commit,
    LMSGetLastError: getLastError,
    LMSGetErrorString: getErrorString,
    LMSGetDiagnostic: getDiagnostic,
  };
  // SCORM 2004
  host.API_1484_11 = {
    Initialize: initialize,
    Terminate: terminate,
    GetValue: getValue,
    SetValue: setValue,
    Commit: commit,
    GetLastError: getLastError,
    GetErrorString: getErrorString,
    GetDiagnostic: getDiagnostic,
  };

  // Unload without an explicit Terminate — keepalive PUT reaches the backend.
  const onPageHide = () => {
    if (!done && initialized) {
      done = true;
      send(true, true);
    }
  };
  win.addEventListener("pagehide", onPageHide);

  return {
    teardown: () => {
      // Unmount without Terminate (in-app lesson switch) still flushes —
      // otherwise the attempt keeps an "open" row with uncommitted CMI.
      if (!done && initialized) {
        done = true;
        send(true, true);
      }
      win.removeEventListener("pagehide", onPageHide);
      delete host.API;
      delete host.API_1484_11;
    },
  };
}
