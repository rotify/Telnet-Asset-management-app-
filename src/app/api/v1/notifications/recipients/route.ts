import { proxyHandler } from "@/lib/api-proxy";

export const GET = proxyHandler("/v1/notifications/recipients/", "GET");
export const POST = proxyHandler("/v1/notifications/recipients/", "POST");
