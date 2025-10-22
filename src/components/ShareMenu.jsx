import React, { useState } from "react";

export default function ShareMenu({
  open,
  onClose,
  users,
  mode,
  selectionMode,
  selectedLines,
  selectedPages,
  onSave,
}) {
  const [editableUsers, setEditableUsers] = useState(users);

  if (!open) return null;

  const handlePermissionChange = (name, value) => {
    setEditableUsers((prev) =>
      prev.map((u) => (u.name === name ? { ...u, permission: value } : u))
    );
  };

  const handleSave = () => {
    onSave(editableUsers, { mode, selectionMode, selectedLines, selectedPages });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 relative">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          {mode === "total" ? "Compartir documento completo" : "Compartición selectiva"}
        </h2>

        <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
          {editableUsers.map((u) => (
            <div
              key={u.name}
              className="flex items-center justify-between border rounded-lg p-3"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: u.color }}
                ></div>
                <span className="font-medium">{u.name}</span>
              </div>

              {u.name === "Tú" ? (
                <span className="text-gray-500 text-sm italic">Propietario</span>
              ) : (
                <select
                  value={u.permission}
                  onChange={(e) => handlePermissionChange(u.name, e.target.value)}
                  className="border rounded-lg px-2 py-1 text-sm"
                >
                  <option value="lectura">Lectura</option>
                  <option value="editar">Editar</option>
                  <option value="cifrado">Cifrado</option>
                </select>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Guardar cambios
          </button>
        </div>

        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
