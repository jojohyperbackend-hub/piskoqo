"use client";

import { useEffect, useRef, useState } from "react";
import { signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";
import { createClient } from "@supabase/supabase-js";

type Msg = { sender: "user" | "bot"; text: string; ts: number };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Page() {
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    loadHistory(user.uid);
  }, [user]);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [messages]);

  async function loadHistory(userId: string) {
    const { data } = await supabase
      .from("chats")
      .select("*")
      .eq("user_id", userId)
      .order("timestamp", { ascending: false });

    setHistory(data || []);
  }

  const handleLogin = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const handleLogout = async () => {
    await signOut(auth);
    setMessages([]);
    setHistory([]);
  };

  const clearChat = async () => {
    const userId = user?.uid || "anonymous";

    await supabase.from("chats").delete().eq("user_id", userId);

    setMessages([]);
    setHistory([]);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userId = user?.uid || "anonymous";
    const userMsg: Msg = { sender: "user", text, ts: Date.now() };

    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, message: text })
      });

      const data = await res.json();

      setMessages((m) => [
        ...m,
        { sender: "bot", text: data?.reply || "Aku di sini kok.", ts: Date.now() }
      ]);

      loadHistory(userId);
    } catch {
      setMessages((m) => [
        ...m,
        { sender: "bot", text: "Koneksi bermasalah.", ts: Date.now() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") sendMessage();
  };

  return (
    <main className="h-screen w-full bg-neutral-950 text-neutral-100 flex flex-col">
      
      {/* HEADER */}
      <header className="border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">

          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-neutral-800 flex items-center justify-center font-semibold">
              PS
            </div>
            <div>
              <p className="font-semibold">piskoqo</p>
              <p className="text-xs text-neutral-400">AI pendamping curhat</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="flex items-center gap-3">
                  <img
                    src={user.photoURL || ""}
                    className="h-9 w-9 rounded-full border border-neutral-700"
                  />
                  <div className="text-sm hidden sm:block">
                    <p className="font-medium leading-none">{user.displayName}</p>
                    <p className="text-xs text-neutral-400">{user.email}</p>
                  </div>
                </div>

                <button
                  onClick={clearChat}
                  className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-sm"
                >
                  Hapus Chat
                </button>

                <button
                  onClick={handleLogout}
                  className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700"
                >
                  Keluar
                </button>
              </>
            ) : (
              <button
                onClick={handleLogin}
                className="px-4 py-2 rounded-xl bg-white text-black font-medium"
              >
                Masuk Google
              </button>
            )}
          </div>
        </div>
      </header>

      {/* BODY */}
      <section className="flex-1 overflow-hidden">
        <div className="max-w-7xl mx-auto h-full grid grid-cols-1 lg:grid-cols-3 gap-4 px-3 py-3">

          {/* CHAT */}
          <div className="lg:col-span-2 flex flex-col">
            <div
              ref={listRef}
              className="flex-1 overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 space-y-3"
            >
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm ${
                    m.sender === "user" ? "bg-white text-black" : "bg-neutral-800"
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="text-sm text-neutral-400">Menyusun respons…</div>
              )}
            </div>

            <div className="mt-3 flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onEnter}
                disabled={!user || loading}
                placeholder="Tulis isi hati kamu…"
                className="flex-1 h-12 px-4 rounded-2xl bg-neutral-900 border border-neutral-800 outline-none"
              />

              <button
                onClick={sendMessage}
                disabled={!user || loading || !input.trim()}
                className="h-12 px-6 rounded-2xl bg-white text-black font-medium"
              >
                Kirim
              </button>
            </div>
          </div>

          {/* HISTORY TABLE */}
          <div className="hidden lg:flex flex-col rounded-2xl border border-neutral-800 bg-neutral-900/40 overflow-hidden">
            <div className="p-4 border-b border-neutral-800 font-medium">
              Riwayat Chat
            </div>

            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="text-neutral-400">
                  <tr>
                    <th className="text-left px-4 py-2">Pengirim</th>
                    <th className="text-left px-4 py-2">Pesan</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h, i) => (
                    <tr key={i} className="border-t border-neutral-800">
                      <td className="px-4 py-2">{h.sender}</td>
                      <td className="px-4 py-2 truncate max-w-[220px]">
                        {h.message}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </section>
    </main>
  );
}
