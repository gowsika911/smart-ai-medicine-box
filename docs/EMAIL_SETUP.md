# Missed-dose emails to the emergency contact (free)

When a dose is missed, MedBox can email the patient's emergency contact. It uses
**Brevo** (free plan: 300 emails a day, no credit card).

Why not Gmail/SMTP? Render's free web services block the SMTP ports (25, 465, 587), so SMTP
silently fails once deployed. Brevo is called over HTTPS, which works.

## One-time setup (about 10 minutes)
1. Create a free account at https://www.brevo.com .
2. Confirm your email address. That address is your **sender**.
   (Brevo > Senders, Domains & Dedicated IPs > Senders. Your sign-up address is already there.
   If you add another one, click the verification link Brevo emails you.)
3. Brevo > profile menu > **SMTP & API** > **API Keys** > **Generate a new API key**. Copy it.
4. In **Render** > your backend service > Environment, add:

   | Name | Value |
   |---|---|
   | `BREVO_API_KEY` | the key from step 3 |
   | `MAIL_FROM_EMAIL` | the verified sender address from step 2 |
   | `MAIL_FROM_NAME` | `MedBox` (optional) |

   For local testing put the same three lines in `backend/.env`.
5. Redeploy / restart the backend.

## Use it
1. In the app: **Profile** > Emergency contact. Fill in the contact's **email**.
2. Tick **Email my emergency contact when I miss a dose** and press **Save profile**.
3. Press **Send a test email**. Ask the contact to check the inbox and the **spam** folder.

## How it behaves
- It only sends if the patient ticked the box (the email contains medicine names).
- One email per patient per minute, even if several doses were missed together.
- At most 8 emails per patient per day.
- If sending fails the dose is still recorded as missed; the app never crashes because of email.
- Do not run the local backend and the Render backend at the same time against the same database,
  otherwise both would send an email.

## Limits
- Emails from a free Gmail/Outlook sender address can land in spam. A custom domain fixes that.
- The free plan allows 300 emails a day in total.
