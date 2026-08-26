/**
 * Smart AI Medicine Box - Dose Logging
 * Day 11 - Indhumithra (Webcam Module)
 *
 * After verifyPill() confirms the correct pill, this sends a
 * POST request to /api/doselogs to record that the dose was taken.
 */

/**
 * Logs a dose as "taken" in the backend.
 * @param {string} medicineId - The ID of the medicine that was verified.
 * @returns {Promise<Object|null>} The server response, or null if it failed.
 */
async function logDoseTaken(medicineId) {
  // The auth token you received after login (Day 5 backend work).
  // For now, while testing standalone, you can temporarily paste a
  // valid token here. Once the app is fully connected, this should
  // come from where your login page stores it (e.g. localStorage).
  const token = localStorage.getItem('authToken');

  if (!token) {
    console.error('No auth token found. Please log in first, or set one for testing.');
    return null;
  }

  try {
    const response = await fetch('http://localhost:5000/api/doselogs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        medicineId: medicineId,
        status: 'taken'
      })
    });

    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`);
    }

    const data = await response.json();
    console.log('Dose logged successfully:', data);
    return data;

  } catch (err) {
    console.error('Failed to log dose:', err.message);
    return null;
  }
}

// Example usage - after verifyPill() and showVerificationResult():
//
// const isCorrectPill = verifyPill(canvas, expectedColor, expectedShape);
// showVerificationResult(isCorrectPill);
//
// if (isCorrectPill) {
//   const medicineId = "PUT_ACTUAL_MEDICINE_ID_HERE";
//   logDoseTaken(medicineId);
// }
