import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  CheckCircle2,
  ChevronDown,
  Cpu,
  Files,
  Image as ImageIcon,
  Italic,
  Key,
  Link2,
  ListOrdered,
  ListPlus,
  Lock,
  MailCheck,
  Paperclip,
  PhoneCall,
  Redo2,
  Save,
  Settings,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  Trash2,
  Underline,
  Undo2,
  UserCheck,
  Users,
  UserX,
} from "lucide-react";

/**
 * CipherDoc Demo v3 – Selección por línea/página + permisos + caducidad
 * Cambios clave:
 * • Gutter con círculos seleccionables por línea y por página.
 * • Modal de compartir con permisos (read/write) y caducidad de clave (timeout).
 * • Solo se cifra y comparte lo seleccionado (líneas o páginas).
 * • Simulación de expiración: destrucción del doc parcial al vencer.
 */

const DEFAULT_TEXT = `# Documento cifrado de ejemplo\n\nEste es un documento de demostración para CipherDoc AI.\nPuedes escribir, dar formato y seleccionar contenido por líneas o por páginas.\n\n— Párrafo 1: El cifrado se realiza localmente con WebCrypto.\n— Párrafo 2: Cada documento genera su propia llave y un modelo de IA efímero.\n— Párrafo 3: La IA guardiana supervisa los accesos y recursos en tiempo real.\n— Párrafo 4: La infraestructura usa contenedores Docker por tenant/documento.\n\nFin de la demo inicial.`;

const FONTS = [
  { label: "System UI", value: "ui-sans-serif, system-ui" },
  { label: "Inter", value: "Inter, ui-sans-serif, system-ui" },
  { label: "Serif", value: "ui-serif, Georgia, Cambria, \"Times New Roman\"" },
  { label: "Mono", value: "ui-monospace, SFMono-Regular, Menlo, Monaco" },
];

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32];

const REGISTERED_CONTACTS = [
  { id: "u1", name: "Ana Torres", email: "ana@empresa.com", phone: "+34 •••• ••321", cert: "válido" },
  { id: "u2", name: "Luis Pérez", email: "luis@empresa.com", phone: "+34 •••• ••654", cert: "válido" },
  { id: "u3", name: "Invitado QA", email: "qa@labs.io", phone: "+34 •••• ••987", cert: "expira pronto" },
];

// --- WebCrypto helpers ---
async function generateKey() {
  const key = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  return key;
}

function ab2hex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
function hex2ab(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  return bytes;
}

async function encryptData(key, data) {
  const encoded = new TextEncoder().encode(data);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  return { encrypted: ab2hex(encrypted), iv: ab2hex(iv) };
}
async function decryptData(key, encryptedData, iv) {
  const encryptedBuffer = hex2ab(encryptedData);
  const ivBuffer = hex2ab(iv);
  const decrypted = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv: ivBuffer }, key, encryptedBuffer);
  return new TextDecoder().decode(decrypted);
}

