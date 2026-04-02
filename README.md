# 💰 Hisaab-Kitaab – Expense Management System

HisabKitab is a **modern expense management system** designed to help individuals and groups track income, expenses, and budgets.
It provides **secure authentication, budgeting tools, detailed analytics, and group expense sharing** – making personal and shared money management simple.

---

## ✨ Features

### 🔐 1. User Authentication (Cookie Session)

* Secure **Sign-Up & Login** (Name, Email, Mobile Number, Password).
* **OTP Verification** via Gmail API (OAuth2) (Email mandatory, Mobile optional if free service available).
* **Login without OTP** – Users can log in using only email & password.
* **Password Reset** – Secure password recovery system.
* **Profile Deletion** – Users can permanently delete their account & all data.

---

### 💸 2. Expense Tracking

* **Add Expenses** – Input amount, category, date, and description.
* **Edit/Delete** – Modify or remove existing expenses.
* **Categorization** – Organize expenses into categories like *Food, Travel, Bills, Entertainment, etc.*

---

### 💰 3. Income Tracking

* **Add Monthly Income** – Users can record income.
* Income is displayed on the **profile dashboard** with total monthly expense for comparison.

---

### 📊 4. Budgeting & Alerts

* **Set Budget Goals** – Define monthly spending limits.
* **Real-Time Alerts** – Notifications when nearing or exceeding budget.

---

### 📈 5. Reports & Analytics

* **Monthly & Yearly Summaries** – Clear breakdown of spending patterns.
* **Visual Charts** – Pie charts & bar graphs for analysis.
* **Export Data** – Download expense reports in **CSV/PDF** format.

---

### 👥 6. Multi-User & Group Expenses

* **Shared Expenses** – Split costs among friends/family (like Splitwise).
* **Group Expense Feature** –

  * Create groups.
  * Add members (by Mobile Number).
  * Divide expenses fairly (visible to all group members).
* **Flexible Cost Splitting** – Choose different methods to split costs.

---

## 🛠️ Tech Stack

* **Frontend:** React + Vite + Tailwind CSS
* **Backend:** Node.js + Express
* **Database:** MongoDB / PostgreSQL (your choice)
* **Authentication:** Cookie Session + JWT (for APIs)
* **Email Service:** Gmail API (OAuth2)
* **Optional:** SMS API (if free service available for mobile OTP)

---

## 🚀 Installation

```bash
# Clone the repository
git clone https://github.com/your-username/hisabkitab.git

# Navigate to project folder
cd hisabkitab

# Install dependencies (Frontend + Backend separately)
cd frontend
npm install

cd ../backend
npm install

# Run development servers
npm run dev

## Backend Environment Variables

Create a `.env` file inside `backend/` and configure these values:

```env
PORT=5000
NODE_ENV=development
URL_DB=<mongodb-connection-string>
FRONTEND_URL=http://localhost:5173

# Gmail API OAuth2 (primary keys)
GMAIL_CLIENT_ID=<google-oauth-client-id>
GMAIL_CLIENT_SECRET=<google-oauth-client-secret>
# Optional at runtime (recommended to keep for token tooling)
GMAIL_REDIRECT_URI=https://developers.google.com/oauthplayground
GMAIL_REFRESH_TOKEN=<google-oauth-refresh-token>
EMAIL_FROM=Hisaab Kitaab Support <your-email@gmail.com>

# Optional backward-compatible fallback keys
CLIENT_ID=<google-oauth-client-id>
CLIENT_SECRET=<google-oauth-client-secret>
REDIRECT_URI=https://developers.google.com/oauthplayground
REFRESH_TOKEN=<google-oauth-refresh-token>
EMAIL=<your-email@gmail.com>
EMAIL_USER=<your-email@gmail.com>
```

## Gmail API Setup (OAuth2)

1. Open Google Cloud Console and create/select a project.
2. Enable the Gmail API for that project.
3. Configure OAuth consent screen (External or Internal based on your org).
4. Create OAuth Client ID credentials (Web application).
5. Add an authorized redirect URI (for local token generation, OAuth Playground URI is commonly used).
6. Generate a refresh token for the sender account with Gmail scope:
  `https://www.googleapis.com/auth/gmail.send`
7. Save OAuth credentials in backend `.env` (never hardcode in source code).
8. Restart backend after any `.env` changes.