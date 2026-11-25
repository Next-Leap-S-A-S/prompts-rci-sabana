/* Modo estatico: el generador entrega prompts pregenerados (js/generados.js) y no usa servidor. */
window.MODO_ESTATICO = true;
window.API_BASE = "";
/* Codigo de la clase. En modo estatico se comprueba en el navegador: barrera de cortesia, no de seguridad. */
window.CLASE_CODIGOS = ["SABANA2026"];
document.documentElement.classList.toggle("estatico", !!window.MODO_ESTATICO);
