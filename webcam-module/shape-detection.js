/**
 * Smart AI Medicine Box - Pill Shape Detection
 * Day 8 - Indhumithra (Webcam Module)
 *
 * Detects basic shape (circle, oval, irregular) of an object
 * in a captured canvas image using simple pixel edge detection.
 * No external libraries used.
 */

/**
 * Detects the shape of the main object in a canvas.
 * @param {HTMLCanvasElement} canvas - Canvas containing the captured image.
 * @returns {string} "circle" | "oval" | "irregular" | "no-object-detected"
 */
function detectShape(canvas) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Step 1: Convert to a simple binary mask (bright object vs dark background)
  // Adjust threshold based on your lighting setup.
  const threshold = 100;
  const mask = new Uint8Array(width * height);

  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const brightness = (r + g + b) / 3;
    mask[i] = brightness > threshold ? 1 : 0;
  }

  // Step 2: Find bounding box of the object (min/max x and y of "on" pixels)
  let minX = width, maxX = 0, minY = height, maxY = 0;
  let pixelCount = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y * width + x] === 1) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        pixelCount++;
      }
    }
  }

  // No object found
  if (pixelCount < 50) {
    return 'no-object-detected';
  }

  // Step 3: Calculate bounding box dimensions
  const boxWidth = maxX - minX + 1;
  const boxHeight = maxY - minY + 1;
  const boxArea = boxWidth * boxHeight;

  // Step 4: Compare actual object area to bounding box area (fill ratio)
  // and compare width vs height (aspect ratio) to guess the shape.
  const fillRatio = pixelCount / boxArea;
  const aspectRatio = boxWidth / boxHeight;

  // Step 5: Classify shape based on simple rules
  if (fillRatio > 0.75 && aspectRatio > 0.85 && aspectRatio < 1.15) {
    return 'circle';
  } else if (fillRatio > 0.6 && (aspectRatio <= 0.85 || aspectRatio >= 1.15)) {
    return 'oval';
  } else {
    return 'irregular';
  }
}

// Example usage:
// const canvas = document.getElementById('captureCanvas');
// const shape = detectShape(canvas);
// console.log('Detected shape:', shape);
