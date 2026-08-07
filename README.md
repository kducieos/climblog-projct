# 🧗‍♀️ ClimbLog  
**A Web Service for Climbing Log Tracking, Hold Detection & AI Challenges**  
*Aalto University · CS-E4400 Design of WWW Services D · Autumn 2025*

---

## 🎯 Overview  
**ClimbLog** is an interactive web application that helps climbers **record**, **analyze**, and **stay motivated** in their climbing practice.  
The service integrates **computer vision**, **AI-generated challenges**, and a **digital logbook** into a playful and easy-to-use interface.

Our goal was to design and implement a **fully functional web prototype** demonstrating how dynamic, adaptive features can support climbers in tracking progress and making training more engaging.

---

## ✨ Core Features (Final Implementation)

### 🧩 Hold Detection (Roboflow API)
- Users can **upload a climbing wall photo** or take one on mobile.
- The system detects **hold count** using the Roboflow Hold Detector.
- Adjustable **confidence threshold** for more reliable detection.
- Count-only detection (no color classification) due to free-tier performance limits.

### 📘 Digital Logbook  
- Users can manually create climbing logs with:
  - Grade  
  - Location  
  - Notes  
  - Timestamp  
- Includes **filtering** by difficulty, location, and date.
- A **Log Detail page** provides a more detailed view for each entry.
- Default placeholder image used (image storage removed due to Firebase free-tier limits).

### 🧗‍♂️ AI Challenge Generator  
- Uses **Google Gemini API** to generate personalized climbing challenges.
- Swipe-based interactions:
  - **Left** → dismiss  
  - **Right** → like  
  - **Up** → start immediately  
- Prompts adjusted to produce realistic indoor bouldering missions.

### 🪶 Achievements & Visual Feedback  
- Visualizes total climbing height compared to famous mountains (static data).  
- Profile page displays:
  - Streak  
  - Total climbs  
  - Favorite difficulty  
  - Achievement milestones  

### 🧭 Responsive Navigation  
- Desktop → top navigation bar  
- Mobile → bottom navigation bar  
- Layout uses max-width constraints for better readability.

---

## 🧰 Tech Stack

| Layer | Technologies |
|-------|------------|
| Frontend | **React + TypeScript + Vite**, Tailwind CSS, shadcn/ui |
| Backend | **Firebase** (Auth + Firestore) |
| Computer Vision | **Roboflow Hold Detection API** |
| AI Generation | **Google Gemini API** |
| Deployment | Netlify (frontend), Render (API), Firebase (backend services) |
| Version Control | GitLab (Aalto instance) |

---

# 🧗‍♀️ ClimbLog – Technology Stack Overview

## 🎨 Frontend
- **React 18 + TypeScript** for component-based UI  
- **Vite** for fast development  
- **Tailwind CSS** for styling  
- **shadcn/ui + Lucide Icons** for consistent components  
- Fully responsive for mobile and desktop  

Shared UI components include:
- Navigation bar (top/bottom)
- Achievement cards  
- Log cards  
- Swipeable challenge cards  

---

## 🧩 Project Architecture
**Pages:**
- `LoginPage`  
- `HomePage`  
- `LogbookPage`  
- `LogDetailPage`  
- `ChallengesPage`  
- `CameraPage`  
- `ProfilePage`  

**Key Systems:**
- Google login authentication  
- Firestore database for logs and statistics  
- Roboflow API for hold detection  
- Gemini API for challenge generation  

**Deployment:**
- Frontend → Netlify  
- Backend API routes → Render  
- Authentication & database → Firebase  

---

## 📎 License
This project was created for the Aalto University course  
**CS-E4400 Design of WWW Services D (Autumn 2025)**  
and is intended for educational purposes only.

