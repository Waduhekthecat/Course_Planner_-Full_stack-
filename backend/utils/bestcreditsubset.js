export function bestCreditSubset(courses, maxCredits) {
  let bestCombo = [];
  let bestTotal = 0;

  function backtrack(start, combo, total) {
    if (total > maxCredits) return;
    if (total > bestTotal) {
      bestTotal = total;
      bestCombo = [...combo];
    }
    for (let i = start; i < courses.length; i++) {
      combo.push(courses[i]);
      backtrack(i + 1, combo, total + courses[i].credits);
      combo.pop();
    }
  }

  backtrack(0, [], 0);
  return bestCombo;
}