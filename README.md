# Smart AI Medicine Box 💊🤖

An intelligent healthcare assistant built on the MERN stack integrated with real-time computer vision for pill verification and adherence monitoring.

## 🚀 Features
- **User Authentication:** Secure JWT-based signup and login system.
- **Medicine Management:** CRUD schedule tracking for daily prescribed medications.
- **Webcam Computer Vision:** Image canvas analysis verifying pill shape and color before logging doses.
- **Adherence & Compliance:** Real-time calculation of adherence scores and risk levels.
- **Caregiver Alerts:** Automatic logging and display of missed, delayed, or mismatched pill doses.

## 🛠️ Tech Stack
- **Frontend:** React.js, Vite, HTML5 Canvas API, Axios, CSS3
- **Backend:** Node.js, Express.js
- **Database:** MongoDB
- **Authentication:** JSON Web Tokens (JWT) & bcrypt

## 🤖 AI Features

### 1. Missed-dose risk prediction (machine learning)
Dashboard card that shows the chance of missing each medicine's **next dose**.
- A logistic-regression model, written in plain JavaScript (`backend/utils/riskModel.js`), is trained on the patient's own dose history every time the card loads.
- Inputs: time of day, weekday vs weekend (and how weekends change the time-of-day effect), and the share of recent doses of that medicine that were missed.
- With too little history (fewer than 15 doses, or no missed/taken examples) it shows a simple smoothed estimate and says so.
- On synthetic data with a built-in pattern it recovered the pattern (weekend-night risk ~55% vs ~17% on a weekday) and beat a constant-rate baseline on held-out log-loss (0.39 vs 0.45).
- API: `GET /api/risk` (auth required).
- Demo data: `cd backend && node scripts/seedDemoData.js`, then log in with `demo@medbox.com` / `demo123`.

### 2. Prescription scanner (OCR)
`/scan` page: take or upload a photo of a printed prescription.
- Text is read in the browser with Tesseract.js (image never leaves the device).
- `frontend/src/utils/prescriptionParser.js` extracts medicine names, dosages and schedules (`1-0-1`, OD, BD, TDS, HS, "after food", ...).
- The user reviews and edits every row before the medicines are added.
- Limitations: printed text only (handwriting is unreliable); as-needed (SOS) and weekly medicines are shown but not added automatically because the app schedules daily doses.

### 3. Pill recognition (computer vision + optional trained model)
"Verify Medicine" page, two modes:
- **AI model (optional):** if a Google Teachable Machine model is placed in `frontend/public/model/` (see the README there), the webcam image is classified with TensorFlow.js. A dose is only logged as taken when the model is at least 80% sure AND the class matches the selected medicine. Low confidence or "no pill" never logs anything.
- **Fallback:** without a model, a rule-based check compares the pill's colour and shape with what was saved for that medicine.

### 4. Health assistant (LLM chatbot)
`/assistant` page: ask about medicines, timing, food and side effects.
- The backend (`/api/chat`) calls a free OpenAI-compatible API (Groq by default). The API key lives only in server environment variables (`GROQ_API_KEY`), never in the browser.
- The prompt includes the patient's medicine list, allergies and conditions, but NOT their name, phone, email or address.
- Safety: it will not diagnose or change doses; emergency words (overdose, chest pain, ...) get a fixed "call 112/108" reply and are never sent to the AI; 30 questions per user per hour.
- Free-tier API traffic may be used by the provider, so avoid typing personal identifiers.

### 5. Edit medicines and several dose times
- **Edit** button on every medicine card: change the name, time, compartment, pill look and course length. Name, compartment, pill look and course length apply to every dose time of that medicine.
- A medicine taken more than once a day can be added with several times at once ("+ Add another time"), or later from the Edit page.
- One active medicine per name: the same medicine cannot be added twice until it is removed or its course ends.
- **"What is it for?" line:** every medicine shows a one-line use under its name (for example "Lowers blood pressure"). It comes from a fixed, hand-written list of about 230 common generic and Indian brand names (`backend/utils/medicineInfo.js`), not from an AI guess, so nothing invented is shown. If the medicine is not in the list the line stays empty and the patient can type their own. A typed line always wins. It is general information, not medical advice.

### 6. Missed-dose emails to the emergency contact
- Optional and opt-in (the email contains medicine names). The patient adds the contact's email in the profile, ticks the box, and can press "Send a test email".
- Sent through Brevo's free HTTPS API (Render's free tier blocks SMTP). Setup: `docs/EMAIL_SETUP.md`.
- One email per patient per minute, at most 8 per day, and a failed email never breaks dose tracking.

### Training the pill model
See `docs/TRAIN_PILL_MODEL.md`.

## ⚙️ Installation & Setup

### 1. Backend Setup
```bash
cd backend
npm install
npm run dev
