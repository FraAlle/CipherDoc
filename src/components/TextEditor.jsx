import React, { useState, useEffect } from "react";
import LineBlock from "./LineBlock";
import EditorToolbar from "./EditorToolbar";
import EphemeralAI from "./EphemeralAI";
import CommandConsole from "./CommandConsole";
import ShareMenu from "./ShareMenu";

const USER_COLORS = ["#2563eb", "#16a34a", "#9333ea"];

export default function TextEditor() {
  // Estado base
  const [users, setUsers] = useState([
    { name: "Tú", permission: "total", color: USER_COLORS[0] },
    { name: "Ana Torres", permission: "cifrado", color: USER_COLORS[1] },
    { name: "Luis Pérez", permission: "cifrado", color: USER_COLORS[2] },
  ]);

  const [viewAs, setViewAs] = useState("Tú");
  const [lines, setLines] = useState([
    { id: 0, text: "# Documento cifrado (demo)" },
    { id: 1, text: "Selecciona líneas o páginas para compartir con permisos granulares." },
    { id: 2, text: "Pulsa Compartir total para enviar el documento completo." },
    { id: 3, text: "O usa Compartición selectiva para compartir solo fragmentos." },
    { id: 4, text: "Usa Vista como para ver lo que cada persona puede leer." },
    { id: 5, text: "Página 2 — Ejemplo extendido con texto adicional y párrafos largos." },
    { id: 6, text: "Cada línea se trata como bloque independiente editable o cifrado." },
    { id: 7, text: "Página 3 — Simulación de una tercera sección con visibilidad selectiva." },
    { id: 8, text: "Fin de documento." },
  ]);

  const [selectedLines, setSelectedLines] = useState([]);
  const [selectedPages, setSelectedPages] = useState([]);
  const [sharedSegments, setSharedSegments] = useState([]);
  const [logs, setLogs] = useState([]);
  const [showAI, setShowAI] = useState(false);
  const [showConsole, setShowConsole] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareType, setShareType] = useState("total");

  // Paginación
  const PAGE_SIZE = 3;
  const pages = [];
  for (let i = 0; i < lines.length; i += PAGE_SIZE) {
    pages.push(lines.slice(i, i + PAGE_SIZE));
  }

  // Log
  const addLog = (msg) => {
    const now = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${now}] ${msg}`]);
  };

  // Selección
  const toggleLine = (id) =>
    setSelectedLines((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const togglePage = (p) =>
    setSelectedPages((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );

  const updateLine = (id, newText) =>
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, text: newText } : l)));

  // Compartir
  const openShare = (type) => {
    if (type === "selectiva" && !selectedLines.length && !selectedPages.length) {
      alert("Selecciona al menos una línea o página antes de compartir.");
      return;
    }
    setShareType(type);
    setShareOpen(true);
  };

  const handleShareSave = (nextUsers) => {
    const sharedNow = nextUsers.filter((u) => u.name !== "Tú");

    // Limpia permisos anteriores de esos usuarios
    let updatedShares = sharedSegments.filter(
      (seg) => !sharedNow.some((u) => u.name === seg.user)
    );

    sharedNow.forEach((user) => {
      let newShare = null;
      if (shareType === "total") {
        newShare = { user: user.name, type: "total" };
      } else if (selectedLines.length > 0) {
        newShare = { user: user.name, type: "lines", indexes: [...selectedLines] };
      } else if (selectedPages.length > 0) {
        newShare = { user: user.name, type: "pages", indexes: [...selectedPages] };
      }
      if (newShare) updatedShares.push(newShare);
    });

    setSharedSegments(updatedShares);
    setUsers(nextUsers);

    addLog(
      `📤 Compartición ${shareType.toUpperCase()} realizada para ${sharedNow
        .map((u) => u.name)
        .join(", ")}.`
    );

    setShareOpen(false);
  };

  // 🔒 Permisos visuales (corregido)
  const canViewLine = (id) => {
    if (viewAs === "Tú") return true;

    const user = users.find((u) => u.name === viewAs);
    if (!user) return false;

    // Permisos base
    if (["total", "editar"].includes(user.permission)) return true;

    // Si es "cifrado" → solo lo que fue compartido explícitamente
    const userShares = sharedSegments.filter((s) => s.user === viewAs);
    if (!userShares.length) return false;

    // 🔍 Solo mostrar lo compartido (no el resto)
    let granted = false;

    for (const s of userShares) {
      if (s.type === "total") granted = true;

      if (s.type === "lines" && s.indexes.includes(id)) granted = true;

      if (
        s.type === "pages" &&
        s.indexes.some((p) => id >= p * PAGE_SIZE && id < (p + 1) * PAGE_SIZE)
      )
        granted = true;
    }

    return granted;
  };

  // ✏️ Permisos de edición
  const canEditLine = (id) => {
    if (viewAs === "Tú") return true;
    const user = users.find((u) => u.name === viewAs);
    if (!user) return false;

    // Solo total o editar base
    if (!["total", "editar"].includes(user.permission)) return false;

    // Pero solo sobre lo que puede ver
    return canViewLine(id);
  };

  // Debug opcional
  useEffect(() => {
    console.log("🧩 sharedSegments:", sharedSegments);
  }, [sharedSegments]);

  // Render
  return (
    <div className="text-editor">
      {showAI && <EphemeralAI addLog={addLog} />}

      <div className="editor-container">
        {/* Header */}
        <div className="text-editor-header">
          <div className="text-editor-users">
            {users.map((u) => (
              <span
                key={u.name}
                className="px-3 py-1 rounded-full text-sm font-medium"
                style={{ backgroundColor: `${u.color}20`, color: u.color }}
              >
                {u.name} — {u.permission}
              </span>
            ))}
          </div>

          <div className="text-editor-controls">
            <select
              value={viewAs}
              onChange={(e) => setViewAs(e.target.value)}
              className="border rounded-lg px-2 py-1 text-sm"
            >
              {users.map((u) => (
                <option key={u.name} value={u.name}>
                  Ver como: {u.name}
                </option>
              ))}
            </select>

            <button onClick={() => openShare("total")} className="btn-blue">
              Compartir total
            </button>

            <button onClick={() => openShare("selectiva")} className="btn-dark">
              Compartición selectiva
            </button>

            <button onClick={() => setShowAI((s) => !s)} className="btn-blue">
              {showAI ? "Cerrar IA" : "IA efímera"}
            </button>

            <button onClick={() => setShowConsole((s) => !s)} className="btn-gray">
              {showConsole ? "Ocultar consola" : "Mostrar consola"}
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <EditorToolbar
          lines={lines}
          selectedLines={selectedLines}
          setLines={setLines}
          addLog={addLog}
        />

        {/* Selector de páginas */}
        <div className="page-selector">
          <span className="font-medium text-gray-700">Páginas:</span>
          {pages.map((_, p) => (
            <button
              key={p}
              onClick={() => togglePage(p)}
              title={`Página ${p + 1}`}
              style={{
                background: selectedPages.includes(p) ? "#2563eb" : "#fff",
                color: selectedPages.includes(p) ? "#fff" : "#1e293b",
              }}
            >
              {p + 1}
            </button>
          ))}
        </div>

        {/* Documento */}
        <div className="editor-pages">
          {pages.map((pageLines, p) => (
            <div key={p} className="editor-page">
              <h3>Página {p + 1}</h3>
              {pageLines.map((line) => (
                <LineBlock
                  key={line.id}
                  id={line.id}
                  text={line.text}
                  editable={canEditLine(line.id)}
                  selected={selectedLines.includes(line.id)}
                  canView={canViewLine(line.id)}
                  onSelect={toggleLine}
                  onChange={updateLine}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {showConsole && <CommandConsole logs={logs} setLogs={setLogs} />}

      {shareOpen && (
        <ShareMenu
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          users={users}
          mode={shareType}
          selectedLines={selectedLines}
          selectedPages={selectedPages}
          onSave={handleShareSave}
        />
      )}
    </div>
  );
}
