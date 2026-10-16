import { ExpensePaceBar } from "@/components/ExpensePaceBar";
import { formatValue } from "@/lib/format";
import type { MinistryAreaExpenseAccount } from "@/lib/monthly-expenses";
import type { StoplightStatus } from "@/lib/benchmarks";

type ExpenseAccountTableProps = {
  accounts: MinistryAreaExpenseAccount[];
  showMinistry?: boolean;
  footerLabel?: string;
  footerActual?: number;
  footerBudget?: number;
  footerVariance?: number;
  footerPercent?: number | null;
  footerStatus?: StoplightStatus;
};

function formatCurrency(value: number): string {
  return formatValue(value, "currency");
}

export function ExpenseAccountTable({
  accounts,
  showMinistry = false,
  footerLabel,
  footerActual,
  footerBudget,
  footerVariance,
  footerPercent,
  footerStatus,
}: ExpenseAccountTableProps) {
  return (
    <div className="expense-account-table-wrap">
      <table className="expense-account-table">
        <thead>
          <tr>
            <th>Account</th>
            <th>Line item</th>
            {showMinistry ? <th>Ministry</th> : null}
            <th className="text-right">Actual</th>
            <th className="text-right">Budget</th>
            <th className="text-right">Variance</th>
            <th>Pace</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((account) => (
            <tr key={account.accountNumber}>
              <td className="tabular-nums expense-account-table__account">
                {account.accountNumber}
              </td>
              <td className="expense-account-table__line">{account.label}</td>
              {showMinistry ? (
                <td className="expense-account-table__ministry">
                  {account.ministryAreaLabel}
                </td>
              ) : null}
              <td className="text-right tabular-nums">
                {formatCurrency(account.actual)}
              </td>
              <td className="text-right tabular-nums">
                {formatCurrency(account.budget)}
              </td>
              <td
                className={`text-right tabular-nums ${
                  account.variance > 0 ? "text-error" : "text-success"
                }`}
              >
                {formatCurrency(account.variance)}
              </td>
              <td>
                <ExpensePaceBar
                  percent={account.percentOfBudget}
                  status={account.paceStatus}
                />
              </td>
            </tr>
          ))}
        </tbody>
        {footerLabel != null &&
          footerActual != null &&
          footerBudget != null &&
          footerVariance != null &&
          footerStatus != null && (
            <tfoot>
              <tr>
                <td colSpan={showMinistry ? 3 : 2}>{footerLabel}</td>
                <td className="text-right tabular-nums">
                  {formatCurrency(footerActual)}
                </td>
                <td className="text-right tabular-nums">
                  {formatCurrency(footerBudget)}
                </td>
                <td
                  className={`text-right tabular-nums ${
                    footerVariance > 0 ? "text-error" : "text-success"
                  }`}
                >
                  {formatCurrency(footerVariance)}
                </td>
                <td>
                  <ExpensePaceBar
                    percent={footerPercent ?? null}
                    status={footerStatus}
                  />
                </td>
              </tr>
            </tfoot>
          )}
      </table>
    </div>
  );
}
