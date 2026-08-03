/**
 * Calculates a 0-100 adherence score from a list of dose logs.
 * Weighted model:
 *   - Missed-dose ratio   -> 50% weight
 *   - Average delay time  -> 30% weight
 *   - Duplicate attempts  -> 20% weight
 */
function calculateComplianceScore(logs) {
  if (!logs || logs.length === 0) {
    return {
      score: 100,
      riskLevel: 'Low',
      totalDoses: 0,
      missedCount: 0,
      takenCount: 0,
      duplicateCount: 0,
      avgDelayMinutes: 0,
      message: 'No dose history yet',
    };
  }

  const totalDoses = logs.length;
  const missedCount = logs.filter((l) => l.status === 'missed').length;
  const duplicateCount = logs.filter((l) => l.status === 'duplicate').length;
  const takenLogs = logs.filter((l) => l.status === 'taken');
  const takenCount = takenLogs.length;

  // 1. Missed-dose ratio component (0-100, higher missed ratio = lower score)
  const missedRatio = missedCount / totalDoses;
  const missedScore = 100 - missedRatio * 100;

  // 2. Delay pattern component (cap at 120 min = fully penalized)
  const totalDelay = takenLogs.reduce((sum, l) => sum + (l.delayMinutes || 0), 0);
  const avgDelayMinutes = takenCount > 0 ? totalDelay / takenCount : 0;
  const delayPenaltyCap = 120;
  const delayScore = 100 - Math.min(avgDelayMinutes / delayPenaltyCap, 1) * 100;

  // 3. Duplicate attempts component
  const duplicateRatio = duplicateCount / totalDoses;
  const duplicateScore = 100 - Math.min(duplicateRatio, 1) * 100;

  // Weighted final score
  const finalScore =
    missedScore * 0.5 + delayScore * 0.3 + duplicateScore * 0.2;

  const score = Math.round(Math.max(0, Math.min(100, finalScore)));

  let riskLevel;
  if (score >= 75) riskLevel = 'Low';
  else if (score >= 50) riskLevel = 'Medium';
  else riskLevel = 'High';

  return {
    score,
    riskLevel,
    totalDoses,
    missedCount,
    takenCount,
    duplicateCount,
    avgDelayMinutes: Math.round(avgDelayMinutes),
  };
}

module.exports = { calculateComplianceScore };