export function getGradeClass(s) {
  if (s >= 9) return 'great';
  if (s >= 7) return 'good';
  if (s >= 5) return 'fine';
  if (s >= 3) return 'notgood';
  return 'disaster';
}

export function getGradeLabel(s) {
  if (s >= 9) return 'Great!';
  if (s >= 7) return 'Very Good';
  if (s >= 5) return 'Fine';
  if (s >= 3) return 'Not So Good';
  return 'Poor';
}

export function getScoreColor(score) {
  if (score >= 9) return [90, 138, 30];
  if (score >= 7) return [127, 173, 65];
  if (score >= 5) return [212, 160, 23];
  if (score >= 3) return [225, 112, 85];
  return [192, 57, 43];
}
