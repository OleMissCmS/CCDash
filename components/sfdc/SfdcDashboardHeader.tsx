import type { ReactNode } from "react";

type SfdcDashboardHeaderProps = {
  breadcrumb?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function SfdcDashboardHeader({
  breadcrumb = "Dashboard",
  title,
  description,
  actions,
}: SfdcDashboardHeaderProps) {
  return (
    <header className="sfdc-dashboard-header">
      <div className="sfdc-dashboard-header__main">
        <div className="sfdc-dashboard-header__copy">
          <p className="sfdc-breadcrumb">{breadcrumb}</p>
          <h1 className="sfdc-dashboard-title">{title}</h1>
          {description && (
            <p className="sfdc-dashboard-description">{description}</p>
          )}
        </div>
        {actions && (
          <div className="sfdc-dashboard-header__actions">{actions}</div>
        )}
      </div>
    </header>
  );
}
