"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";

const CROSSFADE_MS = 700;

const HeroSection: React.FC = () => {
  const videoSources = [
    "/videos/landing1.mp4",
    "/videos/landing2.mp4",
    "/videos/landing3.mp4",
  ];

  const [index, setIndex] = useState<number>(0); // current logical index
  const [activeBuffer, setActiveBuffer] = useState<0 | 1>(0); // which <video> is currently visible
  const videoRefs = [
    useRef<HTMLVideoElement | null>(null),
    useRef<HTMLVideoElement | null>(null),
  ];

  const getVideo = (buffer: 0 | 1) => videoRefs[buffer].current;

  // === INITIAL SETUP: load and try to play the first video on mount ===
  useEffect(() => {
    const v = getVideo(activeBuffer);
    if (!v) return;

    try {
      v.src = videoSources[index];
      v.load();
      // muted autoplay generally works — if blocked, user can still click to play
      v.play().catch(() => {
        /* autoplay blocked by browser; OK */
      });
    } catch (err) {
      console.error("Initial video setup failed:", err);
    }
    // run only once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-advance using a timeout that resets on index change
  useEffect(() => {
    const id = window.setTimeout(() => {
      const next = (index + 1) % videoSources.length;
      goTo(next);
    }, 8000);

    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // Crossfade to a new index (preload into hidden buffer, then fade)
  const goTo = (newIndex: number) => {
    if (newIndex === index) return;

    const visible = activeBuffer;
    const hidden = (1 - visible) as 0 | 1;
    const visibleVideo = getVideo(visible);
    const hiddenVideo = getVideo(hidden);

    // Fallback: if refs not available, set src directly on visible video
    if (!visibleVideo || !hiddenVideo) {
      const v = visibleVideo || hiddenVideo;
      if (v) {
        try {
          v.pause();
          v.src = videoSources[newIndex];
          v.load();
          v.play().catch(() => {});
          setIndex(newIndex);
        } catch (err) {
          console.error("Fallback video switch failed:", err);
        }
      }
      return;
    }

    const onCanPlay = () => {
      hiddenVideo
        .play()
        .then(() => {
          setActiveBuffer(hidden);
          setIndex(newIndex);

          // after crossfade completes, pause and clear previous video to free memory
          setTimeout(() => {
            try {
              visibleVideo.pause();
              visibleVideo.removeAttribute("src");
              visibleVideo.load();
            } catch (e) {
              // ignore cleanup errors
            }
          }, CROSSFADE_MS + 30);
        })
        .catch((playErr) => {
          // if autoplay blocked, still swap buffer so UI continues
          console.warn("Hidden buffer play blocked:", playErr);
          setActiveBuffer(hidden);
          setIndex(newIndex);
          setTimeout(() => {
            try {
              visibleVideo.pause();
              visibleVideo.removeAttribute("src");
              visibleVideo.load();
            } catch (e) {}
          }, CROSSFADE_MS + 30);
        });

      hiddenVideo.removeEventListener("canplay", onCanPlay);
      hiddenVideo.removeEventListener("error", onErr);
    };

    const onErr = (ev: any) => {
      console.error("Hidden buffer load error:", ev);
      hiddenVideo.removeEventListener("canplay", onCanPlay);
      hiddenVideo.removeEventListener("error", onErr);
    };

    hiddenVideo.addEventListener("canplay", onCanPlay);
    hiddenVideo.addEventListener("error", onErr);

    // Start loading the next source into hidden buffer
    try {
      hiddenVideo.pause();
      hiddenVideo.src = videoSources[newIndex];
      hiddenVideo.load();
    } catch (err) {
      console.error("Error preparing hidden buffer:", err);
      hiddenVideo.removeEventListener("canplay", onCanPlay);
      hiddenVideo.removeEventListener("error", onErr);
    }
  };

  const next = () => goTo((index + 1) % videoSources.length);
  const prev = () =>
    goTo((index - 1 + videoSources.length) % videoSources.length);

  return (
    <section className="relative w-full h-screen bg-black overflow-hidden">
      {/* two layered videos for crossfade */}
      <div className="absolute inset-0">
        <video
          ref={videoRefs[0]}
          muted
          playsInline
          loop
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[700ms] ease-in-out"
          style={{ opacity: activeBuffer === 0 ? 1 : 0 }}
        />
        <video
          ref={videoRefs[1]}
          muted
          playsInline
          loop
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[700ms] ease-in-out"
          style={{ opacity: activeBuffer === 1 ? 1 : 0 }}
        />
      </div>

      {/* subtle overlay for readability */}
      <div className="absolute inset-0 bg-black/28" style={{ zIndex: 10 }} />

      {/* top-right nav (kept minimal) - clickable because hero text won't block it */}
      <nav className="absolute top-0 left-0 right-0 p-3 flex justify-between items-center z-20 pointer-events-auto">
        {/* Left Corner: Logo */}
        <div className="flex items-center ">
          <Image
            src="/images/KMRL.webp"
            width={90}
            height={90}
            alt="KMRL"
            className=""
          />
        </div>
        {/* Right Corner: Buttons */}
        <div className="flex gap-4">
          <button
            style={{ borderRadius: "4px" }}
            onClick={() => (window.location.href = "/auth/login")}
            className="px-3 py-1 rounded-md bg-teal-500 text-white font-semibold transition duration-200 hover:bg-white hover:text-black border-2 border-transparent hover:border-teal-500 cursor-pointer"
          >
            Login
          </button>
          <button
            style={{ borderRadius: "4px" }}
            onClick={() => (window.location.href = "/auth/sign-up")}
            className="px-3 py-1 rounded-md bg-teal-500 text-white font-semibold transition duration-200 hover:bg-white hover:text-black border-2 border-transparent hover:border-teal-500 cursor-pointer"
          >
            Sign Up
          </button>
        </div>
      </nav>

      <div className="absolute inset-0 z-30 flex flex-col justify-center items-center text-center px-4 sm:px-16 text-white pointer-events-none">
        <h1 className="">
          <span className="block text-center text-3xl sm:text-4xl lg:text-6xl font-extrabold mb-3 text-[#00B2FF] tracking-tight md:tracking-wider animate-fade-in-up drop-shadow-lg">
            INFORM.
          </span>
          <span className="block text-center text-3xl sm:text-4xl lg:text-6xl font-extrabold mb-3 text-[#00B2FF] tracking-tight md:tracking-wider animate-fade-in-up drop-shadow-lg">
            ACT.
          </span>
          <span className="block text-center text-3xl sm:text-4xl lg:text-6xl font-extrabold mb-3 text-[#00B2FF] tracking-tight md:tracking-wider animate-fade-in-up drop-shadow-lg">
            SUCCEED.
          </span>
        </h1>

        <p className="text-lg sm:text-xl mb-3 opacity-90 text-center animate-fade-in delay-200 drop-shadow-md">
          Transforming document chaos into actionable clarity.
        </p>

        {/* Supporting bold text */}
        <p className="text-xl sm:text-xl lg:text-xl mb-6 text-center font-extrabold leading-relaxed animate-fade-in delay-500 drop-shadow-md">
          No more buried insights.
          <br />
          No more delayed decisions.
          <br />
          One platform. Unified intelligence.
        </p>
      </div>
    </section>
  );
};
export default HeroSection;
