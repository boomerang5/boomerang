export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-screen min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-100 via-white to-orange-50">
      {children}
    </div>
  );
}
