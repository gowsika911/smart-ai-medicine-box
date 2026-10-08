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

### 3. Pill verification (computer vision)
Webcam check compares the pill's colour and shape against what was saved for that medicine (rule-based image processing).

## ⚙️ Installation & Setup

### 1. Backend Setup
```bash
cd backend
npm install
npm run dev
