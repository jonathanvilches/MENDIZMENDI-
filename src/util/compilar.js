// Compilar los sombreadores de algo antes de enseñarlo, en paralelo si el navegador puede: lo mismo que
// renderer.compileAsync de three.js, pero sin romperse si mientras tanto se libera un material (un traje que se cambia,
// una escena que se cierra). three.js daba por hecho que cada material seguía teniendo su programa y, si no, saltaba un
// error («Cannot read properties of undefined (reading 'isReady')») y su espera ya no terminaba. Aquí, un material sin
// programa se da por listo.
export function compilarAsync(R, obj, cam, destino = null) {
  let mats; try { mats = R.compile(obj, cam, destino); } catch (e) { return Promise.resolve(obj); }
  const P = R.properties, paralelo = R.extensions?.get?.('KHR_parallel_shader_compile') != null, todos = [...mats];
  // (y luego su primer uso, uno por vuelta: el navegador enlaza el programa cuando se le pregunta por él, en el primer
  // dibujo, y sin la compilación en paralelo eso paraba la imagen allí; en el mapa, 1,8 s con la isla a medio subir, el
  // 17 de noviembre de 2026. Así se paga aquí, a trozos, y no al enseñarlo)
  const usa = (res) => { const m = todos.pop(); if (!m) { res(obj); return; } try { P.get(m).currentProgram?.getUniforms?.(); } catch (e) { } setTimeout(() => usa(res), 0); };
  return new Promise((res) => {
    const mira = () => {
      for (const m of mats) { const pr = P.get(m).currentProgram; if (!pr || pr.isReady()) mats.delete(m); }
      if (!mats.size) usa(res); else setTimeout(mira, 10);
    };
    if (paralelo) mira(); else setTimeout(mira, 10);
  });
}
