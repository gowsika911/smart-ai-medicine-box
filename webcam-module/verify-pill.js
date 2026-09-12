/**
 * Smart AI Medicine Box - Pill Verification (with Edge Case Handling)
 * Day 13 - Indhumithra (Webcam Module)
 *
 * This REPLACES your Day 9 verifyPill.js file.
 * It now returns a status object instead of just true/false,
 * so you can show more helpful messages to the user.
 *
 * Requires: color-compare.js, shape-detection.js loaded before this file.
 */

/**
 * Checks if the captured image is too dark to analyze reliably.
 * @param {HTMLCanvasElement} canvas
 * @returns {boolean} true if image is too dark
 */
function isImageTooDark(canvas) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  let totalBrightness = 0;
  const pixelCount = width * height;

  for (let i = 0; i < pixelCount; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    totalBrightness += (r + g + b) / 3;
  }

  const avgBrightness = totalBrightness / pixelCount;

  // If average brightness is very low, the room/frame is too dark
  return avgBrightness < 40;
}

/**
 * Verifies a captured pill image, handling edge cases first.
 *
 * @param {HTMLCanvasElement} capturedImage
 * @param {Object} expectedColor - { min: {r,g,b}, max: {r,g,b} }
 * @param {string} expectedShape - "circle" | "oval" | "irregular"
 * @returns {Object} { status: string, matched: boolean, message: string }
 *
 * Possible status values:
 *   "too-dark"          - image too dark to analyze
 *   "no-object"         - no pill detected in frame
 *   "match"             - pill verified successfully
 *   "mismatch"          - pill does not match expected color/shape
 */
function verifyPill(capturedImage, expectedColor, expectedShape) {
  // Edge case 1: Check lighting first
  if (isImageTooDark(capturedImage)) {
    return {
      status: 'too-dark',
      matched: false,
      message: 'Image is too dark. Please improve lighting and try again.'
    };
  }

  // Edge case 2: Check if any object was detected at all
  const detectedShape = detectShape(capturedImage);
  if (detectedShape === 'no-object-detected') {
    return {
      status: 'no-object',
      matched: false,
      message: 'No pill detected in frame. Please place the pill clearly in view.'
    };
  }

  // Normal verification: color check
  const avgColor = getAverageColor(capturedImage);
  const colorMatch = compareColor(avgColor, expectedColor.min, expectedColor.max);

  // Normal verification: shape check
  const shapeMatch = detectedShape === expectedShape;

  if (colorMatch && shapeMatch) {
    return {
      status: 'match',
      matched: true,
      message: 'Pill verified successfully.'
    };
  }

  return {
    status: 'mismatch',
    matched: false,
    message: 'Pill does not match expected color or shape. Please check and try again.'
  };
}

// Example usage:
//
// const result = verifyPill(canvas, expectedColor, expectedShape);
// console.log(result.status, result.message);
//
// showVerificationResult(result.matched, result.message);
//
// if (result.matched) {
//   logDoseTaken("PUT_ACTUAL_MEDICINE_ID_HERE");
// }
