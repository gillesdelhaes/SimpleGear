import Sidebar from './Sidebar'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#F2F2F2]">
      <Sidebar />
      <main className="flex-1 ml-[220px] min-h-screen">
        {children}
      </main>
    </div>
  )
}
