import {Suspense} from "react";
import DreamShell from "@/features/shell/dream-shell";
export default function DreamAppLayout({children}:{children:React.ReactNode}){return <Suspense fallback={<div className="dream-shell-loading">MarkErras Sorare Dream lädt …</div>}><DreamShell>{children}</DreamShell></Suspense>}
