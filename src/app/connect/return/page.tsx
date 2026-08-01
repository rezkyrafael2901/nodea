"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

/**
 * OAuth return page — the user lands here after approving/denying
 * a data access request on Vana's approval page.
 *
 * This page posts a message to the opener window (the main app tab)
 * and closes itself. If the opener is closed, shows a manual return link.
 */

function ReturnContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [message, setMessage] = useState("Completing connection...");

  useEffect(() => {
    const sourceId = searchParams.get("source");
    const requestId = searchParams.get("requestId") || searchParams.get("dcr_id") || searchParams.get("dcrId");
    const error = searchParams.get("error");
    const denied = searchParams.get("denied");

    if (error || denied) {
      setStatus("error");
      setMessage(denied ? "Access was denied." : "Connection failed.");
      return;
    }

    if (!sourceId) {
      // Vana sometimes redirects without params — polling in the main tab
      // is the source of truth, so just send the opener a generic signal.
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: "vana-connect-returned" }, "*");
      }
      setStatus("success");
      setMessage("Returning to your app…");
      setTimeout(() => {
        if (window.opener && !window.opener.closed) {
          window.close();
        } else {
          router.push("/");
        }
      }, 800);
      return;
    }

    // Notify the opener (main app tab) that the user is back.
    // Polling in the main tab is the primary mechanism; this is a nudge.
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(
        {
          type: "vana-connect-approved",
          sourceId,
          requestId,
        },
        "*"
      );
      setStatus("success");
      setMessage("Connection approved! This tab will close automatically.");
      // Close after 1.5s
      setTimeout(() => window.close(), 1500);
    } else {
      // No opener — redirect user back to app with params
      setStatus("success");
      setMessage("Connection approved! Redirecting back to app...");
      setTimeout(() => {
        const baseUrl = window.location.origin;
        const q = new URLSearchParams({ source: sourceId });
        if (requestId) q.set("requestId", requestId);
        router.push(`${baseUrl}/?connect=return&${q.toString()}`);
      }, 1000);
    }
  }, [searchParams, router]);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-8">
        {status === "processing" && (
          <>
            <div className="text-5xl mb-6 animate-pulse">⏳</div>
            <h1 className="text-2xl font-bold mb-2">{message}</h1>
          </>
        )}
        {status === "success" && (
          <>
            <div className="text-5xl mb-6">✅</div>
            <h1 className="text-2xl font-bold mb-2 text-emerald-400">Connected!</h1>
            <p className="text-white/60">{message}</p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="text-5xl mb-6">❌</div>
            <h1 className="text-2xl font-bold mb-2 text-red-400">Connection Failed</h1>
            <p className="text-white/60 mb-6">{message}</p>
            <button
              onClick={() => window.close()}
              className="px-6 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl font-medium transition-colors"
            >
              Close Tab
            </button>
          </>
        )}
      </div>
    </main>
  );
}

export default function ReturnPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
          <div className="text-center">
            <div className="text-5xl mb-6 animate-pulse">⏳</div>
            <p className="text-white/60">Processing connection...</p>
          </div>
        </main>
      }
    >
      <ReturnContent />
    </Suspense>
  );
}
