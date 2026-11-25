/* Modo estatico: sustituye las llamadas a /api/* por una biblioteca pregenerada con IA (js/generados.js).
   Permite publicar el generador en GitHub Pages sin servidor y sin exponer ninguna clave. */
(function () {
  if (!window.MODO_ESTATICO) return;
  const fetchOriginal = window.fetch.bind(window);
  const SIN_SERVIDOR = "Esta función necesita el servidor de IA y no está en esta versión. Usa los prompts preparados y adáptalos en el laboratorio.";
  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const resp = (status, obj) => new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

  function idArea(nombre) {
    const a = (window.AREAS || []).find((x) => x.nombre === nombre);
    return a ? a.id : null;
  }

  function generar(b) {
    const gen = window.GENERADOS || [];
    const perfil = b.perfil || {};
    const area = idArea(perfil.area);
    const subs = [].concat(perfil.subareas || []);
    const tarea = b.tarea;
    const cant = Math.min(Math.max(parseInt(b.cantidad, 10) || 2, 1), 3);
    const parte = Math.max(parseInt(b.parte, 10) || 1, 1);
    let pool;
    if (tarea === "libre") {
      const palabras = norm(b.pedido).split(/\W+/).filter((w) => w.length > 3);
      pool = gen.map((p) => {
        const txt = norm(p.titulo + " " + p.uso + " " + p.subarea + " " + p.tarea);
        return { p, s: palabras.reduce((n, w) => n + (txt.includes(w) ? 1 : 0), 0) };
      }).filter((x) => x.s > 0).sort((a, c) => c.s - a.s).map((x) => x.p);
      if (!pool.length) pool = gen.filter((p) => !area || p.area === area);
    } else {
      pool = gen.filter((p) => p.tarea === tarea && (!area || p.area === area));
      if (!pool.length) pool = gen.filter((p) => p.tarea === tarea);
    }
    const puntaje = (p) => (subs.includes(p.subarea) ? 2 : 0) + (p.rolPerfil === perfil.rol ? 1 : 0);
    pool = pool.map((p, i) => ({ p, i })).sort((a, c) => puntaje(c.p) - puntaje(a.p) || a.i - c.i).map((x) => x.p);
    if (!pool.length) return null;
    const out = [];
    for (let k = 0; k < cant && k < pool.length; k++) out.push(pool[((parte - 1) * cant + k) % pool.length]);
    return out.map(({ titulo, rol, contexto, instruccion, uso, error_comun, verificar }) => ({ titulo, rol, contexto, instruccion, uso, error_comun, verificar }));
  }

  window.fetch = async function (url, opts) {
    const u = typeof url === "string" ? url : (url && url.url) || "";
    const m = u.match(/\/api\/([a-z]+)$/);
    if (!m) return fetchOriginal(url, opts);
    let b = {};
    try { b = JSON.parse((opts && opts.body) || "{}"); } catch (e) { /* cuerpo vacio */ }
    const clase = String(((opts && opts.headers) || {})["x-clase"] || "").trim().toUpperCase();
    const validos = (window.CLASE_CODIGOS || []).map((c) => c.toUpperCase());
    if (validos.length && !validos.includes(clase)) return resp(401, { error: "Ese código no es el de la clase." });
    if (m[1] === "acceso") return resp(200, { ok: true });
    if (m[1] === "generar") {
      const prompts = generar(b);
      return prompts ? resp(200, { prompts }) : resp(404, { error: "No hay prompts preparados para esa combinación. Prueba con otra tarea o área." });
    }
    return resp(501, { error: SIN_SERVIDOR });
  };
})();
