"use client"

import { usePathname } from "next/navigation"

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isFullPage = pathname.startsWith("/dashboard") // o lo que necesites

  return (
    <div className={`flex-1 w-full flex flex-col ${isFullPage ? "" : "items-center"}`}>
      <div className={`${isFullPage ? "w-full" : "max-w-5xl"} flex flex-col gap-20 p-5`}>
        {children}
      </div>

      {!isFullPage && (
        <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-16">
          <p>
            Powered by{" "}
            <a
              href="https://supabase.com/?utm_source=create-next-app&utm_medium=template&utm_term=nextjs"
              target="_blank"
              className="font-bold hover:underline"
              rel="noreferrer"
            >
              Supabase
            </a>
          </p>
        </footer>
      )}
    </div>
  )
}
