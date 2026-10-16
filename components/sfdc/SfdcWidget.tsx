import type { ReactNode } from "react";

type SfdcWidgetProps = {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  footerHref?: string;
  footerLabel?: string;
  className?: string;
  headerAction?: ReactNode;
  placeholder?: boolean;
};

export function SfdcWidget({
  title,
  children,
  footer,
  footerHref,
  footerLabel = "View report",
  className = "",
  headerAction,
  placeholder = false,
}: SfdcWidgetProps) {
  return (
    <article
      className={`sfdc-widget ${placeholder ? "sfdc-widget--placeholder" : ""} ${className}`}
    >
      <header className="sfdc-widget__header">
        <h3 className="sfdc-widget__title">{title}</h3>
        {headerAction ?? (
          <button
            type="button"
            className="sfdc-widget__expand"
            aria-label={`Expand ${title}`}
            tabIndex={-1}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
              <path
                d="M1 5V1h4M9 1h4v4M13 9v4H9M5 13H1V9"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </button>
        )}
      </header>
      <div className="sfdc-widget__body">{children}</div>
      {(footer || footerHref) && (
        <footer className="sfdc-widget__footer">
          {footer}
          {footerHref && (
            <a href={footerHref} className="sfdc-link">
              {footerLabel}
            </a>
          )}
        </footer>
      )}
    </article>
  );
}
