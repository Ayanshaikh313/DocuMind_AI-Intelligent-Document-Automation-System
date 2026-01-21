"use client"

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Dashboard from "@/components/others/dashboard";
import Hub from "@/components/others/hub";
import Insights from "@/components/others/insights";
import Chatbot from "@/components/others/chatbot";

export default function Others() {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', component: Dashboard, color: '#c3facb', icon: '/images/icons/dashboard.webp', alt: 'Dashboard' },
    { id: 'hub', component: Hub, color: '#f1fac3', icon: '/images/icons/paper.webp', alt: 'Hub' },
    { id: 'insights', component: Insights, color: '#fac3c8', icon: '/images/icons/rating.webp', alt: 'Senior Insights' },
    { id: 'chatbot', component: Chatbot, color: '#c3cefa', icon: '/images/icons/robotics.webp', alt: 'Chatbot' }
  ];

  const currentTab = tabs.find(tab => tab.id === activeTab);
  const ActiveComponent = currentTab?.component || Dashboard;

  useEffect(() => {
    async function fetchProfile() {
      try {
        const response = await fetch('/api/others/profile');
        if (response.ok) {
          const profile = await response.json();
          setUserProfile(profile);
        } else {
          setUserProfile(null);
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        setUserProfile(null);
      } finally {
        setLoading(false);
      }
    }
    
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <>
        <p className="text-5xl text-blue-400 p-2 ml-3.5 mt-4 font-bold">
          Welcome
        </p>
        <p className="text-xl ml-4 mt-2">Not signed in</p>
      </>
    );
  }

  const { displayName, displayProfession, displayDepartment } = userProfile;

  return (
    <>
      <div 
        className="m-2 p-1 rounded-xl transition-colors duration-300 ease-in-out"
        style={{ backgroundColor: currentTab?.color || '#c3facb' }}
      >
        <p className="text-4xl text-blue-400 ml-3.5 font-bold">
          Welcome
        </p>
        <p className="text-xl ml-8 text-gray-500 font-medium">{displayName}</p>
        <p className="text-sm ml-8 text-gray-400 font-medium">
          {displayProfession}, {displayDepartment.slice(0, 3)}. Department
        </p>
      </div>

      <div className="flex justify-center items-center">
        <ActiveComponent />
      </div>

      <div 
        className="fixed flex justify-evenly bottom-0 left-[33.330%] m-2 p-2 rounded-xl w-4/12 shadow-2xs transition-colors duration-300 ease-in-out"
        style={{ backgroundColor: currentTab?.color || '#c3facb' }}
      >
        {tabs.map((tab) => (
          <button 
            key={tab.id}
            className={` m-1 transition-all duration-200 ease-in-out ${
              activeTab === tab.id ? 'border-2 border-white rounded-xl' : ''
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            <Image 
              src={tab.icon} 
              width={27} 
              height={27} 
              alt={tab.alt}
            />
          </button>
        ))}
      </div>
    </>
  );
}