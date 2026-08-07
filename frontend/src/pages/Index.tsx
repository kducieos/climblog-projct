// src/pages/Index.tsx（或你的入口页）
import { useState } from "react";
import BottomNavigation from "@/components/BottomNavigation";
import HomePage from "@/components/HomePage";
import LogbookPage from "@/components/LogbookPage";
import ChallengesPage from "@/components/ChallengesPage";
import CameraPage from "@/components/CameraPage";
import ProfilePage from "@/components/ProfilePage";
import LoginPage from "@/components/LoginPage";

export default function Index() {
  const [currentPage, setCurrentPage] = useState("home");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  if (!isLoggedIn) {
    return <LoginPage onLoginSuccess={() => setIsLoggedIn(true)} />;
  }

  const renderCurrentPage = () => {
    switch (currentPage) {
      case "home": return <HomePage />;
      case "logbook": return <LogbookPage />;
      case "challenges": return <ChallengesPage />;
      case "camera": return <CameraPage />;
      case "profile": return <ProfilePage />;
      default: return <HomePage />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="relative pb-20 md:pb-0 md:pt-16">
        {renderCurrentPage()}
      </main>
      <BottomNavigation currentPage={currentPage} onPageChange={setCurrentPage} />
    </div>
  );
}