async function mockDecryptData(keyHex, ivHex, encryptedContent) {
  const key = await window.crypto.subtle.importKey(
    "jwk",
    { k: keyHex, alg: "A256GCM", ext: true, key_ops: ["encrypt", "decrypt"], kty: "oct" },
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
  return decryptData(key, encryptedContent, ivHex);
}

function splitKeyDualChannel(hexKey) {
  const mid = Math.ceil(hexKey.length / 2);
  return { email: hexKey.slice(0, mid), sms: hexKey.slice(mid) };
}

export default function CipherDocDemoV3() {
  const [status, setStatus] = useState("idle");
  const [isOwner] = useState(true);
  const [restricted, setRestricted] = useState(false);
  const [encryptionKey, setEncryptionKey] = useState(null);
  const [editorHtml, setEditorHtml] = useState(escapeHtml(DEFAULT_TEXT).replaceAll("\n", "<br>"));
  const [font, setFont] = useState(FONTS[0].value);
  const [fontSize, setFontSize] = useState(16);
  const [attachments, setAttachments] = useState([]);
  const [aiMessages, setAiMessages] = useState([
    { role: "assistant", text: "Hola, soy tu IA efímera en modo aislado. Puedo ayudarte con el documento, formatos o políticas de acceso." },
  ]);
  const [chatInput, setChatInput] = useState("");

  const [selectionMode, setSelectionMode] = useState("line"); // 'line' | 'page'
  const [pageSize, setPageSize] = useState(18);
  const [selectedLines, setSelectedLines] = useState(new Set());
  const [selectedPages, setSelectedPages] = useState(new Set());

  const [shareSelectionOpen, setShareSelectionOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState(REGISTERED_CONTACTS[0].id);
  const [shareOptions, setShareOptions] = useState({ permission: "read", timeout: 60 }); // minutos; 0 = sin límite
  const [partialDoc, setPartialDoc] = useState(null);
  const timeoutRef = useRef(null);

  const [activeUsers] = useState([
    { id: "owner", name: "Tú (propietario)", role: "owner", last: "ahora" },
    { id: "ana", name: "Ana Torres", role: "editor", last: "hace 1 min" },
    { id: "luis", name: "Luis Pérez", role: "lector", last: "en vivo" },
  ]);

  const [logs, setLogs] = useState(["[00:01] Sistema iniciado…"]);
  const appendLog = (line) => setLogs((prev) => [...prev, timestamp() + " " + line]);

  const editorRef = useRef(null);

  const activateAI = async () => {
    setStatus("active");
    appendLog(`[info] Inicializando entorno de IA efímero...`);
    try {
      const newKey = await generateKey();
      setEncryptionKey(newKey);
      appendLog(`[seguridad] Clave de cifrado única generada localmente.`);
      appendLog(`[ia] Modelo LLAMA cuantizado en sandbox. Estado: Operativo.`);
      setStatus("secure");
    } catch (e) {
      appendLog(`[error] Fallo al generar clave o inicializar IA: ${e.message}`);
      setStatus("idle");
    }
  };

  // Normalización de líneas y páginas a partir del HTML editable
  const lines = useMemo(() => {
    const tmp = editorHtml
      .replaceAll("<div>", "\n")
      .replaceAll("</div>", "")
      .replaceAll("<br>", "\n")
      .replace(/<[^>]+>/g, "")
      .split("\n");
    return tmp.map((t) => t.replace(/&nbsp;/g, " "));
  }, [editorHtml]);

  const pages = useMemo(() => {
    const out = [];
    for (let i = 0; i < lines.length; i += pageSize) {
      out.push({ index: out.length, start: i, end: Math.min(i + pageSize, lines.length) });
    }
    return out;
  }, [lines, pageSize]);

  const applyCmd = (cmd, value = null) => {
    document.execCommand(cmd, false, value);
    syncEditorHtml();
  };
  const syncEditorHtml = () => {
    if (!editorRef.current) return;
    setEditorHtml(editorRef.current.innerHTML);
  };
  const onAttach = (e) => {
    const files = Array.from(e.target.files || []);
    const mapped = files.map((f) => ({ name: f.name, size: f.size }));
    setAttachments((prev) => [...prev, ...mapped]);
  };

  // Selección granular
  const toggleLine = (idx) => {
    const next = new Set(selectedLines);
    next.has(idx) ? next.delete(idx) : next.add(idx);
    setSelectedLines(next);
  };
  const togglePage = (p) => {
    const next = new Set(selectedPages);
    next.has(p.index) ? next.delete(p.index) : next.add(p.index);
    setSelectedPages(next);
  };

  const extractSelectedText = () => {
    if (selectionMode === "line") {
      return lines.map((t, i) => (selectedLines.has(i) ? t : null)).filter(Boolean).join("\n");
    }
    const ranges = pages.filter((p) => selectedPages.has(p.index));
    const chunks = ranges.map((p) => lines.slice(p.start, p.end).join("\n"));
    return chunks.join("\n");
  };

  const generatePartialDoc = async () => {
    const content = extractSelectedText();
    if (!content.trim() || !encryptionKey) return;

    appendLog(`[info] Cifrando documento parcial (modo: ${selectionMode})...`);
    const { encrypted, iv } = await encryptData(encryptionKey, content);
    appendLog(`[seguridad] Documento parcial cifrado. IV generado.`);

    const keyJwk = await window.crypto.subtle.exportKey("jwk", encryptionKey);
    const keyHex = keyJwk.k;
    const parts = splitKeyDualChannel(keyHex);
    const id = "docp-" + Math.random().toString(36).slice(2, 8);
    const target = REGISTERED_CONTACTS.find((c) => c.id === shareTarget);

    // Para la demo, desciframos para mostrar vista previa (el backend real NO vería el contenido)
    const decryptedContent = await mockDecryptData(keyHex, iv, encrypted);

    const payload = {
      id,
      encrypted,
      iv,
      content: decryptedContent,
      key: keyHex,
      parts,
      target,
      permission: shareOptions.permission, // 'read' | 'write'
      timeoutMinutes: shareOptions.timeout, // 0 => sin caducidad
      selection: selectionMode === "line" ? { type: "lines", indices: Array.from(selectedLines) } : { type: "pages", indices: Array.from(selectedPages) },
    };

    setPartialDoc(payload);
    setShareSelectionOpen(true);

    setAiMessages((prev) => [
      ...prev,
      { role: "assistant", text: `Validando certificado digital de ${target.name}… ✔︎ correcto.` },
      { role: "assistant", text: `Se ha generado un documento parcial cifrado (${id}).` },
      { role: "assistant", text: `Fragmentos de clave enviados: correo → ${target.email} | SMS → ${target.phone}` },
      { role: "assistant", text: `Permisos: ${shareOptions.permission === 'read' ? 'Solo lectura' : 'Lectura y escritura'} • Caducidad: ${shareOptions.timeout > 0 ? shareOptions.timeout + ' min' : 'sin límite'}` },
    ]);
    appendLog(`[compartir] Doc parcial ${id} cifrado (AES-256). Certificado de ${target.name} verificado.`);
    appendLog(`[compartir] Key fragmentada enviada por doble canal. Permisos=${payload.permission}. Timeout=${payload.timeoutMinutes}m`);

    // Programar expiración si aplica
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (shareOptions.timeout > 0) {
      timeoutRef.current = setTimeout(() => {
        setPartialDoc((prev) => {
          if (!prev) return prev;
          appendLog(`[expiración] Clave expirada para ${prev.id}. Documento parcial destruido.`);
          setShareSelectionOpen(false);
          return null;
        });
      }, shareOptions.timeout * 60 * 1000);
    }
  };

  const guardAlertAccess = (who = "Desconocido") => {
    const alertId = "acc-" + Math.random().toString(36).slice(2, 6);
    setAiMessages((prev) => [...prev, { role: "assistant", text: `ALERTA (${alertId}): ${who} intenta acceder al documento. Confirmar autorización? (Sí/No)` }]);
    appendLog(`[alerta] Intento de acceso por ${who}. Esperando confirmación del propietario.`);
  };

  useEffect(() => {
    if (status !== "secure") return;
    const t = setTimeout(() => { guardAlertAccess("Invitado QA"); }, 2500);
    return () => clearTimeout(t);
  }, [status]);

  const confirmAccess = (who, allow) => {
    setAiMessages((prev) => [...prev, { role: "assistant", text: allow ? `Acceso confirmado para ${who}.` : `Acceso denegado para ${who}.` }]);
    appendLog(`[alerta] ${allow ? "Autorizado" : "Bloqueado"}: ${who}.`);
  };

  useEffect(() => {
    try { selfTests({ extractSelectedText, splitKeyDualChannel, timestamp }); } catch (e) { console.error(e); }
  }, []);

  // Helpers UI: render gutter (líneas/páginas)
  const Gutter = () => (
    <div className="absolute left-0 top-0 bottom-0 w-10 border-r bg-white/70 backdrop-blur-sm rounded-l-2xl flex flex-col overflow-auto">
      {/* Páginas */}
      {selectionMode === 'page' && (
        <div className="p-1">
          {pages.map((p) => (
            <div key={p.index} className="flex items-center gap-2 py-1">
              <button
                aria-label={`Seleccionar página ${p.index + 1}`}
                onClick={() => togglePage(p)}
                className={`mx-auto h-5 w-5 rounded-full border ${selectedPages.has(p.index) ? 'bg-[#0066FF] border-[#0066FF]' : 'border-gray-300'} transition`}
                title={`Pág. ${p.index + 1}`}
              />
            </div>
          ))}
        </div>
      )}
      {/* Líneas */}
      {selectionMode === 'line' && (
        <div className="p-1">
          {lines.map((_, i) => (
            <div key={i} className="h-[1.6rem] flex items-center">
              <button
                aria-label={`Seleccionar línea ${i + 1}`}
                onClick={() => toggleLine(i)}
                className={`mx-auto h-3.5 w-3.5 rounded-full border ${selectedLines.has(i) ? 'bg-[#0066FF] border-[#0066FF]' : 'border-gray-300'} transition`}
                title={`Línea ${i + 1}`}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-white flex flex-col items-center p-4 md:p-6 space-y-4">
      <header className="w-full max-w-7xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Key className="w-6 h-6 text-[#0066FF]" />
          <h1 className="text-2xl md:text-3xl font-bold text-[#0066FF] tracking-tight">
            CipherDoc<span className="text-gray-800"> AI</span>
          </h1>
          <Badge variant="secondary" className="rounded-full">Demo v3</Badge>
        </div>
        <div className="flex items-center gap-3">
          {isOwner && (
            <Button variant={restricted ? "default" : "outline"} className="gap-2" onClick={() => setRestricted((v) => !v)}>
              <Lock className="w-4 h-4" /> {restricted ? "Acceso restringido" : "Acceso abierto"}
            </Button>
          )}
          <Button onClick={activateAI} className="bg-[#0066FF] hover:bg-[#0055cc] text-white gap-2" disabled={status !== 'idle'}>
            {status === "idle" && (<><Sparkles className="w-4 h-4" /> Iniciar IA</>)}
            {status === "active" && "Inicializando…"}
            {status === "secure" && (<>IA Activa <CheckCircle2 className="w-4 h-4" /></>)}
          </Button>
        </div>
      </header>

      <main className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="space-y-4">
          <Card className="shadow-md border-[#d0d7ff]">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <Users className="text-[#0066FF] w-5 h-5" /> Usuarios activos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activeUsers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between border rounded-xl px-3 py-2">
                    <div>
                      <div className="text-sm font-medium">{u.name}</div>
                      <div className="text-xs text-gray-500">{u.role} • {u.last}</div>
                    </div>
                    {isOwner && u.id !== "owner" && (
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => confirmAccess(u.name, true)}>
                          <UserCheck className="w-4 h-4" /> Permitir
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => confirmAccess(u.name, false)}>
                          <UserX className="w-4 h-4" /> Bloquear
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <Separator className="my-3" />
              <div className="text-xs text-gray-500 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#0066FF]" /> Las nuevas solicitudes requieren confirmación del propietario.
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => guardAlertAccess("Solicitante externo")}>Simular intento de acceso</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="lg:col-span-2 shadow-lg border-[#d0d7ff]">
          <CardHeader className="space-y-3">
            <CardTitle className="flex items-center justify-between">
              <span className="text-gray-800">Documento cifrado</span>
              <div className="flex items-center gap-2 text-[#0066FF]">
                <Key className="w-5 h-5" />
                <span className="text-sm font-medium">Llave generada</span>
              </div>
            </CardTitle>

            <div className="flex flex-wrap items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2"><Files className="w-4 h-4" />Fuente <ChevronDown className="w-4 h-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuLabel>Fuente</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {FONTS.map((f) => (
                    <DropdownMenuItem key={f.value} onClick={() => setFont(f.value)}>{f.label}</DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">Tamaño <ChevronDown className="w-4 h-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuLabel>Tamaño</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {FONT_SIZES.map((s) => (
                    <DropdownMenuItem key={s} onClick={() => setFontSize(s)}>{s}px</DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Separator orientation="vertical" className="h-8" />
              <Toggle aria-label="Bold" onPressedChange={() => applyCmd("bold")}> <Bold className="w-4 h-4" /> </Toggle>
              <Toggle aria-label="Italic" onPressedChange={() => applyCmd("italic")}> <Italic className="w-4 h-4" /> </Toggle>
              <Toggle aria-label="Underline" onPressedChange={() => applyCmd("underline")}> <Underline className="w-4 h-4" /> </Toggle>
              <Separator orientation="vertical" className="h-8" />
              <Button variant="ghost" size="icon" onClick={() => applyCmd("justifyLeft")}><AlignLeft className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => applyCmd("justifyCenter")}><AlignCenter className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => applyCmd("justifyRight")}><AlignRight className="w-4 h-4" /></Button>
              <Separator orientation="vertical" className="h-8" />
              <Button variant="ghost" size="icon" onClick={() => applyCmd("insertUnorderedList")}><ListPlus className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => applyCmd("insertOrderedList")}><ListOrdered className="w-4 h-4" /></Button>
              <Separator orientation="vertical" className="h-8" />
              <Button variant="ghost" size="icon" onClick={() => document.execCommand("undo")}><Undo2 className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => document.execCommand("redo")}><Redo2 className="w-4 h-4" /></Button>
              <Separator orientation="vertical" className="h-8" />
              <label className="inline-flex items-center gap-2 cursor-pointer text-sm px-3 py-2 border rounded-md bg-white hover:bg-gray-50">
                <Paperclip className="w-4 h-4" /> Adjuntar
                <input type="file" className="hidden" multiple onChange={onAttach} />
              </label>
              <Button variant="ghost" className="gap-2"><ImageIcon className="w-4 h-4" /> Insertar imagen</Button>
              <Button variant="ghost" className="gap-2"><Link2 className="w-4 h-4" /> Insertar enlace</Button>
              <div className="ml-auto flex items-center gap-2">
                <Button variant="outline" className="gap-2"><Save className="w-4 h-4" /> Guardar</Button>
                <Button variant="outline" className="gap-2"><Settings className="w-4 h-4" /> Preferencias</Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline" className="px-3 py-1">Selección para compartir:</Badge>
              <Button
                variant={selectionMode === "line" ? "default" : "outline"}
                size="sm"
                onClick={() => { setSelectionMode("line"); setSelectedPages(new Set()); }}
              >
                Por líneas
              </Button>
              <Button
                variant={selectionMode === "page" ? "default" : "outline"}
                size="sm"
                onClick={() => { setSelectionMode("page"); setSelectedLines(new Set()); }}
              >
                Por páginas
              </Button>
              <div className="flex items-center gap-2 ml-2">
                <span className="text-sm text-gray-500">Líneas por página</span>
                <Input type="number" value={pageSize} onChange={(e) => setPageSize(Math.max(5, Number(e.target.value) || 18))} className="h-8 w-20" />
              </div>
              <div className="ml-auto flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2" disabled={!encryptionKey}>
                      <Share2 className="w-4 h-4" /> Generar doc cifrado
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Contacto destino</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {REGISTERED_CONTACTS.map((c) => (
                      <DropdownMenuItem key={c.id} onClick={() => setShareTarget(c.id)}>
                        <div className="flex items-center justify-between w-full gap-4">
                          <span>{c.name}</span>
                          <span className={`text-xs ${c.cert === 'válido' ? 'text-green-600' : 'text-amber-600'}`}>{c.cert}</span>
                        </div>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={generatePartialDoc}>
                      <Check className="w-4 h-4 mr-2" /> Confirmar y generar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" size="sm" onClick={() => { setSelectedLines(new Set()); setSelectedPages(new Set()); }}>Limpiar selección</Button>
              </div>
            </div>

            {/* Editor con gutter de selección */}
            <div className="relative">
              <Gutter />
              <div
                ref={editorRef}
                className="w-full min-h-[420px] rounded-2xl border border-[#ccd6ff] p-4 pl-14 focus:outline-none shadow-sm"
                style={{ fontFamily: font, fontSize }}
                contentEditable
                suppressContentEditableWarning
                onInput={syncEditorHtml}
                dangerouslySetInnerHTML={{ __html: editorHtml }}
              />
            </div>

            {attachments.length > 0 && (
              <div className="mt-3">
                <div className="text-sm font-medium text-gray-700 mb-1">Adjuntos</div>
                <div className="flex flex-wrap gap-2">
                  {attachments.map((f, i) => (
                    <Badge key={i} variant="secondary" className="gap-2">
                      <Paperclip className="w-3 h-3" /> {f.name}
                      <Trash2 className="w-3 h-3 ml-2 cursor-pointer" onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))} />
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="shadow-md border-[#d0d7ff]">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <ShieldCheck className="text-[#0066FF] w-5 h-5" /> Estado de seguridad
              </CardTitle>
            </CardHeader>
            <CardContent>
              <motion.div
                className="rounded-md border p-3 text-sm"
                animate={{ borderColor: status === "secure" ? "#00c853" : status === "active" ? "#ffab00" : "#e5e7eb" }}
                transition={{ duration: 0.4 }}
              >
                {status === "idle" && "IA inactiva. Cifrado en espera."}
                {status === "active" && "Inicializando cifrado y entorno IA efímero…"}
                {status === "secure" && "Cifrado activo. Modelo LLaMA efímero protegiendo este documento."}
              </motion.div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-center text-xs">
                <Badge variant={status !== 'idle' ? 'default' : 'outline'}>WebCrypto</Badge>
                <Badge variant={status === 'secure' ? 'default' : 'outline'}>LLaMA (aislado)</Badge>
                <Badge variant={'outline'}>S3 segregado</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md border-[#d0d7ff]">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <Cpu className="text-[#0066FF] w-5 h-5" /> IA efímera
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600 space-y-1">
              <p>Modelo: <span className="font-medium text-gray-900">CipherCore‑7B (cuantizado)</span></p>
              <p>Modo: <span className="text-[#0066FF] font-medium">local / aislado</span></p>
              <p>Estado: {status === "secure" ? "Operativo y en sandbox" : status === 'active' ? 'Inicializando' : 'En espera'}</p>
            </CardContent>
          </Card>

          <Card className="shadow-md border-[#d0d7ff]">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <Terminal className="text-[#0066FF] w-5 h-5" /> Logs de seguridad
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs font-mono bg-gray-50 rounded-md p-3 h-48 overflow-y-auto border border-[#e0e7ff]">
              {logs.map((l, i) => (<div key={i}>{l}</div>))}
            </CardContent>
          </Card>

          <Card className="shadow-md border-[#d0d7ff]">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <Sparkles className="text-[#0066FF] w-5 h-5" /> Chat con la IA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64 border rounded-md p-3">
                <div className="space-y-3">
                  {aiMessages.map((m, i) => (
                    <div key={i} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.role === 'assistant' ? 'bg-[#eef3ff] ml-0' : 'bg-gray-100 ml-auto'}`}>
                      {m.text}
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="flex items-center gap-2 mt-3">
                <Textarea value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Pídele algo a la IA sobre tu documento…" className="min-h-[60px]" />
                <div className="flex flex-col gap-2">
                  <Button className="gap-2" onClick={() => {
                    if (!chatInput.trim()) return;
                    setAiMessages((p) => [...p, { role: 'user', text: chatInput }]);
                    setChatInput('');
                    setTimeout(() => setAiMessages((p) => [...p, { role: 'assistant', text: 'He procesado tu solicitud (demo).' }]), 600);
                  }}>
                    Enviar
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={() => setAiMessages([{ role: 'assistant', text: 'Conversación reiniciada.' }])}><Trash2 className="w-4 h-4" /> Limpiar</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Modal de compartir actualizado */}
      {shareSelectionOpen && partialDoc && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Share2 className="w-5 h-5" /> Documento parcial cifrado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-gray-700">
                <p className="mb-1">ID: <span className="font-mono">{partialDoc.id}</span></p>
                <p>Destino: <strong>{partialDoc.target.name}</strong> ({partialDoc.target.email})</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-xl border p-3">
                  <div className="text-xs text-gray-500 mb-1">Permisos</div>
                  <select
                    value={shareOptions.permission}
                    onChange={(e) => setShareOptions((p) => ({ ...p, permission: e.target.value }))}
                    className="w-full border rounded p-2 text-sm"
                  >
                    <option value="read">Solo lectura</option>
                    <option value="write">Lectura y escritura</option>
                  </select>
                </div>
                <div className="rounded-xl border p-3">
                  <div className="text-xs text-gray-500 mb-1">Caducidad de la clave</div>
                  <select
                    value={shareOptions.timeout}
                    onChange={(e) => setShareOptions((p) => ({ ...p, timeout: Number(e.target.value) }))}
                    className="w-full border rounded p-2 text-sm"
                  >
                    <option value={5}>5 minutos</option>
                    <option value={60}>1 hora</option>
                    <option value={1440}>24 horas</option>
                    <option value={0}>Sin límite</option>
                  </select>
                </div>
                <div className="rounded-xl border p-3">
                  <div className="text-xs text-gray-500 mb-1">Selección</div>
                  {partialDoc.selection.type === 'lines' ? (
                    <div className="text-xs">Líneas: {partialDoc.selection.indices.length}</div>
                  ) : (
                    <div className="text-xs">Páginas: {partialDoc.selection.indices.length}</div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border p-3 bg-[#f8fbff]">
                <div className="flex items-center gap-2 text-[#0066FF] text-sm mb-1"><ShieldCheck className="w-4 h-4" /> Verificación por IA</div>
                <ul className="text-sm text-gray-700 list-disc ml-6 space-y-1">
                  <li><strong>Certificado digital correcto</strong> para {partialDoc.target.name}.</li>
                  <li>Integridad de la clave confirmada y sellada en el contenedor.</li>
                  <li>Registros de auditoría cifrados en almacén segregado.</li>
                </ul>
              </div>

              <div className="rounded-xl border p-3">
                <div className="text-xs text-gray-500 mb-1">Contenido del documento parcial (vista previa):</div>
                <ScrollArea className="h-40 border rounded-md p-2 bg-gray-50">
                  <pre className="text-xs whitespace-pre-wrap">{partialDoc.content}</pre>
                </ScrollArea>
              </div>

              <div className="rounded-xl border p-3">
                <div className="text-xs text-gray-500 mb-1">Contenido cifrado enviado al servidor:</div>
                <ScrollArea className="h-20 border rounded-md p-2 bg-gray-50">
                  <pre className="text-xs whitespace-pre-wrap font-mono break-all">{partialDoc.encrypted}</pre>
                </ScrollArea>
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" onClick={() => setShareSelectionOpen(false)}>Cerrar</Button>
                <Button className="gap-2" onClick={() => setShareSelectionOpen(false)}><Share2 className="w-4 h-4" /> Finalizar compartir</Button>
              </div>

              {shareOptions.timeout > 0 && (
                <div className="text-xs text-amber-600">Este documento parcial expirará en {shareOptions.timeout} minutos.</div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <footer className="w-full max-w-7xl text-xs text-gray-400 py-6">
        <div className="flex items-center gap-2">
          <Cpu className="w-3 h-3" /> Demo: modelo efímero destruido al cerrar el documento.
        </div>
      </footer>
    </div>
  );
}

// Utils
function escapeHtml(str) {
  return str.replace(/[&<>"]+/g, function (m) {
    switch (m) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return m;
    }
  });
}

function timestamp() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `[${hh}:${mm}:${ss}]`;
}

// --- Runtime self-tests (no cambian la UI) ---
function selfTests({ extractSelectedText, splitKeyDualChannel, timestamp }) {
  try {
    const t = timestamp();
    console.assert(/^\[[0-2]\d:[0-5]\d:[0-5]\d\]$/.test(t), "timestamp() debe devolver [hh:mm:ss]");

    const k = "aabbccddeeff00112233445566778899";
    const parts = splitKeyDualChannel(k);
    console.assert(parts.email.length + parts.sms.length === k.length, "splitKeyDualChannel conserva longitud");
    console.assert(parts.email + parts.sms === k, "splitKeyDualChannel concatena a la clave original");

    const mock = extractSelectedText?.();
    console.assert(typeof mock === "string", "extractSelectedText debe devolver string");

    console.debug("[self-tests] OK");
  } catch (err) {
    console.warn("[self-tests] Error", err);
  }
}
