import React from "react";
import Image from "next/image";

const SecondPage = () => {
  return (
    <div className="min-h-screen py-10 px-3">
      {/* Header Section */}
      <div className="flex justify-center mb-10">
        <h1 
          className="text-center max-w-4xl"
          style={{
            color: "#006A71", 
            textShadow: "3px 3px 6px rgba(0, 0, 0, 0.3)", 
            fontSize: "2.5rem", 
            fontWeight: "800", 
            lineHeight: "1",
            letterSpacing: "-0.02em"
          }}
        >
          Our Capabilities
        </h1>
      </div>

      {/* Content Cards */}
      <div className="max-w-7xl space-y-10 max-h-2xl">
        {/* Card 1 - AI Assistant */}
        <div className="flex items-center gap-8 bg-white rounded-3xl shadow-xl p-1 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
          <div className="flex-shrink-0">
            <div className="rounded-2xl overflow-hidden shadow-lg">
              <Image
                src="/images/1image.webp"
                width={300}
                height={200}
                alt="AI Assistant"
                className="object-cover"
              />
            </div>
          </div>
          <div className="flex-1 pl-4">
            <h2 style={{fontSize: "1.5rem"}} className="text-lg leading-relaxed text-gray-700 mb-3">
              Our AI Assistant can help
            </h2>
            <h3 style={{fontSize: "1rem"}} className="text-xl font-bold text-[#00B2FF] mb-4 leading-tight">
              Streamline your KMRL operations
            </h3>
            <p className="text-lg text-gray-600 leading-relaxed">
              By providing instant access to processed knowledge and automating
              workflows, enhancing decision-making and efficiency.
            </p>
          </div>
        </div>

        {/* Card 2 - Document Management */}
        <div className="flex items-center gap-8 bg-white rounded-3xl shadow-xl p-1 ml-28 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
          <div className="flex-shrink-0">
            <div className="rounded-2xl overflow-hidden shadow-lg">
              <Image
                src="/images/2image.webp"
                width={300}
                height={200}
                alt="Document Management"
                className="object-cover"
              />
            </div>
          </div>
          <div className="flex-1 pl-4">
            <h2 style={{fontSize: "1.5rem"}} className="text-xl leading-relaxed text-gray-700 mb-4">
              Effortlessly manage your documents with our integrated platform.
            </h2>
            <h3 style={{fontSize: "1rem"}} className="text-2xl font-bold text-blue-600 mb-4 leading-tight">
              Edit, Comment, and Sign
            </h3>
            <p className="text-lg text-gray-600 leading-relaxed">
              PDFs seamlessly, from desktop to mobile with advanced
              collaboration tools.
            </p>
          </div>
        </div>

        {/* Card 3 - Workflow Automation */}
        <div className="flex items-center gap-8 bg-white rounded-3xl shadow-xl p-1 ml-48 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
          <div className="flex-shrink-0">
            <div className="rounded-2xl overflow-hidden shadow-lg">
              <Image
                src="/images/3image.webp"
                width={300}
                height={150}
                alt="Workflow Automation"
                className="object-cover"
              />
            </div>
          </div>
          <div className="flex-1 pl-4">
            <h2 style={{fontSize: "1.5rem"}} className="text-xl leading-relaxed text-gray-700 mb-4">
              Automate complex workflows and processes with intelligent routing.
            </h2>
            <h3 style={{fontSize: "1rem"}} className="text-3xl font-bold text-[#00B2FF] mb-4 leading-tight">
              Smart Workflow Management
            </h3>
            <p className="text-lg text-gray-600 leading-relaxed">
              Reduce manual tasks and improve operational efficiency across all
              departments.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecondPage;