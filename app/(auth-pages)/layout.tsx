export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-screen min-h-screen overflow-hidden">
      {/* Elementos decorativos flotantes - más sutiles */}
      <div className="absolute top-32 right-32 w-64 h-64 bg-orange-300 rounded-full opacity-10 blur-3xl"></div>
      <div className="absolute bottom-32 left-32 w-80 h-80 bg-orange-400 rounded-full opacity-10 blur-3xl"></div>
      
      {/* Contenido */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
