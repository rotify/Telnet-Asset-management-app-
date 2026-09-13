import { proxyHandler } from "@/lib/api-proxy";

export const GET = proxyHandler("/v1/notifications/schedule/", "GET");
export const PATCH = proxyHandler("/v1/notifications/schedule/", "PATCH");
