"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { createClient } from "@/lib/supabase/client";

type FeedbackKind = "issue" | "feedback";
type PanelStep = "choose" | "compose" | "thanks";

const INTRO =
  "Thank you for using the new Community Church Dashboard! Would you like to report an issue, or provide feedback?";

const PROMPTS: Record<FeedbackKind, string> = {
  issue:
    "What issue are you experiencing today? Please be as specific and detailed as possible in your response so we can provide the best update possible.",
  feedback:
    "We appreciate your feedback as we continuously improve our Dashboard. Please be as detailed and specific in your feedback as possible.",
};

const widgetStyle: CSSProperties = {
  position: "fixed",
  right: "1.25rem",
  bottom: "1.25rem",
  zIndex: 80,
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: "0.75rem",
};

const launcherStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "3.25rem",
  height: "3.25rem",
  border: "none",
  borderRadius: "999px",
  color: "#ffffff",
  background: "var(--sfdc-brand, #3b6d9a)",
  boxShadow: "0 8px 20px rgba(3, 45, 96, 0.28)",
  cursor: "pointer",
};

const panelStyle: CSSProperties = {
  width: "min(22rem, calc(100vw - 2.5rem))",
  border: "1px solid var(--sfdc-border, #d4d2cf)",
  borderRadius: "0.75rem",
  background: "#ffffff",
  color: "var(--sfdc-text, #2b2a25)",
  boxShadow: "0 16px 40px rgba(3, 45, 96, 0.18)",
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "0.75rem",
  padding: "0.75rem 0.75rem 0.75rem 1rem",
  borderBottom: "1px solid var(--sfdc-border, #d4d2cf)",
};

const titleStyle: CSSProperties = {
  fontSize: "0.875rem",
  fontWeight: 700,
};

const closeStyle: CSSProperties = {
  width: "1.75rem",
  height: "1.75rem",
  border: "none",
  borderRadius: "0.25rem",
  background: "transparent",
  color: "var(--sfdc-text-weak, #6b6966)",
  fontSize: "1.25rem",
  lineHeight: 1,
  cursor: "pointer",
};

const bodyStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.875rem",
  padding: "1rem",
  fontSize: "0.875rem",
  lineHeight: 1.45,
};

const rowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.5rem",
};

const actionsStyle: CSSProperties = {
  ...rowStyle,
  justifyContent: "flex-end",
};

const inputStyle: CSSProperties = {
  width: "100%",
  minHeight: "7rem",
  padding: "0.625rem 0.75rem",
  border: "1px solid var(--sfdc-border, #d4d2cf)",
  borderRadius: "0.375rem",
  font: "inherit",
  resize: "vertical",
};

const errorStyle: CSSProperties = {
  color: "#c23934",
  fontSize: "0.8125rem",
};

export function FeedbackWidget() {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<PanelStep>("choose");
  const [kind, setKind] = useState<FeedbackKind | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (active) setSignedIn(Boolean(data.user));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session?.user));
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closePanel();
    }

    function onPointerDown(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) closePanel();
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  useEffect(() => {
    if (open && step === "compose") textareaRef.current?.focus();
  }, [open, step, kind]);

  function closePanel() {
    setOpen(false);
    setStep("choose");
    setKind(null);
    setMessage("");
    setError(null);
    setSubmitting(false);
  }

  function choose(nextKind: FeedbackKind) {
    setKind(nextKind);
    setStep("compose");
    setMessage("");
    setError(null);
  }

  async function submit() {
    if (!kind || submitting) return;
    const text = message.trim();
    if (!text) return;

    setSubmitting(true);
    setError(null);

    const pagePath = `${window.location.pathname}${window.location.search}`.slice(
      0,
      500
    );
    const supabase = createClient();
    const { error: insertError } = await supabase
      .from("dashboard_feedback")
      .insert({
        kind,
        message: text,
        page_path: pagePath,
      });

    setSubmitting(false);
    if (insertError) {
      setError("We could not save that. Please try again.");
      return;
    }

    setStep("thanks");
    setMessage("");
  }

  if (!signedIn) return null;

  return (
    <div ref={panelRef} style={widgetStyle}>
      {open ? (
        <section
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          style={panelStyle}
        >
          <div style={headerStyle}>
            <h2 id={titleId} style={titleStyle}>
              {step === "thanks" ? "Thank you" : "Community Church Dashboard"}
            </h2>
            <button
              type="button"
              style={closeStyle}
              onClick={closePanel}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {step === "choose" ? (
            <div style={bodyStyle}>
              <p>{INTRO}</p>
              <div style={rowStyle}>
                <button
                  type="button"
                  className="sfdc-btn sfdc-btn--brand"
                  onClick={() => choose("issue")}
                >
                  Report An Issue
                </button>
                <button
                  type="button"
                  className="sfdc-btn sfdc-btn--neutral"
                  onClick={() => choose("feedback")}
                >
                  Provide Feedback
                </button>
              </div>
            </div>
          ) : null}

          {step === "compose" && kind ? (
            <form
              style={bodyStyle}
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
              }}
            >
              <p>{PROMPTS[kind]}</p>
              <textarea
                ref={textareaRef}
                style={inputStyle}
                value={message}
                maxLength={4000}
                rows={5}
                required
                aria-label="Your response"
                placeholder="Type your response"
                onChange={(event) => setMessage(event.target.value)}
              />
              {error ? <p style={errorStyle}>{error}</p> : null}
              <div style={actionsStyle}>
                <button
                  type="button"
                  className="sfdc-btn sfdc-btn--neutral"
                  onClick={() => {
                    setStep("choose");
                    setKind(null);
                    setMessage("");
                    setError(null);
                  }}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="sfdc-btn sfdc-btn--brand"
                  disabled={submitting || message.trim().length === 0}
                >
                  {submitting ? "Sending…" : "Submit"}
                </button>
              </div>
            </form>
          ) : null}

          {step === "thanks" ? (
            <div style={bodyStyle}>
              <p>Thank you for your feedback!</p>
            </div>
          ) : null}
        </section>
      ) : null}

      <button
        type="button"
        style={launcherStyle}
        aria-expanded={open}
        aria-label={open ? "Close feedback" : "Open feedback"}
        onClick={() => (open ? closePanel() : setOpen(true))}
      >
        <ChatIcon />
      </button>
    </div>
  );
}

function ChatIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"
      />
    </svg>
  );
}
