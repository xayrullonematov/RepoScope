"use client";

import useSWR from "swr";
import SessionList from "@/components/session/SessionList";
import NewSessionForm from "@/components/session/NewSessionForm";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function Home() {
  const { data, isLoading } = useSWR("/api/sessions", fetcher);
  const sessions = data?.sessions ?? [];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-gray-800 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-100">AI Engineering Room</h1>
        <p className="text-sm text-gray-400 mt-1">
          Multi-agent structured debate for engineering decisions
        </p>
      </header>

      <main className="flex-1 p-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: New Session Form */}
          <section>
            <h2 className="text-lg font-semibold text-gray-200 mb-4">New Session</h2>
            <div className="p-5 border border-gray-700 rounded-lg bg-gray-900/50">
              <NewSessionForm />
            </div>
          </section>

          {/* Right: Session List */}
          <section>
            <h2 className="text-lg font-semibold text-gray-200 mb-4">
              Sessions {sessions.length > 0 && `(${sessions.length})`}
            </h2>
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <span className="text-gray-400 text-sm">Loading sessions...</span>
              </div>
            ) : (
              <SessionList sessions={sessions} />
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
