import React, { useEffect } from "react";
import { Bot } from "lucide-react";


export default function EphemeralAI({ addLog }) {
useEffect(() => {
addLog("🤖 Inicializando IA efímera en contenedor aislado...");
const timer1 = setTimeout(() => addLog("✅ IA efímera lista (modo demostración)."), 1000);
const timer2 = setTimeout(
() => addLog("🔍 Análisis simulado completado: todo cifrado correctamente."),
3000
);
return () => {
clearTimeout(timer1);
clearTimeout(timer2);
};
}, []);


return (
<div className="w-64 border-r bg-gradient-to-b from-blue-50 to-white p-4 flex flex-col gap-3">
<h3 className="font-semibold text-blue-700 flex items-center gap-2">
<Bot size={18} /> IA efímera
</h3>
<p className="text-sm text-gray-600">
La IA efímera analiza el documento localmente y genera logs de seguridad.
</p>
<button
onClick={() => addLog("🧠 IA: verificación de permisos completada sin anomalías.")}
className="w-full bg-blue-600 text-white rounded-lg py-2 hover:bg-blue-700"
>
Ejecutar análisis
</button>
<div className="mt-auto text-xs text-gray-500">Contenedor aislado activo</div>
</div>
);
}