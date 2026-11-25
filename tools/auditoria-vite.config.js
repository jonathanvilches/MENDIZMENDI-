// Servidor de pruebas para las auditorías largas con capturas (tools/auditoria-*; npx vite --config tools/auditoria-vite.config.js --port 5175): el mismo juego que vite.config.js, pero
// sin recargar la página cuando cambia un archivo, para poder seguir trabajando mientras dura la auditoría.
import base from '../vite.config.js';
export default { ...base, server: { ...(base.server || {}), hmr: false, watch: { ignored: ['**/*'] } } };
