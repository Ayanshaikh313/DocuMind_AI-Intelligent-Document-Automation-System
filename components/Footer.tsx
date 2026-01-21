import React from "react";
import Image from "next/image";
import { FaGithub, FaLinkedin, FaTwitter } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="w-full h-[50vh] md:h-[40vh] flex flex-col md:flex-row overflow-hidden">
      {/* LEFT: map image with rounded right side */}
      <div className="relative md:w-1/2 w-full h-1/2 md:h-full overflow-hidden rounded-r-full">
        <Image
          src="/images/map_Footer.webp"
          alt="Kochi Metro Map"
          fill
          className="object-cover"
          style={{ objectPosition: "center" }}
          priority
        />
      </div>

      {/* RIGHT: content */}
      <div className="md:w-1/2 w-full h-1/2 md:h-full flex flex-col justify-center items-center px-6 md:px-12 py-8 gap-6 bg-white">
        {/* Title + Description */}
        <div>
          <h2 className="text-2xl text-center md:text-3xl font-bold text-gray-900">
            Connect & Explore
          </h2>
          <p className="mt-2 text-center text-gray-600 max-w-lg">
            Follow the project, report issues, or connect with me. You can
            explore the code or reach out on social platforms below.
          </p>
        </div>

        {/* Social icons row */}
        <div className="flex items-center gap-6 mt-2">
          <a
            href="https://github.com/Ayanshaikh313"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            className="text-gray-700 hover:text-black transition-transform hover:scale-110"
          >
            <FaGithub size={40} />
          </a>

          <a
            href="https://linkedin.com/in/your-username"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            className="text-gray-700 hover:text-blue-600 transition-transform hover:scale-110"
          >
            <FaLinkedin size={40} />
          </a>

          <a
            href="https://twitter.com/your-username"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Twitter"
            className="text-gray-700 hover:text-sky-500 transition-transform hover:scale-110"
          >
            <FaTwitter size={40} />
          </a>
        </div>

        {/* Bottom line */}
        <div className="mt-auto text-gray-500 text-sm">
          © {new Date().getFullYear()} Team-ARK • Built with Next.js
        </div>
      </div>
    </footer>
  );
}
