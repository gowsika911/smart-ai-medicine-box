# 📑 Test Plan Document: Smart AI Medicine Box

**Project Name:** Smart AI Medicine Box – Dose Verification and Elder Compliance Prediction
**Prepared By:** Kiruthika Devi (Integration & QA Lead)
**Phase:** Week 3 – Feature Completion & System Integration

---

## 1. 🎯 Testing Objectives
* **API Validation:** Backend REST endpoints (Auth, Medicines, DoseLogs, Compliance, Alerts) responses validation.
* **System Integration:** React UI, Express Backend, and Webcam canvas module link verification.
* **Security & Auth:** JWT Bearer token authentication and input sanitization validation.
* **Data Accuracy:** Adherence score calculation and caregiver alert triggers verification.

---

## 2. 🧪 Scope of Testing

### **In-Scope:**
1. **Authentication:** User Signup (`POST /api/auth/signup`), Login (`POST /api/auth/login`), JWT handling.
2. **Medicine CRUD:** Add, Edit, Fetch, and Delete daily schedules (`/api/medicines`).
3. **Dose Logging & Verification:** `verifyPill()` canvas response and `POST /api/doselogs` trigger.
4. **Compliance & Scoring:** Adherence percentage calculation (`GET /api/compliance`) and risk levels.
5. **Caregiver Alerts:** Red/Yellow severity cards for missed/mismatched doses (`GET /api/alerts`).

---

## 3. 🛠️ Test Environment & Tools
* **API Client:** Postman
* **Browser:** Google Chrome / Microsoft Edge
* **Database:** MongoDB Atlas
* **Local Servers:** Node/Express (`localhost:5000`), Vite/React (`localhost:5173`)