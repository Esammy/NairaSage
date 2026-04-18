import { create } from "zustand";
import { persist } from "zustand/middleware";

type ChatSessionStore = {
  coordinatorSessionId: number | null;
  setCoordinatorSessionId: (id: number | null) => void;
};

export const useChatSessionStore = create<ChatSessionStore>()(
  persist(
    (set) => ({
      coordinatorSessionId: null,
      setCoordinatorSessionId: (id) => set({ coordinatorSessionId: id }),
    }),
    { name: "nairasage-coordinator-session" }
  )
);
