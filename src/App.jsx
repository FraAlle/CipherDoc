import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
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
} from 'lucide-react';

// ---------- Texto y opciones ----------
const DEFAULT_TEXT = `# Documento cifrado de ejemplo

Este es un documento de demostración para CipherDoc AI.
Puedes escribir, dar formato y seleccionar contenido por líneas o por páginas.

— Párrafo 1: El cifrado se realiza localmente con WebCrypto.
— Párrafo 2: Cada documento genera su propia llave y un modelo de IA efímero.
— Párrafo 3: La IA guardiana supervisa los accesos y recursos en tiempo real.
— Párrafo 4: La infraestructura usa contenedores Docker por tenant/documento.

Fin de la demo inicial.`;

const FONTS = [
  { label: 'System UI', value: 'ui-sans-serif, system-ui' },
  { label: 'Inter', value: 'Inter, ui-sans-serif, system-ui' },
  { label: 'Serif', value: 'ui-serif, Georgia, Cambria, "Times New Roman"' },
  { label: 'Mono', value: 'ui-monospace, SFMono-Regular, Menlo, Monaco' },
];

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32];

const REGISTERED_CONTACTS = [
  {
    id: 'u1',
    name: 'Ana Torres',
    email: 'ana@empresa.com',
    phone: '+34 **** **321',
    cert: 'válido',
  },
  {
    id: 'u2',
    name: 'Luis Pérez',
    email: 'luis@empresa.com',
    phone: '+34 **** **654',
    cert: 'válido',
  },
  {
    id: 'u3',
    name: 'Invitado QA',
    email: 'qa@labs.io',
    phone: '+34 **** **987',
    cert: 'expira pronto',
  },
];

// ---------- WebCrypto helpers ----------
async function generateKey() {
  const key = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  return key;
}

function ab2hex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hex2ab(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2)
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  return bytes;
}

async function encryptData(key, data) {
  const encoded = new TextEncoder().encode(data);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );
  return { encrypted: ab2hex(encrypted), iv: ab2hex(iv) };
}

async function decryptData(key, encryptedData, iv) {
  const encryptedBuffer = hex2ab(encryptedData);
  const ivBuffer = hex2ab(iv);
  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBuffer },
    key,
    encryptedBuffer
  );
  return new TextDecoder().decode(decrypted);
}

async function mockDecryptData(keyHex, ivHex, encryptedContent) {
  const key = await window.crypto.subtle.importKey(
    'jwk',
    {
      k: keyHex,
      alg: 'A256GCM',
      ext: true,
      key_ops: ['encrypt', 'decrypt'],
      kty: 'oct',
    },
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
  return decryptData(key, encryptedContent, ivHex);
}

function splitKeyDualChannel(hexKey) {
  const mid = Math.ceil(hexKey.length / 2);
  return { email: hexKey.slice(0, mid), sms: hexKey.slice(mid) };
}

function timestamp() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `[${hh}:${mm}:${ss}]`;
}

