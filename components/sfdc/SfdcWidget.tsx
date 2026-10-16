import type { ReactNode } from "react";
import {
  CardBenchmarkMenu,
  type CardBenchmarkEdit,
} from "@/components/CardBenchmarkMenu";

type SfdcWidgetProps = {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  footerHref?: string;
  footerLabel?: string;
  className?: string;
  headerAction?: ReactNode;
  placeholder?: boolean;
  benchmarkEdit?: CardBenchmarkEdit | null;
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
  benchmarkEdit = null,
}: SfdcWidgetProps) {
  return (
    <article
      className={`sfdc-widget ${placeholder ? "sfdc-widget--placeholder" : ""} ${className}`}
    >
      <header className="sfdc-widget__header">
        <h3 className="sfdc-widget__title">{title}</h3>
        {(headerAction || benchmarkEdit) && (
          <div className="sfdc-widget__actions">
            {headerAction}
            {benchmarkEdit && (
              <CardBenchmarkMenu title={title} edit={benchmarkEdit} />
            )}
          </div>
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
