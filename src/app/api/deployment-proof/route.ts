/**
 * Deployment Proof API Route
 *
 * GET /api/deployment-proof
 *
 * Returns SAFE, non-sensitive deployment metadata to demonstrate the app is
 * live on Alibaba Cloud ECS (for the Qwen Cloud / Alibaba Cloud hackathon).
 *
 * SECURITY: This endpoint is intentionally public (the middleware skips
 * `/api/*` from the demo password gate). It therefore MUST NOT expose:
 *   - API keys, tokens, or credentials
 *   - Full environment variables
 *   - Private IPs, MAC addresses, the ECS instance-id, or serial number
 *
 * The only Alibaba-specific value surfaced is the region (public-geography
 * level, e.g. "ap-southeast-1"), plus a boolean confirming the ECS metadata
 * service answered. That is enough to prove "this runs on Alibaba Cloud ECS"
 * without leaking anything an attacker could use.
 */

import { NextResponse } from "next/server";

// Captured once at server (module) load. For a container that is rebuilt on
// every deploy this closely tracks the actual deploy time; a build/deploy
// pipeline can override it precisely via the DEPLOYED_AT env var.
const SERVER_STARTED_AT = new Date().toISOString();

// Alibaba Cloud ECS instance metadata service (analogous to AWS 169.254.169.254).
// Reachable only from inside the instance, never from the public internet.
const ECS_METADATA_REGION_URL = "http://100.100.100.200/latest/meta-data/region-id";

// Cache the region lookup: undefined = not checked yet, string|null = resolved.
let cachedRegion: string | null | undefined;

async function detectAlibabaRegion(): Promise<string | null> {
  if (cachedRegion !== undefined) return cachedRegion;
  try {
    const res = await fetch(ECS_METADATA_REGION_URL, {
      signal: AbortSignal.timeout(1500),
    });
    // region-id is safe to surface; we deliberately never fetch instance-id,
    // private-ipv4, mac, or serial-number here.
    cachedRegion = res.ok ? (await res.text()).trim() : null;
  } catch {
    cachedRegion = null;
  }
  return cachedRegion;
}

export async function GET() {
  const region = await detectAlibabaRegion();

  return NextResponse.json({
    app: "RepoScope",
    environment: process.env.NODE_ENV ?? "production",
    platform: "Alibaba Cloud ECS",
    runtime: "Docker / Docker Compose",
    framework: "Next.js",
    deployedAt: process.env.DEPLOYED_AT ?? SERVER_STARTED_AT,
    region, // e.g. "ap-southeast-1" — safe geography, or null if unavailable
    onAlibabaEcs: region !== null, // ECS metadata service answered from inside the instance
  });
}
