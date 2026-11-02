# Michael Finley Foundation — Legacy Invitational Check-In

A React + Vite prototype with guest contact forms followed by event check-in.

## Public guest flow
1. The website opens to the contact form.
2. Choose a guest type tab: Celebrity / Guest, VIP, or General Admission.
3. Complete the form and grant permission to be contacted.
4. Continue to the check-in step and confirm your check-in.

The forms follow the uploaded TMFF Celebrity, VIP, and Golfer Contact Information forms. Submissions are recorded in this browser and appear in the admin dashboard's Contact Form Submissions section.

## Admin features
- Demo login: username `admin`, password `LegacyDemo!4827`
- Upload `.xlsx`, `.xls`, or `.csv` rosters with the headings: `Company / Sponsor`, `Full Name`, `VIP`, `Shirt Size`, `Email`, `Cell`, `Notes`
- Search roster, manually check in or undo check-in, and track check-in times
- Export an Excel workbook with an Attendance worksheet and (when available) a Contact Forms worksheet

## Run locally

```bash
npm install
npm run dev
```

Open the local URL Vite prints in the terminal (usually `http://localhost:5173`).

Legacy Invitational website deployment update

## Important before public use
This is a prototype. Roster and contact-form submissions are stored in the current browser only and will not sync between phones or computers. The demo admin credential check runs in the browser and is not secure authentication. Before collecting real guest information publicly, configure shared server-side storage, secure authentication, access controls, and privacy protections. Do not use this local prototype as a production guest database.
# legacy-invitational
