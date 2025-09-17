export const metadata = {
  title: 'Shift Flow',
  description: 'Personal finance for shift workers',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head />
      <body className="min-h-screen bg-white">{children}</body>
    </html>
  );
}
