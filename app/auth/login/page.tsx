"use client";

import Image from "next/image";
import React, { useState, useEffect } from "react";
import { login } from "./actions";
import { toast } from "react-toastify";
import { useRouter, useSearchParams } from "next/navigation";

const Login = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    designation: "",
    department: "",
  });

  const departmentOptions = ["Engineering", "Design", "Operations", "Finance"];

  // If you redirected here after signup with ?signup=success (optional), show a toast
  useEffect(() => {
    const s = searchParams?.get?.("signup");
    if (s === "success") {
      toast.success("Account created successfully. Please login.", {
        className: "rounded-xl",
        autoClose: 4000,
      });
    }
  }, [searchParams]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Special handling when designation changes
    if (name === "designation") {
      // If Director selected, clear department
      if (value === "Director") {
        setFormData((prev) => ({
          ...prev,
          designation: value,
          department: "",
        }));
        return;
      }
    }

    // Normal updates for other fields
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Validation: department required for non-directors
  const isFormValid =
    formData.email.trim() &&
    formData.password &&
    formData.designation &&
    (formData.designation === "Director" ? true : formData.department);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Show loading toast
    const loadingToastId = toast.info("Logging you in...", {
      className: "rounded-xl",
      autoClose: false,
    });

    try {
      const formDataObj = new FormData(e.currentTarget);
      const result = await login(formDataObj);

      // Dismiss loading toast
      toast.dismiss(loadingToastId);

      console.log("Login result:", result);

      // Server returns structured result: { success: true, redirectTo: string } OR { success: false, error: string }
      if (result?.success) {
        const redirectTo = result.redirectTo || "/";
        toast.success("Logged in successfully!", {
          className: "rounded-xl",
          autoClose: 2000,
        });

        // Clear form data
        setFormData({
          email: "",
          password: "",
          designation: "",
          department: "",
        });

        // Navigate to the route provided by server
        router.push(redirectTo);
        return;
      }

      // Show server-provided error message (fallback to generic)
      const errorMessage =
        result?.error || "Login failed. Please check your credentials.";
      toast.error(errorMessage, {
        className: "rounded-xl",
        autoClose: 6000,
      });
      console.error("Login error:", errorMessage);
    } catch (err) {
      // Dismiss loading toast
      toast.dismiss(loadingToastId);

      // Fallback: if server still throws NEXT_REDIRECT (rare with updated action),
      // handle it specially by inspecting the error for redirect URL.
      const isRedirect =
        (err && typeof err === "object" && String(err?.message).includes("NEXT_REDIRECT")) ||
        false;

      if (isRedirect) {
        // try to extract url (different Next versions attach it differently)
        const redirectUrl = err?.url || err?.location || (err?.message && err.message.match(/(\/[^\s?]+)/)?.[0]);

        if (redirectUrl && String(redirectUrl).includes("/error")) {
          // If server redirected to error page, show that as an error
          // Optionally parse a message from query (e.g. /error?msg=...)
          const maybeMsgMatch = String(redirectUrl).match(/[?&]msg=([^&]+)/);
          const serverMsg = maybeMsgMatch ? decodeURIComponent(maybeMsgMatch[1]) : null;

          toast.error(serverMsg ?? "Login failed. Redirected to error page.", {
            className: "rounded-xl",
            autoClose: 6000,
          });

          // keep redirect behavior so user can see server error page
          router.push(redirectUrl);
          return;
        }

        // Non-error redirect => treat as success
        toast.success("Logged in successfully!", {
          className: "rounded-xl",
          autoClose: 2000,
        });
        if (redirectUrl) router.push(redirectUrl);
        return;
      }

      // No redirect: unexpected error
      toast.error("An unexpected error occurred during login.", {
        className: "rounded-xl",
        autoClose: 5000,
      });

      // Helpful logs
      console.error("Unexpected login error:", err);
      if (err instanceof Error) console.error("Error stack:", err.stack);
    }
  };

  return (
    <div className="h-screen w-full flex">
      {/* LEFT - form side */}
      <div className="w-1/2 relative flex items-center justify-center bg-white overflow-hidden">
        {/* Decorative background image (behind the card) */}
        <div className="absolute inset-0 -z-10">
          <Image src="/images/train.png" alt="train" fill style={{ objectFit: "cover" }} priority />
          <div className="absolute inset-0 bg-black/10" />
        </div>

        {/* Card */}
        <div className="bg-white/60 backdrop-blur-sm border border-black/10 rounded-2xl w-[75%] max-w-md p-8 flex flex-col">
          <h2 className="text-3xl font-bold mb-8 text-center text-green-600">Login</h2>

          <form onSubmit={handleSubmit} className="flex flex-col space-y-6">
            <div className="w-full">
              <label className="text-black font-semibold block mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your Email"
                className="w-full p-3 border border-gray-300 rounded-lg text-black"
                required
              />
            </div>

            <div className="w-full">
              <label className="text-black font-semibold block mb-2">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your Password"
                className="w-full p-3 border border-gray-300 rounded-lg text-black"
                required
              />
            </div>

            <div className="w-full">
              <label className="text-black font-semibold block mb-2">Designation</label>
              <select
                name="designation"
                value={formData.designation}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg text-black"
                required
              >
                <option value="">Select Designation</option>
                <option value="Director">Director</option>
                <option value="Department Manager">Department Manager</option>
                <option value="Others">Others</option>
              </select>
            </div>

            {/* Show Department dropdown when designation is NOT Director and a designation is chosen */}
            {formData.designation && formData.designation !== "Director" && (
              <div className="w-full">
                <label className="text-black font-semibold block mb-2">Department</label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-lg text-black"
                  required
                >
                  <option value="">Select Department</option>
                  {departmentOptions.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex justify-center pt-4">
              <button
              style={{borderRadius: "50px" , fontSize: "15px", fontWeight: "bold"}}
                type="submit"
                className={`rounded-2xl p-2 text-white font-medium w-2/4 ${
                  isFormValid ? "bg-[#00C951] hover:bg-[#00B848] border-2 border-[#00C951]" : "bg-gray-400 cursor-not-allowed"
                }`}
                disabled={!isFormValid}
              >
                Login
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* RIGHT - info / image side */}
      <div className="w-1/2 bg-[#00C951] rounded-l-full flex flex-col items-center justify-center text-white h-screen">
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="w-48 h-48 relative">
            <Image src="/images/login.svg" alt="Login" width={300} height={300} />
          </div>
          <p className="text-2xl font-medium">Don't Have An Account?</p>
          <button style={{fontWeight: "bold" , fontSize:"20px"}} onClick={() => router.push("/auth/sign-up")} className="text-2xl font-bold underline  hover:text-green-100">
            Sign Up
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
