/**
 * Utilidades de Colisión, Geometría, Efectos Visuales Compartidos,
 * Sacudida de Pantalla (Screen Shake), Desbloqueo Progresivo y Persistencia en localStorage.
 */
window.Guardianes = window.Guardianes || {};

(function(G) {
    function esModoPruebas() {
        const ruta = window.location.pathname || "";
        const hash = window.location.hash || "";
        const search = window.location.search || "";
        return Boolean(
            window.GUARDIANES_MODO_PRUEBAS ||
            ruta.includes("/pruebas") ||
            hash === "#pruebas" ||
            hash === "#/pruebas" ||
            search.includes("pruebas=1")
        );
    }

    const CLAVE_STORAGE = esModoPruebas()
        ? "guardianes_del_eje_pruebas_v1"
        : "guardianes_del_eje_sesion_v1";

    // Selección de nave para cada stage (por defecto: Stage 1 -> Nave 1, Stage 2 -> Nave 2, Stage 3 -> Nave 3)
    const navesPorStage = {
        1: 1,
        2: 2,
        3: 3
    };

    const stagesDesbloqueados = {
        1: true,
        2: esModoPruebas(),
        3: esModoPruebas()
    };

    const navesDesbloqueadasGlobal = {
        1: true,
        2: esModoPruebas(),
        3: esModoPruebas()
    };

    // Estado de sesión persistido para sobrevivir a recargas de página
    const sesionGuardada = {
        stageActual: 1,
        puntuacionTotal: 0,
        puntuacionInicioStage: 0,
        mejorPuntuacion: 0,
        ultimoEstadoMenu: "menu" // "menu", "stage1-completado", "stage2-completado", "victoria"
    };

    // Estado de sacudida de pantalla (Screen Shake)
    let sacudidaRestante = 0;
    let sacudidaDuracionTotal = 0;
    let sacudidaIntensidad = 0;

    function guardarProgresoEnStorage() {
        try {
            const payload = {
                navesPorStage: Object.assign({}, navesPorStage),
                stagesDesbloqueados: Object.assign({}, stagesDesbloqueados),
                navesDesbloqueadasGlobal: Object.assign({}, navesDesbloqueadasGlobal),
                sesion: Object.assign({}, sesionGuardada)
            };
            const serializado = JSON.stringify(payload);
            if (window.localStorage) {
                window.localStorage.setItem(CLAVE_STORAGE, serializado);
            }
            if (window.sessionStorage) {
                window.sessionStorage.setItem(CLAVE_STORAGE, serializado);
            }
        } catch (error) {
            console.warn("No se pudo guardar la sesión en Web Storage:", error);
        }
    }

    function cargarProgresoDesdeStorage() {
        try {
            const raw = (window.localStorage && window.localStorage.getItem(CLAVE_STORAGE)) ||
                        (window.sessionStorage && window.sessionStorage.getItem(CLAVE_STORAGE));
            if (!raw) return false;
            const datos = JSON.parse(raw);
            if (!datos || typeof datos !== "object") return false;

            if (datos.stagesDesbloqueados) {
                stagesDesbloqueados[1] = true;
                stagesDesbloqueados[2] = esModoPruebas() || Boolean(datos.stagesDesbloqueados[2]);
                stagesDesbloqueados[3] = esModoPruebas() || Boolean(datos.stagesDesbloqueados[3]);
            }
            if (datos.navesDesbloqueadasGlobal) {
                navesDesbloqueadasGlobal[1] = true;
                navesDesbloqueadasGlobal[2] = esModoPruebas() || Boolean(datos.navesDesbloqueadasGlobal[2]);
                navesDesbloqueadasGlobal[3] = esModoPruebas() || Boolean(datos.navesDesbloqueadasGlobal[3]);
            }
            if (datos.navesPorStage) {
                for (const st of [1, 2, 3]) {
                    const nv = Number(datos.navesPorStage[st]);
                    if ([1, 2, 3].includes(nv) && estaNaveHabilitadaParaStage(st, nv)) {
                        navesPorStage[st] = nv;
                    }
                }
            }
            if (datos.sesion && typeof datos.sesion === "object") {
                if ([1, 2, 3].includes(Number(datos.sesion.stageActual))) {
                    sesionGuardada.stageActual = Number(datos.sesion.stageActual);
                }
                if (typeof datos.sesion.puntuacionTotal === "number") {
                    sesionGuardada.puntuacionTotal = Math.max(0, datos.sesion.puntuacionTotal);
                }
                if (typeof datos.sesion.puntuacionInicioStage === "number") {
                    sesionGuardada.puntuacionInicioStage = Math.max(0, datos.sesion.puntuacionInicioStage);
                }
                if (typeof datos.sesion.mejorPuntuacion === "number") {
                    sesionGuardada.mejorPuntuacion = Math.max(0, datos.sesion.mejorPuntuacion);
                }
                if (typeof datos.sesion.ultimoEstadoMenu === "string") {
                    sesionGuardada.ultimoEstadoMenu = datos.sesion.ultimoEstadoMenu;
                }
            }
            return true;
        } catch (error) {
            console.warn("No se pudo restaurar la sesión desde Web Storage:", error);
            return false;
        }
    }

    function actualizarSesion(cambios) {
        if (!cambios || typeof cambios !== "object") return;
        Object.assign(sesionGuardada, cambios);
        if (sesionGuardada.puntuacionTotal > sesionGuardada.mejorPuntuacion) {
            sesionGuardada.mejorPuntuacion = sesionGuardada.puntuacionTotal;
        }
        guardarProgresoEnStorage();
    }

    function obtenerSesion() {
        return Object.assign({}, sesionGuardada);
    }

    function estaStageDesbloqueado(stage) {
        if (esModoPruebas()) return true;
        return Boolean(stagesDesbloqueados[stage]);
    }

    function desbloquearStage(stage) {
        if ([1, 2, 3].includes(Number(stage))) {
            stagesDesbloqueados[Number(stage)] = true;
            guardarProgresoEnStorage();
        }
    }

    function desbloquearNave(tipoNave) {
        if ([1, 2, 3].includes(Number(tipoNave))) {
            navesDesbloqueadasGlobal[Number(tipoNave)] = true;
            guardarProgresoEnStorage();
        }
    }

    /**
     * Una nave puede seleccionarse en un Stage si:
     * - Es la nave por defecto de ese Stage (stage === tipoNave), O
     * - Ya fue desbloqueada al superar su Stage correspondiente.
     */
    function estaNaveHabilitadaParaStage(stage, tipoNave) {
        if (esModoPruebas()) return true;
        const st = Number(stage);
        const nv = Number(tipoNave);
        if (st === nv) return true;
        return Boolean(navesDesbloqueadasGlobal[nv]);
    }

    function configurarNaveParaStage(stage, tipoNave) {
        const st = Number(stage);
        const nv = Number(tipoNave);
        if ([1, 2, 3].includes(st) && [1, 2, 3].includes(nv)) {
            if (estaNaveHabilitadaParaStage(st, nv)) {
                navesPorStage[st] = nv;
                guardarProgresoEnStorage();
                return true;
            }
        }
        return false;
    }

    function obtenerNaveParaStage(stage) {
        return navesPorStage[stage] || stage;
    }

    /**
     * Inicia una sacudida de pantalla durante `duracionSegundos` con `intensidadPx` píxeles máximos.
     */
    function iniciarSacudida(duracionSegundos, intensidadPx) {
        sacudidaDuracionTotal = duracionSegundos || 2.4;
        sacudidaRestante = sacudidaDuracionTotal;
        sacudidaIntensidad = intensidadPx || 9;
    }

    function detenerSacudida() {
        sacudidaRestante = 0;
    }

    function actualizarSacudida(deltaSegundos) {
        if (sacudidaRestante > 0) {
            sacudidaRestante = Math.max(0, sacudidaRestante - deltaSegundos);
        }
    }

    function obtenerDesplazamientoSacudida() {
        if (sacudidaRestante <= 0 || sacudidaDuracionTotal <= 0) {
            return { x: 0, y: 0, activa: false };
        }
        const progreso = sacudidaRestante / sacudidaDuracionTotal;
        const factor = Math.min(1, progreso * 1.35);
        const magnitud = sacudidaIntensidad * factor;
        return {
            x: (Math.random() * 2 - 1) * magnitud,
            y: (Math.random() * 2 - 1) * magnitud,
            activa: true
        };
    }

    /**
     * Dibuja la nave del jugador seleccionada para el stage actual, respetando los 4 estados
     * si el jugador eligió la Nave 3 (Nave de Cristal), o el sprite correspondiente de Nave 1 / Nave 2.
     */
    function dibujarNaveJugador(ctx, stageActual, jugador, opciones) {
        const tipoNave = obtenerNaveParaStage(stageActual);
        const opt = opciones || {};
        const inclinacion = jugador.inclinacion || 0;

        ctx.save();
        ctx.translate(jugador.x + jugador.ancho / 2, jugador.y + jugador.alto / 2);
        ctx.rotate(inclinacion);

        if (tipoNave === 1) {
            const img = G.Recursos.imagenes.stage1.jugador;
            ctx.imageSmoothingEnabled = true;
            if (opt.estaMejorado) {
                ctx.shadowColor = "#48f5ff";
                ctx.shadowBlur = 14;
            }
            ctx.drawImage(
                img,
                -jugador.ancho / 2,
                -jugador.alto / 2,
                jugador.ancho,
                jugador.alto
            );
        } else if (tipoNave === 2) {
            const img = G.Recursos.imagenes.stage2.jugador;
            ctx.imageSmoothingEnabled = false;
            if (opt.estaMejorado) {
                ctx.shadowColor = "#48f5ff";
                ctx.shadowBlur = 14;
            }
            ctx.drawImage(
                img,
                -jugador.ancho / 2,
                -jugador.alto / 2,
                jugador.ancho,
                jugador.alto
            );
        } else {
            // Tipo 3: Nave de Cristal con sus 4 estados (IDLE, DISPARO, UPGRADED, DAMAGE)
            const imgs3 = G.Recursos.imagenes.stage3;
            ctx.imageSmoothingEnabled = true;
            let sprite = imgs3.jugadorIdle;
            if (opt.enDanio) {
                sprite = imgs3.jugadorDamage;
            } else if (opt.estaMejorado) {
                sprite = imgs3.jugadorUpgraded;
            } else if (opt.disparandoReciente) {
                sprite = imgs3.jugadorDisparo;
            }

            const esDisparo = sprite === imgs3.jugadorDisparo;
            const esUpgraded = sprite === imgs3.jugadorUpgraded;
            const dibujoAncho = esUpgraded ? jugador.ancho + 18 : jugador.ancho;
            const dibujoAlto = esDisparo ? jugador.alto + 18 : jugador.alto;
            const offsetY = esDisparo ? -14 : 0;

            ctx.shadowColor = esUpgraded ? "#55f7ff" : "#e055ff";
            ctx.shadowBlur = 14;
            ctx.drawImage(
                sprite,
                -dibujoAncho / 2,
                -jugador.alto / 2 + offsetY,
                dibujoAncho,
                dibujoAlto
            );
        }

        ctx.restore();
    }

    /**
     * Colisión AABB (Axis-Aligned Bounding Box) entre dos rectángulos {x, y, ancho, alto}.
     */
    function seSuperponen(a, b) {
        return a.x < b.x + b.ancho &&
            a.x + a.ancho > b.x &&
            a.y < b.y + b.alto &&
            a.y + a.alto > b.y;
    }

    /**
     * Colisión entre un círculo (centroX, centroY, radio) y un rectángulo {x, y, ancho, alto}.
     */
    function circuloTocaRectangulo(centroX, centroY, radio, rectangulo) {
        const puntoX = Math.max(rectangulo.x, Math.min(centroX, rectangulo.x + rectangulo.ancho));
        const puntoY = Math.max(rectangulo.y, Math.min(centroY, rectangulo.y + rectangulo.alto));
        const distanciaX = centroX - puntoX;
        const distanciaY = centroY - puntoY;

        return distanciaX * distanciaX + distanciaY * distanciaY <= radio * radio;
    }

    /**
     * Convierte un color hexadecimal (#rrggbb) en una función generadora de strings rgba().
     */
    function obtenerColorRGBA(colorHex) {
        const rojo = parseInt(colorHex.slice(1, 3), 16);
        const verde = parseInt(colorHex.slice(3, 5), 16);
        const azul = parseInt(colorHex.slice(5, 7), 16);
        return function(alfa) {
            return `rgba(${rojo}, ${verde}, ${azul}, ${alfa})`;
        };
    }

    /**
     * Dibuja el HUD superior unificado (Vidas, Puntuación, Stage actual y Reloj opcional).
     */
    function dibujarHUDSuperior(ctx, canvas, datosHUD) {
        ctx.save();
        // Panel izquierdo: Vidas y Stage
        ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
        ctx.fillRect(12, 12, 168, 34);
        ctx.fillStyle = "#ffffff";
        ctx.font = "17px Arial";
        ctx.textAlign = "left";
        ctx.fillText(`Stage ${datosHUD.stage} | Vidas: ${datosHUD.vidas}`, 22, 35);

        // Panel central: Puntuación
        ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
        ctx.fillRect(canvas.width / 2 - 85, 12, 170, 34);
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText(`Puntos: ${datosHUD.puntuacion}`, canvas.width / 2, 35);

        // Panel derecho: Tiempo o Progreso
        if (datosHUD.textoDerecho) {
            ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
            ctx.fillRect(canvas.width - 104, 12, 92, 34);
            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.fillText(datosHUD.textoDerecho, canvas.width - 58, 35);
        }
        ctx.restore();
    }

    // Cargar estado guardado inmediatamente al inicializar el módulo
    cargarProgresoDesdeStorage();

    G.Efectos = {
        seSuperponen,
        circuloTocaRectangulo,
        obtenerColorRGBA,
        dibujarHUDSuperior,
        esModoPruebas,
        cargarProgresoDesdeStorage,
        guardarProgresoEnStorage,
        actualizarSesion,
        obtenerSesion,
        estaStageDesbloqueado,
        desbloquearStage,
        desbloquearNave,
        estaNaveHabilitadaParaStage,
        configurarNaveParaStage,
        obtenerNaveParaStage,
        dibujarNaveJugador,
        iniciarSacudida,
        detenerSacudida,
        actualizarSacudida,
        obtenerDesplazamientoSacudida
    };
})(window.Guardianes);
