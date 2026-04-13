import Navbar from "@/components/layout/Navbar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen mesh-bg">
      <Navbar />
      <main className="pt-24 pb-16 px-4">
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
