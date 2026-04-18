"use client";

import { useEffect, useRef } from "react";
import { useChatSessionStore } from "@/lib/chat-session-store";
import { unwrapResults } from "@/lib/django-api";

type ChatSessionRow = { id: number; title: string };

type SessionListBody = {
  next?: string | null;
  results?: ChatSessionRow[];
};

export function ChatSessionPrefetch() {
  const coordinatorSessionId = useChatSessionStore((s) => s.coordinatorSessionId);
  const setCoordinatorSessionId = useChatSessionStore((s) => s.setCoordinatorSessionId);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (coordinatorSessionId != null) return;

    (async () => {
      try {
        const res = await fetch("/api/django/agent/chat-sessions/?page=1", {
          credentials: "include",
        });
        if (!res.ok) return;
        const body = (await res.json()) as SessionListBody;
        const rows = unwrapResults<ChatSessionRow>(body);
        if (rows.length > 0) {
          setCoordinatorSessionId(rows[0].id);
        }
      } catch {
        /* ignore */
      }
    })();
  }, [coordinatorSessionId, setCoordinatorSessionId]);

  return null;
}
