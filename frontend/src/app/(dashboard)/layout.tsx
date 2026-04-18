"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import { NairaSageQuickChat } from "@/components/agent/CoordinatorChat";
import { ChatSessionPrefetch } from "@/components/dashboard/ChatSessionPrefetch";
import { useIdleSessionLogout } from "@/hooks/useIdleSessionLogout";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useIdleSessionLogout();

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      <ChatSessionPrefetch />
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 lg:static lg:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar 
          onOpenChat={() => setIsChatOpen(true)} 
          onMobileMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} 
        />
        
        <main className="flex-1 overflow-y-auto bg-background/50 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>

      <NairaSageQuickChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
}
