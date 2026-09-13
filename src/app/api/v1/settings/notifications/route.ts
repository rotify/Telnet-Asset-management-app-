import { proxyHandler } from "@/lib/api-proxy";

export const GET = proxyHandler("/v1/settings/notifications/", "GET");
export const PATCH = proxyHandler("/v1/settings/notifications/", "PATCH");
