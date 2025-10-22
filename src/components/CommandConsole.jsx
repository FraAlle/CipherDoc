import React from "react";
import { Terminal } from "lucide-react";


export default function CommandConsole({ logs, setLogs }) {
const exportLogs = () => {
const blob = new Blob([logs.join("\n")], { type: "text/plain;charset=utf-8" });
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = `logs_${Date.now()}.txt`;
a.click();
URL.revokeObjectURL(url);
};


return (
<div className="w-72 border-l bg-[#0b1020] text-[#d7e3ff] flex flex-col">
<div className="p-3 border-b border-gray-700 flex items-center justify-between">
<h3 className="font-semibold flex items-center gap-2 text-blue-300">
<Terminal size={16} /> Consola
</h3>
<div className="flex gap-1">
<button onClick={() => setLogs([])} className="text-xs px-2 py-1 bg-blue-800/30 rounded-md">
Limpiar
</button>
<button onClick={exportLogs} className="text-xs px-2 py-1 bg-blue-800/30 rounded-md">
Exportar
</button>
</div>
</div>
<div className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-1">
{logs.length === 0 ? (
<div className="opacity-60">(sin eventos)</div>
) : (
logs.map((l, i) => <div key={i}>{l}</div>)
)}
</div>
</div>
);
}