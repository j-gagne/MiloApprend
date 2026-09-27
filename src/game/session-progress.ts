export interface SessionProgress {
  readonly totalTargets: number;
  readonly completedTargets: number;
  readonly perfectTargets: number;
  readonly incorrectAttemptsForCurrentTarget: number;
  readonly currentTargetCompleted: boolean;
}

export function createSessionProgress(totalTargets: number): SessionProgress {
  return { totalTargets, completedTargets: 0, perfectTargets: 0,
    incorrectAttemptsForCurrentTarget: 0, currentTargetCompleted: false };
}

export function incorrectAttempt(progress: SessionProgress): SessionProgress {
  if (progress.currentTargetCompleted || progress.completedTargets >= progress.totalTargets) return progress;
  return { ...progress, incorrectAttemptsForCurrentTarget: progress.incorrectAttemptsForCurrentTarget + 1 };
}

export function completeTarget(progress: SessionProgress): SessionProgress {
  if (progress.currentTargetCompleted || progress.completedTargets >= progress.totalTargets) return progress;
  return { ...progress, completedTargets: progress.completedTargets + 1,
    perfectTargets: progress.perfectTargets + Number(progress.incorrectAttemptsForCurrentTarget === 0),
    currentTargetCompleted: true };
}

export function nextTarget(progress: SessionProgress): SessionProgress {
  if (!progress.currentTargetCompleted || progress.completedTargets >= progress.totalTargets) return progress;
  return { ...progress, incorrectAttemptsForCurrentTarget: 0, currentTargetCompleted: false };
}
