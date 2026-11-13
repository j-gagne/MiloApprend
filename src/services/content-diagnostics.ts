import type { ContentIssue } from '../content/model.ts';

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
