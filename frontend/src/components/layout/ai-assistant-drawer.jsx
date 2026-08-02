'use client';

import { useState, useEffect, useRef } from 'react';
import { Sparkles, X, Send, Loader2, Play } from 'lucide-react';
import { apiRequest } from '@/services/api-client';
import { toast } from 'sonner';

export function AiAssistantDrawer() {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hello! I am your AI Design Assistant. Select an active project from the dropdown above and ask me to generate a furniture layout (e.g., "design a modular kitchen with acrylic finish and 3 drawers").',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [applyingId, setApplyingId] = useState(null);

  const messagesEndRef = useRef(null);

  // Fetch projects list when drawer is opened
  useEffect(() => {
    if (open) {
      apiRequest('/projects')
        .then((data) => {
          setProjects(data || []);
          if (data && data.length > 0) {
            setSelectedProjectId(data[0].id);
          }
        })
        .catch((err) => {
          console.error(err);
          toast.error('Failed to load projects');
        });
    }
  }, [open]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    if (!selectedProjectId) {
      toast.warning('Please select a project first');
      return;
    }

    const userPrompt = inputValue.trim();
    setInputValue('');
    setLoading(true);

    const userMsgId = Date.now().toString();
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: 'user', content: userPrompt },
    ]);

    try {
      const res = await apiRequest('/ai/estimate', {
        method: 'POST',
        body: {
          prompt: userPrompt,
          projectId: selectedProjectId,
        },
      });

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: res.rawResponse || 'Here is the layout suggestion I generated for you:',
          suggestion: res.suggestion,
        },
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Sorry, I encountered an error: ${err.message || 'Request failed'}`,
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleApplySuggestion = async (msgId, suggestion) => {
    if (!selectedProjectId) return;
    setApplyingId(msgId);

    try {
      await apiRequest('/ai/apply', {
        method: 'POST',
        body: {
          projectId: selectedProjectId,
          suggestion,
          measure: true,
        },
      });

      toast.success('Successfully applied and measured suggestion in project!');
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId ? { ...m, applied: true } : m
        )
      );
    } catch (err) {
      console.error(err);
      toast.error(`Failed to apply suggestion: ${err.message}`);
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all duration-200 group"
      >
        <Sparkles className="h-5 w-5 animate-pulse group-hover:rotate-12 transition-transform" />
        <span>AI Assistant</span>
      </button>

      {/* Slide-over Drawer Container */}
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm transition-opacity duration-300">
          <div className="flex h-full w-full max-w-md flex-col border-l bg-card text-card-foreground shadow-2xl transition-transform duration-300 translate-x-0">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-500" />
                <h2 className="font-heading text-lg font-semibold">AI Design Assistant</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full p-1.5 hover:bg-muted text-muted-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Project Selector */}
            <div className="border-b bg-muted/30 px-6 py-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Active Project Target
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/25"
              >
                {projects.length === 0 ? (
                  <option value="">No projects loaded</option>
                ) : (
                  projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.projectName} ({p.siteAddress})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                        isUser
                          ? 'bg-indigo-600 text-white rounded-tr-none'
                          : msg.isError
                          ? 'bg-destructive/10 text-destructive border border-destructive/20 rounded-tl-none'
                          : 'bg-muted text-foreground border rounded-tl-none'
                      }`}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                      {/* Suggestion Card & Action */}
                      {msg.suggestion && (
                        <div className="mt-3 border-t pt-3 border-muted-foreground/10 space-y-2">
                          <div className="text-xs font-semibold text-indigo-500 dark:text-indigo-400">
                            Generated Layout Suggestion:
                          </div>
                          <div className="text-xs space-y-1 text-muted-foreground">
                            {msg.suggestion.rooms?.map((room, ri) => (
                              <div key={ri} className="border-l-2 border-indigo-500/50 pl-2">
                                <span className="font-semibold text-foreground">{room.name}</span>
                                <ul className="list-disc list-inside pl-1 text-[11px]">
                                  {room.furniture?.map((f, fi) => (
                                    <li key={fi}>
                                      {f.name} ({f.category}, {f.width}×{f.height}mm)
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>

                          <button
                            disabled={msg.applied || applyingId === msg.id}
                            onClick={() => handleApplySuggestion(msg.id, msg.suggestion)}
                            className={`w-full mt-2 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold text-white transition-all shadow-sm ${
                              msg.applied
                                ? 'bg-success hover:bg-success cursor-default shadow-none'
                                : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:brightness-105 active:scale-[0.98]'
                            }`}
                          >
                            {applyingId === msg.id ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                <span>Applying...</span>
                              </>
                            ) : msg.applied ? (
                              <span>Applied to Project ✓</span>
                            ) : (
                              <>
                                <Play className="h-3 w-3 fill-current" />
                                <span>Apply Suggestion</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl bg-muted border px-4 py-3 text-sm text-muted-foreground rounded-tl-none shadow-sm">
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                    <span>Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSend} className="border-t p-4 flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask assistant to generate layout..."
                className="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/25"
                disabled={loading}
              />
              <button
                type="submit"
                className="rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
                disabled={loading || !inputValue.trim()}
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
