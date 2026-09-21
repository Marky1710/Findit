FindIt -- Smart Lost & Found Management System
A full-stack web application for managing lost and found items at

Ismail Yusuf College of Arts, Science & Commerce, Jogeshwari East,

Mumbai.
Live Application: https://findit-iyc.ai.studio/
Overview
FindIt provides a centralized platform where students and staff can

report lost or found items, browse active listings, search and filter

reports, identify possible matches using NLP-based matching, communicate

during the claim process, and track recovery.
Administrators can verify reports and manage users and listings.
Objectives
·	Centralize lost and found reports.
·	Provide secure student, staff and admin authentication.
·	Allow users to report lost and found items.
·	Provide search and filtering.
·	Use NLP-based matching for possible lost/found matches.
·	Support claims and communication.
·	Allow admin verification and moderation.
·	Remove recovered, closed, rejected and deleted reports from active

listings.
·	Support independent sessions for multiple users simultaneously.
User Roles
Student
·	Register and verify email.
·	Login using Student ID and password.
·	Manage profile and personal reports.
·	Report lost/found items.
·	Search and browse listings.
·	View possible matches.
·	Participate in claim/recovery workflow.
Staff
·	Register and verify email.
·	Login using email and password.
·	Report and manage lost/found items.
·	Search and browse listings.
·	Participate in claims and recovery.
Admin
·	Manage users.
·	Block/unblock or restrict users.
·	Verify reports.
·	Manage listings.
·	Soft-delete inappropriate or invalid reports.
·	View appropriate deleted records.
Admin authorization is controlled by the backend and must not depend

only on a displayed name.
Authentication
Student Login
Student ID + Password
Staff Login
Email + Password
Email OTP
Registration uses email verification with: - 4-digit OTP - 5-minute

expiry - 60-second resend cooldown - Maximum 5 attempts - Single-use

verification
Email delivery uses Nodemailer/SMTP.
Independent Sessions
Every authenticated user must have an independent session.
Example:
Laptop  → Admin
Phone   → Student A
PC      → Staff B
Phone 2 → Student B

Logging in or logging out one user must not log out or replace another

user's session. The same requirement applies to independent browser tabs

where supported by the authentication architecture.
Student ID Format
General format:
YY + Study Year Code + Course Code + Roll Number

Examples:
26TCS1
26SBT44
26FBC26

Study-year codes: - F = First Year - S = Second Year - T = Third

Year
Course codes used by the application include: - CS = B.Sc. Computer

Science - BT = B.Sc. Biotechnology - BC = B.Com.
Student IDs are validated for format, selected course/year, roll range

and uniqueness.
Lost & Found Reports
Users can create Lost or Found reports containing information such as: -

Item name - Category - Description - Date/time - Location - Additional

details - Item image where applicable
Active listings should contain only valid active reports.
Search & Filtering
Listings can be searched and filtered using relevant item information

such as: - Lost/Found type - Category - Location - Date - Keywords -

Status
Recovered, closed, rejected and deleted reports must not appear in

active listings.
NLP-Based Matching
FindIt uses Natural Language Processing (NLP) to identify

potentially related lost and found reports.
For example:
Lost:
"Black wallet with college ID and bank cards"

Found:
"Black leather wallet containing an ID card and cards"

NLP-based matching can compare descriptions and other report attributes

to identify semantic similarity.
The project uses a 60% matching threshold for possible matches.
NLP matching identifies potential matches; it does not replace

human/admin verification.
Claim & Recovery Workflow
Lost Report
    ↓
Found Report
    ↓
NLP Possible Match
    ↓
Claim / Contact
    ↓
Verification
    ↓
Recovery
    ↓
RECOVERED
    ↓
Removed from Active Listings

Admin Verification
Report verification is stored on the backend so the state remains

consistent across refreshes and different users/devices.
User Moderation
Supported account states include:
ACTIVE
RESTRICTED
BLOCKED

Moderation must be performed through authenticated backend endpoints and

use the user's unique ID.
Report Deletion
Reports can be soft-deleted using information such as:
deleted
deletedAt
deletedBy

