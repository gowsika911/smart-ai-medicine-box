// Optional AI pill recognition using a model trained in Google Teachable Machine
// (Image Project -> Export Model -> TensorFlow.js). Put the 3 exported files
// (model.json, metadata.json, weights.bin) in frontend/public/model/ and this
// file picks them up automatically. Without them the app uses the colour/shape check.

const MODEL_URL = '/model/model.json';
const METADATA_URL = '/model/metadata.json';

export const CONFIDENT_ENOUGH = 0.8;
const NO_PILL_LABEL = /^(background|nothing|none|empty|no[\s_-]?pill|no[\s_-]?object)$/i;

const normalize = (text) => String(text || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const firstWord = (text) => String(text || '').trim().split(/\s+/)[0] || '';

/** Does the model's class name refer to this medicine? ("Metformin" ~ "Metformin 500mg") */
export function labelMatchesMedicine(label, medicineName) {
  const a = normalize(label);
  const b = normalize(medicineName);
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;
  const fa = normalize(firstWord(label));
  const fb = normalize(firstWord(medicineName));
  return fa.length >= 4 && fa === fb;
}

/**
 * Turns the model's probabilities into a verdict.
 * @param {Array<{label:string, confidence:number}>} predictions sorted high -> low
 * @param {string} expectedName name of the medicine selected in the app
 * @returns {{status:'match'|'mismatch'|'unsure'|'nopill', label:string, confidence:number, message:string}}
 */
export function interpretPrediction(predictions, expectedName) {
  const top = predictions[0];
  if (!top) {
    return { status: 'unsure', label: '', confidence: 0, message: 'The model could not read this image. Try again.' };
  }
  const pct = Math.round(top.confidence * 100);

  if (NO_PILL_LABEL.test(top.label.trim()) && top.confidence >= 0.6) {
    return { status: 'nopill', label: top.label, confidence: top.confidence, message: 'No pill detected. Hold the pill in front of the camera.' };
  }
  if (top.confidence < CONFIDENT_ENOUGH) {
    return {
      status: 'unsure',
      label: top.label,
      confidence: top.confidence,
      message: `Not sure (best guess ${top.label}, ${pct}%). Use better light and a plain background, then try again.`,
    };
  }
  if (labelMatchesMedicine(top.label, expectedName)) {
    return { status: 'match', label: top.label, confidence: top.confidence, message: `AI verified: this looks like ${top.label} (${pct}% sure).` };
  }
  return {
    status: 'mismatch',
    label: top.label,
    confidence: top.confidence,
    message: `Wrong pill? The AI sees ${top.label} (${pct}% sure), but you selected ${expectedName}.`,
  };
}

/** Is a trained model published with the app? (Never throws.) */
async function modelIsPublished() {
  try {
    const res = await fetch(MODEL_URL, { cache: 'no-cache' });
    if (!res.ok) return false;
    // When the file is missing, hosts like Vercel return index.html with status 200,
    // so we must check that the response is really a TensorFlow.js model.
    const json = await res.json();
    return Boolean(json && (json.modelTopology || json.weightsManifest));
  } catch {
    return false;
  }
}

/**
 * @returns {Promise<null | { labels:string[], predict:(canvas:HTMLCanvasElement)=>Promise<Array<{label:string,confidence:number}>>, dispose:()=>void }>}
 * null when no model is published.
 */
export async function loadPillModel() {
  if (!(await modelIsPublished())) return null;

  // Big library: only downloaded when a model actually exists.
  const tf = await import('@tensorflow/tfjs');
  const model = await tf.loadLayersModel(MODEL_URL);

  const metadata = await (await fetch(METADATA_URL)).json();
  const labels = metadata.labels || metadata.classNames || [];
  const [, height, width] = model.inputs[0].shape;

  return {
    labels,
    async predict(canvas) {
      const probabilities = tf.tidy(() => {
        let img = tf.browser.fromPixels(canvas).toFloat();
        // centre-crop to a square, like Teachable Machine does when it trains
        const [h, w] = img.shape;
        const side = Math.min(h, w);
        img = img.slice([Math.floor((h - side) / 2), Math.floor((w - side) / 2), 0], [side, side, 3]);
        img = tf.image.resizeBilinear(img, [height, width]);
        const input = img.div(127.5).sub(1).expandDims(0); // [-1, 1] range
        return model.predict(input);
      });
      const values = Array.from(await probabilities.data());
      probabilities.dispose();
      return values
        .map((confidence, i) => ({ label: labels[i] ?? `class ${i}`, confidence }))
        .sort((a, b) => b.confidence - a.confidence);
    },
    dispose() {
      model.dispose();
    },
  };
}
