import { proxyHandler } from "@/lib/api-proxy";

export const POST = proxyHandler("/v1/notifications/send-now/", "POST");
