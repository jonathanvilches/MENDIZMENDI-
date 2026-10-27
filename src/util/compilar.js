// Compilar los sombreadores de algo antes de enseñarlo, en paralelo si el navegador puede: lo mismo que
// renderer.compileAsync de three.js, pero sin romperse si mientras tanto se libera un material (un traje que se cambia,
// una escena que se cierra). three.js daba por hecho que cada material seguía teniendo su programa y, si no, saltaba un
// error («Cannot read properties of undefined (reading 'isReady')») y su espera ya no terminaba. Aquí, un material sin
// programa se da por listo.
export function compilarAsync(R, obj, cam, destino = null) {
  let mats; try { mats = R.compile(obj, cam, destino); } catch (e) { return Promise.resolve(obj); }
  const P = R.properties, paralelo = R.extensions?.get?.('KHR_parallel_shader_compile') != null;
  return new Promise((res) => {
    const mira = () => {
      for (const m of mats) { const pr = P.get(m).currentProgram; if (!pr || pr.isReady()) mats.delete(m); }
      if (!mats.size) res(obj); else setTimeout(mira, 10);
    };
    if (paralelo) mira(); else setTimeout(mira, 10);
  });
}
