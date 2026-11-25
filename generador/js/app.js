const API_BASE = (window.API_BASE || "").replace(/\/$/, "");
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ---------- almacenamiento y avisos ----------
  const K = "sabana.";
  const leer = (k, d) => { try { const v = localStorage.getItem(K + k); return v ? JSON.parse(v) : d; } catch { return d; } };
  const SYNC = ["mi", "favs", "seleccion", "ctx", "lab"];
  const guardar = (k, v) => { try { localStorage.setItem(K + k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } if (SYNC.includes(k)) programarSync(); };
  let tt;
  function toast(t) { const el = $("#toast"); el.textContent = t; el.classList.add("show"); clearTimeout(tt); tt = setTimeout(() => el.classList.remove("show"), 2200); }
  async function copiar(t, aviso = "Copiado") {
    try { await navigator.clipboard.writeText(t); } catch { const a = document.createElement("textarea"); a.value = t; document.body.appendChild(a); a.select(); document.execCommand("copy"); a.remove(); }
    toast(aviso);
  }
  const armar = (it) => `ROL\n${it.rol}\n\nCONTEXTO\n${it.contexto}\n\nINSTRUCCIÓN\n${it.instruccion}`;

  // ---------- acceso con el código de la clase ----------
  let codigo = leer("codigo", "");
  let pendiente = null;
  function pedirCodigo() {
    if (pendiente) return pendiente;
    pendiente = new Promise((resolve) => {
      $("#gate").hidden = false; $("#gate-inp").value = ""; $("#gate-err").textContent = "";
      setTimeout(() => $("#gate-inp").focus(), 50);
      $("#gate-form").onsubmit = async (e) => {
        e.preventDefault();
        const c = $("#gate-inp").value.trim().toUpperCase();
        if (!c) return;
        const r = await fetch(API_BASE + "/api/acceso", { method: "POST", headers: { "x-clase": c } });
        if (r.ok) { codigo = c; guardar("codigo", c); $("#gate").hidden = true; pendiente = null; resolve(c); }
        else $("#gate-err").textContent = "Ese código no es el de la clase.";
      };
    });
    return pendiente;
  }
  async function api(ruta, cuerpo) {
    if (!codigo) await pedirCodigo();
    for (let intento = 0; intento < 2; intento++) {
      const r = await fetch(API_BASE + ruta, { method: "POST", headers: { "Content-Type": "application/json", "x-clase": codigo }, body: JSON.stringify(cuerpo) });
      if (r.status === 401) { codigo = ""; guardar("codigo", ""); await pedirCodigo(); continue; }
      return r;
    }
    throw new Error("Sin acceso");
  }
  /** Envía un prompt y pinta la respuesta en streaming dentro de `destino`. */
  async function correr(prompt, destino) {
    destino.textContent = "";
    const r = await api("/api/probar", { prompt });
    if (!r.ok) throw new Error((await r.json()).error || "Error");
    const lector = r.body.getReader(); const dec = new TextDecoder();
    for (;;) { const { done, value } = await lector.read(); if (done) break; destino.textContent += dec.decode(value, { stream: true }); }
  }


  // ---------- mini registro: guardar en el servidor ----------
  let token = leer("token", ""); let nombreCuenta = leer("nombre", "");
  let tSync = null;
  const datosLocales = () => Object.fromEntries(SYNC.map((k) => [k, leer(k, null)]));
  function programarSync() {
    if (!token) return;
    clearTimeout(tSync);
    tSync = setTimeout(async () => {
      try {
        const r = await fetch(API_BASE + "/api/cuenta", { method: "POST", headers: { "Content-Type": "application/json", "x-token": token }, body: JSON.stringify({ accion: "guardar", datos: datosLocales() }) });
        if (r.status === 401) { token = ""; guardar("token", ""); pintarCuenta(); toast("Tu sesión venció. Entra de nuevo para seguir guardando."); }
      } catch { /* sin red: se guarda en el siguiente cambio */ }
    }, 1500);
  }
  async function llamarCuenta(cuerpo) {
    if (!codigo) await pedirCodigo();
    const r = await fetch(API_BASE + "/api/cuenta", { method: "POST", headers: { "Content-Type": "application/json", "x-clase": codigo }, body: JSON.stringify(cuerpo) });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401 && /clase/i.test(j.error || "")) { codigo = ""; guardar("codigo", ""); await pedirCodigo(); return llamarCuenta(cuerpo); }
    if (!r.ok) throw new Error(j.error || "Error");
    return j;
  }
  function pintarCuenta() {
    const dentro = !!token;
    $("#btn-cuenta").textContent = dentro ? "Hola, " + (nombreCuenta.split(" ")[0] || "tú") : "Guardar mis prompts";
    $("#cu-fuera").hidden = dentro; $("#cu-dentro").hidden = !dentro;
    $("#cu-titulo").textContent = dentro ? "Tu registro" : "Guarda tus prompts";
    $("#cu-hola").textContent = dentro ? `Sesión abierta como ${nombreCuenta}.` : "";
    const rb = $("#btn-registro"); if (rb) rb.hidden = dentro || !mi.items.length;
  }
  let modoCuenta = "nuevo";
  function modo(m) {
    modoCuenta = m;
    $$("#cu-modo .chip").forEach((b) => b.setAttribute("aria-pressed", b.dataset.m === m));
    $("#cu-f-nombre").hidden = m !== "nuevo";
    $("#cu-enviar").textContent = m === "nuevo" ? "Crear mi registro" : "Entrar";
    $("#cu-err").textContent = "";
  }
  $("#btn-cuenta").onclick = () => { pintarCuenta(); $("#dlg-cuenta").showModal(); };
  $("#btn-registro").onclick = () => { modo("nuevo"); $("#btn-cuenta").click(); };
  $("#dlg-cuenta").addEventListener("click", (e) => { if (e.target.id === "dlg-cuenta" || e.target.closest('[data-c="cerrar"]')) $("#dlg-cuenta").close(); });
  $("#cu-modo").addEventListener("click", (e) => { const b = e.target.closest(".chip"); if (b) modo(b.dataset.m); });
  $("#cu-form").onsubmit = async (e) => {
    e.preventDefault();
    const btn = $("#cu-enviar"); btn.disabled = true; $("#cu-err").textContent = "";
    const base = { correo: $("#cu-correo").value, pin: $("#cu-pin").value };
    try {
      let j;
      if (modoCuenta === "nuevo") j = await llamarCuenta({ accion: "registrar", nombre: $("#cu-nombre").value, ...base, datos: datosLocales() });
      else j = await llamarCuenta({ accion: "entrar", ...base });
      token = j.token; nombreCuenta = j.nombre || nombreCuenta;
      try { localStorage.setItem(K + "token", JSON.stringify(token)); localStorage.setItem(K + "nombre", JSON.stringify(nombreCuenta)); } catch { /* */ }
      if (modoCuenta === "viejo") {
        const d = j.datos || {};
        if (d.mi && d.mi.items && d.mi.items.length) {
          SYNC.forEach((k) => { try { if (d[k] != null) localStorage.setItem(K + k, JSON.stringify(d[k])); } catch { /* */ } });
          location.reload(); return;
        }
        programarSync(); // la cuenta estaba vacía: sube lo que hay en este equipo
      }
      $("#dlg-cuenta").close(); pintarCuenta(); toast("Listo. Tus prompts se guardan solos.");
    } catch (err) { $("#cu-err").textContent = err.message; }
    btn.disabled = false;
  };
  $("#cu-salir").onclick = () => {
    if (!confirm("Se cierra tu sesión y se borra tu biblioteca de este equipo. Seguirá guardada en tu registro. ¿Salir?")) return;
    clearTimeout(tSync);
    try { SYNC.concat(["token", "nombre"]).forEach((k) => localStorage.removeItem(K + k)); } catch { /* */ }
    location.reload();
  };

  // ---------- pestañas ----------
  function pestana(id) {
    $$(".navtab").forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === id));
    $$(".tabpanel").forEach((p) => (p.hidden = p.id !== "t-" + id));
    guardar("tab", id);
    if (id === "lib") pintarLib();
    if (id === "mi") vista();
    if (id === "lab" && typeof ajustarTodos === "function") setTimeout(ajustarTodos, 0);
  }
  $$(".navtab").forEach((b) => (b.onclick = () => { pestana(b.dataset.tab); window.scrollTo({ top: 0 }); }));

  // ---------- favoritos ----------
  const favs = new Set(leer("favs", []));
  const guardarFavs = () => guardar("favs", [...favs]);

  // ---------- tarjeta y ventana (comunes a todo prompt) ----------
  // item: { id, grupo, titulo, rol, contexto, instruccion, extras:[{label, texto, aviso}], orig:{rol,contexto,instruccion} }
  const esEjemplo = (it) => it.id.startsWith("lib-");
  const ICO_FAV = (on) => `<svg width="15" height="15" viewBox="0 0 24 24" fill="${on ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/></svg>`;
  const bloquesCard = (it) => [["rol", "/rol", it.rol], ["ctx", "/contexto", it.contexto], ["ins", "/instrucción", it.instruccion]]
    .map(([k, l, t]) => `<div class="blk" data-k="${k}"><span class="blabel">${l}</span><p class="btext">${esc(t)}</p></div>`).join("");

  function tarjeta(it, codigoTxt, alCambiar) {
    const c = document.createElement("article");
    c.className = "card"; c.dataset.id = it.id;
    const largo = it.rol.length + it.contexto.length + it.instruccion.length;
    c.innerHTML = `
      <div class="chead"><div class="crow"><div><span class="code">${esc(codigoTxt)}</span> <span class="carea">${esc(it.grupo)}</span></div>
        <button class="ico ${favs.has(it.id) ? "on" : ""}" data-act="fav" aria-label="Favorito" title="Favorito">${ICO_FAV(favs.has(it.id))}</button></div>
        <h3>${esc(it.titulo)}</h3></div>
      ${bloquesCard(it)}
      <div class="cfoot"><span class="more">${largo} caracteres · abrir para editar</span>
        <div class="btnrow"><button class="btn" data-act="copiar" type="button">Copiar</button></div></div>`;
    c.onclick = (e) => {
      const b = e.target.closest("[data-act]");
      if (!b) { abrir(it, () => alCambiar && alCambiar("cerrar")); return; }
      e.stopPropagation();
      if (b.dataset.act === "copiar") copiar(armar(it), "Prompt copiado");
      if (b.dataset.act === "fav") {
        favs.has(it.id) ? favs.delete(it.id) : favs.add(it.id); guardarFavs();
        b.classList.toggle("on", favs.has(it.id)); b.innerHTML = ICO_FAV(favs.has(it.id));
        toast(favs.has(it.id) ? "Añadido a favoritos" : "Quitado de favoritos");
        alCambiar && alCambiar("fav");
      }
    };
    return c;
  }

  const dlg = $("#dlg");
  let alCerrar = null;
  function abrir(it, cerrado) {
    alCerrar = cerrado;
    const ejemplo = esEjemplo(it);
    $("#sheet").innerHTML = `
      <div class="shead"><div style="flex:1;min-width:0"><span class="code">${esc(it.grupo)}</span>${ejemplo ? `<h3>${esc(it.titulo)}</h3>` : `<input class="titulo" id="sh-titulo" maxlength="140" aria-label="Título">`}</div><button class="btn" data-x="cerrar" type="button" aria-label="Cerrar">✕</button></div>
      <div class="sbody">
        <div class="blk" data-k="rol"><span class="blabel">/rol</span><textarea class="ta" data-b="rol"></textarea></div>
        <div class="blk" data-k="ctx"><span class="blabel">/contexto</span><textarea class="ta" data-b="contexto"></textarea></div>
        <div class="blk" data-k="ins"><span class="blabel">/instrucción</span><textarea class="ta" data-b="instruccion"></textarea></div>
        ${(it.extras || []).map((x) => `<div class="nota ${x.aviso ? "ver" : ""}"><b>${esc(x.label)}.</b> ${esc(x.texto)}</div>`).join("")}
      </div>
      <div class="sfoot">
        ${ejemplo ? "" : '<button class="btn izq" data-x="borrar" type="button">Eliminar</button>'}
        <button class="btn" data-x="reset" type="button">Restablecer</button>
        <button class="btn" data-x="lab" type="button">Llevar al laboratorio</button>
        <button class="btn" data-x="copiar" type="button">Copiar prompt</button>
        ${ejemplo ? '<button class="btn" data-x="guardar" type="button">Guardar en mis prompts</button>' : ""}
        <button class="btn solid" data-x="probar" type="button">Probar con IA</button>
      </div>
      <div class="salida" hidden></div>`;
    const campos = $$("textarea", $("#sheet"));
    const auto = (ta) => { ta.style.height = "auto"; ta.style.height = ta.scrollHeight + 2 + "px"; };
    const llenar = () => campos.forEach((ta) => { ta.value = it[ta.dataset.b]; });
    campos.forEach((ta) => ta.addEventListener("input", () => { it[ta.dataset.b] = ta.value; auto(ta); if (!ejemplo) guardarMi(); }));
    const ti = $("#sh-titulo");
    if (ti) { ti.value = it.titulo; ti.addEventListener("input", () => { it.titulo = ti.value; guardarMi(); }); }
    llenar();
    dlg.showModal();
    campos.forEach(auto);
    $("#sheet").onclick = async (e) => {
      const b = e.target.closest("[data-x]"); if (!b) return;
      const a = b.dataset.x;
      if (a === "cerrar") dlg.close();
      if (a === "copiar") copiar(armar(it), "Prompt copiado");
      if (a === "reset") { Object.assign(it, it.orig); llenar(); campos.forEach(auto); if (!ejemplo) guardarMi(); toast("Campos restablecidos"); }
      if (a === "lab") { dlg.close(); cargarEnLab(it); pestana("lab"); window.scrollTo({ top: 0 }); }
      if (a === "guardar") { guardarEjemplo(it); }
      if (a === "borrar") {
        if (!confirm("¿Eliminar este prompt de tu espacio? No se puede deshacer.")) return;
        mi.items = mi.items.filter((x) => x.id !== it.id); favs.delete(it.id); guardarFavs(); guardarMi();
        alCerrar = () => pintarMi(); dlg.close(); toast("Prompt eliminado");
      }
      if (a === "probar") {
        const texto = armar(it);
        const salida = $(".salida", $("#sheet"));
        b.disabled = true; b.textContent = "Pensando...";
        salida.hidden = false; salida.innerHTML = '<span class="code">/respuesta de la IA, un borrador que debes verificar</span><div></div>';
        try { await correr(texto, salida.lastElementChild); }
        catch (err) { salida.lastElementChild.innerHTML = `<span class="err">${esc(err.message)}</span>`; }
        b.disabled = false; b.textContent = "Probar de nuevo";
        salida.scrollIntoView({ block: "nearest" });
      }
    };
  }
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener("close", () => { const f = alCerrar; alCerrar = null; f && f(); });

  // ==================== ESTADO DE MIS PROMPTS ====================
  // mi = { perfil: texto, items: [item] }. Los más nuevos van primero.
  const sel = { area: null, sub: [], rol: null, enf: [], jur: "Colombia", niv: "La uso a veces", ton: "Técnico y sobrio", tar: [], por: 4 };
  Object.assign(sel, leer("seleccion", {}));
  let mi = leer("mi", { perfil: "", items: [] });
  if (!mi || !Array.isArray(mi.items)) mi = { perfil: "", items: [] };
  const guardarMi = () => guardar("mi", mi);
  let seq = Date.now();
  const nuevoId = (p) => p + "-" + (seq++).toString(36);
  const nombreTarea = (id) => (window.TAREAS.find((x) => x.id === id) || { nombre: id }).nombre;
  const perfilListo = () => !!(sel.area && sel.rol);
  const perfilTexto = () => `${sel.area}. ${sel.sub.join(", ") || "sin especialidades"}. ${sel.rol}. ${sel.enf.join(", ")}. ${sel.jur}.`;

  // ---------- perfil ----------
  function chips(cont, opciones, { multi = false, max = 1, clave, onChange }) {
    cont.innerHTML = "";
    opciones.forEach((o) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "chip"; b.textContent = o;
      b.setAttribute("aria-pressed", multi ? sel[clave].includes(o) : sel[clave] === o);
      b.onclick = () => {
        if (multi) {
          const i = sel[clave].indexOf(o);
          if (i >= 0) sel[clave].splice(i, 1);
          else if (sel[clave].length < max) sel[clave].push(o);
          else { toast("Máximo " + max); return; }
        } else sel[clave] = o;
        $$(".chip", cont).forEach((x) => x.setAttribute("aria-pressed", multi ? sel[clave].includes(x.textContent) : sel[clave] === x.textContent));
        onChange && onChange();
      };
      cont.appendChild(b);
    });
  }
  const areaActual = () => window.AREAS.find((a) => a.nombre === sel.area);

  function pintarPerfil() {
    chips($("#c-area"), window.AREAS.map((a) => a.nombre), { clave: "area", onChange: () => { sel.sub = []; pintarPerfil(); } });
    const a = areaActual();
    $("#p-sub").classList.toggle("off", !a);
    chips($("#c-sub"), a ? a.sub : [], { multi: true, max: 3, clave: "sub", onChange: estadoPerfil });
    $("#p-rol").classList.toggle("off", !a);
    chips($("#c-rol"), window.ROLES, { clave: "rol", onChange: pintarPerfil });
    $("#p-enf").classList.toggle("off", !sel.rol);
    chips($("#c-enf"), window.ENFOQUES, { multi: true, max: 3, clave: "enf", onChange: estadoPerfil });
    $("#p-ajustes").classList.toggle("off", !sel.rol);
    chips($("#c-jur"), window.JURISDICCIONES, { clave: "jur", onChange: estadoPerfil });
    chips($("#c-niv"), window.NIVELES, { clave: "niv", onChange: estadoPerfil });
    chips($("#c-ton"), window.TONOS, { clave: "ton", onChange: estadoPerfil });
    $("#p-ctx").classList.toggle("off", !sel.rol);
    estadoPerfil();
  }
  function estadoPerfil() {
    guardar("seleccion", sel);
    $("#btn-perfil-ok").disabled = !perfilListo();
  }
  $("#btn-perfil-ok").onclick = () => { mi.perfil = perfilTexto(); guardarMi(); vista(); if (!mi.items.length) abrirCrear(true); window.scrollTo({ top: 0, behavior: "smooth" }); };
  $("#btn-perfil").onclick = () => { $("#onb").hidden = false; $("#gestion").hidden = true; window.scrollTo({ top: 0, behavior: "smooth" }); };

  /** Muestra el perfil si aún no existe, o la gestión de prompts si ya está listo. */
  function vista() {
    const listo = perfilListo() && (mi.perfil || mi.items.length);
    $("#onb").hidden = !!listo; $("#gestion").hidden = !listo;
    if (listo) { $("#perfil-linea").textContent = perfilTexto(); pintarMi(); }
    pintarCuenta();
  }

  // ---------- crear con IA ----------
  function abrirCrear(si) { $("#crear").hidden = si === undefined ? !$("#crear").hidden : !si; }
  $("#btn-crear").onclick = () => { abrirCrear(); if (!$("#crear").hidden) $("#crear").scrollIntoView({ behavior: "smooth", block: "start" }); };
  $("#btn-escribir").onclick = () => { pestana("lab"); window.scrollTo({ top: 0 }); };

  function pintarTareas() {
    const c = $("#c-tar"); c.innerHTML = "";
    window.TAREAS.forEach((t) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "tarea";
      b.innerHTML = `<b>${esc(t.nombre)}</b><span>${esc(t.d)}</span>`;
      b.setAttribute("aria-pressed", sel.tar.includes(t.id));
      b.onclick = () => {
        const i = sel.tar.indexOf(t.id);
        if (i >= 0) sel.tar.splice(i, 1);
        else if (sel.tar.length < 6) sel.tar.push(t.id);
        else { toast("Máximo seis tareas"); return; }
        b.setAttribute("aria-pressed", sel.tar.includes(t.id));
        estadoCrear();
      };
      c.appendChild(b);
    });
    const por = $("#c-por"); por.innerHTML = "";
    [2, 4, 6].forEach((n) => {
      const b = document.createElement("button"); b.type = "button"; b.className = "chip"; b.textContent = n;
      b.setAttribute("aria-pressed", sel.por === n);
      b.onclick = () => { sel.por = n; $$(".chip", por).forEach((x) => x.setAttribute("aria-pressed", +x.textContent === n)); estadoCrear(); };
      por.appendChild(b);
    });
    estadoCrear();
  }
  function plan() {
    const tareas = sel.tar.length ? sel.tar : ($("#cr-pedido").value.trim() ? ["libre"] : []);
    return { tareas, llamadas: tareas.length * Math.round(sel.por / 2) };
  }
  function estadoCrear() {
    guardar("seleccion", sel);
    const { tareas, llamadas } = plan();
    const exceso = llamadas > 12;
    $("#btn-gen").disabled = !tareas.length || exceso || generando;
    $("#resumen").textContent = exceso ? "Son demasiados de una vez. Baja las tareas o la cantidad."
      : tareas.length ? `${tareas.length * sel.por} prompts. Tarda alrededor de un minuto.` : "Elige una tarea o cuéntame qué necesitas.";
  }
  $("#cr-pedido").addEventListener("input", estadoCrear);

  let generando = false;
  let pendientes = 0;
  const perfilEnvio = () => ({ area: sel.area, subareas: sel.sub, rol: sel.rol, enfoques: sel.enf, jurisdiccion: sel.jur, nivelIA: sel.niv, tono: sel.ton, contexto: $("#ctx").value.trim() });
  function itemDeGenerado(p, tarea) {
    const base = { rol: p.rol, contexto: p.contexto, instruccion: p.instruccion };
    return {
      id: nuevoId("gen"), tarea, grupo: tarea === "libre" ? "A mi medida" : nombreTarea(tarea), titulo: p.titulo, ...base, orig: { ...base },
      extras: [{ label: "Para qué sirve", texto: p.uso }, { label: "Error común", texto: p.error_comun }, { label: "Verifica antes de usar", texto: p.verificar, aviso: true }],
    };
  }

  async function pedirLote(llamadas) {
    const perfil = perfilEnvio(); const pedido = $("#cr-pedido").value.trim();
    const fallos = []; let ultimo = "";
    pendientes += llamadas.length * 2; pintarMi();
    await Promise.all(llamadas.map(async (ll) => {
      try {
        const r = await api("/api/generar", { perfil, tarea: ll.tarea, cantidad: 2, parte: ll.parte, pedido });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Error");
        mi.items.unshift(...j.prompts.map((p) => itemDeGenerado(p, ll.tarea)));
        guardarMi();
      } catch (e) { fallos.push(ll); ultimo = e.message; }
      pendientes -= 2; pintarMi();
    }));
    return { fallos, ultimo };
  }
  function mostrarFallos({ fallos, ultimo }) {
    const c = $("#cr-fallos"); c.innerHTML = "";
    if (!fallos.length) return;
    c.innerHTML = `<div class="alerta" style="margin-top:12px">${esc(ultimo)} Faltaron ${fallos.length * 2} prompts. <button class="btn" type="button">Reintentar</button></div>`;
    $("button", c).onclick = async () => { c.innerHTML = ""; mostrarFallos(await pedirLote(fallos)); };
  }
  $("#btn-gen").onclick = async () => {
    const { tareas } = plan();
    const partes = Math.max(1, Math.round(sel.por / 2));
    const llamadas = tareas.flatMap((t) => Array.from({ length: partes }, (_, i) => ({ tarea: t, parte: i + 1 })));
    generando = true; estadoCrear(); $("#cr-fallos").innerHTML = "";
    $("#crear").hidden = true; window.scrollTo({ top: 0, behavior: "smooth" });
    const res = await pedirLote(llamadas);
    generando = false; estadoCrear();
    $("#cr-pedido").value = "";
    if (res.fallos.length) { $("#crear").hidden = false; mostrarFallos(res); }
    else if (!token) toast("Guarda tus prompts para volver a consultarlos");
    pintarCuenta();
  };

  // ---------- listado de mis prompts ----------
  let filtroMi = "todos"; let consultaMi = "";
  function pintarMi() {
    // chips: Todos, Favoritos y cada grupo que exista
    const grupos = []; mi.items.forEach((it) => { if (!grupos.includes(it.grupo)) grupos.push(it.grupo); });
    if (filtroMi !== "todos" && filtroMi !== "favs" && !grupos.includes(filtroMi)) filtroMi = "todos";
    const c = $("#chips-mi"); c.innerHTML = "";
    [["todos", "Todos"], ["favs", "Favoritos"], ...grupos.map((g) => [g, g])].forEach(([k, l]) => {
      const b = document.createElement("button"); b.type = "button"; b.className = "chip"; b.textContent = l;
      b.setAttribute("aria-pressed", k === filtroMi);
      b.onclick = () => { filtroMi = k; pintarMi(); };
      c.appendChild(b);
    });
    const q = consultaMi.trim().toLowerCase();
    const g = $("#grid-mi"); g.innerHTML = "";
    for (let i = 0; i < pendientes; i++) { const e = document.createElement("div"); e.className = "esqueleto"; g.appendChild(e); }
    let n = 0;
    mi.items.forEach((it, i) => {
      if (filtroMi === "favs" ? !favs.has(it.id) : filtroMi !== "todos" && it.grupo !== filtroMi) return;
      if (q && !(it.titulo + " " + it.grupo + " " + it.rol + " " + it.contexto + " " + it.instruccion).toLowerCase().includes(q)) return;
      g.appendChild(tarjeta(it, "/" + (mi.items.length - i), (que) => { if (que === "fav" && filtroMi === "favs") pintarMi(); if (que === "cerrar") pintarMi(); }));
      n++;
    });
    $("#n-mi").textContent = mi.items.length ? `(${mi.items.length})` : "";
    $("#count-mi").textContent = n === mi.items.length ? "" : `${n} de ${mi.items.length}`;
    const v = $("#vacio-mi");
    v.hidden = n > 0 || pendientes > 0;
    if (!v.hidden) {
      v.innerHTML = mi.items.length
        ? "Ningún prompt coincide con la búsqueda o el filtro."
        : 'Aún no tienes prompts. Crea los primeros con IA, escribe uno en el laboratorio o guarda uno de los ejemplos de la clase.<br><button class="btn solid" type="button" id="vacio-crear">Crear con IA</button>';
      const vb = $("#vacio-crear"); if (vb) vb.onclick = () => abrirCrear(true);
    }
    pintarCuenta();
  }
  $("#q-mi").addEventListener("input", (e) => { consultaMi = e.target.value; pintarMi(); });

  function textoTodo() {
    const partes = [`MIS PROMPTS JURÍDICOS\n${mi.perfil}\n`];
    mi.items.forEach((it) => partes.push(`=== ${it.grupo}: ${it.titulo} ===\n${armar(it)}\n\n${(it.extras || []).map((x) => `${x.label}: ${x.texto}`).join("\n")}\n`));
    return partes.join("\n");
  }
  $("#btn-pdf").onclick = () => window.print();
  $("#btn-copiar-todo").onclick = () => copiar(textoTodo(), "Prompts copiados");
  $("#ctx").value = leer("ctx", "");
  $("#ctx").addEventListener("input", () => guardar("ctx", $("#ctx").value));

  function guardarEjemplo(it) {
    if (mi.items.some((x) => x.origen === it.id)) { toast("Ya está en tus prompts"); return; }
    const base = { rol: it.rol, contexto: it.contexto, instruccion: it.instruccion };
    mi.items.unshift({ id: nuevoId("mio"), origen: it.id, grupo: "De los ejemplos", titulo: it.titulo, ...base, orig: { ...base }, extras: it.extras });
    guardarMi(); pintarMi(); toast("Guardado en tus prompts");
  }

  // ==================== EJEMPLOS (48 de la clase) ====================
  const NOMBRE_AREA = Object.fromEntries(window.LIB_AREAS);
  const CODIGO_AREA = Object.fromEntries(window.LIB_AREAS.map(([k], i) => [k, i + 1]));
  const lib = (() => { const n = {}; return window.LIBRERIA.map((p, i) => {
    n[p.a] = (n[p.a] || 0) + 1;
    const base = { rol: p.r, contexto: p.c, instruccion: p.i };
    return { id: "lib-" + i, area: p.a, cod: `/${CODIGO_AREA[p.a]}.${n[p.a]}`, grupo: NOMBRE_AREA[p.a], titulo: p.t, ...base, orig: { ...base },
      extras: [{ label: "El pedido vago de partida", texto: p.mal }, { label: "Por qué falla", texto: p.por }, { label: "Consejo", texto: p.tip, aviso: true }] };
  }); })();
  let filtro = "todas"; let consulta = "";

  function chipsLib() {
    const c = $("#chips-lib"); c.innerHTML = "";
    [["todas", "Todas"], ...window.LIB_AREAS, ["favs", "Favoritos"]].forEach(([k, l]) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "chip"; b.dataset.k = k;
      b.textContent = l; b.setAttribute("aria-pressed", k === filtro);
      b.onclick = () => { filtro = k; $$(".chip", c).forEach((x) => x.setAttribute("aria-pressed", x.dataset.k === filtro)); pintarLib(); };
      c.appendChild(b);
    });
  }
  function pintarLib() {
    const g = $("#grid-lib"); g.innerHTML = "";
    const q = consulta.trim().toLowerCase(); let n = 0;
    lib.forEach((it) => {
      if (filtro === "favs" ? !favs.has(it.id) : filtro !== "todas" && it.area !== filtro) return;
      if (q && !(it.titulo + " " + it.grupo + " " + it.rol + " " + it.contexto + " " + it.instruccion).toLowerCase().includes(q)) return;
      g.appendChild(tarjeta(it, it.cod, (que) => { if (que === "fav" && filtro === "favs") pintarLib(); }));
      n++;
    });
    $("#vacio-lib").hidden = n > 0;
    $("#count").textContent = n === lib.length ? `${n} prompts` : `${n} de ${lib.length}`;
  }
  $("#q").addEventListener("input", (e) => { consulta = e.target.value; pintarLib(); });

  // ==================== LABORATORIO ====================
  const F = { rol: $("#f-rol"), ctx: $("#f-ctx"), ins: $("#f-ins") };
  const CRIT = [
    { p: 20, t: "El rol está definido", m: "Empieza con “Eres un...” y nombra una especialidad.", f: (v) => /\b(eres un|eres una|act[uú]a como|como un)\b/i.test(v.rol) && v.rol.length >= 30 },
    { p: 10, t: "El rol tiene experiencia o mercado", m: "Añade años de práctica, tipo de clientes o despachos, o país.", f: (v) => /\b(a[nñ]os|experiencia|pr[aá]ctica|senior|especializad|especialista|con dominio|familiarizad|asesorando|litigando|litigante|experto|experta)/i.test(v.rol) },
    { p: 20, t: "El contexto describe tu caso", m: "Describe la situación real en al menos dos frases.", f: (v) => v.ctx.length >= 80 },
    { p: 12, t: "Hay datos concretos", m: "Incluye una cifra, una fecha o un término.", f: (v) => /\d/.test(v.ctx) || /\[[^\]]+\]/.test(v.ctx) },
    { p: 10, t: "Dices para quién o con qué límite", m: "Nombra el despacho, el término, la contraparte, el cliente o la restricción.", f: (v) => /\b(audiencia|comit[eé]|cliente|equipo|jefe|gerente|gerencia|juez|juzgado|tribunal|despacho|fiscal[ií]a|entidad|autoridad|contraparte|expediente|plazo|t[eé]rmino|vence|restricci|presupuesto|minutos|d[ií]as|reuni[oó]n|demanda|requerimiento|tutela|sentencia|proceso)\b/i.test(v.ctx) },
    { p: 18, t: "Pides un formato de salida", m: "Di si quieres tabla, memorial, matriz, minuta, carta, lista de chequeo o cuadro.", f: (v) => /\b(tabla|vi[nñ]etas|lista|correo|gui[oó]n|ficha|columnas|formato|p[aá]rrafos|p[aá]gina|matriz|agenda|memorando|memorial|escrito|concepto|minuta|cuadro|checklist|borrador|carta|acta|resumen|cronograma|calendario|demanda|recurso|alegato|tutela)\b/i.test(v.ins) },
    { p: 5, t: "Pones un límite de extensión", m: "Añade “máximo N palabras” o similar.", f: (v) => /\b(m[aá]ximo|no m[aá]s de|hasta \d|\d+\s*palabras|una p[aá]gina|\d+\s*l[ií]neas)\b/i.test(v.ins) },
    { p: 5, t: "Dices qué no hacer", m: "Cierra con “no concluyas”, “no inventes sentencias” o “marca con [verificar]”.", f: (v) => /\b(no inventes|no incluyas|no uses|no propongas|no concluyas|no afirmes|no cites|no recomiendes|no prometas|no redactes|no hagas|no emitas|evita|prohibido|sin jerga|sin adjetivos|sin lenguaje jur|marca con)\b/i.test(v.ins) },
  ];
  const PII = [
    { re: /\b\d{5}[-\s.]?\d{2}[-\s.]?\d{2}[-\s.]?\d{3}[-\s.]?\d{4}[-\s.]?\d{5}[-\s.]?\d{2}\b/, q: "un radicado judicial de 23 dígitos" },
    { re: /\b[\w.+-]+@[\w-]+(\.[\w-]+)*\.[a-z]{2,}\b/i, q: "un correo electrónico" },
    { re: /(\+?57[\s-]?)?\b3\d{2}[\s-]?\d{3}[\s-]?\d{4}\b/, q: "un número de celular" },
    { re: /(\+?57[\s-]?)?\(?\b60\d\)?[\s-]?\d{3}[\s-]?\d{4}\b/, q: "un teléfono fijo" },
    { re: /\bnit\.?\s*(n[°º.o]*\s*)?:?\s*\d/i, q: "un NIT" },
    { re: /\b\d{3}\.?\d{3}\.?\d{3}\s?-\s?\d\b/, q: "un número con formato de NIT" },
    { re: /\b(c\.?\s?c\.?|c[eé]dula( de ciudadan[ií]a)?|t\.?\s?i\.?|c\.?\s?e\.?|pasaporte)\s*(n[°º.o]*\s*)?:?\s*\d/i, q: "un número de documento de identidad" },
    { re: /(?<![$\d.,]\s?)\b\d{1,3}(\.\d{3}){2,3}\b(?![.,]\d)/, q: "un número con puntos que parece una cédula" },
    { re: /\b(radicado|radicaci[oó]n|expediente|proceso|rad\.?|spoa|noticia criminal)\s*(n[°º.o]*\s*)?:?\s*\d{6,}/i, q: "un número de radicado, expediente o noticia criminal" },
    { re: /\b(matr[ií]cula( inmobiliaria| mercantil)?|folio de matr[ií]cula|escritura( p[uú]blica)?|p[oó]liza)\s*(n[°º.o]*\s*)?:?\s*[\dA-Z]{0,4}-?\d{3,}/i, q: "un número de matrícula, escritura o póliza" },
    { re: /\b\d{3}-\d{4,}\b/, q: "un número con formato de folio de matrícula inmobiliaria" },
    { re: /\b(tarjeta profesional|t\.?\s?p\.?)\s*(n[°º.o]*\s*)?:?\s*\d{4,}/i, q: "una tarjeta profesional" },
    { re: /\b\d{7,10}\b/, q: "un número que parece una cédula, un NIT o un teléfono" },
  ];
  const valores = () => ({ rol: F.rol.value.trim(), ctx: F.ctx.value.trim(), ins: F.ins.value.trim() });
  const labTexto = () => { const v = valores(); return `ROL\n${v.rol}\n\nCONTEXTO\n${v.ctx}\n\nINSTRUCCIÓN\n${v.ins}`; };

  function evaluar() {
    const v = valores();
    const todo = [v.rol, v.ctx, v.ins].join(" ");
    let pts = 0;
    $("#crit").innerHTML = CRIT.map((c) => {
      const ok = c.f(v); if (ok) pts += c.p;
      return `<li class="${ok ? "on" : ""}"><span class="mk">${ok ? "✓" : "·"}</span><span>${c.t}<span class="ms">${c.m}</span></span></li>`;
    }).join("");
    $("#fill").style.width = pts + "%";
    const s = $("#score"); s.innerHTML = `${pts}<sub>/100</sub>`;
    s.style.setProperty("--sc", pts >= 80 ? "var(--ok)" : pts >= 50 ? "var(--warn)" : pts > 0 ? "var(--bad)" : "var(--ink20)");
    $("#verdict").textContent = !todo.trim() ? "Empieza a escribir" : pts >= 85 ? "Listo para usar" : pts >= 65 ? "Bien: pule el detalle" : pts >= 40 ? "Falta contexto o formato" : "Todavía es un pedido vago";
    const hits = [...new Set(PII.filter((x) => x.re.test(todo)).map((x) => x.q))];
    const box = $("#pii"); box.hidden = !hits.length;
    if (hits.length) box.innerHTML = `<b>Detectamos ${esc(hits.slice(0, 3).join(", "))}${hits.length > 3 ? " y otros datos" : ""}.</b> Reemplázalo por un marcador genérico, por ejemplo [cédula] o [radicado], antes de pegar el texto en una herramienta de IA.`;
    ["rol", "ctx", "ins"].forEach((k) => ($("#c-" + k + "-n").textContent = v[k].length));
    const ln = (lab, tok, val, ph) => `<strong style="color:var(--${tok})">${lab}</strong>\n` + (val ? esc(val) : `<span class="ph">${ph}</span>`);
    $("#preview").innerHTML = [ln("ROL", "rol", v.rol, "(define quién responde)"), ln("CONTEXTO", "ctx", v.ctx, "(describe tu caso real)"), ln("INSTRUCCIÓN", "ins", v.ins, "(pide el entregable y su formato)")].join("\n\n");
    guardar("lab", v);
  }
  function cargarEnLab(it) { F.rol.value = it.rol; F.ctx.value = it.contexto; F.ins.value = it.instruccion; evaluar(); setTimeout(() => Object.values(F).forEach((ta) => { ta.style.height = "auto"; ta.style.height = ta.scrollHeight + 2 + "px"; }), 0); }

  Object.values(F).forEach((x) => x.addEventListener("input", evaluar));
  $$(".seeds").forEach((sd) => sd.addEventListener("click", (e) => {
    const b = e.target.closest(".seed"); if (!b) return;
    const ta = $("#" + sd.dataset.for);
    ta.value = (ta.value.trim() ? ta.value.trim() + " " : "") + b.textContent;
    ta.focus(); evaluar();
  }));
  $("#lab-copiar").onclick = () => copiar(labTexto(), "Prompt copiado");
  $("#lab-limpiar").onclick = () => { Object.values(F).forEach((x) => (x.value = "")); evaluar(); $("#lab-salida").innerHTML = '<span class="hint">La respuesta aparece aquí. Es un borrador que debes verificar.</span>'; toast("Laboratorio limpio"); };
  $("#lab-ejemplo").onclick = () => { cargarEnLab(lib[Math.floor(Math.random() * lib.length)]); toast("Ejemplo cargado"); };
  $("#lab-guardar").onclick = () => {
    const v = valores();
    if (!v.rol || !v.ctx || !v.ins) { toast("Completa las tres partes"); return; }
    const base = { rol: v.rol, contexto: v.ctx, instruccion: v.ins };
    const titulo = (prompt("Ponle un nombre al prompt") || "").trim();
    if (!titulo) return;
    mi.items.unshift({ id: nuevoId("mio"), grupo: "Escritos por mí", titulo, ...base, orig: { ...base }, extras: [] });
    guardarMi(); pintarMi();
    toast("Guardado en tus prompts");
  };
  async function ia(prompt, boton, etiqueta) {
    const sal = $("#lab-salida");
    boton.disabled = true; boton.textContent = "Pensando...";
    sal.innerHTML = '<span class="code">/respuesta de la IA, un borrador que debes verificar</span><div></div>';
    try { await correr(prompt, sal.lastElementChild); }
    catch (e) { sal.lastElementChild.innerHTML = `<span class="err">${esc(e.message)}</span>`; }
    boton.disabled = false; boton.textContent = etiqueta;
  }
  $("#lab-probar").onclick = (e) => {
    const v = valores();
    if (!v.rol && !v.ctx && !v.ins) { toast("Escribe algo primero"); return; }
    ia(labTexto(), e.currentTarget, "Probar con IA");
  };
  $("#lab-mejorar").onclick = (e) => {
    const v = valores();
    if (!v.rol && !v.ctx && !v.ins) { toast("Escribe algo primero"); return; }
    ia(`Eres un experto en ingeniería de prompts para abogados colombianos. Revisa este prompt escrito con el método Rol, Contexto, Instrucción y devuelve:\n1. Un diagnóstico en tres viñetas de lo que le falta (rol, contexto, instrucción).\n2. La versión mejorada, en tres bloques ROL, CONTEXTO e INSTRUCCIÓN. Conserva los datos que ya trae, deja entre [corchetes] lo que la persona debe completar, y agrega al final de la instrucción qué no debe hacer la IA y que marque con [verificar] toda norma que no pueda sustentar.\nNo uses rayas largas. No inventes normas ni sentencias.\n\nPROMPT A REVISAR\n${labTexto()}`, e.currentTarget, "Mejorar con IA");
  };
  // Auto-ajuste de altura para que el texto extendido se vea completo
  const ajustar = (ta) => { ta.style.height = "auto"; ta.style.height = ta.scrollHeight + 2 + "px"; };
  Object.values(F).forEach((x) => x.addEventListener("input", () => ajustar(x)));
  const ajustarTodos = () => Object.values(F).forEach(ajustar);

  // Extender con IA: de un borrador corto a un prompt completo con sangría
  let antesDeExtender = null;
  $("#lab-expandir").onclick = async (e) => {
    const v = valores();
    if (!v.rol && !v.ctx && !v.ins) { toast("Escribe una idea en alguna de las tres partes"); return; }
    const btn = e.currentTarget; btn.disabled = true; btn.textContent = "Extendiendo...";
    $("#lab-exp-estado").textContent = "Tarda unos 30 segundos";
    try {
      const r = await api("/api/expandir", { rol: v.rol, contexto: v.ctx, instruccion: v.ins, perfil: perfilListo() ? perfilEnvio() : null });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Error");
      antesDeExtender = v;
      F.rol.value = j.rol; F.ctx.value = j.contexto; F.ins.value = j.instruccion;
      evaluar(); ajustarTodos();
      $("#lab-deshacer").hidden = false;
      $("#lab-exp-estado").textContent = "Listo. Revisa, completa los [corchetes] y ajusta.";
    } catch (err) { $("#lab-exp-estado").textContent = err.message; }
    btn.disabled = false; btn.textContent = "Extender con IA";
  };
  $("#lab-deshacer").onclick = () => {
    if (!antesDeExtender) return;
    F.rol.value = antesDeExtender.rol; F.ctx.value = antesDeExtender.ctx; F.ins.value = antesDeExtender.ins;
    antesDeExtender = null; $("#lab-deshacer").hidden = true; $("#lab-exp-estado").textContent = "Volví a tu borrador.";
    evaluar(); ajustarTodos();
  };

  const guardadoLab = leer("lab", null);
  if (guardadoLab) { F.rol.value = guardadoLab.rol; F.ctx.value = guardadoLab.ctx; F.ins.value = guardadoLab.ins; }

  // ---------- arranque ----------
  pintarPerfil();
  pintarTareas();
  chipsLib();
  evaluar();
  ajustarTodos();
  modo("nuevo");
  vista();
  pestana(leer("tab", "mi"));
})();
