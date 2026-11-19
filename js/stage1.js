/**
 * Módulo del Stage 1 — Guardianes del Eje.
 * Conserva el 100% de las mecánicas originales del Stage 1:
 * - Enemigo 1 (básico con disparo dirigido)
 * - Enemigo 2 (pesado lateral con propulsores y cohetes con explosión de daño en área)
 * - Enemigo 3 (par de sub-jefes con ráfagas en abanico de 7 direcciones)
 * - Jefe Final Stage 1 (300 HP, núcleo pulsante, combina disparo dirigido + cohete + abanico,
 *   secuencia de 10 explosiones al morir y ascenso de victoria de la nave)
 * - Potenciador progresivo (Nivel 1: doble disparo, Nivel 2: escudo eléctrico de 12 rayos + 30% velocidad)
 * - Renderizado 100% en Canvas (corrige el bug de coordenadas DOM % vs px en la animación de victoria).
 */
window.Guardianes = window.Guardianes || {};

(function(G) {
    const intervaloEnemigos = 2250;
    const velocidadDesplazamientoEscenario = 0.25;
    const intervaloEnemigoDos = 16500;

    const jugador = {
        x: 368,
        y: 400,
        ancho: 64,
        alto: 64,
        velocidad: 5,
        inclinacion: 0
    };

    const proyectiles = [];
    const disparosEnemigos = [];
    const enemigos = [];
    const enemigosPesados = [];
    const enemigosTres = [];
    const cohetesEnemigos = [];
    const explosiones = [];

    let nivelPotenciador = 0;
    let escudoActivo = false;
    let vidas = 6;
    let inicioDestruccion = null;
    let progresoEscenario = 1;
    let tiempoEscenario = 0;
    let tiempoJuego = 0;
    let enemigosTresIniciados = false;
    let jefeFinalActivo = false;
    let inicioAvisoJefeFinal = null;
    let jefeFinal = null;
    let victoriaEnCurso = false;
    let invulnerableHasta = 0;
    let ultimoDisparo = -Infinity;
    let siguientePotenciador = 3200;
    let siguienteEnemigo = 0;
    let siguienteEnemigoDos = 0;
    let potenciador = null;

    function reiniciar(canvas) {
        jugador.x = (canvas.width - jugador.ancho) / 2;
        jugador.y = canvas.height - jugador.alto - 36;
        jugador.velocidad = 5;
        jugador.inclinacion = 0;
        proyectiles.length = 0;
        disparosEnemigos.length = 0;
        enemigos.length = 0;
        enemigosPesados.length = 0;
        enemigosTres.length = 0;
        cohetesEnemigos.length = 0;
        explosiones.length = 0;
        nivelPotenciador = 0;
        escudoActivo = false;
        vidas = 6;
        inicioDestruccion = null;
        progresoEscenario = 1;
        tiempoEscenario = 0;
        tiempoJuego = 0;
        enemigosTresIniciados = false;
        jefeFinalActivo = false;
        inicioAvisoJefeFinal = null;
        jefeFinal = null;
        victoriaEnCurso = false;
        invulnerableHasta = 0;
        ultimoDisparo = -Infinity;
        siguientePotenciador = 3200;
        siguienteEnemigo = 0;
        siguienteEnemigoDos = 0;
        potenciador = null;
    }

    function obtenerVidas() {
        return vidas;
    }

    function tieneAnimacionPendiente() {
        if (inicioDestruccion !== null) {
            return tiempoJuego - inicioDestruccion < 480;
        }
        return false;
    }

    function actualizar(deltaSegundos, canvas, contextoJuego) {
        const delta = deltaSegundos * 60;
        tiempoJuego += deltaSegundos * 1000;

        if ( contextoJuego.estado === "derrota" ) {
            return;
        }

        if (victoriaEnCurso) {
            actualizarAnimacionVictoria(delta, tiempoJuego, contextoJuego);
            return;
        }

        tiempoEscenario += deltaSegundos * 1000;
        actualizarEscenario(delta, canvas);
        actualizarJugador(delta, canvas);
        actualizarDisparos(tiempoJuego, delta);
        actualizarEnemigos(tiempoJuego, delta, canvas);
        actualizarEnemigosPesados(tiempoJuego, delta, canvas);
        actualizarEnemigosTres(tiempoJuego, delta, canvas);
        actualizarJefeFinal(tiempoJuego, delta, canvas);
        actualizarPotenciador(delta, canvas);
        comprobarColisiones(tiempoJuego, canvas, contextoJuego);
    }

    function obtenerDuracionEscenario(canvas) {
        const imagenEscenario = G.Recursos.imagenes.stage1.fondo;
        if (!imagenEscenario || !imagenEscenario.complete || imagenEscenario.naturalWidth === 0) {
            return Infinity;
        }
        const altoEscenario = imagenEscenario.naturalHeight * canvas.width / imagenEscenario.naturalWidth;
        const recorrido = Math.max(0, altoEscenario - canvas.height);
        return recorrido / (velocidadDesplazamientoEscenario * 60) * 1000;
    }

    function actualizarEscenario(delta, canvas) {
        const imagenEscenario = G.Recursos.imagenes.stage1.fondo;
        if (!imagenEscenario || !imagenEscenario.complete || imagenEscenario.naturalWidth === 0) {
            return;
        }
        const altoEscenario = imagenEscenario.naturalHeight * canvas.width / imagenEscenario.naturalWidth;
        const recorrido = Math.max(0, altoEscenario - canvas.height);
        if (recorrido > 0) {
            progresoEscenario = Math.max(
                0,
                progresoEscenario - velocidadDesplazamientoEscenario * delta / recorrido
            );
        }
    }

    function actualizarJugador(delta, canvas) {
        const vector = G.Entrada.obtenerVectorMovimiento();
        jugador.x += vector.x * jugador.velocidad * delta;
        jugador.y += vector.y * jugador.velocidad * delta;
        jugador.x = Math.max(0, Math.min(jugador.x, canvas.width - jugador.ancho));
        jugador.y = Math.max(0, Math.min(jugador.y, canvas.height - jugador.alto));

        if (vector.x < -0.05) {
            jugador.inclinacion = -12 * Math.PI / 180;
        } else if (vector.x > 0.05) {
            jugador.inclinacion = 12 * Math.PI / 180;
        } else {
            jugador.inclinacion = 0;
        }
    }

    function actualizarDisparos(ahora, delta) {
        if (G.Entrada.estaDisparando() && ahora - ultimoDisparo >= 260) {
            if (nivelPotenciador === 0) {
                crearProyectil(jugador.x + jugador.ancho / 2 - 3);
            } else {
                crearProyectil(jugador.x + 8);
                crearProyectil(jugador.x + jugador.ancho - 14);
            }
            if (G.Sonido) {
                G.Sonido.reproducirDisparo(nivelPotenciador >= 1);
            }
            ultimoDisparo = ahora;
        }

        for (let i = proyectiles.length - 1; i >= 0; i--) {
            proyectiles[i].y -= proyectiles[i].velocidad * delta;
            if (proyectiles[i].y + proyectiles[i].alto < 0) {
                proyectiles.splice(i, 1);
            }
        }
    }

    function crearProyectil(x) {
        proyectiles.push({
            x: x,
            y: jugador.y - 7,
            ancho: 6,
            alto: 16,
            velocidad: 8
        });
    }

    function actualizarEnemigos(ahora, delta, canvas) {
        if (!jefeFinalActivo && ahora >= siguienteEnemigo) {
            const ancho = 64;
            const alto = 38;
            const direccion = Math.random() < 0.5 ? -1 : 1;
            enemigos.push({
                x: Math.random() * (canvas.width - ancho),
                y: -alto,
                ancho: ancho,
                alto: alto,
                velocidadX: direccion * (0.4 + Math.random() * 0.8),
                velocidadY: 1.35 + Math.random() * 0.4,
                siguienteDisparo: ahora + 2200 + Math.random() * 1200
            });
            siguienteEnemigo = ahora + intervaloEnemigos;
        }

        for (let i = enemigos.length - 1; i >= 0; i--) {
            const enemigo = enemigos[i];
            enemigo.x += enemigo.velocidadX * delta;
            enemigo.y += enemigo.velocidadY * delta;

            if (enemigo.x <= 0 || enemigo.x + enemigo.ancho >= canvas.width) {
                enemigo.velocidadX *= -1;
                enemigo.x = Math.max(0, Math.min(enemigo.x, canvas.width - enemigo.ancho));
            }

            if (ahora >= enemigo.siguienteDisparo) {
                crearDisparoEnemigo(enemigo);
                enemigo.siguienteDisparo = ahora + 3300;
            }

            if (enemigo.y > canvas.height) {
                enemigos.splice(i, 1);
            }
        }

        for (let i = disparosEnemigos.length - 1; i >= 0; i--) {
            const disparo = disparosEnemigos[i];
            disparo.x += disparo.velocidadX * delta;
            disparo.y += disparo.velocidadY * delta;

            if (
                disparo.x + disparo.ancho < 0 ||
                disparo.x > canvas.width ||
                disparo.y + disparo.alto < 0 ||
                disparo.y > canvas.height
            ) {
                disparosEnemigos.splice(i, 1);
            }
        }
    }

    function actualizarEnemigosPesados(ahora, delta, canvas) {
        const duracionEscenario = obtenerDuracionEscenario(canvas);
        const inicioEnemigoDos = duracionEscenario * 0.25;

        if (
            !jefeFinalActivo &&
            tiempoEscenario >= inicioEnemigoDos &&
            enemigosPesados.length === 0 &&
            ahora >= siguienteEnemigoDos
        ) {
            const ancho = 72;
            const alto = 68;
            const desdeIzquierda = Math.random() < 0.5;
            const alturaBase = 70 + Math.random() * 150;
            enemigosPesados.push({
                x: desdeIzquierda ? -ancho : canvas.width,
                y: alturaBase,
                alturaBase: alturaBase,
                faseMovimiento: Math.random() * Math.PI * 2,
                ancho: ancho,
                alto: alto,
                velocidadX: desdeIzquierda ? 1.15 : -1.15,
                resistencia: 12,
                resistenciaMaxima: 12,
                siguienteDisparo: ahora + 2100
            });
            siguienteEnemigoDos = ahora + intervaloEnemigoDos;
        }

        for (let i = enemigosPesados.length - 1; i >= 0; i--) {
            const enemigo = enemigosPesados[i];
            enemigo.x += enemigo.velocidadX * delta;
            enemigo.y = enemigo.alturaBase + Math.sin(ahora / 280 + enemigo.faseMovimiento) * 7;

            if (
                (enemigo.x <= 0 && enemigo.velocidadX < 0) ||
                (enemigo.x + enemigo.ancho >= canvas.width && enemigo.velocidadX > 0)
            ) {
                enemigo.velocidadX *= -1;
                enemigo.x = Math.max(0, Math.min(enemigo.x, canvas.width - enemigo.ancho));
            }

            if (ahora >= enemigo.siguienteDisparo) {
                lanzarCoheteEnemigo(enemigo);
                enemigo.siguienteDisparo = ahora + 3800;
            }
        }

        for (let i = cohetesEnemigos.length - 1; i >= 0; i--) {
            const cohete = cohetesEnemigos[i];
            const diferenciaX = cohete.destinoX - (cohete.x + cohete.ancho / 2);
            const diferenciaY = cohete.destinoY - (cohete.y + cohete.alto / 2);
            const distancia = Math.hypot(diferenciaX, diferenciaY);
            const avance = cohete.velocidad * delta;

            if (distancia <= avance) {
                cohete.x = cohete.destinoX - cohete.ancho / 2;
                cohete.y = cohete.destinoY - cohete.alto / 2;
                explosiones.push({
                    x: cohete.destinoX,
                    y: cohete.destinoY,
                    inicio: ahora,
                    duracion: 700,
                    radioMaximo: 76,
                    dañoAplicado: false
                });
                cohetesEnemigos.splice(i, 1);
                continue;
            }

            cohete.x += diferenciaX / distancia * avance;
            cohete.y += diferenciaY / distancia * avance;
            cohete.angulo = Math.atan2(diferenciaY, diferenciaX);
        }

        for (let i = explosiones.length - 1; i >= 0; i--) {
            if (ahora - explosiones[i].inicio >= explosiones[i].duracion) {
                explosiones.splice(i, 1);
            }
        }
    }

    function actualizarEnemigosTres(ahora, delta, canvas) {
        const inicioEnemigoTres = obtenerDuracionEscenario(canvas) * 0.5;

        if (!enemigosTresIniciados && tiempoEscenario >= inicioEnemigoTres) {
            const ancho = 76;
            const alto = 108;
            const margen = 92;

            enemigosTres.push(
                crearEnemigoTres(margen, ancho, alto, 0),
                crearEnemigoTres(canvas.width - margen - ancho, ancho, alto, Math.PI)
            );
            enemigosTresIniciados = true;
        }

        for (let i = enemigosTres.length - 1; i >= 0; i--) {
            const enemigo = enemigosTres[i];
            enemigo.x = enemigo.xBase + Math.sin(ahora / 900 + enemigo.faseMovimiento) * 18;
            if (!enemigo.entradaCompleta) {
                enemigo.y = Math.min(
                    enemigo.yBase,
                    enemigo.y + enemigo.velocidadEntrada * delta
                );
                if (enemigo.y >= enemigo.yBase) {
                    enemigo.entradaCompleta = true;
                    enemigo.siguienteDisparo = ahora + 700;
                }
            } else {
                enemigo.y = enemigo.yBase + Math.sin(ahora / 650 + enemigo.faseMovimiento) * 5;
            }

            if (enemigo.entradaCompleta && ahora >= enemigo.siguienteDisparo) {
                lanzarSalvaEnemigoTres(enemigo);
                enemigo.disparosEnRafaga++;
                enemigo.siguienteDisparo = ahora + (
                    enemigo.disparosEnRafaga >= 4 ? 3800 : 260
                );
                if (enemigo.disparosEnRafaga >= 4) {
                    enemigo.disparosEnRafaga = 0;
                }
            }
        }

        if (enemigosTresIniciados && enemigosTres.length === 0 && !jefeFinalActivo) {
            jefeFinalActivo = true;
            inicioAvisoJefeFinal = ahora;
            G.Efectos.iniciarSacudida(2.5, 9);
            if (G.Sonido) {
                G.Sonido.reproducirAparicionJefe();
            }
        }
    }

    function actualizarJefeFinal(ahora, delta, canvas) {
        if (!jefeFinalActivo) {
            return;
        }

        if (!jefeFinal) {
            if (ahora - inicioAvisoJefeFinal < 2200) {
                return;
            }

            enemigos.length = 0;
            enemigosPesados.length = 0;
            enemigosTres.length = 0;
            disparosEnemigos.length = 0;
            cohetesEnemigos.length = 0;
            const ancho = 156;
            const alto = 228;
            jefeFinal = {
                x: (canvas.width - ancho) / 2,
                y: -alto,
                ancho: ancho,
                alto: alto,
                centroMovimientoX: canvas.width / 2,
                amplitudMovimientoX: (canvas.width - ancho - 44) / 2,
                resistencia: 110,
                resistenciaMaxima: 110,
                fase: "entrada",
                velocidadEntrada: 3.2,
                siguienteDisparoDirigido: Infinity,
                siguienteCohete: Infinity,
                siguienteRafaga: Infinity,
                disparosRafaga: 0,
                explosionesRestantes: 10,
                siguienteExplosion: 0
            };
            return;
        }

        if (jefeFinal.fase === "entrada") {
            jefeFinal.y = Math.min(22, jefeFinal.y + jefeFinal.velocidadEntrada * delta);
            if (jefeFinal.y >= 22) {
                jefeFinal.fase = "combate";
                jefeFinal.movimientoInicio = ahora;
                jefeFinal.siguienteDisparoDirigido = ahora + 450;
                jefeFinal.siguienteCohete = ahora + 900;
                jefeFinal.siguienteRafaga = ahora + 650;
            }
            return;
        }

        if (jefeFinal.fase === "combate") {
            const faseMovimiento = (ahora - jefeFinal.movimientoInicio) * 0.00024;
            const posicionX = jefeFinal.centroMovimientoX +
                Math.sin(faseMovimiento) * jefeFinal.amplitudMovimientoX;
            jefeFinal.x = posicionX - jefeFinal.ancho / 2;
            jefeFinal.y = 22 + Math.sin(faseMovimiento * 1.7) * 5;

            const centroX = jefeFinal.x + jefeFinal.ancho / 2;
            const centroY = jefeFinal.y + jefeFinal.alto * 0.72;
            if (ahora >= jefeFinal.siguienteDisparoDirigido) {
                crearDisparoEnemigo(jefeFinal, 0.9);
                jefeFinal.siguienteDisparoDirigido = ahora + 1700;
            }

            if (ahora >= jefeFinal.siguienteCohete) {
                lanzarCoheteEnemigo(jefeFinal, 0.9);
                jefeFinal.siguienteCohete = ahora + 3100;
            }

            if (ahora >= jefeFinal.siguienteRafaga) {
                lanzarSalvaEnemigoTresDesde(centroX, centroY, 0.9);
                jefeFinal.disparosRafaga++;
                jefeFinal.siguienteRafaga = ahora + (
                    jefeFinal.disparosRafaga >= 3 ? 2600 : 280
                );
                if (jefeFinal.disparosRafaga >= 3) {
                    jefeFinal.disparosRafaga = 0;
                }
            }
            return;
        }

        if (jefeFinal.explosionesRestantes > 0 && ahora >= jefeFinal.siguienteExplosion) {
            const centroX = jefeFinal.x + Math.random() * jefeFinal.ancho;
            const centroY = jefeFinal.y + Math.random() * jefeFinal.alto;
            explosiones.push({
                x: centroX,
                y: centroY,
                inicio: ahora,
                duracion: 620,
                radioMaximo: 50 + Math.random() * 38,
                dañoAplicado: true
            });
            jefeFinal.explosionesRestantes--;
            jefeFinal.siguienteExplosion = ahora + 150;
        } else if (
            jefeFinal.explosionesRestantes === 0 &&
            ahora >= jefeFinal.siguienteExplosion + 500
        ) {
            jefeFinal = null;
            victoriaEnCurso = true;
            proyectiles.length = 0;
            disparosEnemigos.length = 0;
            cohetesEnemigos.length = 0;
            jugador.x = (canvas.width - jugador.ancho) / 2;
            jugador.y = canvas.height - jugador.alto - 36;
            jugador.inclinacion = 0;
        }
    }

    function actualizarAnimacionVictoria(delta, ahora, contextoJuego) {
        jugador.y -= 3.2 * delta;
        jugador.inclinacion = 0;
        for (let i = explosiones.length - 1; i >= 0; i--) {
            if (ahora - explosiones[i].inicio >= explosiones[i].duracion) {
                explosiones.splice(i, 1);
            }
        }
        if (jugador.y + jugador.alto < 0) {
            victoriaEnCurso = false;
            contextoJuego.alCompletarStage1();
        }
    }

    function crearEnemigoTres(x, ancho, alto, faseMovimiento) {
        return {
            x: x,
            y: -alto,
            xBase: x,
            yBase: 8,
            ancho: ancho,
            alto: alto,
            faseMovimiento: faseMovimiento,
            entradaCompleta: false,
            velocidadEntrada: 1.35,
            resistencia: 26,
            resistenciaMaxima: 26,
            disparosEnRafaga: 0,
            siguienteDisparo: Infinity
        };
    }

    function lanzarSalvaEnemigoTres(enemigo) {
        const origenX = enemigo.x + enemigo.ancho / 2;
        const origenY = enemigo.y + enemigo.alto * 0.6;
        lanzarSalvaEnemigoTresDesde(origenX, origenY, 1);
    }

    function lanzarSalvaEnemigoTresDesde(origenX, origenY, multiplicadorVelocidad) {
        if (G.Sonido) {
            G.Sonido.reproducirLaser(false);
        }
        const velocidad = 2.45 * multiplicadorVelocidad;
        const direcciones = [-90, -60, -30, 0, 30, 60, 90];

        direcciones.forEach(function(grados) {
            const angulo = grados * Math.PI / 180;
            disparosEnemigos.push({
                x: origenX - 4,
                y: origenY - 4,
                ancho: 8,
                alto: 8,
                velocidadX: Math.sin(angulo) * velocidad,
                velocidadY: Math.cos(angulo) * velocidad,
                color: "#ff55e8"
            });
        });
    }

    function lanzarCoheteEnemigo(enemigo, multiplicadorVelocidad) {
        const x = enemigo.x + enemigo.ancho / 2;
        const y = enemigo.y + enemigo.alto / 2;
        const destinoX = jugador.x + jugador.ancho / 2;
        const destinoY = jugador.y + jugador.alto / 2;

        cohetesEnemigos.push({
            x: x - 7,
            y: y - 11,
            ancho: 14,
            alto: 22,
            destinoX: destinoX,
            destinoY: destinoY,
            velocidad: 3.2 * (multiplicadorVelocidad || 1),
            angulo: Math.atan2(destinoY - y, destinoX - x)
        });
    }

    function crearDisparoEnemigo(enemigo, multiplicadorVelocidad) {
        const origenX = enemigo.x + enemigo.ancho / 2;
        const origenY = enemigo.y + enemigo.alto / 2;
        const destinoX = jugador.x + jugador.ancho / 2;
        const destinoY = jugador.y + jugador.alto / 2;
        const distancia = Math.hypot(destinoX - origenX, destinoY - origenY) || 1;
        const velocidad = 2.4 * (multiplicadorVelocidad || 1);

        disparosEnemigos.push({
            x: origenX - 4,
            y: origenY - 4,
            ancho: 8,
            alto: 8,
            velocidadX: (destinoX - origenX) / distancia * velocidad,
            velocidadY: (destinoY - origenY) / distancia * velocidad
        });
    }

    function actualizarPotenciador(delta, canvas) {
        if (nivelPotenciador >= 2 && escudoActivo) {
            potenciador = null;
            return;
        }

        const jefeDestruyendose = jefeFinal && jefeFinal.fase === "destruccion";
        if (!potenciador && !jefeDestruyendose && !victoriaEnCurso && tiempoEscenario >= siguientePotenciador) {
            potenciador = {
                x: Math.random() * (canvas.width - 40),
                y: 30,
                ancho: 40,
                alto: 40,
                velocidad: 1.5
            };
        }

        if (potenciador) {
            potenciador.y += potenciador.velocidad * delta;
            if (potenciador.y > canvas.height) {
                potenciador = null;
                siguientePotenciador = tiempoEscenario + obtenerIntervaloPotenciador();
            }
        }
    }

    function comprobarColisiones(ahora, canvas, contextoJuego) {
        const seSolapan = G.Efectos.seSuperponen;
        const circuloTocaRectangulo = G.Efectos.circuloTocaRectangulo;

        for (let i = proyectiles.length - 1; i >= 0; i--) {
            const indiceEnemigo = enemigos.findIndex(function(enemigo) {
                return seSolapan(proyectiles[i], enemigo);
            });

            if (indiceEnemigo !== -1) {
                const enemigoDestruido = enemigos[indiceEnemigo];
                proyectiles.splice(i, 1);
                enemigos.splice(indiceEnemigo, 1);
                contextoJuego.sumarPuntos(100);
                crearExplosionDestruccion(enemigoDestruido, ahora, 38, "#ff9b43");
                continue;
            }

            const indiceEnemigoPesado = enemigosPesados.findIndex(function(enemigo) {
                return seSolapan(proyectiles[i], enemigo);
            });

            if (indiceEnemigoPesado !== -1) {
                proyectiles.splice(i, 1);
                enemigosPesados[indiceEnemigoPesado].resistencia--;
                if (enemigosPesados[indiceEnemigoPesado].resistencia <= 0) {
                    crearExplosionDestruccion(
                        enemigosPesados[indiceEnemigoPesado],
                        ahora,
                        54,
                        "#ff8a36"
                    );
                    enemigosPesados.splice(indiceEnemigoPesado, 1);
                    contextoJuego.sumarPuntos(500);
                    siguienteEnemigoDos = ahora + intervaloEnemigoDos;
                }
                continue;
            }

            const indiceEnemigoTres = enemigosTres.findIndex(function(enemigo) {
                return seSolapan(proyectiles[i], enemigo);
            });

            if (indiceEnemigoTres !== -1) {
                proyectiles.splice(i, 1);
                enemigosTres[indiceEnemigoTres].resistencia--;
                if (enemigosTres[indiceEnemigoTres].resistencia <= 0) {
                    crearExplosionDestruccion(enemigosTres[indiceEnemigoTres], ahora, 48, "#ff55e8");
                    enemigosTres.splice(indiceEnemigoTres, 1);
                    contextoJuego.sumarPuntos(1500);
                }
                continue;
            }

            if (jefeFinal && jefeFinal.fase === "combate" && seSolapan(proyectiles[i], jefeFinal)) {
                proyectiles.splice(i, 1);
                jefeFinal.resistencia--;
                if (jefeFinal.resistencia <= 0) {
                    jefeFinal.fase = "destruccion";
                    jefeFinal.siguienteExplosion = ahora;
                    disparosEnemigos.length = 0;
                    cohetesEnemigos.length = 0;
                    contextoJuego.sumarPuntos(5000);
                    explosiones.forEach(function(explosion) {
                        explosion.dañoAplicado = true;
                    });
                }
            }
        }

        const hitboxJugador = obtenerHitboxJugador();

        if (potenciador && seSolapan(hitboxJugador, potenciador)) {
            recogerPotenciador();
            potenciador = null;
            siguientePotenciador = tiempoEscenario + obtenerIntervaloPotenciador();
        }

        for (let i = disparosEnemigos.length - 1; i >= 0; i--) {
            if (disparoTocaJugador(disparosEnemigos[i], hitboxJugador)) {
                disparosEnemigos.splice(i, 1);
                recibirImpacto(ahora, canvas, contextoJuego);
            }
        }

        for (let i = explosiones.length - 1; i >= 0; i--) {
            const explosion = explosiones[i];
            if (!explosion.dañoAplicado) {
                const progreso = Math.min((ahora - explosion.inicio) / explosion.duracion, 1);
                const radio = explosion.radioMaximo * Math.max(progreso, 0.35);
                if (circuloTocaRectangulo(explosion.x, explosion.y, radio, hitboxJugador)) {
                    explosion.dañoAplicado = true;
                    recibirImpacto(ahora, canvas, contextoJuego);
                }
            }
        }

        const indiceEnemigoTocado = enemigos.findIndex(function(enemigo) {
            return seSolapan(hitboxJugador, enemigo);
        });

        if (indiceEnemigoTocado !== -1) {
            enemigos.splice(indiceEnemigoTocado, 1);
            recibirImpacto(ahora, canvas, contextoJuego);
        }

        const enemigoTresTocado = enemigosTres.some(function(enemigo) {
            return seSolapan(hitboxJugador, enemigo);
        });

        if (enemigoTresTocado) {
            recibirImpacto(ahora, canvas, contextoJuego);
        }
    }

    function obtenerHitboxJugador() {
        return {
            x: jugador.x + 12,
            y: jugador.y + 7,
            ancho: 40,
            alto: 55
        };
    }

    function disparoTocaJugador(disparo, hitbox) {
        const centroX = disparo.x + disparo.ancho / 2;
        const centroY = disparo.y + disparo.alto / 2;
        const radio = Math.min(disparo.ancho, disparo.alto) / 2;
        return G.Efectos.circuloTocaRectangulo(centroX, centroY, radio, hitbox);
    }

    function recibirImpacto(ahora, canvas, contextoJuego) {
        if (ahora < invulnerableHasta) {
            return;
        }

        if (G.Sonido) {
            G.Sonido.reproducirImpactoNave();
        }

        if (escudoActivo) {
            escudoActivo = false;
            siguientePotenciador = tiempoEscenario + obtenerIntervaloPotenciador();
            invulnerableHasta = ahora + 800;
            return;
        }

        nivelPotenciador = 0;
        jugador.velocidad = 5;
        siguientePotenciador = tiempoEscenario + obtenerIntervaloPotenciador();
        vidas--;
        if (vidas <= 0) {
            inicioDestruccion = ahora;
            contextoJuego.alPerderPartida();
        } else {
            jugador.x = (canvas.width - jugador.ancho) / 2;
            jugador.y = canvas.height - jugador.alto - 36;
            invulnerableHasta = ahora + 1500;
        }
    }

    function crearExplosionDestruccion(elemento, ahora, radioMaximo, color) {
        explosiones.push({
            x: elemento.x + elemento.ancho / 2,
            y: elemento.y + elemento.alto / 2,
            inicio: ahora,
            duracion: 520,
            radioMaximo: radioMaximo,
            dañoAplicado: true,
            color: color
        });
    }

    function recogerPotenciador() {
        nivelPotenciador = Math.min(nivelPotenciador + 1, 2);

        if (nivelPotenciador >= 2) {
            escudoActivo = true;
            jugador.velocidad = 5 * 1.3;
        }
    }

    function obtenerIntervaloPotenciador() {
        return Math.min(4500 + tiempoEscenario * 0.04, 8000);
    }

    function dibujar(ctx, canvas, contextoJuego) {
        const ahora = tiempoJuego;
        const imgs = G.Recursos.imagenes.stage1;

        ctx.imageSmoothingEnabled = true;

        if (imgs.fondo.complete && imgs.fondo.naturalWidth > 0) {
            const altoEscenario = imgs.fondo.naturalHeight * canvas.width / imgs.fondo.naturalWidth;
            const recorrido = Math.max(0, altoEscenario - canvas.height);
            const desplazamiento = recorrido * progresoEscenario;
            ctx.drawImage(
                imgs.fondo,
                0,
                -desplazamiento,
                canvas.width,
                altoEscenario
            );
        }

        enemigos.forEach(function(enemigo) {
            ctx.save();
            ctx.shadowColor = "#36e8ff";
            ctx.shadowBlur = 10;
            ctx.drawImage(imgs.enemigo1, enemigo.x, enemigo.y, enemigo.ancho, enemigo.alto);
            ctx.restore();
        });

        enemigosPesados.forEach(function(enemigo) {
            const centroX = enemigo.x + enemigo.ancho / 2;
            const centroY = enemigo.y + enemigo.alto / 2;
            const fasePropulsor = Math.sin(ahora / 75 + enemigo.faseMovimiento);

            ctx.save();
            ctx.translate(centroX, centroY);
            ctx.rotate(Math.sin(ahora / 420 + enemigo.faseMovimiento) * 0.045);
            ctx.globalAlpha = 0.22 + (fasePropulsor + 1) * 0.08;
            ctx.strokeStyle = "#ff9a42";
            ctx.lineWidth = 2;

            for (let estela = 0; estela < 3; estela++) {
                const desfase = estela * 9;
                const inicioX = enemigo.velocidadX > 0
                    ? -enemigo.ancho / 2 - desfase
                    : enemigo.ancho / 2 + desfase;
                const largo = 10 + (Math.sin(ahora / 90 + estela + enemigo.faseMovimiento) + 1) * 5;

                ctx.beginPath();
                ctx.moveTo(inicioX, -12 + estela * 11);
                ctx.lineTo(
                    inicioX - Math.sign(enemigo.velocidadX) * largo,
                    -12 + estela * 11
                );
                ctx.stroke();
            }

            ctx.globalAlpha = 0.72 + (fasePropulsor + 1) * 0.12;
            ctx.shadowColor = "#ff672d";
            ctx.shadowBlur = 12 + (fasePropulsor + 1) * 4;
            ctx.fillStyle = "#ff8a32";

            for (let propulsor = -1; propulsor <= 1; propulsor += 2) {
                const llama = 7 + (fasePropulsor + 1) * 3;
                ctx.beginPath();
                ctx.moveTo(propulsor * 13 - 3, enemigo.alto / 2 - 7);
                ctx.quadraticCurveTo(
                    propulsor * 13,
                    enemigo.alto / 2 + llama,
                    propulsor * 13 + 3,
                    enemigo.alto / 2 - 7
                );
                ctx.fill();
            }

            ctx.globalAlpha = 1;
            ctx.shadowColor = "#ff8c35";
            ctx.shadowBlur = 14;
            ctx.drawImage(
                imgs.enemigo2,
                -enemigo.ancho / 2,
                -enemigo.alto / 2,
                enemigo.ancho,
                enemigo.alto
            );
            ctx.restore();

            ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
            ctx.fillRect(enemigo.x + 8, enemigo.y - 9, enemigo.ancho - 16, 5);
            ctx.fillStyle = "#ff8a32";
            ctx.fillRect(
                enemigo.x + 8,
                enemigo.y - 9,
                (enemigo.ancho - 16) * enemigo.resistencia / enemigo.resistenciaMaxima,
                5
            );
        });

        enemigosTres.forEach(function(enemigo) {
            ctx.save();
            ctx.shadowColor = "#ff38dc";
            ctx.shadowBlur = 18;
            ctx.drawImage(
                imgs.enemigo3,
                592,
                8,
                592,
                864,
                enemigo.x,
                enemigo.y,
                enemigo.ancho,
                enemigo.alto
            );
            ctx.restore();

            ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
            ctx.fillRect(enemigo.x + 10, enemigo.y - 7, enemigo.ancho - 20, 5);
            ctx.fillStyle = "#ff55e8";
            ctx.fillRect(
                enemigo.x + 10,
                enemigo.y - 7,
                (enemigo.ancho - 20) * enemigo.resistencia / enemigo.resistenciaMaxima,
                5
            );
        });

        if (jefeFinal) {
            ctx.save();
            if (jefeFinal.fase === "entrada") {
                const pulsoEntrada = (Math.sin(ahora / 85) + 1) / 2;
                const centroX = jefeFinal.x + jefeFinal.ancho / 2;
                const centroY = jefeFinal.y + jefeFinal.alto * 0.55;
                const radio = 76 + pulsoEntrada * 24;
                const resplandorEntrada = ctx.createRadialGradient(
                    centroX,
                    centroY,
                    8,
                    centroX,
                    centroY,
                    radio
                );
                resplandorEntrada.addColorStop(0, "rgba(92, 40, 135, 0.5)");
                resplandorEntrada.addColorStop(0.55, "rgba(63, 24, 102, 0.26)");
                resplandorEntrada.addColorStop(1, "rgba(43, 16, 75, 0)");
                ctx.fillStyle = resplandorEntrada;
                ctx.beginPath();
                ctx.ellipse(centroX, centroY, radio * 0.78, radio, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = `rgba(126, 67, 168, ${0.42 + pulsoEntrada * 0.42})`;
                ctx.lineWidth = 2;
                ctx.shadowColor = "#4b1b70";
                ctx.shadowBlur = 20;
                ctx.beginPath();
                ctx.ellipse(centroX, centroY, radio * 0.64, radio * 0.84, 0, 0, Math.PI * 2);
                ctx.stroke();
            }
            if (
                jefeFinal.fase === "destruccion" &&
                Math.floor(ahora / 75) % 2 === 0
            ) {
                ctx.globalAlpha = 0.3;
            }
            const balanceoJefe = jefeFinal.fase === "combate"
                ? Math.sin(ahora / 620) * 0.025
                : 0;
            ctx.translate(
                jefeFinal.x + jefeFinal.ancho / 2,
                jefeFinal.y + jefeFinal.alto / 2
            );
            ctx.rotate(balanceoJefe);
            ctx.shadowColor = "#4b1b70";
            ctx.shadowBlur = 22;
            ctx.drawImage(
                imgs.jefeFinal,
                -jefeFinal.ancho / 2,
                -jefeFinal.alto / 2,
                jefeFinal.ancho,
                jefeFinal.alto
            );
            if (jefeFinal.fase !== "destruccion") {
                const pulsoNucleo = (Math.sin(ahora / 180) + 1) / 2;
                const nucleoX = 0;
                const nucleoY = -jefeFinal.alto / 2 + jefeFinal.alto * 0.32;
                const radioNucleo = 23 + pulsoNucleo * 6;
                const brilloNucleo = ctx.createRadialGradient(
                    nucleoX,
                    nucleoY,
                    2,
                    nucleoX,
                    nucleoY,
                    radioNucleo
                );
                brilloNucleo.addColorStop(0, "rgba(93, 231, 255, 0.24)");
                brilloNucleo.addColorStop(0.55, "rgba(136, 69, 190, 0.18)");
                brilloNucleo.addColorStop(1, "rgba(75, 27, 112, 0)");
                ctx.globalAlpha = 0.65 + pulsoNucleo * 0.3;
                ctx.fillStyle = brilloNucleo;
                ctx.beginPath();
                ctx.arc(nucleoX, nucleoY, radioNucleo, 0, Math.PI * 2);
                ctx.fill();

                ctx.globalAlpha = 0.45 + pulsoNucleo * 0.35;
                ctx.strokeStyle = "#a85ae0";
                ctx.lineWidth = 1.5;
                ctx.shadowColor = "#8b42c1";
                ctx.shadowBlur = 12;
                ctx.beginPath();
                ctx.ellipse(
                    nucleoX,
                    nucleoY,
                    radioNucleo + 4,
                    radioNucleo * 0.68,
                    ahora / 1600,
                    0,
                    Math.PI * 2
                );
                ctx.stroke();
            }
            ctx.restore();

            if (jefeFinal.fase === "combate") {
                ctx.fillStyle = "rgba(0, 0, 0, 0.78)";
                ctx.fillRect(jefeFinal.x + 12, jefeFinal.y - 10, jefeFinal.ancho - 24, 7);
                ctx.fillStyle = "#713b9c";
                ctx.fillRect(
                    jefeFinal.x + 12,
                    jefeFinal.y - 10,
                    (jefeFinal.ancho - 24) * jefeFinal.resistencia / jefeFinal.resistenciaMaxima,
                    7
                );
            }
        }

        ctx.fillStyle = "#36b9ff";
        proyectiles.forEach(function(proyectil) {
            ctx.fillRect(proyectil.x, proyectil.y, proyectil.ancho, proyectil.alto);
        });

        ctx.save();
        ctx.fillStyle = "#ffb45c";
        ctx.shadowColor = "#ff8a36";
        ctx.shadowBlur = 12;
        disparosEnemigos.forEach(function(disparo) {
            ctx.fillStyle = disparo.color || "#ffb45c";
            ctx.shadowColor = disparo.color || "#ff8a36";
            ctx.beginPath();
            ctx.arc(
                disparo.x + disparo.ancho / 2,
                disparo.y + disparo.alto / 2,
                disparo.ancho / 2,
                0,
                Math.PI * 2
            );
            ctx.fill();
        });
        ctx.restore();

        cohetesEnemigos.forEach(function(cohete) {
            ctx.save();
            ctx.translate(cohete.x + cohete.ancho / 2, cohete.y + cohete.alto / 2);
            ctx.rotate(cohete.angulo + Math.PI / 2);
            ctx.shadowColor = "#ff692e";
            ctx.shadowBlur = 12;
            ctx.fillStyle = "#ffb347";
            ctx.beginPath();
            ctx.moveTo(0, -cohete.alto / 2);
            ctx.lineTo(cohete.ancho / 2, cohete.alto / 2);
            ctx.lineTo(0, cohete.alto / 2 - 4);
            ctx.lineTo(-cohete.ancho / 2, cohete.alto / 2);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = "#fff1bd";
            ctx.fillRect(-2, 0, 4, 7);
            ctx.restore();
        });

        explosiones.forEach(function(explosion) {
            const progreso = Math.min((ahora - explosion.inicio) / explosion.duracion, 1);
            const radio = explosion.radioMaximo * (0.25 + progreso * 0.75);
            const onda = explosion.radioMaximo * progreso;
            const intensidad = 1 - progreso;
            const colorExplosion = explosion.color || "#ff762e";
            const rgbaColor = G.Efectos.obtenerColorRGBA(colorExplosion);
            const gradiente = ctx.createRadialGradient(
                explosion.x,
                explosion.y,
                radio * 0.08,
                explosion.x,
                explosion.y,
                radio
            );
            gradiente.addColorStop(0, "rgba(255, 255, 225, 1)");
            gradiente.addColorStop(0.22, rgbaColor(0.98));
            gradiente.addColorStop(0.5, rgbaColor(0.78));
            gradiente.addColorStop(0.78, rgbaColor(0.42));
            gradiente.addColorStop(1, rgbaColor(0));
            ctx.save();
            ctx.globalAlpha = intensidad;
            ctx.shadowColor = colorExplosion;
            ctx.shadowBlur = 34 * intensidad;
            ctx.fillStyle = gradiente;
            ctx.beginPath();
            ctx.arc(explosion.x, explosion.y, radio, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.arc(explosion.x, explosion.y, onda, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(194, 248, 255, ${intensidad})`;
            ctx.lineWidth = 5 * intensidad + 1;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(explosion.x, explosion.y, radio * 0.62, 0, Math.PI * 2);
            ctx.strokeStyle = rgbaColor(intensidad * 0.8);
            ctx.lineWidth = 3;
            ctx.stroke();

            for (let fragmento = 0; fragmento < 8; fragmento++) {
                const angulo = fragmento * Math.PI / 4 + explosion.inicio / 180;
                const distancia = onda * (0.72 + (fragmento % 3) * 0.12);
                const x = explosion.x + Math.cos(angulo) * distancia;
                const y = explosion.y + Math.sin(angulo) * distancia;
                const tamano = 2 + intensidad * 3;

                ctx.fillStyle = fragmento % 2 === 0 ? "#fff3bd" : colorExplosion;
                ctx.beginPath();
                ctx.arc(x, y, tamano, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        });

        if (potenciador) {
            dibujarPotenciador(ctx, potenciador, ahora, imgs.potenciador);
        }

        // Renderizado del jugador en el Canvas con rotación suave (elimina bug DOM % vs px)
        const juegoTerminado = contextoJuego.estado === "derrota";
        const stageCompletado = contextoJuego.estado === "stage1-completado";
        const visible = ahora >= invulnerableHasta || Math.floor(ahora / 100) % 2 === 0;

        if (!juegoTerminado && !stageCompletado && visible) {
            G.Efectos.dibujarNaveJugador(ctx, 1, jugador, {
                estaMejorado: nivelPotenciador >= 1,
                disparandoReciente: ahora - ultimoDisparo < 120,
                enDanio: vidas === 1 || ahora < invulnerableHasta
            });
        }

        if (escudoActivo && !juegoTerminado) {
            dibujarEscudo(ctx, ahora);
        }

        const duracionDestruccion = 480;
        const tiempoDestruccion = inicioDestruccion === null ? duracionDestruccion : ahora - inicioDestruccion;
        const destruccionEnCurso = juegoTerminado && tiempoDestruccion < duracionDestruccion;

        if (destruccionEnCurso && imgs.destruccion.complete && imgs.destruccion.naturalWidth > 0) {
            const fotograma = 4 + Math.floor(tiempoDestruccion / 120);
            ctx.drawImage(
                imgs.destruccion,
                fotograma * 32,
                96,
                32,
                64,
                jugador.x,
                jugador.y,
                jugador.ancho,
                jugador.alto
            );
        }

        const porcentajeAvance = Math.round((1 - progresoEscenario) * 100);
        G.Efectos.dibujarHUDSuperior(ctx, canvas, {
            stage: 1,
            vidas: vidas,
            puntuacion: contextoJuego.puntuacion,
            textoDerecho: jefeFinalActivo ? "JEFE" : `${porcentajeAvance}%`
        });

        ctx.save();
        ctx.fillStyle = "#ffffff";
        ctx.font = "15px Arial";
        ctx.textAlign = "left";
        ctx.fillText(`Potenciadores: ${Math.min(nivelPotenciador, 2)}/2`, 16, 66);
        if (escudoActivo) {
            ctx.fillStyle = "#57e8ff";
            ctx.fillText("Escudo eléctrico activo (+30% vel.)", 16, 86);
        }
        ctx.restore();

        if (jefeFinalActivo && !jefeFinal && !victoriaEnCurso && !stageCompletado) {
            const mensajeJefe = "SE ACERCA EL JEFE FINAL";
            const inicioOnda = ahora / 150;

            ctx.save();
            ctx.textAlign = "center";
            ctx.font = "bold 28px Arial";
            const anchoMensaje = ctx.measureText(mensajeJefe).width;
            const gradienteMensaje = ctx.createLinearGradient(
                canvas.width / 2 - anchoMensaje / 2,
                0,
                canvas.width / 2 + anchoMensaje / 2,
                0
            );
            gradienteMensaje.addColorStop(0, "#35dfff");
            gradienteMensaje.addColorStop(0.5, "#f2fbff");
            gradienteMensaje.addColorStop(1, "#ff63e8");

            ctx.textAlign = "left";
            ctx.fillStyle = gradienteMensaje;
            ctx.shadowColor = Math.sin(inicioOnda) >= 0 ? "#35dfff" : "#ff38dc";
            ctx.shadowBlur = 14 + (Math.sin(inicioOnda * 1.5) + 1) * 5;

            let posicionX = canvas.width / 2 - anchoMensaje / 2;
            for (let i = 0; i < mensajeJefe.length; i++) {
                const letra = mensajeJefe[i];
                const anchoLetra = ctx.measureText(letra).width;
                const desplazamientoOnda = Math.sin(inicioOnda + i * 0.55) * 5;
                ctx.fillText(letra, posicionX, 82 + desplazamientoOnda);
                posicionX += anchoLetra;
            }
            ctx.restore();
        }
    }

    function dibujarPotenciador(ctx, elemento, ahora, imagenPotenciador) {
        const centroX = elemento.x + elemento.ancho / 2;
        const centroY = elemento.y + elemento.alto / 2 + Math.sin(ahora / 240) * 1.5;
        const fase = ahora / 420;
        const pulso = (Math.sin(ahora / 260) + 1) / 2;
        const radio = 20 + pulso * 2;

        ctx.save();
        ctx.translate(centroX, centroY);
        ctx.shadowColor = "#36b9ff";
        ctx.shadowBlur = 10 + pulso * 8;

        const energia = ctx.createRadialGradient(-4, -5, 1, 0, 0, radio);
        energia.addColorStop(0, "rgba(102, 244, 255, 0.38)");
        energia.addColorStop(0.62, "rgba(28, 173, 255, 0.14)");
        energia.addColorStop(1, "rgba(20, 92, 255, 0)");
        ctx.beginPath();
        ctx.ellipse(0, 0, radio, radio * 0.82, 0, 0, Math.PI * 2);
        ctx.fillStyle = energia;
        ctx.fill();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = "rgba(101, 234, 255, 0.82)";
        ctx.stroke();

        ctx.save();
        ctx.rotate(fase);
        ctx.beginPath();
        ctx.ellipse(0, 0, radio + 5, 7, 0, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 186, 98, 0.9)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(radio + 5, 0, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = "#fff1bd";
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.rotate(-fase * 0.8);
        ctx.beginPath();
        ctx.ellipse(0, 0, 8, radio + 3, 0, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(101, 234, 255, 0.72)";
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();

        for (let chispa = 0; chispa < 4; chispa++) {
            const angulo = fase * (chispa % 2 === 0 ? 1 : -1) + chispa * Math.PI / 2;
            const distancia = radio + 5 + Math.sin(ahora / 180 + chispa) * 2;
            const x = Math.cos(angulo) * distancia;
            const y = Math.sin(angulo) * distancia * 0.72;
            const tamano = 1 + (Math.sin(ahora / 150 + chispa * 2) + 1) * 0.8;

            ctx.beginPath();
            ctx.arc(x, y, tamano, 0, Math.PI * 2);
            ctx.fillStyle = chispa % 2 === 0 ? "#a3f8ff" : "#ffd19a";
            ctx.shadowBlur = 8;
            ctx.fill();
        }

        ctx.save();
        ctx.rotate(Math.sin(ahora / 700) * 0.04);
        ctx.scale(0.88 + pulso * 0.12, 1);
        ctx.shadowBlur = 12 + pulso * 8;
        ctx.drawImage(imagenPotenciador, -17, -17, 34, 34);
        ctx.restore();
        ctx.restore();
    }

    function dibujarEscudo(ctx, ahora) {
        const centroX = jugador.x + jugador.ancho / 2;
        const centroY = jugador.y + jugador.alto / 2;
        const fase = ahora / 180;

        ctx.save();
        ctx.lineCap = "round";
        ctx.shadowColor = "#20bfff";
        ctx.shadowBlur = 18;

        ctx.beginPath();
        ctx.ellipse(centroX, centroY, 37, 39, 0, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(32, 191, 255, 0.32)";
        ctx.lineWidth = 2;
        ctx.stroke();

        for (let rayo = 0; rayo < 12; rayo++) {
            const inicio = fase + rayo * Math.PI * 2 / 12;
            const longitud = 0.24 + (Math.sin(fase * 1.7 + rayo * 2.3) + 1) * 0.13;
            const pasos = 5;

            ctx.beginPath();
            for (let paso = 0; paso <= pasos; paso++) {
                const progreso = paso / pasos;
                const angulo = inicio + longitud * progreso;
                const variacion = paso === 0 || paso === pasos
                    ? 1
                    : 1 + Math.sin(fase * 2 + rayo * 4 + paso * 7) * 0.12;
                const x = centroX + Math.cos(angulo) * 37 * variacion;
                const y = centroY + Math.sin(angulo) * 39 * variacion;

                if (paso === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }

            ctx.strokeStyle = rayo % 2 === 0 ? "#65eaff" : "#268bff";
            ctx.lineWidth = rayo % 3 === 0 ? 2.5 : 1.5;
            ctx.stroke();
        }

        ctx.restore();
    }

    G.Stage1 = {
        reiniciar,
        actualizar,
        dibujar,
        obtenerVidas,
        tieneAnimacionPendiente
    };
})(window.Guardianes);
