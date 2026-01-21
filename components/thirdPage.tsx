import React from "react";
import Image from "next/image";

const ThirdPage = () => {
  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-white overflow-x-hidden">
      {/* Page title */}
      <header className="w-full py-8">
        <h1 className="text-2xl font-bold text-center text-gray-900">
          Document Intelligence Solutions
        </h1>
      </header>

      <main className="flex-1 w-full max-w-7xl px-4">
        <div 
          className="grid h-full items-center gap-8"
          style={{ 
            gridTemplateColumns: "minmax(200px, 1fr) minmax(400px, 800px) minmax(200px, 1fr)",
            minHeight: "600px"
          }}
        >
          {/* LEFT COLUMN - two cards spaced top and bottom */}
          <div className="flex flex-col items-center justify-between h-[600px]">
            {/* Top-left (cyan) */}
            <div
              className="w-[300px] h-44 rounded-3xl shadow-xl p-6 flex flex-col justify-evenly transform transition-transform duration-300 hover:scale-105"
              style={{
                background: "linear-gradient(135deg,#E6FFFA 0%, #BDECF0 100%)",
              }}
            >
              <div className="flex justify-center">
                <Image
                  src={"/images/thirdpage_icons/loop-square.svg"}
                  width={30}
                  height={30}
                  alt={"automate-icon"}
                />
              </div>
              <p className="text-xl font-semibold text-center text-gray-900">
                Automate Business Workflows
              </p>
            </div>
            
            {/* Bottom-left (mint/green) */}
            <div
              className="w-[300px] h-44 mb-8 rounded-3xl shadow-xl p-6 flex flex-col justify-evenly transform transition-transform duration-300 hover:scale-105"
              style={{
                background: "linear-gradient(135deg,#F0FFF4 0%, #D1FADF 100%)",
              }}
            >
              <div className="flex justify-center">
                <Image
                  src={"/images/thirdpage_icons/triangle-arrow-bolt.svg"}
                  width={30}
                  height={30}
                  alt={"sustainability-icon"}
                />
              </div>
              <p className="text-xl font-semibold text-center text-gray-900">
                Achieve Sustainability Goals
              </p>
            </div>
          </div>

          {/* CENTER COLUMN - image stays centered and unchanged */}
          <div className="relative w-full h-[400px] flex justify-center items-center">
            <Image
              src="/images/Gemini.webp"
              alt="Gemini"
              fill
              className="hover:scale-115 ease-in duration-300 object-contain"
            />
          </div>

          {/* RIGHT COLUMN - two cards spaced top and bottom */}
          <div className="flex flex-col items-center justify-between h-[600px]">
            {/* Top-right (lavender/purple) */}
            <div
              className="w-[300px] h-44 rounded-3xl shadow-xl p-6 flex flex-col justify-evenly transform transition-transform duration-300 hover:scale-105"
              style={{
                background: "linear-gradient(135deg,#F5F3FF 0%, #E9D5FF 100%)",
              }}
            >
              <div className="flex justify-center">
                <Image
                  src={"/images/thirdpage_icons/lightbulb-on.svg"}
                  width={30}
                  height={30}
                  alt={"ai-icon"}
                />
              </div>
              <p className="text-xl font-semibold text-center text-gray-900">
                AI Document Summarization
              </p>
            </div>
            
            {/* Bottom-right (warm amber) */}
            <div
              className="w-[300px] h-44 mb-8 rounded-3xl shadow-xl p-6 flex flex-col justify-evenly transform transition-transform duration-300 hover:scale-105"
              style={{
                background: "linear-gradient(135deg,#FFF7ED 0%, #FFEDD5 100%)",
              }}
            >
              <div className="flex justify-center">
                <Image
                  src={"/images/thirdpage_icons/hard-disk-scan.svg"}
                  width={30}
                  height={30}
                  alt={"scan-icon"}
                />
              </div>
              <p className="text-xl font-semibold text-center text-gray-900">
                Scan & Archive Solutions
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ThirdPage;