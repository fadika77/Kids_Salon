# Kids Barbershop – Backend (FastAPI + SQL Server)

## Prerequisites

- Python 3.10+
- Microsoft SQL Server (2019+ or Express)
- SSMS (SQL Server Management Studio)
- ODBC Driver 17 for SQL Server
  - Windows: [Download here](https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server)
  - Linux: `apt-get install unixodbc-dev` + ODBC driver package

---

## 1. Database Setup

### Step 1 – Create the database and tables

Open SSMS, connect to your SQL Server instance, then run the SQL script:

```
backend/create_tables.sql
```

This will:
- Create the `KidsBarbershop` database
- Create all 4 tables: `users`, `appointment_slots`, `bookings`, `app_settings`

### Step 2 – Seed the default admin user

Run the second script:

```
backend/seed_admin.sql
```

Default admin credentials:
- **Email:** `admin@kidsbarbershop.com`
- **Password:** `Admin123!`

> **Change this password immediately after your first login.**

---

## 2. Backend Setup

### Step 1 – Clone / copy project

Put the `backend/` folder on your machine.

### Step 2 – Create a virtual environment

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

### Step 3 – Install dependencies

```bash
pip install -r requirements.txt
```

### Step 4 – Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# SQL Server connection (Option A – full URL)
DATABASE_URL=mssql+pyodbc://sa:YourPassword@localhost/KidsBarbershop?driver=ODBC+Driver+17+for+SQL+Server

# JWT
JWT_SECRET_KEY=replace-with-a-long-random-secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# SMTP (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password   # Use a Gmail App Password, not your main password
SMTP_FROM_EMAIL=your-email@gmail.com

# Admin
ADMIN_DEFAULT_EMAIL=admin@kidsbarbershop.com
ADMIN_DEFAULT_PASSWORD=Admin123!
SHOP_NAME=Kids Barbershop
```

### Step 5 – Run the server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at: `http://localhost:8000`  
Interactive docs: `http://localhost:8000/docs`

---

## 3. SQL Server Connection Notes

### Connection string format

```
mssql+pyodbc://<user>:<password>@<server>/<database>?driver=ODBC+Driver+17+for+SQL+Server
```

### Common examples

| Scenario | Example |
|---|---|
| Local default instance | `mssql+pyodbc://sa:pass@localhost/KidsBarbershop?driver=ODBC+Driver+17+for+SQL+Server` |
| Named instance | `mssql+pyodbc://sa:pass@localhost\SQLEXPRESS/KidsBarbershop?driver=ODBC+Driver+17+for+SQL+Server` |
| Windows auth | `mssql+pyodbc://@localhost/KidsBarbershop?driver=ODBC+Driver+17+for+SQL+Server&trusted_connection=yes` |

### Windows Authentication (no username/password)

```env
DATABASE_URL=mssql+pyodbc://@localhost/KidsBarbershop?driver=ODBC+Driver+17+for+SQL+Server&trusted_connection=yes
```

---

## 4. API Routes Reference

### Auth
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/auth/register` | Public | Register a new customer |
| POST | `/auth/login` | Public | Login (returns JWT) |
| GET | `/auth/me` | Any user | Get current user info |

### Customer
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/appointment-types` | Public | List appointment types |
| GET | `/slots/available?date=YYYY-MM-DD` | Public | Get available slots for a date |
| POST | `/bookings` | Customer | Create a booking |
| GET | `/bookings/my` | Customer | Get my bookings |
| PUT | `/bookings/{id}/cancel` | Customer | Cancel my booking |

### Admin
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/admin/dashboard` | Admin | Dashboard statistics |
| GET | `/admin/slots` | Admin | All slots (optional ?date=) |
| POST | `/admin/slots` | Admin | Create a slot |
| PUT | `/admin/slots/{id}` | Admin | Edit a slot |
| DELETE | `/admin/slots/{id}` | Admin | Delete a slot |
| GET | `/admin/bookings` | Admin | All bookings with filters |
| PUT | `/admin/bookings/{id}/cancel` | Admin | Cancel a booking |
| GET | `/admin/settings` | Admin | Get settings |
| PUT | `/admin/settings` | Admin | Update settings |

---

## 5. Gmail App Password Setup

1. Go to your Google Account → Security → 2-Step Verification (enable it first)
2. Then go to Security → App passwords
3. Generate an app password for "Mail"
4. Use that 16-character password as `SMTP_PASSWORD`

---

## 6. Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py          ← FastAPI app entry point
│   ├── database.py      ← SQLAlchemy engine & session
│   ├── models.py        ← ORM models
│   ├── schemas.py       ← Pydantic request/response schemas
│   ├── auth.py          ← JWT & password utilities
│   ├── email_service.py ← SMTP email functions
│   └── routers/
│       ├── auth.py      ← /auth/* routes
│       ├── customer.py  ← /slots/*, /bookings/* routes
│       └── admin.py     ← /admin/* routes
├── create_tables.sql    ← Run in SSMS first
├── seed_admin.sql       ← Seed default admin
├── requirements.txt
├── .env.example
└── README.md
```
