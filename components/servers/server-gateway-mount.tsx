"use client";

import { useEffect } from "react";
import { serverGateway } from "@/lib/server-gateway";

export function ServerGatewayMount({ userId, serverId }: { userId: string; serverId: string }) {
  useEffect(() => {
    serverGateway.connect(userId, serverId);
  }, [serverId, userId]);

  return null;
}
