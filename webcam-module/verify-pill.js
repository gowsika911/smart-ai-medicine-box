/**
 * Smart AI Medicine Box - Pill Verification
 * Day 9 - Indhumithra (Webcam Module)
 *
 * Combines color-comparison and shape-detection into a single
 * verifyPill() function used to confirm the correct pill was taken.
 *
 * Requires: color-compare.js (Day 6) and shape-detection.js (Day 8)
 * to be loaded on the page BEFORE this file.
 */

/**
 * Verifies a captured pill image against expected color and shape.
 *
 * @param {HTMLCanvasElement} capturedImage - Canvas with the captured pill frame.
 * @param {Object} expectedColor - { min: {r,g,b}, max: {r,g,b} } acceptable RGB range.
 * @param {string} expectedShape - "circle" | "oval" | "irregular"
 * @returns {boolean} true if both color and shape match, false otherwise.
 */
function verifyPill(capturedImage, expectedColor, expectedShape) {
  // Step 1: Get the average color of the captured image
  // (getAverageColor comes from your Day 5 color-detection code)
  const avgColor = getAverageColor(capturedImage);

  // Step 2: Check if that color falls within the expected range
  // (compareColor comes from your Day 6 color-compare code)
  const colorMatch = compareColor(avgColor, expectedColor.min, expectedColor.max);

  // Step 3: Detect the shape of the object in the image
  // (detectShape comes from your Day 8 shape-detection code)
  const detectedShape = detectShape(capturedImage);

  // Step 4: Check if detected shape matches the expected shape
  const shapeMatch = detectedShape === expectedShape;

  // Step 5: Log results for easier debugging while testing
  console.log('Verification result:', {
    avgColor,
    colorMatch,
    detectedShape,
    shapeMatch
  });

  // Step 6: Final result — both color AND shape must match
  return colorMatch && shapeMatch;
}

// Example usage:
// const canvas = document.getElementById('captureCanvas');
// const expectedColor = { min: {r:200,g:200,b:200}, max: {r:255,g:255,b:255} };
// const expectedShape = 'circle';
// const isCorrectPill = verifyPill(canvas, expectedColor, expectedShape);
// console.log('Is correct pill?', isCorrectPill);
