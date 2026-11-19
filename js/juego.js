/**
 * Controlador Principal — Guardianes del Eje (Stage 1, Stage 2, Stage 3, Menú 3D, Créditos Animados y Persistencia en Storage).
 * Responsabilidades:
 * - Máquina de estados única ("menu", "naves", "jugando", "pausado", "stage1-completado", "stage2-completado", "victoria", "derrota", "tiempo-agotado")
 * - Animación 3D de Space Invaders en tiempo real en el Menú Principal, Hangar de Naves y Efectos de Victoria en Créditos
 * - Desbloqueo progresivo y persistencia automática en localStorage/sessionStorage (mantiene avance, puntos y naves al recargar)
 * - Pantalla de Créditos animada con efectos de victoria al superar los 3 Stages o al acceder por la ruta `/creditos`
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
    const bloqueCreditos = document.getElementById("bloque-creditos");

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

    const nombresBaseNaves = {
        1: "Clásica",
        2: "Artillada",
        3: "Cristal"
    };

    // Restaurar sesión previa desde localStorage / sessionStorage
    const sesionInicial = G.Efectos.obtenerSesion();
    let stageActual = sesionInicial.stageActual || 1;
    let estadoJuego = "menu";
    let puntuacionTotal = sesionInicial.puntuacionTotal || 0;
    let puntuacionInicioStage = sesionInicial.puntuacionInicioStage || 0;
    let ultimoFrame = null;
    let tiempoAnimacionMenu = 0;
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
            G.Efectos.actualizarSesion({
                stageActual: stageActual,
                puntuacionTotal: puntuacionTotal,
                puntuacionInicioStage: puntuacionInicioStage
            });
        },
        alCompletarStage1() {
            // Al ganar Stage 1: se desbloquea Stage 2 y la Nave 2 (además de la Nave 1) y se guarda en Storage
            G.Efectos.desbloquearStage(2);
            G.Efectos.desbloquearNave(1);
            G.Efectos.desbloquearNave(2);
            G.Efectos.actualizarSesion({
                stageActual: 2,
                puntuacionTotal: puntuacionTotal,
                puntuacionInicioStage: puntuacionTotal,
                ultimoEstadoMenu: "stage1-completado"
            });
            cambiarEstado("stage1-completado");
        },
        alCompletarStage2() {
            // Al ganar Stage 2: se desbloquea Stage 3 y la Nave 3 y se guarda en Storage
            G.Efectos.desbloquearStage(3);
            G.Efectos.desbloquearNave(2);
            G.Efectos.desbloquearNave(3);
            G.Efectos.actualizarSesion({
                stageActual: 3,
                puntuacionTotal: puntuacionTotal,
                puntuacionInicioStage: puntuacionTotal,
                ultimoEstadoMenu: "stage2-completado"
            });
            cambiarEstado("stage2-completado");
        },
        alGanarJuego() {
            // Al superar el Stage 3: todo desbloqueado, se guarda en Storage y aparecen los Créditos con efectos de victoria
            G.Efectos.desbloquearStage(2);
            G.Efectos.desbloquearStage(3);
            G.Efectos.desbloquearNave(1);
            G.Efectos.desbloquearNave(2);
            G.Efectos.desbloquearNave(3);
            G.Efectos.actualizarSesion({
                stageActual: 3,
                puntuacionTotal: puntuacionTotal,
                puntuacionInicioStage: puntuacionTotal,
                ultimoEstadoMenu: "victoria"
            });
            if (G.Sonido && G.Sonido.reproducirFanfarriaVictoria) {
                G.Sonido.reproducirFanfarriaVictoria();
            }
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

    function sincronizarBotonesStages() {
        const st2Desbloqueado = G.Efectos.estaStageDesbloqueado(2);
        const st3Desbloqueado = G.Efectos.estaStageDesbloqueado(3);

        botonIniciarStage2.disabled = !st2Desbloqueado;
        botonIniciarStage2.textContent = st2Desbloqueado ? "Jugar Stage 2" : "Stage 2 🔒";

        botonIniciarStage3.disabled = !st3Desbloqueado;
        botonIniciarStage3.textContent = st3Desbloqueado ? "Jugar Stage 3" : "Stage 3 🔒";
    }

    function sincronizarTarjetasNaves() {
        botonesOpcionNave.forEach(function(boton) {
            const st = Number(boton.getAttribute("data-stage"));
            const nv = Number(boton.getAttribute("data-nave"));
            const habilitada = G.Efectos.estaNaveHabilitadaParaStage(st, nv);
            const seleccionada = G.Efectos.obtenerNaveParaStage(st) === nv;
            const spanNombre = boton.querySelector(".nombre-opcion-nave");

            boton.disabled = !habilitada;
            boton.classList.toggle("bloqueada", !habilitada);
            boton.classList.toggle("activa", seleccionada);
            boton.setAttribute("aria-pressed", String(seleccionada));

            if (spanNombre) {
                spanNombre.textContent = habilitada
                    ? nombresBaseNaves[nv]
                    : `${nombresBaseNaves[nv]} 🔒`;
            }
        });
    }

    function reiniciarAnimacionCreditos() {
        if (!bloqueCreditos) return;
        bloqueCreditos.style.animation = "none";
        // Forzar reflow para reiniciar las animaciones escalonadas de entrada
        void bloqueCreditos.offsetWidth;
        bloqueCreditos.style.animation = "";
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

        sincronizarBotonesStages();

        const esTransicionStage = estadoJuego === "stage1-completado" || estadoJuego === "stage2-completado";
        botonIniciarStage1.hidden = estadoJuego !== "menu";
        botonIniciarStage2.hidden = estadoJuego !== "menu";
        botonIniciarStage3.hidden = estadoJuego !== "menu";
        botonAbrirNaves.hidden = estadoJuego !== "menu";
        botonCerrarNaves.hidden = estadoJuego !== "naves";
        selectorNaves.hidden = estadoJuego !== "naves";
        if (bloqueCreditos) {
            const mostrarCreditos = estadoJuego === "victoria";
            const estabaOculto = bloqueCreditos.hidden;
            bloqueCreditos.hidden = !mostrarCreditos;
            if (mostrarCreditos && estabaOculto) {
                reiniciarAnimacionCreditos();
            }
        }
        botonSiguienteStage.hidden = !esTransicionStage;
        botonContinuar.hidden = estadoJuego !== "pausado";
        botonReiniciar.hidden = ["menu", "naves", "stage1-completado", "stage2-completado", "victoria"].includes(estadoJuego);
        botonMenu.hidden = estadoJuego === "menu" || estadoJuego === "naves";

        if (estadoJuego === "stage1-completado") {
            botonSiguienteStage.textContent = "Avanzar al Stage 2";
        } else if (estadoJuego === "stage2-completado") {
            botonSiguienteStage.textContent = "Avanzar al Stage 3";
        }

        G.Entrada.actualizarBotonPausaMovil(estadoJuego === "pausado");

        const sesionActual = G.Efectos.obtenerSesion();

        if (estadoJuego === "menu") {
            if (G.Efectos.esModoPruebas && G.Efectos.esModoPruebas()) {
                tituloPanel.textContent = "Guardianes del Eje — Modo Pruebas";
                textoPanel.textContent = "Los 3 Stages y todas las Naves están libres para probar.";
            } else {
                tituloPanel.textContent = "Guardianes del Eje";
                if (sesionActual.mejorPuntuacion > 0 || G.Efectos.estaStageDesbloqueado(2)) {
                    textoPanel.textContent = `Progreso guardado activo · Mejor Puntuación: ${sesionActual.mejorPuntuacion}`;
                } else {
                    textoPanel.textContent = "Supera cada Stage para desbloquear el siguiente sector y su nave.";
                }
            }
        } else if (estadoJuego === "naves") {
            tituloPanel.textContent = "Hangar de Naves";
            textoPanel.textContent = "Elige tu nave para cada Stage (tu selección queda guardada automáticamente):";
            sincronizarTarjetasNaves();
        } else if (estadoJuego === "pausado") {
            tituloPanel.textContent = "Juego pausado";
            textoPanel.textContent = `Stage ${stageActual} en pausa. Presiona P, ESC o Continuar.`;
        } else if (estadoJuego === "stage1-completado") {
            tituloPanel.textContent = "STAGE 1 COMPLETED";
            textoPanel.textContent = `¡Stage 2 y Nave Artillada desbloqueados y guardados! Puntuación acumulada: ${puntuacionTotal}`;
        } else if (estadoJuego === "stage2-completado") {
            tituloPanel.textContent = "STAGE 2 COMPLETED";
            textoPanel.textContent = `¡Stage 3 y Nave de Cristal desbloqueados y guardados! Puntuación acumulada: ${puntuacionTotal}`;
        } else if (estadoJuego === "victoria") {
            tituloPanel.textContent = "¡VICTORIA TOTAL — CRÉDITOS!";
            textoPanel.textContent = `Puntuación Final: ${puntuacionTotal} · Récord: ${Math.max(puntuacionTotal, sesionActual.mejorPuntuacion || 0)}`;
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
        ultimoFrame = null;
        solicitarFrame();
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
        if (!G.Efectos.estaStageDesbloqueado(numeroStage)) {
            return;
        }
        await prepararPantallaMovil();
        stageActual = numeroStage;
        if (!conservarPuntos) {
            // Si elige directamente un stage desbloqueado desde el menú, mantiene la base guardada si continúa su campaña o inicia limpio en Stage 1
            if (numeroStage === 1) {
                puntuacionTotal = 0;
            }
        }
        puntuacionInicioStage = puntuacionTotal;
        G.Efectos.actualizarSesion({
            stageActual: stageActual,
            puntuacionTotal: puntuacionTotal,
            puntuacionInicioStage: puntuacionInicioStage,
            ultimoEstadoMenu: "menu"
        });
        G.Efectos.detenerSacudida();
        obtenerModuloStage().reiniciar(canvas);
        cambiarEstado("jugando");
    }

    function reiniciarStageActual() {
        puntuacionTotal = puntuacionInicioStage;
        G.Efectos.actualizarSesion({
            stageActual: stageActual,
            puntuacionTotal: puntuacionTotal,
            puntuacionInicioStage: puntuacionInicioStage
        });
        G.Efectos.detenerSacudida();
        obtenerModuloStage().reiniciar(canvas);
        cambiarEstado("jugando");
    }

    function volverAlMenuPrincipal() {
        if (window.location.hash === "#creditos" || window.location.search.includes("creditos=1")) {
            if (window.history && window.history.replaceState) {
                window.history.replaceState(null, "", window.location.pathname.replace(/\/creditos\/?$/, "/"));
            }
        }
        G.Efectos.actualizarSesion({
            ultimoEstadoMenu: "menu"
        });
        cambiarEstado("menu");
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
        } else if (["derrota", "tiempo-agotado"].includes(estadoJuego)) {
            reiniciarStageActual();
        } else if (estadoJuego === "victoria") {
            volverAlMenuPrincipal();
        }
    }

    function esEstadoConFondo3D() {
        return estadoJuego === "menu" || estadoJuego === "naves" || estadoJuego === "victoria";
    }

    function dibujarEscenaActual() {
        if (esEstadoConFondo3D() && G.Menu3D) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            G.Menu3D.dibujarEscena3D(ctx, canvas, tiempoAnimacionMenu, estadoJuego === "victoria");
            return;
        }

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
        if (estadoJuego === "jugando" || esEstadoConFondo3D()) return true;
        return obtenerModuloStage().tieneAnimacionPendiente(estadoJuego);
    }

    function bucleJuego(timestamp) {
        rafActivo = false;

        const deltaSegundos = ultimoFrame === null
            ? 0.016
            : Math.min((timestamp - ultimoFrame) / 1000, 0.05);
        ultimoFrame = timestamp;

        if (esEstadoConFondo3D()) {
            tiempoAnimacionMenu += deltaSegundos;
            dibujarEscenaActual();
            solicitarFrame();
            return;
        }

        if (G.Recursos.hayError()) {
            dibujarEscenaActual();
            return;
        }

        if (!G.Recursos.estanListos()) {
            dibujarEscenaActual();
            solicitarFrame();
            return;
        }

        if (debeContinuarBucle()) {
            G.Efectos.actualizarSacudida(deltaSegundos);
            obtenerModuloStage().actualizar(deltaSegundos, canvas, contextoJuego);
        }

        dibujarEscenaActual();

        if (debeContinuarBucle()) {
            solicitarFrame();
        }
    }

    function verificarRutaCreditos() {
        const ruta = window.location.pathname || "";
        const hash = window.location.hash || "";
        const search = window.location.search || "";
        if (
            ruta.endsWith("/creditos") ||
            ruta.endsWith("/creditos/") ||
            hash === "#creditos" ||
            hash === "#/creditos" ||
            search.includes("creditos=1")
        ) {
            if (G.Sonido && G.Sonido.reproducirFanfarriaVictoria) {
                G.Sonido.reproducirFanfarriaVictoria();
            }
            cambiarEstado("victoria");
            return true;
        }
        return false;
    }

    window.addEventListener("hashchange", function() {
        verificarRutaCreditos();
    });

    // Inicialización de eventos de botones UI
    botonIniciarStage1.addEventListener("click", function() {
        iniciarPartidaEnStage(1, false);
    });
    botonIniciarStage2.addEventListener("click", function() {
        iniciarPartidaEnStage(2, true);
    });
    botonIniciarStage3.addEventListener("click", function() {
        iniciarPartidaEnStage(3, true);
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
            if (!G.Efectos.estaNaveHabilitadaParaStage(st, nv)) {
                return;
            }
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

    if (!verificarRutaCreditos()) {
        // Si el jugador recargó la página justo en la pantalla de transición entre stages, restaurarla
        if (
            sesionInicial.ultimoEstadoMenu === "stage1-completado" ||
            sesionInicial.ultimoEstadoMenu === "stage2-completado"
        ) {
            cambiarEstado(sesionInicial.ultimoEstadoMenu);
        } else {
            actualizarPanel();
        }
    }

    G.Recursos.inicializarRecursos(function() {
        if (estadoJuego !== "jugando") {
            dibujarEscenaActual();
        }
    });

    solicitarFrame();
})(window.Guardianes);
