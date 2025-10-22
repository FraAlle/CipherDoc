import React from "react";
import TextEditor from "./components/TextEditor";
import Navbar from "./components/Navbar";
import SidebarUsers from "./components/SidebarUsers";


export default function App() {
return (
<div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-white text-gray-900 font-sans">
{/* Barra superior */}
<Navbar />


{/* Contenido principal */}
<div className="flex flex-1 overflow-hidden">
{/* Sidebar izquierda */}
<aside className="hidden md:flex flex-col w-60 border-r bg-white/70 backdrop-blur-sm p-4 shadow-inner">
<SidebarUsers />
<div className="mt-auto text-xs text-gray-400 text-center pt-4 border-t">
© 2025 Editor Cifrado IA — Demo Secure
</div>
</aside>


{/* Editor principal */}
<main className="flex-1 flex items-center justify-center p-4 overflow-hidden">
<div className="w-full h-full max-w-[1400px]">
<TextEditor />
</div>
</main>
</div>


{/* Pie de página */}
<footer className="p-3 text-center text-xs text-gray-400 bg-white/50 border-t">
Desarrollado para demo de seguridad — Privacidad total, IA efímera local.
</footer>
</div>
);
}