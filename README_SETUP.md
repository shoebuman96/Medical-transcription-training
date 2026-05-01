# Medical Transcription Training Portal

Upload these files to GitHub:

- `index.html`
- `styles.css`
- `app.js`
- `medical_transcription_v4_2.html`

Do not rename `medical_transcription_v4_2.html` unless you also update this line in `app.js`:

```js
const COURSE_FILE = "medical_transcription_v4_2.html";
```

## Google Sheets Score Saving

1. Open your Google Sheet.
2. Go to **Extensions** -> **Apps Script**.
3. Paste the code from `google-apps-script.gs`.
4. Deploy it as a **Web app**.
5. Copy the Web app URL.
6. Paste it into `app.js`:

```js
const SCORE_ENDPOINT = "PASTE_YOUR_WEB_APP_URL_HERE";
```

Until you add that URL, scores are saved only in the learner's browser.
