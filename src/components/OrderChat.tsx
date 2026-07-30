import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Msg = { id: string; order_id: string; sender_id: string; body: string; created_at: string };

/** Real-time chat between the customer and the assigned rider. */
export default function OrderChat({ orderId, selfId, title = "Chat" }: { orderId: string; selfId: string; title?: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data } = await supabase
        .from("order_messages")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at");
      if (alive) setMsgs((data as Msg[]) ?? []);
    };
    load();
    const ch = supabase
      .channel(`order-chat-${orderId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "order_messages", filter: `order_id=eq.${orderId}` },
        (payload) => setMsgs((prev) => (prev.some((m) => m.id === (payload.new as Msg).id) ? prev : [...prev, payload.new as Msg])),
      )
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, [orderId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [msgs.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim().slice(0, 500);
    if (!body) return;
    setSending(true);
    const { error } = await supabase.from("order_messages").insert({ order_id: orderId, sender_id: selfId, body });
    setSending(false);
    if (error) toast.error(error.message);
    else setText("");
  }

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-4">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{title}</h2>
      <div className="mt-2 max-h-56 space-y-1.5 overflow-y-auto pr-1">
        {!msgs.length && <p className="py-6 text-center text-xs text-muted-foreground">No messages yet. Say hi 👋</p>}
        {msgs.map((m) => {
          const mine = m.sender_id === selfId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-sm ${
                  mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                }`}
              >
                {m.body}
                <span className={`ml-2 text-[10px] ${mine ? "opacity-80" : "text-muted-foreground"}`}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="mt-3 flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          placeholder="Type a message…"
          className="w-full rounded-full border border-border bg-surface px-4 py-2 text-sm outline-none focus:border-primary"
        />
        <button
          disabled={sending || !text.trim()}
          className="press grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground active:bg-primary-press disabled:opacity-50"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </section>
  );
}
