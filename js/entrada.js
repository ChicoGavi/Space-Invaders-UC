/**
 * Gestor unificado de Entrada (Input Manager):
 * - Teclado (Flechas, WASD, Espacio, P, Escape, Enter)
 * - Disparo con clic izquierdo del mouse (mantener presionado o hacer clic sobre el escenario/canvas)
 * - Controles táctiles móviles (Joystick analógico con Pointer Capture, botón de disparo, botón de pausa)
 * - Gestión de pantalla completa y bloqueo de orientación horizontal en móviles
 */
window.Guardianes = window.Guardianes || {};

(function(G) {
    const teclasPresionadas = new Set();
    const direccionTactil = { x: 0, y: 0 };
    let disparoTactilPresionado = false;
    let disparoMousePresionado = false;

    let canvasJuego = null;
    let joystick = null;
    let joystickPerilla = null;
    let botonDisparo = null;
    let botonPausaMovil = null;
    let botonOrientacion = null;
    let estadoOrientacion = null;

    let callbacks = {
        alAlternarPausa: null,
        alConfirmarEnter: null,
        estaJugando: null
    };

    function inicializarEntrada(configCallbacks) {
        callbacks = Object.assign(callbacks, configCallbacks);

        canvasJuego = document.getElementById("juego");
        joystick = document.getElementById("joystick");
        joystickPerilla = document.getElementById("joystick-perilla");
        botonDisparo = document.getElementById("boton-disparo");
        botonPausaMovil = document.getElementById("boton-pausa");
        botonOrientacion = document.getElementById("boton-orientacion");
        estadoOrientacion = document.getElementById("orientacion-estado");

        registrarEventosTeclado();
        registrarEventosMouse();
        registrarEventosTactiles();
    }

    function normalizarTecla(evento) {
        if (evento.code === "Space") return "space";
        if (evento.code === "ArrowLeft" || evento.code === "KeyA") return "left";
        if (evento.code === "ArrowRight" || evento.code === "KeyD") return "right";
        if (evento.code === "ArrowUp" || evento.code === "KeyW") return "up";
        if (evento.code === "ArrowDown" || evento.code === "KeyS") return "down";
        if (evento.code === "KeyP") return "p";
        if (evento.code === "Escape") return "escape";
        if (evento.code === "Enter") return "enter";
        return evento.key ? evento.key.toLowerCase() : "";
    }

    function registrarEventosTeclado() {
        window.addEventListener("keydown", function(evento) {
            const tecla = normalizarTecla(evento);

            if (["left", "right", "up", "down", "space", "p", "escape"].includes(tecla)) {
                evento.preventDefault();
            }

            if ((tecla === "p" || tecla === "escape") && !evento.repeat) {
                if (typeof callbacks.alAlternarPausa === "function") {
                    callbacks.alAlternarPausa();
                }
                return;
            }

            if (tecla === "enter" && !evento.repeat) {
                if (typeof callbacks.alConfirmarEnter === "function") {
                    callbacks.alConfirmarEnter();
                }
                return;
            }

            if (typeof callbacks.estaJugando === "function" && !callbacks.estaJugando()) {
                return;
            }

            if (["left", "right", "up", "down", "space"].includes(tecla)) {
                teclasPresionadas.add(tecla);
            }
        });

        window.addEventListener("keyup", function(evento) {
            const tecla = normalizarTecla(evento);
            teclasPresionadas.delete(tecla);
        });

        window.addEventListener("blur", function() {
            limpiarEntradas();
        });
    }

    function registrarEventosMouse() {
        if (!canvasJuego) return;

        canvasJuego.addEventListener("mousedown", function(evento) {
            // Botón 0 es el clic izquierdo del mouse
            if (evento.button !== 0) return;
            if (typeof callbacks.estaJugando === "function" && !callbacks.estaJugando()) {
                return;
            }
            evento.preventDefault();
            disparoMousePresionado = true;
        });

        window.addEventListener("mouseup", function(evento) {
            if (evento.button === 0) {
                disparoMousePresionado = false;
            }
        });

        window.addEventListener("contextmenu", function() {
            disparoMousePresionado = false;
        });
    }

    function actualizarJoystick(evento) {
        if (!joystick || !joystickPerilla) return;
        const rectangulo = joystick.getBoundingClientRect();
        const radioMaximo = Math.max(1, (rectangulo.width - joystickPerilla.offsetWidth) / 2);
        const centroX = rectangulo.left + rectangulo.width / 2;
        const centroY = rectangulo.top + rectangulo.height / 2;
        const desplazamientoX = evento.clientX - centroX;
        const desplazamientoY = evento.clientY - centroY;
        const distancia = Math.hypot(desplazamientoX, desplazamientoY);
        const escala = distancia > radioMaximo ? radioMaximo / distancia : 1;
        const perillaX = desplazamientoX * escala;
        const perillaY = desplazamientoY * escala;

        direccionTactil.x = perillaX / radioMaximo;
        direccionTactil.y = perillaY / radioMaximo;
        joystickPerilla.style.transform = `translate(${perillaX}px, ${perillaY}px)`;
    }

    function soltarJoystick() {
        direccionTactil.x = 0;
        direccionTactil.y = 0;
        if (joystickPerilla) {
            joystickPerilla.style.transform = "translate(0, 0)";
        }
    }

    function soltarDisparoTactil() {
        disparoTactilPresionado = false;
        if (botonDisparo) {
            botonDisparo.setAttribute("aria-pressed", "false");
        }
    }

    function limpiarEntradas() {
        teclasPresionadas.clear();
        soltarJoystick();
        soltarDisparoTactil();
        disparoMousePresionado = false;
    }

    function registrarEventosTactiles() {
        if (joystick) {
            joystick.addEventListener("pointerdown", function(evento) {
                if (typeof callbacks.estaJugando === "function" && !callbacks.estaJugando()) {
                    return;
                }
                evento.preventDefault();
                joystick.setPointerCapture(evento.pointerId);
                actualizarJoystick(evento);
            });

            joystick.addEventListener("pointermove", function(evento) {
                if (joystick.hasPointerCapture(evento.pointerId)) {
                    evento.preventDefault();
                    actualizarJoystick(evento);
                }
            });

            joystick.addEventListener("pointerup", soltarJoystick);
            joystick.addEventListener("pointercancel", soltarJoystick);
            joystick.addEventListener("lostpointercapture", soltarJoystick);
        }

        if (botonDisparo) {
            botonDisparo.addEventListener("pointerdown", function(evento) {
                if (typeof callbacks.estaJugando === "function" && !callbacks.estaJugando()) {
                    return;
                }
                evento.preventDefault();
                botonDisparo.setPointerCapture(evento.pointerId);
                disparoTactilPresionado = true;
                botonDisparo.setAttribute("aria-pressed", "true");
            });

            botonDisparo.addEventListener("pointerup", soltarDisparoTactil);
            botonDisparo.addEventListener("pointercancel", soltarDisparoTactil);
            botonDisparo.addEventListener("lostpointercapture", soltarDisparoTactil);
        }

        if (botonPausaMovil) {
            botonPausaMovil.addEventListener("click", function() {
                if (typeof callbacks.alAlternarPausa === "function") {
                    callbacks.alAlternarPausa();
                }
            });
        }

        if (botonOrientacion) {
            botonOrientacion.addEventListener("click", async function() {
                if (estadoOrientacion) estadoOrientacion.textContent = "";
                const aviso = await entrarPantallaCompleta();
                if (aviso && estadoOrientacion) {
                    estadoOrientacion.textContent = aviso;
                }
            });
        }
    }

    function actualizarBotonPausaMovil(estaPausado) {
        if (!botonPausaMovil) return;
        botonPausaMovil.textContent = estaPausado ? "▶" : "Ⅱ";
        botonPausaMovil.setAttribute("aria-label", estaPausado ? "Reanudar juego" : "Pausar juego");
        botonPausaMovil.setAttribute("aria-pressed", String(estaPausado));
    }

    async function entrarPantallaCompleta() {
        try {
            if (!document.fullscreenElement) {
                if (!document.documentElement.requestFullscreen) {
                    throw new Error("Este navegador no permite pantalla completa.");
                }
                await document.documentElement.requestFullscreen();
            }
        } catch (error) {
            console.warn("No se pudo activar la pantalla completa:", error);
            return "El navegador no permitió pantalla completa. Puedes continuar girando el celular.";
        }

        if (screen.orientation && screen.orientation.lock) {
            try {
                await screen.orientation.lock("landscape");
            } catch (error) {
                console.warn("No se pudo bloquear la orientación horizontal:", error);
                if (window.matchMedia("(orientation: portrait)").matches) {
                    return "Pantalla completa activada. Gira el celular manualmente para continuar.";
                }
            }
        } else if (window.matchMedia("(orientation: portrait)").matches) {
            return "Pantalla completa activada. Gira el celular manualmente para continuar.";
        }

        return "";
    }

    function obtenerVectorMovimiento() {
        const izquierda = teclasPresionadas.has("left");
        const derecha = teclasPresionadas.has("right");
        const arriba = teclasPresionadas.has("up");
        const abajo = teclasPresionadas.has("down");

        let dx = Math.max(-1, Math.min(1, Number(derecha) - Number(izquierda) + direccionTactil.x));
        let dy = Math.max(-1, Math.min(1, Number(abajo) - Number(arriba) + direccionTactil.y));

        const magnitud = Math.hypot(dx, dy);
        if (magnitud > 1) {
            dx /= magnitud;
            dy /= magnitud;
        }

        return { x: dx, y: dy };
    }

    function estaDisparando() {
        return teclasPresionadas.has("space") || disparoTactilPresionado || disparoMousePresionado;
    }

    G.Entrada = {
        inicializarEntrada,
        limpiarEntradas,
        obtenerVectorMovimiento,
        estaDisparando,
        actualizarBotonPausaMovil,
        entrarPantallaCompleta
    };
})(window.Guardianes);
