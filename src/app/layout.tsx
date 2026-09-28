import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Connect with City4Christ",
  description: "Get a personal introduction to City4Christ in Brighton and Hove.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
