/**
 * Missed-dose risk prediction.
 *
 * A small logistic-regression model trained (in plain JavaScript, no external
 * libraries) on the patient's OWN dose history. For every past dose we know the
 * outcome (taken = 0, missed = 1) and we learn which patterns lead to misses:
 *
 *   - time of day          (hour encoded as sin/cos so 23:00 is "close" to 01:00)
 *   - weekend vs weekday   (plus how weekends change the time-of-day effect)
 *   - recent behaviour     (share of the last 5 doses of that medicine that were missed)
 *
 * With too little history the model would just memorise noise, so we fall back to
 * a smoothed baseline miss-rate and say so in the result ("baseline").
 */

const MIN_SAMPLES = 15; // labelled doses needed before we train the model
const MIN_PER_CLASS = 3; // need at least 3 taken AND 3 missed examples
const RECENT_WINDOW = 5;
const PRIOR_MISS_RATE = 0.15; // assumed miss rate before we know anything
const PRIOR_WEIGHT = 4;

const FEATURE_NAMES = ['bias', 'timeSin', 'timeCos', 'weekend', 'recentMiss', 'weekendTimeSin', 'weekendTimeCos'];

const sigmoid = (z) => 1 / (1 + Math.exp(-z));

function hourOf(hhmm) {
  const [h, m] = String(hhmm).split(':').map(Number);
  return (h || 0) + (m || 0) / 60;
}

function isWeekend(date) {
  const day = date.getDay(); // 0 = Sunday, 6 = Saturday
  return day === 0 || day === 6 ? 1 : 0;
}

function features(hour, weekend, recentMiss) {
  const angle = (2 * Math.PI * hour) / 24;
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  // The last two let the model learn "weekend EVENINGS are different", not just
  // "weekends" and "evenings" separately.
  return [1, sin, cos, weekend, recentMiss, weekend * sin, weekend * cos];
}

/**
 * Turn dose logs into labelled training rows.
 * Only "taken" and "missed" are used ("duplicate"/"mismatched" are not a miss).
 * recentMiss is computed ONLY from doses that came before, so the model never
 * peeks at the future.
 */
function buildTrainingRows(logs) {
  const usable = logs
    .filter((l) => l.status === 'taken' || l.status === 'missed')
    .map((l) => ({
      medicineId: String(l.medicineId),
      scheduledTime: l.scheduledTime,
      when: new Date(l.actualTime),
      missed: l.status === 'missed' ? 1 : 0,
    }))
    .sort((a, b) => a.when - b.when);

  const historyByMedicine = {};
  const rows = [];

  for (const log of usable) {
    const history = historyByMedicine[log.medicineId] || [];
    const recent = history.slice(-RECENT_WINDOW);
    const recentMiss = recent.length ? recent.reduce((s, v) => s + v, 0) / recent.length : PRIOR_MISS_RATE;

    rows.push({
      x: features(hourOf(log.scheduledTime), isWeekend(log.when), recentMiss),
      y: log.missed,
    });

    history.push(log.missed);
    historyByMedicine[log.medicineId] = history;
  }
  return rows;
}

function trainLogistic(rows, { epochs = 1500, learningRate = 0.5, l2 = 0.005 } = {}) {
  const n = rows.length;
  const dim = rows[0].x.length;
  const weights = new Array(dim).fill(0);

  for (let epoch = 0; epoch < epochs; epoch++) {
    const grad = new Array(dim).fill(0);
    for (const { x, y } of rows) {
      const p = sigmoid(x.reduce((s, xi, i) => s + xi * weights[i], 0));
      const err = p - y;
      for (let i = 0; i < dim; i++) grad[i] += err * x[i];
    }
    for (let i = 0; i < dim; i++) {
      const reg = i === 0 ? 0 : l2 * weights[i]; // don't regularise the bias
      weights[i] -= learningRate * (grad[i] / n + reg);
    }
  }

  const correct = rows.filter(({ x, y }) => {
    const p = sigmoid(x.reduce((s, xi, i) => s + xi * weights[i], 0));
    return (p >= 0.5 ? 1 : 0) === y;
  }).length;

  const meanX = new Array(dim).fill(0);
  rows.forEach(({ x }) => x.forEach((v, i) => { meanX[i] += v / n; }));

  return { weights, meanX, trainingAccuracy: correct / n };
}

