import "./globals.css";
import { Toaster } from "react-hot-toast";
import ThemeToggle from "../components/ThemeToggle";
import { Plus_Jakarta_Sans } from "next/font/google";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-plus-jakarta"
});

export const metadata = {
  title: "ITCOMMERCE",
  description: "SaaS POS profesional"
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={plusJakarta.variable}>
      <body className={plusJakarta.className}>
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 1000 }}>
          <ThemeToggle />
        </div>
        <Toaster position="top-right" />
        {children}
      </body>
    </html>
  );
}
