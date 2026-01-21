import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";

type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  ts: string;
};

const INITIAL_MESSAGES: Message[] = [
  {
    id: "m1",
    role: "assistant",
    text: "Hello! I'm the Hub Assistant — how can I help you today?",
    ts: new Date().toISOString(),
  },
  {
    id: "m2",
    role: "user",
    text: "Show me recent documents uploaded by Engineering.",
    ts: new Date().toISOString(),
  },
  {
    id: "m3",
    role: "assistant",
    text: "Sure — I can search by department, date, or title. Try: 'recent engineering docs'.",
    ts: new Date().toISOString(),
  },
];

const QUICK_REPLIES = [
  "List recent uploads",
  "Search by department",
  "Show safety guidelines",
  "How to upload a document?",
];

const MODELS = ["Assistant v1", "Assistant v2 (fast)", "Legacy GPT"];

const Avatar: React.FC<{ role: Message["role"] }> = ({ role }) => {
  const size = 40;
  if (role === "user") {
    return (
      <div
        className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold"
        aria-hidden
      >
        You
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden">
      <Image src="/images/chatbot.jpg" alt="assistant" width={size} height={size} style={{ objectFit: "cover" }} />
    </div>
  );
};

const formatTime = (iso: string) => {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
};

const Chatbot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);
  const [isListening, setIsListening] = useState(false); // UI only
  const [showSidebar, setShowSidebar] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // scroll to bottom when messages update
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isTyping]);

  const sendMessage = (text?: string) => {
    const content = (text ?? input).trim();
    if (!content) return;
    const msg: Message = {
      id: String(Date.now()),
      role: "user",
      text: content,
      ts: new Date().toISOString(),
    };
    setMessages((m) => [...m, msg]);
    setInput("");
    // show typing indicator
    setIsTyping(true);

    // demo assistant reply after a short delay
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          id: String(Date.now() + 1),
          role: "assistant",
          text: `Demo reply to: "${content}" (model: ${selectedModel})`,
          ts: new Date().toISOString(),
        },
      ]);
      setIsTyping(false);
    }, 650);
  };

  const onQuickReply = (text: string) => {
    sendMessage(text);
  };

  const handleAttachClick = () => fileRef.current?.click();

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    // insert a fake message showing attachment (UI-only)
    const attachMsg: Message = {
      id: String(Date.now() + 2),
      role: "user",
      text: `📎 Attached file: ${f.name}`,
      ts: new Date().toISOString(),
    };
    setMessages((m) => [...m, attachMsg]);
    // clear file input
    if (fileRef.current) fileRef.current.value = "";
  };

  const clearConversation = () => {
    setMessages([
      {
        id: String(Date.now()),
        role: "assistant",
        text: "Conversation cleared. How can I help you next?",
        ts: new Date().toISOString(),
      },
    ]);
  };

  const exportChat = () => {
    const blob = new Blob([JSON.stringify(messages, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-2xl font-bold">Hub Assistant</h2>
          <p className="text-sm text-gray-500 mt-0.5">Ask about documents, uploads, and procedures — demo UI</p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600 hidden sm:inline">Model</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="px-3 py-1 border rounded-md text-sm"
            aria-label="Select model"
          >
            {MODELS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowSidebar((s) => !s)}
            className="px-3 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-sm"
            title="Toggle tips"
          >
            {showSidebar ? "Hide tips" : "Show tips"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden grid grid-cols-1 lg:grid-cols-4">
        {/* Chat area */}
        <div className="col-span-1 lg:col-span-3 flex flex-col h-[70vh]">
          {/* header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b">
            <Avatar role="assistant" />
            <div>
              <div className="font-semibold">Hub Assistant</div>
              <div className="text-xs text-gray-500">Online • <span className="font-medium">{selectedModel}</span></div>
            </div>
            <div className="ml-auto text-xs text-gray-400">Demo</div>
          </div>

          {/* messages */}
          <div ref={listRef} className="flex-1 p-4 overflow-y-auto space-y-4 bg-gradient-to-b from-white to-gray-50">
            {messages.map((m, idx) => {
              const isUser = m.role === "user";
              const bubbleClass = isUser
                ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-tr-none"
                : "bg-white border border-gray-200 text-gray-800 rounded-tl-none";
              return (
                <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"} items-end gap-3`}>
                  {!isUser && <Avatar role={m.role} />}

                  <div className="max-w-[78%]">
                    <div className={`p-3 shadow-sm ${bubbleClass} transition transform hover:scale-[1.002]`}>
                      <div className="whitespace-pre-wrap break-words">{m.text}</div>
                    </div>
                    <div className={`mt-1 text-[11px] ${isUser ? "text-right text-gray-300" : "text-left text-gray-400"}`}>
                      {formatTime(m.ts)}
                    </div>
                  </div>

                  {isUser && <Avatar role="user" />}
                </div>
              );
            })}

            {/* typing indicator */}
            {isTyping && (
              <div className="flex items-center gap-3">
                <Avatar role="assistant" />
                <div className="bg-white border border-gray-200 rounded p-2 flex items-center gap-2">
                  <span className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-75" />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150" />
                  </span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* quick replies */}
          <div className="px-4 py-3 border-t bg-gradient-to-r from-white to-gray-50 flex gap-2 items-center overflow-x-auto">
            {QUICK_REPLIES.map((q) => (
              <button
                key={q}
                onClick={() => onQuickReply(q)}
                className="text-xs px-3 py-1 border rounded-full bg-white shadow-sm hover:shadow-md transition"
                aria-label={`Quick reply ${q}`}
              >
                {q}
              </button>
            ))}
          </div>

          {/* composer */}
          <div className="px-4 py-3 border-t bg-white flex items-center gap-2">
            <button
              type="button"
              title="Attach file"
              onClick={handleAttachClick}
              className="p-2 rounded-md hover:bg-gray-100 transition"
            >
              📎
            </button>
            <input ref={fileRef} onChange={handleFileSelected} type="file" className="hidden" />

            <button
              type="button"
              title="Emoji"
              onClick={() => setInput((s) => s + " 🙂")}
              className="p-2 rounded-md hover:bg-gray-100 transition"
            >
              😊
            </button>

            <textarea
              aria-label="Message input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Type a message and press Enter..."
              className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring resize-none h-10 max-h-28"
            />

            <button
              onClick={() => setIsListening((s) => !s)}
              title="Voice (UI only)"
              className={`p-2 rounded-md ${isListening ? "bg-red-50 text-red-600 shadow-inner" : "bg-gray-100"}`}
              aria-pressed={isListening}
            >
              <span className={isListening ? "animate-pulse" : ""}>🎙</span>
            </button>

            <button
              onClick={() => sendMessage()}
              className="px-4 py-2 rounded-md bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-semibold shadow hover:opacity-95 transition"
              aria-label="Send message"
            >
              Send
            </button>
          </div>
        </div>

        {/* Sidebar */}
        {showSidebar && (
          <aside className="col-span-1 border-l p-4 bg-white">
            <div className="flex items-start justify-between">
              <h3 className="font-semibold">Quick Tips</h3>
              <div className="text-xs text-gray-400">Demo</div>
            </div>

            <ul className="text-sm text-gray-700 space-y-2 mt-3 mb-4">
              <li>• Ask: "List documents uploaded last week"</li>
              <li>• Try searching by department — e.g., "Engineering"</li>
              <li>• Use quick replies for common tasks</li>
            </ul>

            <h4 className="font-semibold mb-2">Conversation Shortcuts</h4>
            <div className="flex flex-col gap-2">
              <button
                onClick={exportChat}
                className="text-sm px-3 py-2 border rounded text-left hover:bg-gray-50"
                aria-label="Export chat"
              >
                Export chat (JSON)
              </button>
              <button
                onClick={clearConversation}
                className="text-sm px-3 py-2 border rounded text-left hover:bg-gray-50"
                aria-label="Clear conversation"
              >
                Clear conversation
              </button>
            </div>

            <div className="mt-4 text-xs text-gray-500">
              This is a frontend demo. Connect to your assistant backend to enable real replies, streaming and file handling.
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

export default Chatbot;
