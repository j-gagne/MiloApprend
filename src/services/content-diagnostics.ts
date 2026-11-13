import type { ContentIssue } from '../content/model.ts';
import { expectedPedagogicalDiagnostics } from '../content/expected-pedagogical-diagnostics.ts';

// One report per identical diagnostic per page lifetime. Validation results remain intact.
export function createDiagnosticReporter(output: Pick<Console, 'warn' | 'error'> = console) {
  const reported = new Set<string>();
  return (source: string, issue: ContentIssue) => {
    const key = JSON.stringify([source, issue.severity, issue.code, issue.path, issue.message]);
    if (reported.has(key)) return;
    reported.add(key);
    output[issue.severity === 'error' ? 'error' : 'warn'](
      `[${source}:${issue.severity}:${issue.code}] ${issue.path} : ${issue.message}`);
  };
}

export const reportContentDiagnostic = createDiagnosticReporter();

// Only audited, byte-for-byte equivalent warnings are summarized at startup.
// service.validate() continues to return every diagnostic, including its exact path.
export function reportStartupDiagnostics(issues: readonly ContentIssue[], development: boolean,
  report = reportContentDiagnostic, summary: (message: string, details: readonly ContentIssue[]) => void = console.debug) {
  const expected = issues.filter(issue => expectedPedagogicalDiagnostics.some(known =>
    known.severity === issue.severity && known.code === issue.code && known.path === issue.path && known.message === issue.message));
  for (const issue of issues) if (!expected.includes(issue)) report('contenu', issue);
  if (development && expected.length) summary(
    `[contenu] ${expected.length} diagnostics pédagogiques connus (contenus non confirmés, conservés visibles uniquement). Détails :`, expected);
}
