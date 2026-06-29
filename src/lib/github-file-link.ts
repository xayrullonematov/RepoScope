/**
 * GitHub File Link Utility
 *
 * Extracts file path + optional line number from finding content and builds
 * a clickable GitHub URL. Used by FindingCard and ResultsDashboard to link
 * findings directly to source code.
 */

export interface FileRef {
  path: string;
  line: number | null;
  url: string;
  /** Short display text: "src/lib/foo.ts:42" */
  display: string;
}

/**
 * Extract the first file path + line reference from text content and build
 * a GitHub URL for it. Returns null if no file reference is found.
 */
export function extractFileLink(
  content: string,
  repo: { owner: string; repo: string; branch: string } | undefined | null
): FileRef | null {
  const parsed = parseFileAndLine(content);
  if (!parsed) return null;

  const display = parsed.line
    ? `${parsed.path}:${parsed.line}`
    : parsed.path;

  if (!repo) {
    return { path: parsed.path, line: parsed.line, url: "", display };
  }

  const lineFragment = parsed.line ? `#L${parsed.line}` : "";
  const url = `https://github.com/${repo.owner}/${repo.repo}/blob/${repo.branch}/${parsed.path}${lineFragment}`;

  return { path: parsed.path, line: parsed.line, url, display };
}

function parseFileAndLine(content: string): { path: string; line: number | null } | null {
  const patterns: RegExp[] = [
    // path:line (most common)
    /(?:^|\s|`)((?:src|lib|app|pages|components|api|config|prisma|scripts|hooks|types|schemas|middleware)\/[\w./-]+):(\d+)/i,
    // ./relative/path:line
    /(?:^|\s|`)(\.\/[\w./-]+):(\d+)/,
    // path (line N) or path (L N)
    /(?:^|\s|`)((?:src|lib|app|pages|components|api|config|prisma|scripts|hooks|types|schemas|middleware)\/[\w./-]+)\s*\((?:line\s*|L)(\d+)\)/i,
    // path#LN
    /(?:^|\s|`)((?:src|lib|app|pages|components|api|config|prisma|scripts|hooks|types|schemas|middleware)\/[\w./-]+)#L(\d+)/i,
    // path without line (fallback)
    /(?:^|\s|`)((?:src|lib|app|pages|components|api|config|prisma|scripts|hooks|types|schemas|middleware)\/[\w./-]+\.\w{1,6})/i,
    // ./relative/path without line
    /(?:^|\s|`)(\.\/[\w./-]+\.\w{1,6})/,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      const path = match[1].replace(/`$/, "");
      const line = match[2] ? parseInt(match[2], 10) : null;
      return { path, line };
    }
  }

  return null;
}
