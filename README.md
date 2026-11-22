# Smart AI Medicine Box

A full-stack medicine management and adherence assistant that combines dose scheduling, prescription OCR, webcam-based pill verification, missed-dose risk estimation, and an AI-powered health information assistant.

> **Important:** This project is an educational and assistive software application. It does not replace advice from a qualified doctor or pharmacist. Do not use its OCR, image recognition, or AI responses to decide whether to start, stop, or change medication.

## Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [AI and Smart Features](#ai-and-smart-features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Demo Data](#demo-data)
- [Optional Pill Model](#optional-pill-model)
- [Email Alerts](#email-alerts)
- [Safety and Privacy](#safety-and-privacy)
- [Documentation](#documentation)

## Features

- **Account management:** JWT-based signup and login.
- **Medicine scheduling:** Create, edit, and manage medicines with multiple daily dose times and course lengths.
- **Dose tracking:** Record taken, missed, delayed, or mismatched doses.
- **Adherence dashboard:** Review dose history, adherence summaries, and missed-dose risk estimates.
- **Prescription scanner:** Extract printed prescription text in the browser using Tesseract.js; users can review and edit extracted details before adding medicines.
- **Pill verification:** Use a webcam and an optional TensorFlow.js image model, with a colour-and-shape fallback.
- **Health assistant:** Ask general medicine-related questions through a server-side Groq-compatible LLM integration.
- **Caregiver alerts:** Optional email notifications for missed doses through Brevo.

## Technology Stack

| Area | Technologies |
|---|---|
| Frontend | React 19, Vite, JavaScript, CSS |
| Computer vision / OCR | TensorFlow.js, Tesseract.js, browser webcam and Canvas APIs |
| Backend | Node.js, Express |
| Database | MongoDB with Mongoose |
| Authentication | JSON Web Tokens, bcryptjs |
| AI assistant | Groq API using an OpenAI-compatible interface |
| Email alerts | Brevo HTTPS API |

## AI and Smart Features

### Missed-dose risk estimation

The backend includes a JavaScript logistic-regression model in `backend/utils/riskModel.js`. It estimates the likelihood of missing a medicine's next dose using dose-history patterns, time of day, weekday/weekend information, and recent missed-dose frequency. When there is insufficient history, the application falls back to a smoothed estimate.

Authenticated endpoint: `GET /api/risk`.

### Prescription OCR

The `/scan` page uses Tesseract.js in the browser to read printed prescriptions. The parser in `frontend/src/utils/prescriptionParser.js` recognises common dosage and schedule patterns. Users must review and correct the extracted rows before saving them. Handwriting may not be read reliably.

### Pill verification

The verification page supports two approaches:

1. **Optional TensorFlow.js model:** Place a trained Teachable Machine model in `frontend/public/model/` following the instructions in that folder. The application uses a confidence threshold and selected-medicine class match before recording a dose as taken.
2. **Fallback visual check:** Without a trained model, the application compares the saved pill colour and shape.

Image classification can be wrong. Always verify medication using its original packaging and professional guidance.

### Health assistant

The `/assistant` page sends questions to the backend, which calls the configured Groq-compatible API. The API key is kept on the server. The assistant is intended for general information and must not be relied on for diagnosis, emergency decisions, or medication changes.

## Project Structure

~~~text
smart-ai-medicine-box/
├── backend/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── scripts/
│   ├── utils/
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── docs/
│   ├── EMAIL_SETUP.md
│   └── TRAIN_PILL_MODEL.md
├── frontend/
│   ├── public/
│   │   └── model/
│   ├── src/
│   │   ├── api/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── context/
│   │   └── utils/
│   ├── .env.example
│   └── package.json
└── .gitignore
~~~

## Getting Started

### Prerequisites

- Node.js 18 or later and npm
- MongoDB database (local or hosted)
- A Groq API key for live assistant responses (optional)
- Brevo API credentials for caregiver email alerts (optional)

### 1. Clone the repository

~~~bash
git clone https://github.com/gowsika911/smart-ai-medicine-box.git
cd smart-ai-medicine-box
~~~

### 2. Configure and start the backend

~~~bash
cd backend
npm install
~~~

Create your local environment file by copying the example:

**Windows Command Prompt**
~~~bat
copy .env.example .env
~~~

**macOS / Linux**
~~~bash
cp .env.example .env
~~~

Edit `backend/.env` and provide your MongoDB connection string and a strong JWT secret. Add optional provider credentials only if you use those integrations.

Start the backend in development mode:

~~~bash
npm run dev
~~~

The backend uses port `5000` by default unless configured otherwise.

### 3. Configure and start the frontend

Open a second terminal from the repository root:

~~~bash
cd frontend
npm install
~~~

Create the frontend environment file:

**Windows Command Prompt**
~~~bat
copy .env.example .env
~~~

**macOS / Linux**
~~~bash
cp .env.example .env
~~~

Check that `VITE_API_URL` points to your backend API. For local development, the example value is `http://localhost:5000/api`.

Start the Vite development server:

~~~bash
npm run dev
~~~

Open the local URL printed by Vite in your browser.

## Environment Variables

Use the example files as templates:

- `backend/.env.example` — database, JWT, CORS, timezone, email, and AI provider settings.
- `frontend/.env.example` — frontend API base URL.

Never commit real `.env` files, API keys, database credentials, or JWT secrets. Configure production secrets through your hosting provider's environment-variable settings.

## Demo Data

To seed the backend with sample dose history:

~~~bash
cd backend
node scripts/seedDemoData.js
~~~

The seed script's demo account credentials are intended only for local demonstration. Do not reuse demo credentials in a deployed environment.

## Optional Pill Model

A trained Teachable Machine model can be added under `frontend/public/model/`. Follow the instructions in [frontend/public/model/README.md](frontend/public/model/README.md) and [docs/TRAIN_PILL_MODEL.md](docs/TRAIN_PILL_MODEL.md).

## Email Alerts

Caregiver email alerts are optional and require Brevo configuration. Follow [docs/EMAIL_SETUP.md](docs/EMAIL_SETUP.md). The feature should be enabled only with the patient's informed consent because notifications may contain medicine names.

## Safety and Privacy

- This application is not a medical device and is not a substitute for professional medical advice.
- Never change or skip a prescribed dose based only on an AI response or image-classification result.
- OCR and pill recognition can make mistakes; confirm all medicine names, strengths, and schedules against the prescription and packaging.
- Keep API keys, database credentials, and JWT secrets private.
- Avoid entering personal identifiers or sensitive medical details into third-party AI services.
- Use secure authentication, database access rules, HTTPS, and appropriate privacy controls before any real-world deployment.

## Documentation

- [Train the pill recognition model](docs/TRAIN_PILL_MODEL.md)
- [Configure caregiver email alerts](docs/EMAIL_SETUP.md)

---

Developed by **Gowsika E.**
