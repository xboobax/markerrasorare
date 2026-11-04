"use client";
import {usePathname} from "next/navigation";
import DreamShell from "./dream-shell";

/**
 * Keep the Dream navigation mounted across normal workspace route changes.
 * Diagnostic and legacy pages must preserve their own standalone layout.
 * Avoid the (dream) route-group on Next.js 14.2.35: Vercel's output file
 * tracer referenced a non-generated group page_client-reference-manifest.js.
 */
export default function DreamAppRouter({children}:{children:React.ReactNode}){
  const pathname=usePathname() ?? "";
  if(pathname==="/legacy" || pathname==="/diagnose" || pathname==="/status"){
    return <>{children}</>;
  }
  return <DreamShell>{children}</DreamShell>;
}