function levelFor(probability) {
  if (probability >= 0.5) return 'High';
  if (probability >= 0.25) return 'Medium';
  return 'Low';
}

function describeHour(hour) {
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'night';
}

/** Next time this medicine is due (today if still ahead, otherwise tomorrow). */
function nextDoseDate(doseTime, now) {
  const [h, m] = doseTime.split(':').map(Number);
  const next = new Date(now);
  next.setHours(h, m, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next;
}

function explain(model, x, hour, weekend, recentMiss) {
  const reasons = [];
  // How far each feature pushes this prediction above the "average dose".
  const contributions = model.weights.map((w, i) => ({ i, value: w * (x[i] - model.meanX[i]) }));

  const timeEffect = contributions[1].value + contributions[2].value;
  const weekendEffect = contributions[3].value + contributions[5].value + contributions[6].value;
  if (weekendEffect > 0.25 && weekend) {
    reasons.push(`${describeHour(hour)} doses are missed more often on weekends`);
  } else if (timeEffect > 0.25) {
    reasons.push(`${describeHour(hour)} doses are missed more often`);
  }
  if (contributions[4].value > 0.25 && recentMiss > 0) {
    reasons.push(`${Math.round(recentMiss * 100)}% of the last doses were missed`);
  }
  return reasons;
}

/**
 * @param {Array} logs       DoseLog documents (plain objects are fine)
 * @param {Array} medicines  Medicine documents
 * @param {Date}  now        injectable for testing
 */
function predictRisk(logs, medicines, now = new Date()) {
  const rows = buildTrainingRows(logs);
  const missedRows = rows.filter((r) => r.y === 1).length;
  const takenRows = rows.length - missedRows;

  const canTrain =
    rows.length >= MIN_SAMPLES && missedRows >= MIN_PER_CLASS && takenRows >= MIN_PER_CLASS;
  const model = canTrain ? trainLogistic(rows) : null;

  const predictions = medicines.map((medicine) => {
    const medId = String(medicine._id);
    const medLogs = logs
      .filter((l) => String(l.medicineId) === medId && (l.status === 'taken' || l.status === 'missed'))
      .sort((a, b) => new Date(a.actualTime) - new Date(b.actualTime));

    const recent = medLogs.slice(-RECENT_WINDOW);
    const recentMiss = recent.length
      ? recent.filter((l) => l.status === 'missed').length / recent.length
      : PRIOR_MISS_RATE;

    const dueAt = nextDoseDate(medicine.doseTime, now);
    const hour = hourOf(medicine.doseTime);
    const weekend = isWeekend(dueAt);

    let probability;
    let reasons = [];

    if (model) {
      const x = features(hour, weekend, recentMiss);
      probability = sigmoid(x.reduce((s, xi, i) => s + xi * model.weights[i], 0));
      reasons = explain(model, x, hour, weekend, recentMiss);
    } else {
      const missed = medLogs.filter((l) => l.status === 'missed').length;
      probability = (missed + PRIOR_MISS_RATE * PRIOR_WEIGHT) / (medLogs.length + PRIOR_WEIGHT);
      if (missed > 0) reasons.push(`${missed} of ${medLogs.length} past doses were missed`);
    }

    return {
      medicineId: medicine._id,
      medicineName: medicine.medicineName,
      doseTime: medicine.doseTime,
      nextDoseAt: dueAt,
      probability: Math.round(probability * 100) / 100,
      level: levelFor(probability),
      reasons,
    };
  });

  predictions.sort((a, b) => b.probability - a.probability);

  return {
    model: model ? 'logistic-regression' : 'baseline',
    trainedOn: rows.length,
    trainingAccuracy: model ? Math.round(model.trainingAccuracy * 100) / 100 : null,
    note: model
      ? null
      : `Not enough history yet (${rows.length}/${MIN_SAMPLES} doses with both taken and missed examples). Showing a simple estimate.`,
    predictions,
  };
}

module.exports = { predictRisk, buildTrainingRows, trainLogistic, FEATURE_NAMES };
