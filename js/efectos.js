/**
 * Utilidades de Colisión, Geometría, Efectos Visuales Compartidos,
 * Sacudida de Pantalla (Screen Shake) y Renderizado de Nave Elegida.
 */
window.Guardianes = window.Guardianes || {};

(function(G) {
    // Selección de nave para cada stage (por defecto: Stage 1 -> Nave 1, Stage 2 -> Nave 2, Stage 3 -> Nave 3)
    const navesPorStage = {
        1: 1,
        2: 2,
        3: 3
    };

    // Estado de sacudida de pantalla (Screen Shake)
    let sacudidaRestante = 0;
    let sacudidaDuracionTotal = 0;
    let sacudidaIntensidad = 0;

    function configurarNaveParaStage(stage, tipoNave) {
        if ([1, 2, 3].includes(stage) && [1, 2, 3].includes(Number(tipoNave))) {
            navesPorStage[stage] = Number(tipoNave);
        }
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
        // Atenuación suave hacia el final, manteniendo fuerza durante la entrada del jefe
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

    G.Efectos = {
        seSuperponen,
        circuloTocaRectangulo,
        obtenerColorRGBA,
        dibujarHUDSuperior,
        configurarNaveParaStage,
        obtenerNaveParaStage,
        dibujarNaveJugador,
        iniciarSacudida,
        detenerSacudida,
        actualizarSacudida,
        obtenerDesplazamientoSacudida
    };
})(window.Guardianes);
