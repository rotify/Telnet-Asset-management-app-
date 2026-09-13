import { proxyHandlerWithId } from "@/lib/api-proxy";

export const POST = proxyHandlerWithId(
  "/v1/notifications/deliveries/{id}/retry/",
  "POST"
);
