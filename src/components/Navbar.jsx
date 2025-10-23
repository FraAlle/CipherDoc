import React from "react";
import { ShieldCheck, Cpu, GitBranch } from "lucide-react";

function Navbar() {
  return (
    <nav className="w-full bg-white/80 backdrop-blur-md border-b border-blue-100 shadow-sm px-6 py-3 flex items-center justify-between">
      {/* Logo y título */}
      <div className="flex items-center gap-3">
        <ShieldCheck className="text-blue-600" size={22} />
        <h1 className="text-lg font-semibold text-blue-700 tracking-tight">
          Editor Cifrado IA Efímera
        </h1>
      </div>

      {/* Menú derecho */}
      <div className="flex items-center gap-6 text-sm text-gray-600">
        {/*<a href="#" className="hover:text-blue-600 flex items-center gap-1">
          <Cpu size={15} /> Arquitectura
        </a>
        <a href="#" className="hover:text-blue-600 flex items-center gap-1">
          <GitBranch size={15} /> Roadmap
        </a>
        <a href="#" className="hover:text-blue-600 flex items-center gap-1">
          🔒 Seguridad
        </a>*/}
        <a href="https://github.com/FraAlle/CipherDoc" className="hover:text-blue-600 flex items-center gap-1">
          Repositorio Github
          <img src="https://github.com/fluidicon.png" alt="GitHub Icon" style={{ width: '30px', height: '30px', marginRight: '8px' }} />
        </a>
      </div>
    </nav>
  );
}

export default Navbar;
