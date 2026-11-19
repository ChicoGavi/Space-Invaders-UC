/**
 * Gestor centralizado de recursos gráficos para Guardianes del Eje (Stage 1, Stage 2 y Stage 3).
 * Garantiza que todas las imágenes necesarias estén cargadas antes de iniciar la simulación.
 */
window.Guardianes = window.Guardianes || {};

(function(G) {
    const definicionRecursos = {
        stage1: {
            fondo: "img/Stage_1.jpg",
            jugador: "img/jugador.png",
            destruccion: "img/Nave_Destruida.png",
            potenciador: "img/Power_up_stage1.png",
            enemigo1: "img/Enemigo_1_Stage_1.png",
            enemigo2: "img/Enemigo_2_Stage_1_sprite.png",
            enemigo3: "img/Enemigo_3_Stage_1.png",
            jefeFinal: "img/Final_boss_stage_1_sprite.png"
        },
        stage2: {
            fondo: "img/stage_2.png",
            jugador: "img/jugador_stage_2.gif",
            enemigo1: "img/enemigo_1_stage_2.gif",
            enemigo2: "img/enemigo_2_stage_2.png",
            enemigo3: "img/enemigo_3_stage_2.gif",
            enemigo4: "img/enemigo_4_stage_2.gif"
        },
        stage3: {
            fondo: "img/stage_3.png?v=3.1",
            jugadorIdle: "img/jugador_stage_3_idle.png",
            jugadorDisparo: "img/jugador_stage_3_disparo.png",
            jugadorUpgraded: "img/jugador_stage_3_upgraded.png",
            jugadorDamage: "img/jugador_stage_3_damage.png",
            enemigo1: "img/enemigo_1_stage_3.png",
            enemigo2: "img/enemigo_2_stage_3.png",
            enemigo3: "img/enemigo_3_stage_3.png",
            enemigo4: "img/enemigo_4_stage_3.png",
            jefeIdle: "img/jefe_stage_3_idle.png",
            jefeCarga: "img/jefe_stage_3_carga.png",
            jefeLaser: "img/jefe_stage_3_laser.png",
            jefeDerrotado: "img/jefe_stage_3_derrotado.png"
        }
    };

    const imagenes = {
        stage1: {},
        stage2: {},
        stage3: {}
    };

    const listaImagenes = [];
    let errorCarga = false;
    let recursoFallido = "";

    function inicializarRecursos(alCambiarEstadoCarga) {
        for (const [etapa, mapaRutas] of Object.entries(definicionRecursos)) {
            for (const [clave, ruta] of Object.entries(mapaRutas)) {
                const img = new Image();
                img.onload = function() {
                    if (typeof alCambiarEstadoCarga === "function") {
                        alCambiarEstadoCarga();
                    }
                };
                img.onerror = function() {
                    console.error(`No se pudo cargar el recurso gráfico: ${ruta}`);
                    errorCarga = true;
                    recursoFallido = ruta;
                    if (typeof alCambiarEstadoCarga === "function") {
                        alCambiarEstadoCarga();
                    }
                };
                img.src = ruta;
                imagenes[etapa][clave] = img;
                listaImagenes.push(img);
            }
        }
    }

    function estanListos() {
        return !errorCarga && listaImagenes.length > 0 && listaImagenes.every(function(img) {
            return img.complete && img.naturalWidth > 0;
        });
    }

    function hayError() {
        return errorCarga;
    }

    function obtenerRecursoFallido() {
        return recursoFallido;
    }

    G.Recursos = {
        imagenes,
        inicializarRecursos,
        estanListos,
        hayError,
        obtenerRecursoFallido
    };
})(window.Guardianes);
