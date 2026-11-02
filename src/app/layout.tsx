import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "LakerPool — Better trips, shared",
  description: "Find affordable shared rides with verified student profiles."
};
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="en"><body>{children}</body></html>;
}
