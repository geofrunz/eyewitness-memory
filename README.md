# Eyewitness Memory Experiment — no video embedded

A complete English-language questionnaire and instructor dashboard designed for GitHub Pages. **The instructor projects a video to the whole class separately; the website has no video component.**

## Classroom procedure

1. **First, project your chosen car-crash clip** for everyone, once, on the classroom screen.
2. **After the clip**, project the QR code from the instructor dashboard (`?view=admin`).
3. Students scan the QR code and click **Begin questionnaire**. Each participant is assigned Group A or B with independent probability 50% (not necessarily equal-sized groups).
4. Both groups answer the same glass question. The speed question differs:
   - A: “In your opinion, how fast was the car going when it **smashed into** the wall?”
   - B: “In your opinion, how fast was the car going when it **hit** the wall?”
   - Both: “Were there any broken glass fragments on the ground?” (Yes / No).
5. The instructor reviews results in a live dashboard (mean ± standard error in km/h; Yes/No counts and percentages by group) and can download a CSV.

There is no video file and no playback requirement; students can open the questionnaire when the instructor finishes showing the clip.

## Quick local trial (single browser)

1. Unzip the archive. Open a terminal inside the extracted folder.
2. Run `python -m http.server 8000` (or `py -m http.server 8000` on Windows).
3. Open `http://localhost:8000/` to submit a response.
4. In the **same browser profile**, open `http://localhost:8000/?view=admin` to see the demo dashboard and export CSV.
5. For another simulated student, in Developer Tools > Application > Local Storage, delete only `vm_done` and `vm_group` (leave `vm_demo_responses` intact), then reload the student tab. Note that this is a convenience for demonstration, **not a valid method of simulating independent student randomization**.

In DEMO MODE answers are **only stored on that browser**. Do not use demo mode with students on separate phones: their results will not be combined.

## Firebase setup (required for real multi-device classroom collection)

GitHub Pages alone cannot maintain a shared response database. The website uses Firebase Authentication and Cloud Firestore to collect all students’ answers into one dashboard.

1. Create a Firebase project at https://console.firebase.google.com and register a **Web app**.
2. In Authentication > Sign-in method enable **Anonymous** and **Email/Password**.
3. Create a teacher account under Authentication > Users. Copy its **UID** (not its email).
4. Create a **Cloud Firestore** database. Select appropriate region; do not leave database rules in open/test mode.
5. Edit `config.js`: paste the Firebase **public web app configuration** into `firebase` (replace `null`) and enter the instructor UID in `instructorUid`.
6. In `firestore.rules` replace `'INSTRUCTOR_UID'` with the same UID. Paste these rules into the Firebase Console > Firestore Database > Rules and **Publish**.
7. Under Firebase Authentication > Settings > Authorized domains add `YOURNAME.github.io` if necessary.

Example `config.js`:

```js
window.STUDY_CONFIG = {
  firebase: {
    apiKey: 'YOUR_PUBLIC_WEB_API_KEY',
    authDomain: 'YOUR_PROJECT.firebaseapp.com',
    projectId: 'YOUR_PROJECT',
    appId: 'YOUR_WEB_APP_ID',
    messagingSenderId: 'YOUR_SENDER_ID'
  },
  instructorUid: 'YOUR_INSTRUCTOR_AUTH_UID'
};
```

**Do not** put service-account credentials or private keys in the repository. Firebase web configuration is public by design; access is limited by the Firestore security rules.

## Publish to GitHub Pages

1. Create a GitHub repository, e.g. `eyewitness-memory-study`.
2. Upload `index.html`, `style.css`, `app.js`, `config.js`, and `firestore.rules` to the repository root.
3. In GitHub > Settings > Pages select **Deploy from a branch** > `main` > `/(root)` > Save.
4. Student URL: `https://YOURNAME.github.io/eyewitness-memory-study/`
5. Instructor URL: `https://YOURNAME.github.io/eyewitness-memory-study/?view=admin`
6. Log in as teacher to view the QR code, export data and watch the live statistics update.

## Practical cautions

- In the actual Firebase version, only the instructor account can read all responses. Each student can submit one record per anonymous Firebase account. These measures **do not reliably prevent repeat participation with a different account/device**, and client-side group assignment is not tamper-proof.
- The app does not collect names, student IDs or emails from respondents; Firebase and hosting services may still process standard technical or pseudonymous metadata. Inform students about voluntary participation and local data-protection policies.
- A new teaching session should use a new Firestore project or remove prior records from the Firestore console after exporting them; otherwise all sessions are combined.
- The QR image is created by a public QR-generation endpoint using the public site URL only, not response data. Internet access is needed to display it.
- Standard error (SEM) uses `sample SD / sqrt(n)`; no SEM is shown for n=1.
