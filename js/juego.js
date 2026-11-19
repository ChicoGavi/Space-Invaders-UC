/**
 * Controlador Principal — Guardianes del Eje (Stage 1, Stage 2 y Stage 3).
 * Responsabilidades:
 * - Máquina de estados única ("menu", "naves", "jugando", "pausado", "stage1-completado", "stage2-completado", "victoria", "derrota", "tiempo-agotado")
 * - Único Game Loop (requestAnimationFrame) con guardia rafActivo y deltaSegundos limitado a 0.05s
 * - Orquestación entre Stage 1, Stage 2 y Stage 3, conservando puntuación en modo campaña
 * - Selector de Naves por Stage y aplicación de sacudida de pantalla (Screen Shake) al aparecer cada Jefe Final
 */
window.Guardianes = window.Guardianes || {};

(function(G) {
    const canvas = document.getElementById("juego");
    const ctx = canvas.getContext("2d");

    const panelJuego = document.getElementById("panel-juego");
    const tituloPanel = document.getElementById("titulo-panel");
    const textoPanel = document.getElementById("texto-panel");
    const estadoInicio = document.getElementById("estado-inicio");
    const selectorNaves = document.getElementById("selector-naves");

    const botonIniciarStage1 = document.getElementById("iniciar-stage1");
    const botonIniciarStage2 = document.getElementById("iniciar-stage2");
    const botonIniciarStage3 = document.getElementById("iniciar-stage3");
    const botonAbrirNaves = document.getElementById("abrir-naves");
    const botonCerrarNaves = document.getElementById("cerrar-naves");
    const botonSiguienteStage = document.getElementById("siguiente-stage");
    const botonContinuar = document.getElementById("continuar-juego");
    const botonReiniciar = document.getElementById("reiniciar-juego");
    const botonMenu = document.getElementById("menu-principal");
    const botonesOpcionNave = document.querySelectorAll(".opcion-nave");

    let stageActual = 1;
    let estadoJuego = "menu";
    let puntuacionTotal = 0;
    let puntuacionInicioStage = 0;
    let ultimoFrame = null;
    let rafActivo = false;

    const contextoJuego = {
        get estado() {
            return estadoJuego;
        },
        get puntuacion() {
            return puntuacionTotal;
        },
        sumarPuntos(puntos) {
            puntuacionTotal += puntos;
        },
        alCompletarStage1() {
            cambiarEstado("stage1-completado");
        },
        alCompletarStage2() {
            cambiarEstado("stage2-completado");
        },
        alGanarJuego() {
            cambiarEstado("victoria");
        },
        alPerderPartida() {
            cambiarEstado("derrota");
        },
        alAgotarTiempo() {
            cambiarEstado("tiempo-agotado");
        }
    };

    function obtenerModuloStage() {
        if (stageActual === 1) return G.Stage1;
        if (stageActual === 2) return G.Stage2;
        return G.Stage3;
    }

    function mostrarMensajeCanvas(mensaje) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#081021";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ffffff";
        ctx.font = "20px Arial";
        ctx.textAlign = "center";
        ctx.fillText(mensaje, canvas.width / 2, canvas.height / 2);
    }

    function sincronizarTarjetasNaves() {
        botonesOpcionNave.forEach(function(boton) {
            const st = Number(boton.getAttribute("data-stage"));
            const nv = Number(boton.getAttribute("data-nave"));
            const seleccionada = G.Efectos.obtenerNaveParaStage(st) === nv;
            boton.classList.toggle("activa", seleccionada);
            boton.setAttribute("aria-pressed", String(seleccionada));
        });
    }

    function actualizarPanel() {
        const estadosConPanel = [
            "menu",
            "naves",
            "pausado",
            "stage1-completado",
            "stage2-completado",
            "victoria",
            "derrota",
            "tiempo-agotado"
        ];
        const mostrar = estadosConPanel.includes(estadoJuego);
        panelJuego.hidden = !mostrar;

        const esTransicionStage = estadoJuego === "stage1-completado" || estadoJuego === "stage2-completado";
        botonIniciarStage1.hidden = estadoJuego !== "menu";
        botonIniciarStage2.hidden = estadoJuego !== "menu";
        botonIniciarStage3.hidden = estadoJuego !== "menu";
        botonAbrirNaves.hidden = estadoJuego !== "menu";
        botonCerrarNaves.hidden = estadoJuego !== "naves";
        selectorNaves.hidden = estadoJuego !== "naves";
        botonSiguienteStage.hidden = !esTransicionStage;
        botonContinuar.hidden = estadoJuego !== "pausado";
        botonReiniciar.hidden = ["menu", "naves", "stage1-completado", "stage2-completado"].includes(estadoJuego);
        botonMenu.hidden = estadoJuego === "menu" || estadoJuego === "naves";

        if (estadoJuego === "stage1-completado") {
            botonSiguienteStage.textContent = "Avanzar al Stage 2";
        } else if (estadoJuego === "stage2-completado") {
            botonSiguienteStage.textContent = "Avanzar al Stage 3";
        }

        G.Entrada.actualizarBotonPausaMovil(estadoJuego === "pausado");

        if (estadoJuego === "menu") {
            tituloPanel.textContent = "Guardianes del Eje";
            textoPanel.textContent = "Prepárate para defender el eje. Selecciona una misión o personaliza tus naves.";
        } else if (estadoJuego === "naves") {
            tituloPanel.textContent = "Hangar de Naves";
            textoPanel.textContent = "Elige qué nave utilizar en cada Stage:";
            sincronizarTarjetasNaves();
        } else if (estadoJuego === "pausado") {
            tituloPanel.textContent = "Juego pausado";
            textoPanel.textContent = `Stage ${stageActual} en pausa. Presiona P, ESC o Continuar.`;
        } else if (estadoJuego === "stage1-completado") {
            tituloPanel.textContent = "STAGE 1 COMPLETED";
            textoPanel.textContent = `¡Has defendido el primer sector! Puntuación acumulada: ${puntuacionTotal}`;
        } else if (estadoJuego === "stage2-completado") {
            tituloPanel.textContent = "STAGE 2 COMPLETED";
            textoPanel.textContent = `¡Sector exterior despejado! Adéntrate en las Cavernas de Cristal. Puntuación: ${puntuacionTotal}`;
        } else if (estadoJuego === "victoria") {
            tituloPanel.textContent = "¡VICTORIA TOTAL!";
            textoPanel.textContent = `¡Has destruido a The Crystal Arch-Dreadnought y salvado el eje! Puntuación final: ${puntuacionTotal}`;
        } else if (estadoJuego === "derrota") {
            tituloPanel.textContent = "Fin del juego";
            textoPanel.textContent = `Tu nave fue destruida en el Stage ${stageActual}. Puntuación: ${puntuacionTotal}`;
        } else if (estadoJuego === "tiempo-agotado") {
            tituloPanel.textContent = "Tiempo agotado";
            textoPanel.textContent = `El jefe del Stage ${stageActual} no fue derrotado a tiempo. Puntuación: ${puntuacionTotal}`;
        }
    }

    function cambiarEstado(nuevoEstado) {
        estadoJuego = nuevoEstado;
        G.Entrada.limpiarEntradas();
        if (nuevoEstado !== "jugando") {
            G.Efectos.detenerSacudida();
        }
        actualizarPanel();
        if (nuevoEstado === "jugando") {
            ultimoFrame = null;
            solicitarFrame();
        }
    }

    function solicitarFrame() {
        if (rafActivo) return;
        rafActivo = true;
        requestAnimationFrame(bucleJuego);
    }

    async function prepararPantallaMovil() {
        if (estadoInicio) estadoInicio.textContent = "";
        const esMovil = window.matchMedia("(pointer: coarse), (max-width: 700px)").matches;
        if (esMovil) {
            const aviso = await G.Entrada.entrarPantallaCompleta();
            if (aviso && estadoInicio) {
                estadoInicio.textContent = aviso;
            }
        }
    }

    async function iniciarPartidaEnStage(numeroStage, conservarPuntos) {
        await prepararPantallaMovil();
        stageActual = numeroStage;
        if (!conservarPuntos) {
            puntuacionTotal = 0;
        }
        puntuacionInicioStage = puntuacionTotal;
        G.Efectos.detenerSacudida();
        obtenerModuloStage().reiniciar(canvas);
        cambiarEstado("jugando");
    }

    function reiniciarStageActual() {
        puntuacionTotal = puntuacionInicioStage;
        G.Efectos.detenerSacudida();
        obtenerModuloStage().reiniciar(canvas);
        cambiarEstado("jugando");
    }

    function volverAlMenuPrincipal() {
        puntuacionTotal = 0;
        puntuacionInicioStage = 0;
        cambiarEstado("menu");
        dibujarEscenaActual();
    }

    function alternarPausa() {
        if (estadoJuego === "jugando") {
            cambiarEstado("pausado");
            dibujarEscenaActual();
        } else if (estadoJuego === "pausado") {
            cambiarEstado("jugando");
        }
    }

    function avanzarSiguienteStage() {
        if (estadoJuego === "stage1-completado") {
            iniciarPartidaEnStage(2, true);
        } else if (estadoJuego === "stage2-completado") {
            iniciarPartidaEnStage(3, true);
        }
    }

    function manejarTeclaEnter() {
        if (estadoJuego === "menu") {
            iniciarPartidaEnStage(1, false);
        } else if (estadoJuego === "naves") {
            cambiarEstado("menu");
        } else if (estadoJuego === "stage1-completado" || estadoJuego === "stage2-completado") {
            avanzarSiguienteStage();
        } else if (["derrota", "victoria", "tiempo-agotado"].includes(estadoJuego)) {
            reiniciarStageActual();
        }
    }

    function dibujarEscenaActual() {
        if (G.Recursos.hayError()) {
            mostrarMensajeCanvas(`Error al cargar: ${G.Recursos.obtenerRecursoFallido()}`);
            return;
        }
        if (!G.Recursos.estanListos()) {
            mostrarMensajeCanvas("Cargando recursos del juego...");
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const sacudida = G.Efectos.obtenerDesplazamientoSacudida();
        if (sacudida.activa) {
            ctx.save();
            ctx.translate(sacudida.x, sacudida.y);
            obtenerModuloStage().dibujar(ctx, canvas, contextoJuego);
            ctx.restore();
        } else {
            obtenerModuloStage().dibujar(ctx, canvas, contextoJuego);
        }
    }

    function debeContinuarBucle() {
        if (estadoJuego === "jugando") return true;
        return obtenerModuloStage().tieneAnimacionPendiente(estadoJuego);
    }

    function bucleJuego(timestamp) {
        rafActivo = false;

        if (G.Recursos.hayError()) {
            dibujarEscenaActual();
            return;
        }

        if (!G.Recursos.estanListos()) {
            dibujarEscenaActual();
            solicitarFrame();
            return;
        }

        const deltaSegundos = ultimoFrame === null
            ? 0
            : Math.min((timestamp - ultimoFrame) / 1000, 0.05);
        ultimoFrame = timestamp;

        if (debeContinuarBucle()) {
            G.Efectos.actualizarSacudida(deltaSegundos);
            obtenerModuloStage().actualizar(deltaSegundos, canvas, contextoJuego);
        }

        dibujarEscenaActual();

        if (debeContinuarBucle()) {
            solicitarFrame();
        }
    }

    // Inicialización de eventos de botones UI
    botonIniciarStage1.addEventListener("click", function() {
        iniciarPartidaEnStage(1, false);
    });
    botonIniciarStage2.addEventListener("click", function() {
        iniciarPartidaEnStage(2, false);
    });
    botonIniciarStage3.addEventListener("click", function() {
        iniciarPartidaEnStage(3, false);
    });
    botonAbrirNaves.addEventListener("click", function() {
        cambiarEstado("naves");
    });
    botonCerrarNaves.addEventListener("click", function() {
        cambiarEstado("menu");
        dibujarEscenaActual();
    });
    botonesOpcionNave.forEach(function(boton) {
        boton.addEventListener("click", function() {
            const st = Number(boton.getAttribute("data-stage"));
            const nv = Number(boton.getAttribute("data-nave"));
            G.Efectos.configurarNaveParaStage(st, nv);
            sincronizarTarjetasNaves();
            if (G.Sonido) {
                G.Sonido.reproducirDisparo(nv === 3);
            }
            dibujarEscenaActual();
        });
    });
    botonSiguienteStage.addEventListener("click", function() {
        avanzarSiguienteStage();
    });
    botonContinuar.addEventListener("click", function() {
        alternarPausa();
    });
    botonReiniciar.addEventListener("click", function() {
        reiniciarStageActual();
    });
    botonMenu.addEventListener("click", function() {
        volverAlMenuPrincipal();
    });

    // Inicialización del sistema de entrada y recursos
    G.Entrada.inicializarEntrada({
        alAlternarPausa: alternarPausa,
        alConfirmarEnter: manejarTeclaEnter,
        estaJugando: function() {
            return estadoJuego === "jugando";
        }
    });

    G.Stage1.reiniciar(canvas);
    G.Stage2.reiniciar(canvas);
    G.Stage3.reiniciar(canvas);
    sincronizarTarjetasNaves();
    actualizarPanel();

    G.Recursos.inicializarRecursos(function() {
        if (estadoJuego !== "jugando") {
            dibujarEscenaActual();
        }
    });

    solicitarFrame();
})(window.Guardianes);
