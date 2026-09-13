import { proxyHandler } from "@/lib/api-proxy";

export const GET = proxyHandler("/v1/reports/transfers/", "GET");
