import React from "react";
import { Bold, Italic, Plus, FilePlus2 } from "lucide-react";


export default function EditorToolbar({ lines, selectedLines, setLines, addLog }) {
    const applyWrap = (symbol) => {
        if (!selectedLines.length) {
            addLog("⚠️ No hay líneas seleccionadas para aplicar formato.");
            return;
        }
        setLines((prev) =>
            prev.map((l) =>
                selectedLines.includes(l.id)
                ? { ...l, text: `${symbol}${l.text}${symbol}` }
                : l
            )
        );
        addLog(`📝 Se aplicó formato '${symbol}' a ${selectedLines.length} líneas.`);
    };


    const addNewLine = () => {
        const maxId = Math.max(...lines.map((l) => l.id), 0);
        const newLine = { id: maxId + 1, text: "Nueva línea (demo)" };
        setLines((prev) => [...prev, newLine]);
        addLog("➕ Nueva línea agregada.");
    };


    const addNewPage = () => {
        const maxId = Math.max(...lines.map((l) => l.id), 0);
        const newPage = { id: maxId + 1, text: "--- PAGE BREAK ---" };
        setLines((prev) => [...prev, newPage]);
        addLog("📄 Nueva página añadida.");
    };


    return (
        <div className="border-b bg-white flex gap-3 p-2 items-center text-sm">
            {/*<button onClick={() => applyWrap("**")} className="toolbar-btn">
                <Bold size={16} /> Negrita
            </button>
            <button onClick={() => applyWrap("*")} className="toolbar-btn">
                <Italic size={16} /> Cursiva
            </button>*/}
            <div className="mx-2 h-6 w-px bg-gray-200" />
            <button onClick={addNewLine} className="toolbar-btn">
                <Plus size={16} /> Nueva línea
            </button>
            <button onClick={addNewPage} className="toolbar-btn">
                <FilePlus2 size={16} /> Nueva página
            </button>
        </div>
    );
}


const style = document.createElement('style');
style.innerHTML = `
.toolbar-btn{display:inline-flex;align-items:center;gap:.5rem;padding:.4rem .7rem;border-radius:.5rem;border:1px solid #e5e7eb;background:white;font-size:.875rem;transition:all .2s}
.toolbar-btn:hover{background:#f8fafc}
`;
if (typeof document !== 'undefined' && !document.getElementById('toolbar-style')){
    style.id = 'toolbar-style';
    document.head.appendChild(style);
}