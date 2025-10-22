import React, { useState } from "react";

export default function LineBlock({
  id,
  text,
  editable,
  selected,
  onSelect,
  onChange,
  canView = true,
}) {
  const [hovered, setHovered] = useState(false);

  if (!canView) {
    return (
      <div className="flex items-start text-gray-400 italic py-1">
        <span className="ml-6">[Contenido cifrado 🔒]</span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-start group transition-all py-1 ${
        hovered ? "bg-gray-50" : ""
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Botón lateral de selección */}
      <button
        onClick={() => onSelect(id)}
        className={`mt-1 mr-3 w-5 h-5 rounded-full text-xs flex items-center justify-center transition ${
          selected
            ? "bg-blue-600 text-white"
            : "bg-gray-200 hover:bg-gray-300 text-gray-700"
        }`}
        title={`Línea ${id + 1}`}
      >
        {selected ? "✔" : "+"}
      </button>

      {/* Campo editable */}
      <textarea
        value={text}
        onChange={(e) => onChange(id, e.target.value)}
        readOnly={!editable}
        rows={1}
        className={`flex-1 bg-transparent resize-none border-none focus:outline-none ${
          editable ? "text-gray-800" : "text-gray-600"
        }`}
      />
    </div>
  );
}
