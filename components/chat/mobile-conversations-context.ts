"use client";

import { createContext, useContext } from "react";

interface MobileConversationsContextValue {
  open: () => void;
}

const MobileConversationsContext = createContext<MobileConversationsContextValue | null>(
  null,
);

export function useMobileConversations() {
  return useContext(MobileConversationsContext);
}

export { MobileConversationsContext };
