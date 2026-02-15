import "./globals.css";

export const metadata = {
  title: "piskoqo",
  description: "Pendamping curhat yang hangat & responsif"
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-neutral-950 text-neutral-100">
        {children}
      </body>
    </html>
  );
}
