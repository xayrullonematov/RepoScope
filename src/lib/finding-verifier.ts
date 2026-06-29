/**
 * Finding Verifier — Lightweight post-consensus gate that uses the cheapest
 * model to verify findings reference real code issues.
 *
 * For each finding that references a file path, the verifier reads that file
 * and asks a cheap model: "Does this code actually exhibit this problem?"
 * Findings that fail verification are marked as unverified.
 *
 * Cost: ~$0.01–$0.03 per analysis (uses summary-tier model, tiny context).
 */

import { createLLMProvider } from "@/lib/llm-provider";
import { fetchFileContent, GithubError } from "@/lib/github-fetcher";
import type { ArtifactState, LLMProvider, LLMRequest } from "@/types/domain";

export interface VerificationResult {
  artifactId: string;
  verified: boolean;
  confidence: number;
  reason: string;
}

const VERIFY_MODEL = process.env.LLM_MODEL_SUMMARY_TIER ?? "qwen-turbo";
const MAX_FILE_BYTES = 15_000; // ~3.5K tokens — enough for most single-file checks

/**
 * Verify a batch of findings against their referenced source files.
 * Only verifies findings that have a file path in their content.
 * Returns verification results; findings without file refs are auto-passed.
 */
export async function verifyFindings(
  findings: ArtifactState[],
  repo: { owner: string; repo: string; branch: string } | null
): Promise<VerificationResult[]> {
  if (!repo) {
    // No repo context — can't verify, pass everything
    return findings.map((f) => ({
      artifactId: f.id,
      verified: true,
      confidence: 0.5,
      reason: "No repo context available for verification",
    }));
  }

  const llm = createLLMProvider();
  const results: VerificationResult[] = [];

  // Extract file-referencing findings and batch verify
  const verifiable: { artifact: ArtifactState; filePath: string }[] = [];
  for (const artifact of findings) {
    const filePath = extractFilePath(artifact.content);
    if (filePath) {
      verifiable.push({ artifact, filePath });
    } else {
      // No file reference — auto-pass with lower confidence
      results.push({
        artifactId: artifact.id,
        verified: true,
        confidence: 0.4,
        reason: "No specific file reference to verify",
      });
    }
  }

  // Batch findings by file to avoid fetching the same file multiple times
  const byFile = new Map<string, ArtifactState[]>();
  for (const { artifact, filePath } of verifiable) {
    if (!byFile.has(filePath)) byFile.set(filePath, []);
    byFile.get(filePath)!.push(artifact);
  }

  // Verify each file's findings (concurrent but limited)
  const fileEntries = Array.from(byFile.entries());
  const batchSize = 4;
  for (let i = 0; i < fileEntries.length; i += batchSize) {
    const batch = fileEntries.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map(([filePath, artifacts]) =>
        verifyFileFindings(llm, repo, filePath, artifacts)
      )
    );

    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        results.push(...result.value);
      } else {
        // On failure, pass findings with low confidence
        const failedFile = batch[batchResults.indexOf(result)];
        if (failedFile) {
          for (const artifact of failedFile[1]) {
            results.push({
              artifactId: artifact.id,
              verified: true,
              confidence: 0.3,
              reason: "Verification failed — passing by default",
            });
          }
        }
      }
    }
  }

  return results;
}

async function verifyFileFindings(
  llm: LLMProvider,
  repo: { owner: string; repo: string; branch: string },
  filePath: string,
  artifacts: ArtifactState[]
): Promise<VerificationResult[]> {
  // Fetch the file content
  const result = await fetchFileContent(
    repo.owner,
    repo.repo,
    filePath,
    repo.branch
  );

  if (result instanceof GithubError) {
    return artifacts.map((a) => ({
      artifactId: a.id,
      verified: true,
      confidence: 0.3,
      reason: `Could not fetch ${filePath}: ${result.message}`,
    }));
  }

  const truncatedContent = result.content.slice(0, MAX_FILE_BYTES);
  const findingsList = artifacts
    .map((a, i) => `[${i + 1}] "${a.title}": ${a.content.slice(0, 200)}`)
    .join("\n");

  const request: LLMRequest = {
    systemPrompt:
      "You are a code verification assistant. For each finding, determine if the code actually exhibits the described problem. Respond with JSON only.",
    userMessage: `File: ${filePath}\n\n\`\`\`\n${truncatedContent}\n\`\`\`\n\nFindings to verify:\n${findingsList}\n\nFor each finding, respond with:\n{"results": [{"index": 1, "verified": true/false, "confidence": 0.0-1.0, "reason": "brief explanation"}]}`,
    responseFormat: "json",
    maxTokens: 1024,
    temperature: 0.1,
  };

  try {
    const response = await llm.complete(request, VERIFY_MODEL);
    const parsed = JSON.parse(response.content) as {
      results: { index: number; verified: boolean; confidence: number; reason: string }[];
    };

    return artifacts.map((artifact, i) => {
      const match = parsed.results?.find((r) => r.index === i + 1);
      return {
        artifactId: artifact.id,
        verified: match?.verified ?? true,
        confidence: match?.confidence ?? 0.5,
        reason: match?.reason ?? "No verification data",
      };
    });
  } catch {
    // On parse failure, pass all findings
    return artifacts.map((a) => ({
      artifactId: a.id,
      verified: true,
      confidence: 0.3,
      reason: "Verification response unparseable — passing by default",
    }));
  }
}

/** Extract the first file path reference from artifact content */
function extractFilePath(content: string): string | null {
  // Match patterns like: src/lib/foo.ts, ./app/page.tsx, components/Bar.tsx:42
  const match = content.match(
    /(?:^|\s|`)((?:src|lib|app|pages|components|api|config|prisma|scripts)\/[\w./-]+)/i
  );
  if (match) return match[1].replace(/:\d+$/, ""); // strip line numbers

  const relMatch = content.match(/(?:^|\s|`)(\.\/[\w./-]+)/);
  if (relMatch) return relMatch[1].replace(/:\d+$/, "");

  return null;
}
