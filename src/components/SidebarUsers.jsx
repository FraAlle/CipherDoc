import React from "react";
import { User, Lock, Edit3 } from "lucide-react";

function SidebarUsers() {
  const users = [
    { name: "Tú", role: "Administrador", color: "text-blue-600", icon: <User size={16} /> },
    { name: "Ana Torres", role: "Editora", color: "text-green-600", icon: <Edit3 size={16} /> },
    { name: "Luis Pérez", role: "Cifrado", color: "text-purple-600", icon: <Lock size={16} /> },
  ];

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-blue-700 border-b border-blue-100 pb-2 flex items-center gap-2">
        <User size={16} /> Usuarios conectados
      </h2>

      {users.map((u, i) => (
        <div
          key={i}
          className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl shadow-sm p-3 hover:shadow-md transition-all"
        >
          <div className={`p-2 rounded-full bg-blue-50 ${u.color}`}>{u.icon}</div>
          <div className="flex flex-col">
            <span className="font-medium text-gray-800 text-sm">{u.name}</span>
            <span className="text-xs text-gray-500">{u.role}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default SidebarUsers;
