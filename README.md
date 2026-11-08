# BugMap AI

Upload an application log file; BugMap AI parses it, redacts likely secrets, groups similar errors (TF-IDF clustering), flags unusual error spikes, and lists possible root causes with the log lines that support them. Possible causes are never verified causes, and anomaly scores are relative rankings, not probabilities.

## What is included
- `backend/` Flask API (`/api/health`, `/api/analyze`), log parser, analysis (TF-IDF clustering, Isolation Forest anomalies, keyword root-cause hints), 12 pytest tests. In production it also serves the built frontend.
- `frontend/` React + Vite app that follows `design/dashboard.html` exactly (same CSS, layout and animations), with 7 pages: Overview, Upload logs, Error explorer (search, filter, CSV export), Investigations, Anomalies, Alerts (editable rules) and Reports (HTML download, print to PDF). 7 vitest unit tests.
- Overview shows the design's built-in sample data until you analyse a log, then your real results. The time-range dropdown filters every page (logs up to 2000 events).
- Your last analysis and alert settings are saved in your browser (localStorage) so they survive refresh. Use "Clear saved analysis" on the Upload page to delete them. The server never stores uploaded files.
- `Dockerfile`, `render.yaml` one-container deployment. `setup.bat` / `start.bat` Windows helpers.
- `database/schema.sql` MySQL schema (not used by the API yet), `design/dashboard.html` original design, `sample_logs/app.log` test log.

## Limits
No login or multi-user accounts, and no MySQL storage yet. Alerts are in-app rules checked on the log you analysed; they do not send email. Logs are capped at 5 MB, the first 2000 events are loaded for display, and the time filter is turned off above that. The "Error locations" map on the Overview is decorative because logs carry no location data. Root causes are keyword-based hypotheses, never verified causes, and anomaly scores are relative rankings, not probabilities.

## Easiest start on Windows
Install Python 3.10+ and Node.js 18+, then double-click `setup.bat` once, and `start.bat` every time after that.

## Run tests
Backend: `cd backend`, activate the venv, `pytest`. Frontend: `cd frontend`, `npm test`.

## Deploy (one container)
Build and run locally: `docker build -t bugmap-ai .` then `docker run -p 10000:10000 bugmap-ai` and open http://localhost:10000. On Render: push this repo to GitHub, choose New > Blueprint, select the repo (it reads `render.yaml`). The free plan sleeps when idle, so the first request after a pause is slow.

## Manual setup (PowerShell, Python 3.10+ and Node.js 18+ installed)
Use two PowerShell windows, one for the backend and one for the frontend.

Window 1, backend:
```
cd BugMap-AI\backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
pytest
python app.py
```
If activation is blocked: `Set-ExecutionPolicy -Scope Process Bypass` then activate again. Check http://localhost:5000/api/health shows `{"status":"ok"}`.

Window 2, frontend:
```
cd BugMap-AI\frontend
npm install
npm run dev
```
Open http://localhost:5173 (the dev server forwards `/api` to the backend on port 5000). Go to Upload logs, then choose `sample_logs\app.log` or click the sample button.

MySQL/XAMPP is optional for now: start MySQL in XAMPP, open phpMyAdmin, and import `database\schema.sql`.

## Troubleshooting
- "API offline" in the header: the backend window is not running, or port 5000 is busy.
- `npm install` errors: delete `frontend\node_modules` and retry.
- Port 5173 busy: Vite will print the new port; open that one.
