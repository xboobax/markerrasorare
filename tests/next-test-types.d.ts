// Minimal ambient definitions for the isolated TypeScript test compilation.
// A Next.js build provides these types normally.
declare const process: { env: Record<string, string | undefined> };
interface RequestInit { next?: { revalidate?: number } }