Deleted reports must be excluded from public and active results while

remaining available to authorized administrators where required.
No Fake Production Data
Production should contain only real user-generated data.
Do not include: - Fake students - Fake staff - Fake admins - Fake

reports - Fake claims - Fake matches - Fake messages - Fake statistics -

AI-generated human profile images
Development seed/demo data should be disabled by default in production.
Technology
The project is developed as a full-stack application using Google AI

Studio Build Mode.
Main technologies/components include: - React -- frontend -

Node.js -- backend runtime - Nodemailer -- email/OTP delivery -

NLP-based matching -- lost/found semantic matching - REST-style

APIs -- frontend/backend communication - Authentication and

sessions -- access control - Environment variables/secrets --

sensitive configuration
Google AI Studio Build Mode supports full-stack web applications with a

client side and Node.js server runtime.
High-Level Architecture
User
  ↓
React Frontend
  ↓
Backend API
  ├── Authentication
  ├── Authorization
  ├── Reports
  ├── Claims
  ├── Matching
  ├── Verification
  └── Moderation
  ↓
Persistent Data Store

Backend
  ↓
SMTP / Email OTP

Environment Variables
Sensitive configuration should be stored as server-side environment

variables/secrets.
Example:
GEMINI_API_KEY=your_key
APP_URL=your_app_url

SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_email
SMTP_PASS=your_app_password
SMTP_FROM=your_email

Never commit real passwords, API keys, database credentials or session

secrets to GitHub.
Running Locally
Install dependencies:
npm install

Start the development server using the command configured in

package.json, commonly:
npm run dev

Build:
npm run build

Use the project's actual package.json scripts as the authoritative

commands.
Testing Checklist
Authentication
·	Student registration
·	Staff registration
·	Email OTP
·	Student login
·	Staff login
·	Admin login
·	Duplicate Student ID
·	Duplicate email
·	Logout
·	Refresh after login
·	Multiple independent sessions
·	Independent browser/tab sessions
Reports
·	Create Lost report
·	Create Found report
·	Edit report
·	Delete/soft-delete report
·	Verify report
·	Mark recovered
·	Recovered report removed from active listings
Matching
·	NLP matching
·	60% threshold
·	Possible Matches
·	Recovered/deleted reports excluded from active matching
Admin
·	View users
·	Block/unblock
·	Restrict
·	Verify reports
·	Delete/soft-delete reports
·	View deleted records
·	Backend authorization
Campus Location Context
The system can use structured college locations such as: - Main Gate -

Second Gate - Science Building 1 - Science Building 2 / Computer Science

Building - Main Building - Library - New Library - Canteen - Mess -

Parking - Gym - Playground - Football Ground - Volleyball Ground -

Tennis Area - Chess Area - Carrom Area - Auditorium - Stage - Xerox

Shop - NCC Karyalay - Boys Hostel - Masjid - Jogging Path - Aadhar

Office - Voter Office - Education Office
Computer Science locations include: - Lab A - Lab B - CS1 - CS2
Benefits
FindIt helps: - Centralize lost and found information. - Reduce

dependence on informal communication. - Make searching easier. -

Identify possible matches automatically. - Provide an admin verification

layer. - Track recovery status. - Support multiple users simultaneously.
Future Enhancements
Possible future improvements: - Push notifications - Mobile

application - QR-based item identification - Image-based item matching -

Automatic match notifications - Campus map integration - Analytics

dashboard - Admin audit logs - Advanced device/session management -

Multilingual interface - Accessibility improvements
Institution
Ismail Yusuf College of Arts, Science & Commerce

Natwar Nagar, Jogeshwari East, Mumbai, Maharashtra -- 400060
Official website: https://ismailyusufcollege.ac.in/
Project
FindIt -- Smart Lost & Found Management System
An academic/project application designed to provide a structured, secure
and user-friendly platform for reporting, discovering, matching and
recovering lost and found items.
License

This project is intended for academic/educational use. Add an
appropriate open-source or institutional license if the project is

distributed publicly.
