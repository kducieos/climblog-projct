# ClimbLog

**ClimbLog** is a mobile-friendly climbing training web app for logging bouldering sessions, analyzing climbing wall photos, and generating AI-powered training challenges.

It combines a React frontend, Firebase authentication and Firestore persistence, a FastAPI proxy for computer vision inference, and Gemini-generated challenge cards into one interactive climbing companion.

## Highlights

- **Digital climbing logbook** with route grade, location, rating, notes, and date filters.
- **Google sign-in** through Firebase Authentication.
- **Realtime Firestore data** for user-specific climbing logs and profile statistics.
- **Hold detection workflow** that lets users upload or capture a climbing wall photo and receive detected hold counts.
- **FastAPI Roboflow proxy** that keeps the Roboflow API key off the client.
- **AI challenge generator** powered by Gemini, with a local fallback when the model is unavailable.
- **Responsive UI** with desktop top navigation and mobile bottom navigation.

## Tech Stack

| Area | Technologies |
| --- | --- |
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui, Lucide React |
| Authentication | Firebase Auth, Google provider |
| Database | Firebase Firestore |
| API Proxy | FastAPI, Uvicorn, Python |
| Computer Vision | Roboflow Serverless API |
| AI Generation | Google Gemini API |

## Core Features

### Route Logbook

Users can create and browse climbing records with:

- Difficulty grade
- Location
- Date
- Rating
- Personal notes
- Filtering by grade, location, and time range

The logbook uses Firestore for authenticated users and seeded demo data for a smooth first-run experience.

### Hold Detection

The hold detector supports image upload and mobile camera capture. Images are sent to a FastAPI backend, which forwards them to Roboflow and returns:

- Raw prediction data
- Detection summary
- Annotated image preview
- Adjustable confidence threshold

The current implementation focuses on hold counting rather than color classification because of model and free-tier constraints.

### AI Challenge Cards

The challenge page requests bouldering missions from Gemini and normalizes the response into swipeable challenge cards. If the API request fails or no key is configured, the app falls back to local sample challenges.

Supported interactions:

- Swipe left to skip
- Swipe right to save/like
- Swipe up to start
- Refresh to generate a new set

### Profile And Achievements

The profile page summarizes climbing activity from saved routes:

- Routes completed
- Estimated total climbing height
- Current streak
- Favorite grade
- Achievement milestones

## Architecture

```text
frontend/
  React + Vite app
  Firebase Auth / Firestore client
  Gemini challenge generation
  Camera and image upload UI

backend/
  FastAPI service
  /detect endpoint
  Roboflow API proxy
```

High-level data flow:

```text
User -> React UI -> Firebase Auth / Firestore
User -> React Camera Page -> FastAPI /detect -> Roboflow API
User -> React Challenge Page -> Gemini API -> Challenge cards
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Python 3.10+
- Firebase project with Google authentication enabled
- Roboflow API key
- Gemini API key, optional for local fallback mode

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Create `frontend/.env.local`:

```bash
VITE_FB_API_KEY=your_firebase_api_key
VITE_FB_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FB_PROJECT_ID=your_project_id
VITE_FB_STORAGE_BUCKET=your_project.appspot.com
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_API_URL=http://localhost:8000
```

### Backend Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --reload --port 8000
```

On Windows PowerShell:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn server:app --reload --port 8000
```

Create `backend/.env`:

```bash
ROBOFLOW_API_KEY=your_roboflow_api_key
ROBOFLOW_MODEL=hold-detector-rnvkl
ROBOFLOW_VERSION=2
```

## API

### `POST /detect`

Runs hold detection on an uploaded image.

Query parameters:

| Name | Default | Description |
| --- | --- | --- |
| `confidence` | `0.35` | Minimum confidence for Roboflow detections |
| `overlap` | `0.30` | Overlap threshold |
| `mode` | `both` | `json`, `image`, or `both` |

Example response in `both` mode:

```json
{
  "predictions": [],
  "summary": {
    "total": 0,
    "by_class": []
  },
  "annotated": "data:image/png;base64,..."
}
```

## Project Structure

```text
.
+-- backend/
|   +-- requirements.txt
|   +-- server.py
+-- frontend/
|   +-- public/
|   +-- src/
|   |   +-- assets/
|   |   +-- components/
|   |   +-- hooks/
|   |   +-- lib/
|   |   +-- pages/
|   +-- package.json
|   +-- vite.config.ts
+-- README.md
```

## Implementation Notes

- Firebase Storage upload is intentionally disabled in the current version because of free-tier limitations; route images use a placeholder/demo image.
- Gemini generation includes a local fallback so the challenge page remains usable without an API key.
- The Roboflow key is used only on the FastAPI server and should never be exposed in frontend environment variables.
- CORS is currently open for development. For production, restrict it to the deployed frontend domain.

## Course Context

This project was originally built for **CS-E4400 Design of WWW Services D** at **Aalto University** in Autumn 2025. The repository has been polished as a portfolio/open-source project while keeping the course context minimal.