// ---------- App ----------
export default function App() {
  const [status, setStatus] = useState('idle');
  const [isOwner] = useState(true);
  const [restricted, setRestricted] = useState(false);
  const [encryptionKey, setEncryptionKey] = useState(null);
  const [editorHtml, setEditorHtml] = useState(
    DEFAULT_TEXT.replaceAll('\n', '<br/>')
  );
  const [font, setFont] = useState(FONTS[0].value);
  const [fontSize, setFontSize] = useState(16);
  const [attachments, setAttachments] = useState([]);
  const [aiMessages, setAiMessages] = useState([
    {
      role: 'assistant',
      text: 'Hola, soy tu IA efímera en modo aislado. Puedo ayudarte con el documento, formatos o políticas de acceso.',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [selectionMode, setSelectionMode] = useState('line'); // 'line' | 'page'
  const [pageSize, setPageSize] = useState(18);
  const [selectedLines, setSelectedLines] = useState(new Set());
  const [selectedPages, setSelectedPages] = useState(new Set());
  const [shareSelectionOpen, setShareSelectionOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState(REGISTERED_CONTACTS[0].id);
  const [shareOptions, setShareOptions] = useState({
    permission: 'read',
    timeout: 60,
  }); // minutos; 0 = sin límite
  const [partialDoc, setPartialDoc] = useState(null);
  const timeoutRef = useRef(null);
  const [activeUsers] = useState([
    { id: 'owner', name: 'Tú (propietario)', role: 'owner', last: 'ahora' },
    { id: 'ana', name: 'Ana Torres', role: 'editor', last: 'hace 1 min' },
    { id: 'luis', name: 'Luis Pérez', role: 'lector', last: 'en vivo' },
  ]);
  const [logs, setLogs] = useState(['[00:01] Sistema iniciado…']);
  const editorRef = useRef(null);

  const appendLog = (line) =>
    setLogs((prev) => [...prev, timestamp() + ' ' + line]);

  const activateAI = async () => {
    setStatus('active');
    appendLog(`[info] Inicializando entorno de IA efímero...`);
    try {
      const newKey = await generateKey();
      setEncryptionKey(newKey);
      appendLog(`[seguridad] Clave de cifrado única generada localmente.`);
      appendLog(`[ia] Modelo LLAMA cuantizado en sandbox. Estado: Operativo.`);
      setStatus('secure');
    } catch (e) {
      appendLog(
        `[error] Fallo al generar clave o inicializar IA: ${e.message}`
      );
      setStatus('idle');
    }
  };

  const lines = useMemo(() => {
    const tmp = editorHtml
      .replaceAll('<br/>', '\n')
      .replace(/<[^>]+>/g, '')
      .split('\n');
    return tmp.map((t) => t.replace(/  /g, ' '));
  }, [editorHtml]);

  const pages = useMemo(() => {
    const out = [];
    for (let i = 0; i < lines.length; i += pageSize) {
      out.push({
        index: out.length,
        start: i,
        end: Math.min(i + pageSize, lines.length),
      });
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
    if (selectionMode === 'line') {
      return lines
        .map((t, i) => (selectedLines.has(i) ? t : null))
        .filter(Boolean)
        .join('\n');
    }
    const ranges = pages.filter((p) => selectedPages.has(p.index));
    const chunks = ranges.map((p) => lines.slice(p.start, p.end).join('\n'));
    return chunks.join('\n');
  };

  const generatePartialDoc = async () => {
    const content = extractSelectedText();
    if (!content.trim() || !encryptionKey) return;
    appendLog(`[info] Cifrando documento parcial (modo: ${selectionMode})...`);
    const { encrypted, iv } = await encryptData(encryptionKey, content);
    appendLog(`[seguridad] Documento parcial cifrado. IV generado.`);
    const keyJwk = await window.crypto.subtle.exportKey('jwk', encryptionKey);
    const keyHex = keyJwk.k;
    const parts = splitKeyDualChannel(keyHex);
    const id = 'docp-' + Math.random().toString(36).slice(2, 8);
    const target = REGISTERED_CONTACTS.find((c) => c.id === shareTarget);

    const decryptedContent = await mockDecryptData(keyHex, iv, encrypted);
    const payload = {
      id,
      encrypted,
      iv,
      content: decryptedContent,
      key: keyHex,
      parts,
      target,
      permission: shareOptions.permission,
      timeoutMinutes: shareOptions.timeout,
      selection:
        selectionMode === 'line'
          ? { type: 'lines', indices: Array.from(selectedLines) }
          : { type: 'pages', indices: Array.from(selectedPages) },
    };
    setPartialDoc(payload);
    setShareSelectionOpen(true);
    setAiMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        text: `Validando certificado digital de ${target.name}… ✓ correcto.`,
      },
      {
        role: 'assistant',
        text: `Se ha generado un documento parcial cifrado (${id}).`,
      },
      {
        role: 'assistant',
        text: `Fragmentos de clave enviados: correo → ${target.email} | SMS → ${target.phone}`,
      },
      {
        role: 'assistant',
        text: `Permisos: ${
          shareOptions.permission === 'read'
            ? 'Solo lectura'
            : 'Lectura y escritura'
        } • Caducidad: ${
          shareOptions.timeout > 0
            ? shareOptions.timeout + ' min'
            : 'sin límite'
        }`,
      },
    ]);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (shareOptions.timeout > 0) {
      timeoutRef.current = setTimeout(() => {
        setPartialDoc((prev) => {
          if (!prev) return prev;
          appendLog(
            `[expiración] Clave expirada para ${prev.id}. Documento parcial destruido.`
          );
          setShareSelectionOpen(false);
          return null;
        });
      }, shareOptions.timeout * 60 * 1000);
    }
  };

  const guardAlertAccess = (who = 'Desconocido') => {
    const alertId = 'acc-' + Math.random().toString(36).slice(2, 6);
    setAiMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        text: `ALERTA (${alertId}): ${who} intenta acceder al documento. ¿Confirmar autorización? (Sí/No)`,
      },
    ]);
    appendLog(
      `[alerta] Intento de acceso por ${who}. Esperando confirmación del propietario.`
    );
  };

  useEffect(() => {
    if (status !== 'secure') return;
    const t = setTimeout(() => {
      guardAlertAccess('Invitado QA');
    }, 2500);
    return () => clearTimeout(t);
  }, [status]);

  const confirmAccess = (who, allow) => {
    setAiMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        text: allow
          ? `Acceso confirmado para ${who}.`
          : `Acceso denegado para ${who}.`,
      },
    ]);
    appendLog(`[alerta] ${allow ? 'Autorizado' : 'Bloqueado'}: ${who}.`);
  };

  // ---- UI sencilla (sin shadcn) ----
  return (
    <div
      style={{
        fontFamily: font,
        padding: 16,
        maxWidth: 1160,
        margin: '0 auto',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 12,
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
          CipherDoc AI — Demo v3
        </h1>
        <span
          style={{
            marginLeft: 'auto',
            padding: '4px 10px',
            borderRadius: 999,
            background:
              status === 'secure'
                ? '#e7f7ee'
                : status === 'active'
                ? '#fff7e6'
                : '#f1f5f9',
            border: '1px solid #e2e8f0',
            fontSize: 12,
          }}
        >
          {status === 'idle' && 'IA inactiva'}
          {status === 'active' && 'Inicializando…'}
          {status === 'secure' && 'IA activa'}
        </span>
        <button
          onClick={() => setRestricted((v) => !v)}
          style={{
            padding: '6px 10px',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
          }}
        >
          {restricted ? 'Acceso restringido' : 'Acceso abierto'}
        </button>
        {status === 'idle' && (
          <button
            onClick={activateAI}
            style={{
              padding: '6px 10px',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
            }}
          >
            Iniciar IA
          </button>
        )}
      </header>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: '260px 1fr 300px',
          gap: 12,
        }}
      >
        {/* Columna izquierda: usuarios + acciones */}
        <div
          style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontWeight: 600,
              marginBottom: 6,
            }}
          >
            <Users size={16} /> Usuarios activos
          </div>
          <ul style={{ paddingLeft: 16, marginTop: 6 }}>
            {activeUsers.map((u) => (
              <li key={u.id} style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 600 }}>{u.name}</div>
                <div style={{ fontSize: 12, color: '#475569' }}>
                  {u.role} • {u.last}
                </div>
                {isOwner && u.id !== 'owner' && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <button
                      onClick={() => confirmAccess(u.name, true)}
                      style={{
                        padding: '4px 8px',
                        border: '1px solid #e2e8f0',
                        borderRadius: 6,
                      }}
                    >
                      Permitir
                    </button>
                    <button
                      onClick={() => confirmAccess(u.name, false)}
                      style={{
                        padding: '4px 8px',
                        border: '1px solid #e2e8f0',
                        borderRadius: 6,
                      }}
                    >
                      Bloquear
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <button
            onClick={() => guardAlertAccess('Solicitante externo')}
            style={{
              marginTop: 8,
              padding: '6px 8px',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
            }}
          >
            Simular intento de acceso
          </button>
        </div>

        {/* Centro: Editor */}
        <div
          style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}
        >
          {/* Barra formato */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              marginBottom: 8,
            }}
          >
            <select
              value={font}
              onChange={(e) => setFont(e.target.value)}
              style={{
                padding: 6,
                borderRadius: 8,
                border: '1px solid #e2e8f0',
              }}
            >
              {FONTS.map((f) => (
                <option key={f.label} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
            <select
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              style={{
                padding: 6,
                borderRadius: 8,
                border: '1px solid #e2e8f0',
              }}
            >
              {FONT_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}px
                </option>
              ))}
            </select>

            <button onClick={() => applyCmd('bold')} style={btn()}>
              B
            </button>
            <button onClick={() => applyCmd('italic')} style={btn()}>
              I
            </button>
            <button onClick={() => applyCmd('underline')} style={btn()}>
              U
            </button>
            <button onClick={() => applyCmd('justifyLeft')} style={btn()}>
              ⟸
            </button>
            <button onClick={() => applyCmd('justifyCenter')} style={btn()}>
              ≡
            </button>
            <button onClick={() => applyCmd('justifyRight')} style={btn()}>
              ⟹
            </button>
            <button
              onClick={() => applyCmd('insertUnorderedList')}
              style={btn()}
            >
              • Lista
            </button>
            <button onClick={() => applyCmd('insertOrderedList')} style={btn()}>
              1. Lista
            </button>

            <label style={{ marginLeft: 'auto', fontSize: 12 }}>
              <input
                type="file"
                multiple
                onChange={onAttach}
                style={{ display: 'none' }}
              />
              <span
                style={{
                  padding: '6px 8px',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
              >
                Adjuntar
              </span>
            </label>
          </div>

          {/* Controles de selección y compartir */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              marginBottom: 8,
            }}
          >
            <div>
              <strong>Selección:</strong>{' '}
              <button
                onClick={() => {
                  setSelectionMode('line');
                  setSelectedPages(new Set());
                }}
                style={toggle(selectionMode === 'line')}
              >
                Por líneas
              </button>
              <button
                onClick={() => {
                  setSelectionMode('page');
                  setSelectedLines(new Set());
                }}
                style={toggle(selectionMode === 'page')}
              >
                Por páginas
              </button>
            </div>
            <div>
              <label>Líneas por página: </label>
              <input
                type="number"
                value={pageSize}
                onChange={(e) =>
                  setPageSize(Math.max(5, Number(e.target.value) || 18))
                }
                style={{
                  width: 70,
                  padding: 4,
                  border: '1px solid #e2e8f0',
                  borderRadius: 6,
                }}
              />
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <select
                value={shareTarget}
                onChange={(e) => setShareTarget(e.target.value)}
                style={{
                  padding: 6,
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                }}
              >
                {REGISTERED_CONTACTS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.cert})
                  </option>
                ))}
              </select>
              <button
                onClick={generatePartialDoc}
                style={{
                  padding: '6px 10px',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                }}
              >
                Generar doc cifrado
              </button>
              <button
                onClick={() => {
                  setSelectedLines(new Set());
                  setSelectedPages(new Set());
                }}
                style={{
                  padding: '6px 10px',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                }}
              >
                Limpiar selección
              </button>
            </div>
          </div>

          {/* Editor con gutter de selección */}
          <div
            style={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: 8 }}
          >
            <div style={{ userSelect: 'none' }}>
              {selectionMode === 'page'
                ? pages.map((p) => (
                    <div
                      key={p.index}
                      title={`Pág. ${p.index + 1}`}
                      onClick={() => togglePage(p)}
                      style={dot(selectedPages.has(p.index))}
                    />
                  ))
                : lines.map((_, i) => (
                    <div
                      key={i}
                      title={`Línea ${i + 1}`}
                      onClick={() => toggleLine(i)}
                      style={dot(selectedLines.has(i))}
                    />
                  ))}
            </div>

            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={syncEditorHtml}
              style={{
                minHeight: 360,
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: 12,
                lineHeight: 1.6,
                fontSize: fontSize,
                outline: 'none',
                whiteSpace: 'pre-wrap',
              }}
              dangerouslySetInnerHTML={{ __html: editorHtml }}
            />
          </div>

          {attachments.length > 0 && (
            <div style={{ marginTop: 10, fontSize: 12 }}>
              <strong>Adjuntos:</strong>
              <ul style={{ paddingLeft: 18 }}>
                {attachments.map((f, i) => (
                  <li key={i}>
                    {f.name}{' '}
                    <button
                      onClick={() =>
                        setAttachments(
                          attachments.filter((_, idx) => idx !== i)
                        )
                      }
                      style={{ fontSize: 12 }}
                    >
                      (quitar)
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Derecha: Estado/IA/logs */}
        <div style={{ display: 'grid', gap: 12 }}>
          <div
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: 12,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 8,
              }}
            >
              <Cpu size={16} /> Estado de seguridad
            </div>
            <div style={{ fontSize: 14 }}>
              {status === 'idle' && 'IA inactiva. Cifrado en espera.'}
              {status === 'active' &&
                'Inicializando cifrado y entorno IA efímero…'}
              {status === 'secure' &&
                'Cifrado activo. Modelo LLaMA efímero protegiendo este documento.'}
            </div>
          </div>

          <div
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: 12,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 8,
              }}
            >
              <ShieldCheck size={16} /> Logs de seguridad
            </div>
            <div
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco',
                fontSize: 12,
                whiteSpace: 'pre-wrap',
              }}
            >
              {logs.map((l, i) => (
                <div key={i}>{l}</div>
              ))}
            </div>
          </div>

          <div
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: 12,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 8,
              }}
            >
              <Terminal size={16} /> Chat con la IA
            </div>
            <div
              style={{ display: 'grid', gap: 6, marginBottom: 8, fontSize: 14 }}
            >
              {aiMessages.map((m, i) => (
                <div key={i}>{m.text}</div>
              ))}
            </div>
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Pídele algo a la IA sobre tu documento…"
              style={{
                width: '100%',
                minHeight: 60,
                padding: 8,
                borderRadius: 8,
                border: '1px solid #e2e8f0',
              }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                onClick={() => {
                  if (!chatInput.trim()) return;
                  setAiMessages((p) => [
                    ...p,
                    { role: 'user', text: chatInput },
                  ]);
                  setChatInput('');
                  setTimeout(
                    () =>
                      setAiMessages((p) => [
                        ...p,
                        {
                          role: 'assistant',
                          text: 'He procesado tu solicitud (demo).',
                        },
                      ]),
                    600
                  );
                }}
                style={{
                  padding: '6px 10px',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                }}
              >
                Enviar
              </button>
              <button
                onClick={() =>
                  setAiMessages([
                    { role: 'assistant', text: 'Conversación reiniciada.' },
                  ])
                }
                style={{
                  padding: '6px 10px',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                }}
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Modal compartir */}
      {shareSelectionOpen && partialDoc && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            zIndex: 50,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              width: '100%',
              maxWidth: 800,
              padding: 16,
              border: '1px solid #e2e8f0',
            }}
          >
            <h3
              style={{
                marginTop: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Share2 size={18} /> Documento parcial cifrado
            </h3>

            <div style={{ fontSize: 13, color: '#334155', marginBottom: 8 }}>
              <div>
                ID:{' '}
                <span style={{ fontFamily: 'ui-monospace' }}>
                  {partialDoc.id}
                </span>
              </div>
              <div>
                Destino: <strong>{partialDoc.target.name}</strong> (
                {partialDoc.target.email})
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 8,
                marginBottom: 8,
              }}
            >
              <div style={box()}>
                <div style={label()}>Permisos</div>
                <select
                  value={shareOptions.permission}
                  onChange={(e) =>
                    setShareOptions((p) => ({
                      ...p,
                      permission: e.target.value,
                    }))
                  }
                  style={{
                    width: '100%',
                    padding: 8,
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                  }}
                >
                  <option value="read">Solo lectura</option>
                  <option value="write">Lectura y escritura</option>
                </select>
              </div>

              <div style={box()}>
                <div style={label()}>Caducidad de la clave</div>
                <select
                  value={shareOptions.timeout}
                  onChange={(e) =>
                    setShareOptions((p) => ({
                      ...p,
                      timeout: Number(e.target.value),
                    }))
                  }
                  style={{
                    width: '100%',
                    padding: 8,
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                  }}
                >
                  <option value={5}>5 minutos</option>
                  <option value={60}>1 hora</option>
                  <option value={1440}>24 horas</option>
                  <option value={0}>Sin límite</option>
                </select>
              </div>

              <div style={box()}>
                <div style={label()}>Selección</div>
                <div style={{ fontSize: 12 }}>
                  {partialDoc.selection.type === 'lines' ? (
                    <>Líneas: {partialDoc.selection.indices.length}</>
                  ) : (
                    <>Páginas: {partialDoc.selection.indices.length}</>
                  )}
                </div>
              </div>
            </div>

            <div style={box()}>
              <div style={label()}>
                Contenido del documento parcial (vista previa)
              </div>
              <div
                style={{
                  maxHeight: 160,
                  overflow: 'auto',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: 8,
                }}
              >
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>
                  {partialDoc.content}
                </pre>
              </div>
            </div>

            <div style={box()}>
              <div style={label()}>Contenido cifrado enviado al servidor</div>
              <div
                style={{
                  maxHeight: 100,
                  overflow: 'auto',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: 8,
                }}
              >
                <pre
                  style={{
                    whiteSpace: 'pre-wrap',
                    fontSize: 12,
                    wordBreak: 'break-all',
                  }}
                >
                  {partialDoc.encrypted}
                </pre>
              </div>
            </div>

            <div
              style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}
            >
              <button
                onClick={() => setShareSelectionOpen(false)}
                style={{
                  padding: '6px 10px',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                }}
              >
                Cerrar
              </button>
              <button
                onClick={() => setShareSelectionOpen(false)}
                style={{
                  padding: '6px 10px',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                }}
              >
                Finalizar compartir
              </button>
            </div>

            {shareOptions.timeout > 0 && (
              <div style={{ fontSize: 12, color: '#b45309', marginTop: 6 }}>
                Este documento parcial expirará en {shareOptions.timeout}{' '}
                minutos.
              </div>
            )}
          </div>
        </div>
      )}

      <footer style={{ fontSize: 12, color: '#64748b', padding: '16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Cpu size={12} /> Demo: el modelo efímero se destruye al cerrar el
          documento.
        </div>
      </footer>
    </div>
  );
}

// ---- estilos en línea/helpers pequeños ----
function btn() {
  return {
    padding: '6px 8px',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    minWidth: 36,
  };
}
function toggle(active) {
  return {
    padding: '6px 8px',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    marginRight: 6,
    background: active ? '#eef2ff' : '#fff',
  };
}
function dot(active) {
  return {
    width: 14,
    height: 14,
    borderRadius: 999,
    border: '1px solid #cbd5e1',
    background: active ? '#2563eb' : '#fff',
    margin: '6px auto',
  };
}
function box() {
  return { border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 };
}
function label() {
  return { fontSize: 12, color: '#64748b', marginBottom: 6 };
}
