# Evercare Medical Center – Hospital Management System

A front-end prototype of a hospital management system built with **HTML5, CSS3
and plain JavaScript**. Four kinds of users (Admin, Doctor, Receptionist,
Patient) log in through one common login page and each gets a dashboard with
their own features.

> **Course:** CSC 3215 Web Technologies · Fall 2026-27 · Project Prototype Part
> 1 (CO3) **Important:** this is a _front-end prototype_. Data lives in
> JavaScript arrays in the browser (no backend, no database). See
> [Limitations](#13-limitations).

---

## Table of contents

1. [Project description](#1-project-description)
2. [Team and modules](#2-team-and-modules)
3. [Objectives](#3-objectives)
4. [Technologies used](#4-technologies-used)
5. [User roles](#5-user-roles)
6. [Features](#6-features)
7. [CRUD and search for every role](#7-crud-and-search-for-every-role)
8. [Pages and forms (with JavaScript validation)](#8-pages-and-forms-with-javascript-validation)
9. [Folder structure](#9-folder-structure)
10. [How to run](#10-how-to-run)
11. [Sample login accounts](#11-sample-login-accounts)
12. [How the data and the login work](#12-how-the-data-and-the-login-work)
13. [Limitations](#13-limitations)
14. [Future improvements](#14-future-improvements)
15. [Team Git workflow](#15-team-git-workflow)

---

## 1. Project description

**Targeted users.** Patients, doctors, receptionists and administrators of a
hospital or clinic.

**Problem solved.** Many hospitals still manage appointments, waiting queues,
prescriptions and medicine stock on paper or by phone. This causes double
bookings, unclear waiting times, scattered patient records, and medicines that
expire or run out unnoticed.

**Our solution.** Evercare puts these tasks in one web system:

- a **patient** finds a doctor, books a free time slot and follows the live
  queue;
- a **receptionist** registers patients, books and checks them in, issues queue
  tokens, and reschedules everyone when a doctor suddenly becomes unavailable;
- a **doctor** works through the patient queue, writes prescriptions and reads a
  patient's medical timeline;
- an **admin** monitors hospital statistics, doctor workload, and medicine stock
  and expiry.

---

## 2. Team and modules

| Member                   | Module                 | Files                                                              |
| ------------------------ | ---------------------- | ------------------------------------------------------------------ |
| **Shohan** (Team Leader) | Admin + Home           | `admin.html`, `js/admin.js`, `index.html`, `js/home.js`            |
| **Alif**                 | Doctor + Login         | `doctor.html`, `js/doctor.js`, `login.html`, `js/login.js`         |
| **Saad**                 | Patient + Registration | `patient.html`, `js/patient.js`, `register.html`, `js/register.js` |
| **Najir**                | Receptionist           | `receptionist.html`, `js/receptionist.js`                          |

Shared files used by everyone: `css/style.css`, `js/data.js`, `js/common.js`
(divided by owner, see [Team Git workflow](#15-team-git-workflow)).

---

## 3. Objectives

- Build a multi-page website using **HTML, CSS and JavaScript only**.
- Keep records as **arrays of objects** and process them with **loops,
  conditions and functions**.
- Update the page with the **DOM** (`getElementById`, `innerHTML`,
  `style.display`, `createElement`, `appendChild`).
- Validate every form with JavaScript and show clear error messages.
- Separate **structure (HTML), design (CSS) and behaviour (JS)**, and share one
  data model between several pages.

---

## 4. Technologies used

| Layer     | Technology                                                                                   |
| --------- | -------------------------------------------------------------------------------------------- |
| Structure | HTML5 (forms, tables, fieldsets, semantic tags)                                              |
| Design    | CSS3 – one external stylesheet, Flexbox, Grid, media queries                                 |
| Behaviour | JavaScript (`let`/`const`, functions, arrays and objects, loops, `if`/`switch`, DOM, `Date`) |

No frameworks, no libraries, no backend, no database, no `localStorage`, no
`fetch`.

---

## 5. User roles

| Role             | Dashboard           | What the role does                                                              |
| ---------------- | ------------------- | ------------------------------------------------------------------------------- |
| **Admin**        | `admin.html`        | Monitors the hospital; manages doctors, patients, appointments and medicines    |
| **Doctor**       | `doctor.html`       | Runs the patient queue, writes prescriptions, reads patient history             |
| **Receptionist** | `receptionist.html` | Registers patients, books appointments, checks patients in, handles emergencies |
| **Patient**      | `patient.html`      | Finds doctors, books appointments, tracks the queue, reads own health record    |

Everyone uses the same `login.html`; the role stored in the account decides
which dashboard opens. Patients, doctors and receptionists can register at
`register.html`. **Admin accounts cannot be created publicly.** New doctor and
receptionist accounts are _Pending_ until an admin approves them.

---

## 6. Features

### Common features (all four dashboards)

- **Login / Logout** with one login page
- **Role-based dashboard access** (wrong role → "Access denied")
- **Profile** – view the account and edit name, e-mail and phone
- **Search and filter** on every list
- **Notifications** – list, mark one as read, mark all as read
- **Dashboard statistics** – every number is calculated from the data, nothing
  is hard-coded

### Unique features

| Role             | 1                                                                           | 2                                              | 3                                                                   |
| ---------------- | --------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------- |
| **Admin**        | Hospital Statistics Report (totals, department-wise counts, CSS bar charts) | Doctor Workload Monitor (Low / Medium / High)  | Medicine Stock & Expiry Monitor (low stock, expired, expiring soon) |
| **Doctor**       | Smart Patient Queue (call next, skip, complete)                             | Digital Prescription Builder                   | Patient Medical Timeline                                            |
| **Receptionist** | Quick Patient Registration (duplicate-phone check)                          | Appointment & Slot Manager (no double booking) | Check-in & Token Generator                                          |
| **Patient**      | Smart Doctor Finder (search + filters)                                      | Live Queue Tracker (estimated waiting time)    | Personal Health Record                                              |

**Extra Receptionist feature – Dynamic Slot Booking & Emergency Rescheduling.**
When a doctor suddenly becomes unavailable (Emergency OT Duty, On-Call
Emergency, Medical Emergency, Other), the receptionist records the date and time
range. The page lists the affected appointments and **Reschedule All
Appointments** moves each patient to the doctor's next free slot: never inside
an unavailable period, never on a day the doctor does not work, never
double-booking the doctor or the patient, within the next 14 days. A summary
shows the original and the new time and a notification status for every patient.
Appointments that cannot be moved stay unchanged and are listed clearly.

---

## 7. CRUD and search for every role

| Role             | Create                                                           | Read                                  | Update                                                                        | Delete                                                             | Search                                              |
| ---------------- | ---------------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------- |
| **Admin**        | Add doctor, add medicine                                         | Statistics, lists, activity history   | Edit doctor / patient / medicine, change appointment status, approve accounts | Delete doctor, medicine, patient, appointment (with safety checks) | Doctors, patients, medicines, appointments, history |
| **Doctor**       | Prescription, follow-up appointment                              | Queue, appointments, medical timeline | Appointment status, queue status, profile                                     | Delete own prescription                                            | Appointments, prescriptions                         |
| **Receptionist** | Register patient, book appointment, record doctor unavailability | Appointments, patients, queue         | Edit appointment, check in, reschedule                                        | Cancel appointment, remove an unavailable period                   | Patients, appointments                              |
| **Patient**      | Book appointment                                                 | Doctors, queue, health record         | Edit profile                                                                  | Cancel own appointment                                             | Doctors, appointments                               |

---

## 8. Pages and forms (with JavaScript validation)

| Page                | Purpose                                 | Forms validated with JavaScript                                                                             |
| ------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `index.html`        | Home page with public doctor search     | Search box                                                                                                  |
| `login.html`        | One login for all roles                 | Login (empty fields, password length, wrong credentials, pending account)                                   |
| `register.html`     | Patient / Doctor / Receptionist sign-up | Registration (role-based fields, e-mail, phone, duplicate username/e-mail, matching passwords, minimum age) |
| `admin.html`        | Admin dashboard                         | Medicine, doctor and patient forms                                                                          |
| `doctor.html`       | Doctor dashboard                        | Prescription, follow-up appointment                                                                         |
| `receptionist.html` | Receptionist dashboard                  | Patient registration, appointment booking, doctor unavailability                                            |
| `patient.html`      | Patient dashboard                       | Appointment booking                                                                                         |
| _(all dashboards)_  | Profile section                         | Profile edit                                                                                                |

---

## 9. Folder structure

```
evercare-medical-center/
├── index.html            Home page
├── login.html            One login for all roles
├── register.html         Registration
├── admin.html            Admin dashboard
├── doctor.html           Doctor dashboard
├── receptionist.html     Receptionist dashboard
├── patient.html          Patient dashboard
│
├── css/
│   └── style.css         The only stylesheet
│
├── js/
│   ├── data.js           Sample data (arrays of objects)
│   ├── common.js         Shared helper functions
│   ├── home.js           Home page
│   ├── login.js          Login
│   ├── register.js       Registration
│   ├── admin.js          Admin
│   ├── doctor.js         Doctor
│   ├── receptionist.js   Receptionist
│   └── patient.js        Patient
│
├── .github/              CODEOWNERS and pull-request template
├── CONTRIBUTING.md       Team Git workflow
├── .gitignore
└── README.md
```

Every page loads its scripts in the same order: `data.js` → `common.js` → the
page's own script.

---

## 10. How to run

1. Clone or download the repository.
2. Open **`index.html`** in a browser (or open the folder in VS Code and use
   _Live Server_).
3. Click **Login**, press **Use** next to a demo account, then press **Login**.

No installation, no server and no internet connection are needed. Developed for
a modern desktop browser such as Chrome or Edge.

---

## 11. Sample login accounts

All accounts and data are **fictional**.

| Role             | Username    | Password       | Note                                                     |
| ---------------- | ----------- | -------------- | -------------------------------------------------------- |
| Admin            | `admin`     | `admin1234`    |                                                          |
| Doctor           | `doctor`    | `doctor123`    | Dr. Arif Rahman (Cardiology) – has the busiest queue     |
| Doctor           | `nusrat`    | `nusrat123`    | Dr. Nusrat Jahan (Pediatrics)                            |
| Receptionist     | `reception` | `reception123` |                                                          |
| Patient          | `patient`   | `patient123`   | Farhan Kabir – token 4 in Dr. Arif's queue               |
| Patient          | `sadia`     | `sadia1234`    | Sadia Islam                                              |
| Doctor (pending) | `imran`     | `imran1234`    | Login is **refused** until an admin approves the account |

You can also log in with the e-mail addresses stored in `js/data.js`.

---

## 12. How the data and the login work

### Data (`js/data.js`)

Each list is an **array of objects**, similar to a database table. Records are
linked by `id`:

```
users ──► doctors / patients          appointments ──► patients + doctors
queue ──► appointments                prescriptions, medicalRecords ──► patients + doctors
```

Arrays: `users`, `departments`, `doctors`, `patients`, `appointments`, `queue`,
`prescriptions`, `medicalRecords`, `medicines`, `notifications`, `activityLog`
(plus `doctorUnavailability` in `receptionist.js`). Sample dates are generated
from today's date (`sampleDate()`), so "today's appointments" and "medicines
expiring soon" always have something to show.

### Login

1. `login.js` finds the account (username **or** e-mail), checks the password
   and the account status, and sets the form's `action` to the right dashboard
   with a `switch` on the role.
2. The form uses `method="get"`, so the browser opens e.g.
   `doctor.html?username=nusrat`.
3. `getLoggedInUser(role)` in `common.js` reads the username from the address
   and checks that the role matches the page.

> **Demonstration only – not secure.** Passwords are stored in `data.js` and
> checked in the browser, and anyone can type a username in the address bar. A
> real hospital system needs server-side authentication, hashed passwords and
> sessions.

---

## 13. Limitations

- **No persistence.** Data is kept in memory. Reloading a page, or moving to
  another HTML page, resets the data to the values in `data.js`. Changes are
  consistent _within_ one page (queue ↔ appointments ↔ notifications), but are
  not carried to another page.
- **Not secure.** See the note above.
- **No HTML escaping.** Text typed into forms is written with `innerHTML`; a
  real project must escape it.
- The **estimated waiting time** is a simple multiplication (patients ahead ×
  minutes per patient), not a prediction.
- Existing booking forms do not check the "doctor unavailable" periods; only the
  rescheduler respects them.
- A doctor created by the admin form has no login account; accounts are created
  through the registration page.
- Medical content is **sample data only** and is not medical advice.

---

## 14. Future improvements

- Add a **backend and a database** (for example Node.js with a SQL database) so
  data is saved and shared.
- Real authentication (hashed passwords, sessions or tokens) and server-side
  role checks.
- Live queue updates between the Doctor, Receptionist and Patient screens.
- Make normal booking forms respect doctor unavailability; let patients
  reschedule their own appointments.
- SMS / e-mail notifications, printable PDF prescriptions, billing and pharmacy
  dispensing.

---

## 15. Team Git workflow

- One repository, one branch per member: `feature/shohan-admin-home`,
  `feature/alif-doctor-login`, `feature/saad-patient-register`,
  `feature/najir-receptionist`.
- Each member edits **only their own files**. Shared files (`css/style.css`,
  `js/data.js`, `js/common.js`) are divided by owner so that nobody edits the
  same lines.
- Every change goes to `main` through a **Pull Request** and is reviewed by the
  owner (see `.github/CODEOWNERS`).
- Merge order: Shohan → Alif → Saad → Najir. Never use `git push --force`.

Details are in [CONTRIBUTING.md](CONTRIBUTING.md).

---

_Web Technologies course project – fictional data only._
