import { proxyHandler } from "@/lib/api-proxy";

export const GET = proxyHandler("/v1/settings/profile/", "GET");
export const PATCH = proxyHandler("/v1/settings/profile/", "PATCH");
