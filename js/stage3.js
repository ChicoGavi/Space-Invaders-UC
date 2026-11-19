/**
 * Módulo del Stage 3 — Guardianes del Eje: "Las Cavernas de Cristal".
 *
 * Características y Mecánicas:
 * 1. Nave de Cristal del Jugador con 4 estados visuales dinámicos:
 *    - IDLE: Estado base con propulsor cristalino.
 *    - DISPARO: Destello cristalino frontal al disparar.
 *    - UPGRADED: Alas de cristal desplegadas (se activa con potenciador de cristal o al alcanzar 1500 puntos en el stage),
 *      dispara ráfaga triple de fragmentos de cristal (centro + 2 diagonales).
 *    - DAMAGE: Cristales fracturados y humo púrpura cuando le queda 1 vida o tras recibir un impacto.
 *
 * 2. Los 4 Oponentes Voladores de la Caverna (Cavern Flying Opponents):
 *    - Enemigo 1 (Crystal Drone): Dron rápido en zigzag que dispara orbes de energía cian.
 *    - Enemigo 2 (Crystal Cowl / Beetle): Escarabajo cristalino que desciende realizando embestidas rápidas
 *      y lanza agujas magenta gemelas.
 *    - Enemigo 3 (Cavern Skiff): Patrullero artillado (8 HP) que se desplaza lateralmente y dispara
 *      un abanico de 3 fragmentos de cristal.
 *    - Enemigo 4 (Crystal Dredger / Heavy Flyer): Sub-jefe perforador pesado (35 HP) con taladro frontal;
 *      avanza, realiza cargas cortas de taladro y lanza salvas de 5 esquirlas.
 *
 * 3. Jefe Final: THE CRYSTAL ARCH-DREADNOUGHT (360 HP):
 *    - Estado IDLE: Patrulla la bóveda superior disparando ráfagas dirigidas de cristales.
 *    - Ataque 1 (DRILL RUSH & ENERGY CHARGE): Su núcleo brilla en magenta, apunta al jugador y embiste
 *      hacia abajo con su gigantesco taladro antes de replegarse.
 *    - Ataque 2 (CRYSTAL BARRAGE & LASER): Se posiciona, carga energía, dispara un colosal Rayo Láser
 *      Cristalino vertical que barre la zona mientras expulsa una lluvia radial de esquirlas de cristal.
 *    - Estado DEFEATED / FINAL EXPLOSION: Al llegar a 0 HP, muestra su sprite de colapso con 14 explosiones
 *      encadenadas de cristal antes del ascenso triunfal de la Nave de Cristal.
 */
window.Guardianes = window.Guardianes || {};

(function(G) {
    const duracionRecorridoBase = 95; // segundos para el recorrido completo antes del jefe
    const umbralMejoraPuntos = 1500;

    const jugador = {
        x: 364,
        y: 390,
        ancho: 68,
        alto: 88,
        velocidadBase: 265,
        velocidad: 265,
        inclinacion: 0
    };

    const proyectilesJugador = [];
    const disparosEnemigos = [];
    const enemigos = [];
    const potenciadores = [];
    const explosionesCristal = [];

    let tiempoEtapa = 0;
    let vidas = 3;
    let puntosStage = 0;
    let invulnerableHasta = -Infinity;
    let mostrarEstadoDisparoHasta = -Infinity;
    let mostrarEstadoDanioHasta = -Infinity;
    let ultimoDisparo = -Infinity;

    let nivelCristal = 0; // 0: normal, 1: upgraded (triple cristal), 2: upgraded + escudo de cristal
    let mejoradoPorPuntos = false;
    let escudoCristalActivo = false;

    let proximoDrone = 1.0;
    let proximoBeetle = 9.0;
    let proximoSkiff = 18.0;
    let proximoDredger = 30.0;
    let proximoPotenciador = 17.0;

    let dredgersDerrotados = 0;
    let jefeActivo = false;
    let avisoJefeInicio = null;
    let jefe = null;
    let victoriaEnCurso = false;

    const tiposPotenciador = ["cristal", "escudo", "vida"];
    let contadorPotenciadores = 0;

    function reiniciar(canvas) {
        jugador.x = (canvas.width - jugador.ancho) / 2;
        jugador.y = canvas.height - jugador.alto - 24;
        jugador.velocidad = jugador.velocidadBase;
        jugador.inclinacion = 0;

        proyectilesJugador.length = 0;
        disparosEnemigos.length = 0;
        enemigos.length = 0;
        potenciadores.length = 0;
        explosionesCristal.length = 0;

        tiempoEtapa = 0;
        vidas = 3;
        puntosStage = 0;
        invulnerableHasta = -Infinity;
        mostrarEstadoDisparoHasta = -Infinity;
        mostrarEstadoDanioHasta = -Infinity;
        ultimoDisparo = -Infinity;

        nivelCristal = 0;
        mejoradoPorPuntos = false;
        escudoCristalActivo = false;

        proximoDrone = 1.0;
        proximoBeetle = 8.0;
        proximoSkiff = 17.0;
        proximoDredger = 28.0;
        proximoPotenciador = 17.0;
        contadorPotenciadores = 0;

        dredgersDerrotados = 0;
        jefeActivo = false;
        avisoJefeInicio = null;
        jefe = null;
        victoriaEnCurso = false;
    }

    function obtenerVidas() {
        return vidas;
    }

    function estaMejorado() {
        return nivelCristal >= 1 || mejoradoPorPuntos;
    }

    function tieneAnimacionPendiente(estado) {
        return (estado === "derrota" && explosionesCristal.length > 0) || victoriaEnCurso;
    }

    function actualizar(deltaSegundos, canvas, contextoJuego) {
        tiempoEtapa += deltaSegundos;

        actualizarExplosionesCristal(deltaSegundos);

        if (contextoJuego.estado !== "jugando") {
            return;
        }

        if (victoriaEnCurso) {
            actualizarAnimacionVictoria(deltaSegundos, contextoJuego);
            return;
        }

        actualizarJugador(deltaSegundos, canvas);
        actualizarProyectilesJugador(deltaSegundos);
        actualizarOleadasEnemigos(deltaSegundos, canvas);
        actualizarJefeFinal(deltaSegundos, canvas, contextoJuego);
        actualizarDisparosEnemigos(deltaSegundos, canvas);
        actualizarPotenciadores(deltaSegundos, canvas);
        comprobarColisiones(canvas, contextoJuego);
    }

    function actualizarJugador(deltaSegundos, canvas) {
        const vector = G.Entrada.obtenerVectorMovimiento();
        jugador.x += vector.x * jugador.velocidad * deltaSegundos;
        jugador.y += vector.y * jugador.velocidad * deltaSegundos;
        jugador.x = Math.max(8, Math.min(canvas.width - jugador.ancho - 8, jugador.x));
        jugador.y = Math.max(20, Math.min(canvas.height - jugador.alto - 8, jugador.y));

        if (vector.x < -0.05) {
            jugador.inclinacion = -10 * Math.PI / 180;
        } else if (vector.x > 0.05) {
            jugador.inclinacion = 10 * Math.PI / 180;
        } else {
            jugador.inclinacion = 0;
        }

        const cadencia = estaMejorado() ? 0.21 : 0.24;
        if (G.Entrada.estaDisparando() && tiempoEtapa - ultimoDisparo >= cadencia) {
            dispararCristalesJugador();
            if (G.Sonido) {
                G.Sonido.reproducirDisparo(estaMejorado());
            }
            ultimoDisparo = tiempoEtapa;
            mostrarEstadoDisparoHasta = tiempoEtapa + 0.11;
        }
    }

    function dispararCristalesJugador() {
        const centroX = jugador.x + jugador.ancho / 2;
        const puntaY = jugador.y + 4;

        if (!estaMejorado()) {
            // Láser de cristal magenta/cian concentrado
            proyectilesJugador.push({
                x: centroX,
                y: puntaY,
                vx: 0,
                vy: -540,
                radio: 5,
                largo: 22,
                daño: 1,
                color: "#ff66f5",
                nucleo: "#ffffff"
            });
        } else {
            // Modo UPGRADED: Ráfaga de 3 fragmentos de cristal (central + 2 laterales angulados)
            proyectilesJugador.push({
                x: centroX,
                y: puntaY - 2,
                vx: 0,
                vy: -580,
                radio: 6,
                largo: 24,
                daño: 1.5,
                color: "#57f7ff",
                nucleo: "#ffffff"
            });
            proyectilesJugador.push({
                x: centroX - 16,
                y: puntaY + 8,
                vx: -85,
                vy: -550,
                radio: 5,
                largo: 18,
                daño: 1,
                color: "#ff66f5",
                nucleo: "#d8ffff"
            });
            proyectilesJugador.push({
                x: centroX + 16,
                y: puntaY + 8,
                vx: 85,
                vy: -550,
                radio: 5,
                largo: 18,
                daño: 1,
                color: "#ff66f5",
                nucleo: "#d8ffff"
            });
        }
    }

    function actualizarProyectilesJugador(deltaSegundos) {
        for (let i = proyectilesJugador.length - 1; i >= 0; i--) {
            const p = proyectilesJugador[i];
            p.x += p.vx * deltaSegundos;
            p.y += p.vy * deltaSegundos;
            if (p.y + p.largo < -10 || p.x < -20 || p.x > 820) {
                proyectilesJugador.splice(i, 1);
            }
        }
    }

    function actualizarOleadasEnemigos(deltaSegundos, canvas) {
        // Activar jefe final cuando se derrota a 2 Dredgers o se cumple el recorrido de la caverna
        if (!jefeActivo && (dredgersDerrotados >= 2 || tiempoEtapa >= duracionRecorridoBase)) {
            jefeActivo = true;
            avisoJefeInicio = tiempoEtapa;
            G.Efectos.iniciarSacudida(2.6, 10);
            if (G.Sonido) {
                G.Sonido.reproducirAparicionJefe();
            }
        }

        if (!jefeActivo) {
            // 1. Crystal Drone (rápido, aparece durante toda la etapa)
            if (tiempoEtapa >= proximoDrone) {
                crearCrystalDrone(canvas);
                proximoDrone = tiempoEtapa + (tiempoEtapa > 25 ? 1.45 : 1.9);
            }

            // 2. Crystal Cowl / Beetle (escarabajo veloz)
            if (tiempoEtapa >= proximoBeetle) {
                crearCrystalBeetle(canvas);
                proximoBeetle = tiempoEtapa + 2.95;
            }

            // 3. Cavern Skiff (nave artillada media)
            if (tiempoEtapa >= proximoSkiff) {
                crearCavernSkiff(canvas);
                proximoSkiff = tiempoEtapa + 5.4;
            }

            // 4. Crystal Dredger / Heavy Flyer (sub-jefe perforador pesado)
            const hayDredgerVivo = enemigos.some(function(e) { return e.tipo === 4; });
            if (tiempoEtapa >= proximoDredger && !hayDredgerVivo) {
                crearCrystalDredger(canvas);
                proximoDredger = tiempoEtapa + 15.0;
            }
        }

        for (let i = enemigos.length - 1; i >= 0; i--) {
            const e = enemigos[i];
            e.tiempoVida += deltaSegundos;

            if (e.tipo === 1) {
                // Crystal Drone: descenso con oscilación sinusoidal rápida
                e.y += e.vy * deltaSegundos;
                e.x = e.xBase + Math.sin(e.tiempoVida * 3.8 + e.fase) * 58;
                e.x = Math.max(16, Math.min(canvas.width - e.ancho - 16, e.x));

                if (tiempoEtapa >= e.proximoDisparo) {
                    dispararOrbeDirigido(e, 230, "#47f5ff", 5);
                    e.proximoDisparo = tiempoEtapa + 2.1;
                }
            } else if (e.tipo === 2) {
                // Crystal Beetle: se alinea suavemente con X del jugador y acelera en embestida
                const centroJugadorX = jugador.x + jugador.ancho / 2;
                const centroEnemigoX = e.x + e.ancho / 2;
                const diffX = centroJugadorX - centroEnemigoX;
                e.x += Math.sign(diffX) * Math.min(Math.abs(diffX), 115 * deltaSegundos);
                const velocidadVertical = e.y > 120 ? e.vy * 1.45 : e.vy;
                e.y += velocidadVertical * deltaSegundos;

                if (tiempoEtapa >= e.proximoDisparo) {
                    dispararAgujasBeetle(e);
                    e.proximoDisparo = tiempoEtapa + 1.9;
                }
            } else if (e.tipo === 3) {
                // Cavern Skiff: baja hasta franja media-alta y patrulla horizontalmente
                if (e.y < e.yObjetivo) {
                    e.y += e.vy * deltaSegundos;
                } else {
                    e.y = e.yObjetivo + Math.sin(e.tiempoVida * 2.5) * 10;
                    e.x += e.vx * deltaSegundos;
                    if (e.x <= 24 || e.x + e.ancho >= canvas.width - 24) {
                        e.vx *= -1;
                        e.x = Math.max(24, Math.min(canvas.width - e.ancho - 24, e.x));
                    }
                }

                if (tiempoEtapa >= e.proximoDisparo) {
                    dispararAbanicoCristal(
                        e.x + e.ancho / 2,
                        e.y + e.alto - 6,
                        [-25, 0, 25],
                        245,
                        "#5efdff"
                    );
                    e.proximoDisparo = tiempoEtapa + 2.2;
                }
            } else if (e.tipo === 4) {
                // Crystal Dredger (Heavy Flyer): entra hasta y=65, patrulla y hace embestidas cortas de taladro
                if (e.faseEstado === "entrada") {
                    e.y = Math.min(64, e.y + e.vy * deltaSegundos);
                    if (e.y >= 64) {
                        e.faseEstado = "patrulla";
                        e.proximoAtaqueEspecial = tiempoEtapa + 4.0;
                    }
                } else if (e.faseEstado === "patrulla") {
                    e.x += e.vx * deltaSegundos;
                    if (e.x <= 36 || e.x + e.ancho >= canvas.width - 36) {
                        e.vx *= -1;
                        e.x = Math.max(36, Math.min(canvas.width - e.ancho - 36, e.x));
                    }
                    e.y = 64 + Math.sin(e.tiempoVida * 3) * 8;

                    if (tiempoEtapa >= e.proximoDisparo) {
                        dispararAbanicoCristal(
                            e.x + e.ancho / 2,
                            e.y + e.alto - 8,
                            [-44, -22, 0, 22, 44],
                            255,
                            "#df6eff"
                        );
                        e.proximoDisparo = tiempoEtapa + 2.0;
                    }

                    if (tiempoEtapa >= e.proximoAtaqueEspecial) {
                        e.faseEstado = "embestida";
                        e.vyEmbestida = 290;
                    }
                } else if (e.faseEstado === "embestida") {
                    e.y += e.vyEmbestida * deltaSegundos;
                    if (e.y >= 260) {
                        e.vyEmbestida = -220;
                        dispararAbanicoCristal(
                            e.x + e.ancho / 2,
                            e.y + e.alto - 10,
                            [-60, -30, 0, 30, 60],
                            270,
                            "#55f7ff"
                        );
                    } else if (e.vyEmbestida < 0 && e.y <= 64) {
                        e.y = 64;
                        e.faseEstado = "patrulla";
                        e.proximoAtaqueEspecial = tiempoEtapa + 4.5;
                    }
                }
            }

            if (e.y > canvas.height + 40) {
                enemigos.splice(i, 1);
            }
        }
    }

    function crearCrystalDrone(canvas) {
        const ancho = 42;
        const alto = 68;
        const xBase = 60 + Math.random() * (canvas.width - ancho - 120);
        enemigos.push({
            tipo: 1,
            nombre: "Crystal Drone",
            x: xBase,
            xBase: xBase,
            y: -alto,
            ancho: ancho,
            alto: alto,
            vy: 125 + Math.random() * 35,
            vida: 2,
            vidaMaxima: 2,
            puntos: 150,
            fase: Math.random() * Math.PI * 2,
            tiempoVida: 0,
            proximoDisparo: tiempoEtapa + 0.9 + Math.random() * 0.7
        });
    }

    function crearCrystalBeetle(canvas) {
        const ancho = 48;
        const alto = 78;
        enemigos.push({
            tipo: 2,
            nombre: "Crystal Beetle",
            x: 40 + Math.random() * (canvas.width - ancho - 80),
            y: -alto,
            ancho: ancho,
            alto: alto,
            vy: 145,
            vida: 3,
            vidaMaxima: 3,
            puntos: 250,
            tiempoVida: 0,
            proximoDisparo: tiempoEtapa + 0.8
        });
    }

    function crearCavernSkiff(canvas) {
        const ancho = 58;
        const alto = 96;
        enemigos.push({
            tipo: 3,
            nombre: "Cavern Skiff",
            x: 50 + Math.random() * (canvas.width - ancho - 100),
            y: -alto,
            yObjetivo: 75 + Math.random() * 95,
            ancho: ancho,
            alto: alto,
            vx: (Math.random() < 0.5 ? -1 : 1) * 120,
            vy: 130,
            vida: 9,
            vidaMaxima: 9,
            puntos: 600,
            barraVida: true,
            tiempoVida: 0,
            proximoDisparo: tiempoEtapa + 1.1
        });
    }

    function crearCrystalDredger(canvas) {
        const ancho = 76;
        const alto = 138;
        enemigos.push({
            tipo: 4,
            nombre: "Crystal Dredger",
            x: (canvas.width - ancho) / 2,
            y: -alto,
            ancho: ancho,
            alto: alto,
            vx: (Math.random() < 0.5 ? -1 : 1) * 110,
            vy: 120,
            vyEmbestida: 0,
            vida: 35,
            vidaMaxima: 35,
            puntos: 2000,
            barraVida: true,
            faseEstado: "entrada",
            tiempoVida: 0,
            proximoDisparo: tiempoEtapa + 1.4,
            proximoAtaqueEspecial: Infinity
        });
    }

    function dispararOrbeDirigido(origen, rapidez, color, radio) {
        const ox = origen.x + origen.ancho / 2;
        const oy = origen.y + origen.alto - 6;
        const dx = (jugador.x + jugador.ancho / 2) - ox;
        const dy = (jugador.y + jugador.alto / 2) - oy;
        const dist = Math.hypot(dx, dy) || 1;

        disparosEnemigos.push({
            x: ox,
            y: oy,
            vx: dx / dist * rapidez,
            vy: dy / dist * rapidez,
            radio: radio || 5,
            color: color || "#47f5ff",
            tipo: "orbe"
        });
    }

    function dispararAgujasBeetle(enemigo) {
        const cx = enemigo.x + enemigo.ancho / 2;
        const cy = enemigo.y + enemigo.alto - 6;
        for (const offset of [-10, 10]) {
            disparosEnemigos.push({
                x: cx + offset,
                y: cy,
                vx: offset * 2.5,
                vy: 275,
                radio: 4,
                color: "#ff55e8",
                tipo: "esquirla"
            });
        }
    }

    function dispararAbanicoCristal(origenX, origenY, angulosGrados, rapidez, color) {
        for (const grados of angulosGrados) {
            const rad = grados * Math.PI / 180;
            disparosEnemigos.push({
                x: origenX,
                y: origenY,
                vx: Math.sin(rad) * rapidez,
                vy: Math.cos(rad) * rapidez,
                radio: 5,
                color: color,
                tipo: "esquirla"
            });
        }
    }

    function actualizarJefeFinal(deltaSegundos, canvas) {
        if (!jefeActivo) return;

        if (!jefe) {
            if (tiempoEtapa - avisoJefeInicio < 2.6) {
                return;
            }
            // Limpiar enemigos menores al entrar el Arch-Dreadnought
            enemigos.length = 0;
            disparosEnemigos.length = 0;

            const ancho = 132;
            const alto = 236;
            jefe = {
                nombre: "THE CRYSTAL ARCH-DREADNOUGHT",
                x: (canvas.width - ancho) / 2,
                y: -alto,
                yBase: 16,
                ancho: ancho,
                alto: alto,
                vx: 140,
                direccion: 1,
                vida: 240,
                vidaMaxima: 240,
                estado: "entrada", // "entrada", "idle", "preparando_taladro", "embestida_taladro", "retorno_taladro", "preparando_laser", "disparando_laser", "derrotado"
                tiempoEstado: 0,
                proximoDisparoBase: tiempoEtapa + 1.2,
                proximoBarrageLaser: 0,
                cicloAtaque: 0,
                laserActivo: false,
                explosionesRestantes: 14,
                proximaExplosionMuerte: 0
            };
            return;
        }

        jefe.tiempoEstado += deltaSegundos;

        if (jefe.estado === "entrada") {
            jefe.y = Math.min(jefe.yBase, jefe.y + 130 * deltaSegundos);
            if (jefe.y >= jefe.yBase) {
                cambiarEstadoJefe("idle");
            }
            return;
        }

        if (jefe.estado === "idle") {
            // Patrulla lateralmente en la parte superior
            const factorFuria = jefe.vida <= jefe.vidaMaxima * 0.5 ? 1.3 : 1;
            jefe.x += jefe.vx * factorFuria * jefe.direccion * deltaSegundos;
            const minX = 36;
            const maxX = canvas.width - jefe.ancho - 36;
            if (jefe.x <= minX || jefe.x >= maxX) {
                jefe.direccion *= -1;
                jefe.x = Math.max(minX, Math.min(maxX, jefe.x));
            }
            jefe.y = jefe.yBase + Math.sin(tiempoEtapa * 2.6) * 6;

            if (tiempoEtapa >= jefe.proximoDisparoBase) {
                dispararAbanicoCristal(
                    jefe.x + jefe.ancho / 2,
                    jefe.y + jefe.alto - 14,
                    [-48, -24, 0, 24, 48],
                    260,
                    "#55f7ff"
                );
                dispararOrbeDirigido(jefe, 285, "#ff55e8", 6);
                jefe.proximoDisparoBase = tiempoEtapa + (jefe.vida <= jefe.vidaMaxima * 0.5 ? 1.15 : 1.45);
            }

            // Cada 3.6 segundos alterna entre Ataque 1 (Drill Rush) y Ataque 2 (Crystal Barrage & Laser)
            if (jefe.tiempoEstado >= 3.6) {
                jefe.cicloAtaque++;
                if (jefe.cicloAtaque % 2 === 1) {
                    cambiarEstadoJefe("preparando_taladro");
                } else {
                    cambiarEstadoJefe("preparando_laser");
                }
            }
            return;
        }

        if (jefe.estado === "preparando_taladro") {
            // Se alinea con el jugador mientras su taladro chispea (sprite jefeCarga)
            const destinoX = (jugador.x + jugador.ancho / 2) - jefe.ancho / 2;
            const diffX = destinoX - jefe.x;
            jefe.x += Math.sign(diffX) * Math.min(Math.abs(diffX), 210 * deltaSegundos);
            jefe.x = Math.max(24, Math.min(canvas.width - jefe.ancho - 24, jefe.x));
            // Vibración de carga
            jefe.y = jefe.yBase + Math.sin(jefe.tiempoEstado * 45) * 3;

            if (jefe.tiempoEstado >= 1.15) {
                cambiarEstadoJefe("embestida_taladro");
            }
            return;
        }

        if (jefe.estado === "embestida_taladro") {
            // Embestida violenta hacia abajo con el taladro
            jefe.y += 460 * deltaSegundos;
            if (jefe.y + jefe.alto >= canvas.height - 22) {
                // Impacto al fondo: onda expansiva de esquirlas de cristal
                crearExplosionCristal(jefe.x + jefe.ancho / 2, jefe.y + jefe.alto - 16, 1.3, "#55f7ff");
                dispararAbanicoCristal(
                    jefe.x + jefe.ancho / 2,
                    jefe.y + jefe.alto - 30,
                    [-85, -60, -35, -12, 12, 35, 60, 85],
                    250,
                    "#ff66f5"
                );
                cambiarEstadoJefe("retorno_taladro");
            }
            return;
        }

        if (jefe.estado === "retorno_taladro") {
            jefe.y = Math.max(jefe.yBase, jefe.y - 240 * deltaSegundos);
            if (jefe.y <= jefe.yBase) {
                cambiarEstadoJefe("idle");
            }
            return;
        }

        if (jefe.estado === "preparando_laser") {
            // Carga energía magenta en el cañón durante 1.1s (muestra guía de advertencia láser)
            const destinoX = (jugador.x + jugador.ancho / 2) - jefe.ancho / 2;
            const diffX = destinoX - jefe.x;
            jefe.x += Math.sign(diffX) * Math.min(Math.abs(diffX), 120 * deltaSegundos);
            jefe.x = Math.max(30, Math.min(canvas.width - jefe.ancho - 30, jefe.x));

            if (jefe.tiempoEstado >= 1.1) {
                cambiarEstadoJefe("disparando_laser");
                jefe.laserActivo = true;
                jefe.proximoBarrageLaser = tiempoEtapa + 0.15;
                G.Efectos.iniciarSacudida(1.2, 6);
                if (G.Sonido) {
                    G.Sonido.reproducirLaser(true);
                }
            }
            return;
        }

        if (jefe.estado === "disparando_laser") {
            // Mientras dispara el enorme rayo láser vertical, se mueve lentamente barriendo horizontalmente
            // y lanza una lluvia de cristales laterales (Crystal Barrage & Laser)
            jefe.x += jefe.direccion * 68 * deltaSegundos;
            const minX = 36;
            const maxX = canvas.width - jefe.ancho - 36;
            if (jefe.x <= minX || jefe.x >= maxX) {
                jefe.direccion *= -1;
                jefe.x = Math.max(minX, Math.min(maxX, jefe.x));
            }

            if (tiempoEtapa >= jefe.proximoBarrageLaser) {
                const origenX = jefe.x + jefe.ancho / 2;
                const origenY = jefe.y + jefe.alto * 0.78;
                dispararAbanicoCristal(
                    origenX,
                    origenY,
                    [-75, -50, -30, 30, 50, 75],
                    235,
                    "#ff66f5"
                );
                jefe.proximoBarrageLaser = tiempoEtapa + 0.55;
            }

            if (jefe.tiempoEstado >= 2.5) {
                jefe.laserActivo = false;
                cambiarEstadoJefe("idle");
            }
            return;
        }

        if (jefe.estado === "derrotado") {
            jefe.laserActivo = false;
            if (jefe.explosionesRestantes > 0 && tiempoEtapa >= jefe.proximaExplosionMuerte) {
                const ex = jefe.x + 16 + Math.random() * (jefe.ancho - 32);
                const ey = jefe.y + 16 + Math.random() * (jefe.alto - 32);
                const color = jefe.explosionesRestantes % 2 === 0 ? "#55f7ff" : "#ff55e8";
                crearExplosionCristal(ex, ey, 1.15 + Math.random() * 0.5, color);
                jefe.explosionesRestantes--;
                jefe.proximaExplosionMuerte = tiempoEtapa + 0.16;
            } else if (jefe.explosionesRestantes === 0 && tiempoEtapa >= jefe.proximaExplosionMuerte + 0.5) {
                jefe = null;
                victoriaEnCurso = true;
                proyectilesJugador.length = 0;
                disparosEnemigos.length = 0;
                potenciadores.length = 0;
                jugador.x = (canvas.width - jugador.ancho) / 2;
                jugador.inclinacion = 0;
            }
        }
    }

    function cambiarEstadoJefe(nuevoEstado) {
        if (!jefe) return;
        jefe.estado = nuevoEstado;
        jefe.tiempoEstado = 0;
    }

    function actualizarAnimacionVictoria(deltaSegundos, contextoJuego) {
        jugador.y -= 220 * deltaSegundos;
        jugador.inclinacion = 0;
        if (jugador.y + jugador.alto < 0) {
            victoriaEnCurso = false;
            contextoJuego.alGanarJuego();
        }
    }

    function actualizarDisparosEnemigos(deltaSegundos, canvas) {
        for (let i = disparosEnemigos.length - 1; i >= 0; i--) {
            const d = disparosEnemigos[i];
            d.x += d.vx * deltaSegundos;
            d.y += d.vy * deltaSegundos;
            if (d.x < -20 || d.x > canvas.width + 20 || d.y < -20 || d.y > canvas.height + 20) {
                disparosEnemigos.splice(i, 1);
            }
        }
    }

    function actualizarPotenciadores(deltaSegundos, canvas) {
        const jefeDestruyendose = jefe && jefe.estado === "derrotado";
        if (!jefeDestruyendose && !victoriaEnCurso && tiempoEtapa >= proximoPotenciador) {
            const tipo = tiposPotenciador[contadorPotenciadores % tiposPotenciador.length];
            contadorPotenciadores++;
            potenciadores.push({
                tipo: tipo,
                x: 44 + Math.random() * (canvas.width - 128),
                y: -42,
                ancho: 40,
                alto: 40,
                vy: 82
            });
            proximoPotenciador = tiempoEtapa + 25.0;
        }

        for (let i = potenciadores.length - 1; i >= 0; i--) {
            const p = potenciadores[i];
            p.y += p.vy * deltaSegundos;
            if (p.y > canvas.height + 20) {
                potenciadores.splice(i, 1);
            }
        }
    }

    function obtenerHitboxJugador() {
        return {
            x: jugador.x + 14,
            y: jugador.y + 12,
            ancho: jugador.ancho - 28,
            alto: jugador.alto - 24
        };
    }

    function comprobarColisiones(canvas, contextoJuego) {
        const seSuperponen = G.Efectos.seSuperponen;
        const circuloTocaRectangulo = G.Efectos.circuloTocaRectangulo;

        // 1. Proyectiles del jugador contra enemigos y Jefe Final
        for (let i = proyectilesJugador.length - 1; i >= 0; i--) {
            const p = proyectilesJugador[i];
            let impacto = false;

            for (let j = enemigos.length - 1; j >= 0; j--) {
                const e = enemigos[j];
                if (circuloTocaRectangulo(p.x, p.y, p.radio, e)) {
                    proyectilesJugador.splice(i, 1);
                    impacto = true;
                    e.vida -= p.daño;
                    if (e.vida <= 0) {
                        crearExplosionCristal(
                            e.x + e.ancho / 2,
                            e.y + e.alto / 2,
                            e.tipo === 4 ? 1.4 : 0.9,
                            e.tipo % 2 === 0 ? "#ff66f5" : "#55f7ff"
                        );
                        puntosStage += e.puntos;
                        contextoJuego.sumarPuntos(e.puntos);
                        verificarMejoraPorPuntos();
                        if (e.tipo === 4) {
                            dredgersDerrotados++;
                        }
                        enemigos.splice(j, 1);
                    }
                    break;
                }
            }

            if (impacto) continue;

            if (
                jefe &&
                jefe.estado !== "entrada" &&
                jefe.estado !== "derrotado" &&
                circuloTocaRectangulo(p.x, p.y, p.radio, jefe)
            ) {
                proyectilesJugador.splice(i, 1);
                jefe.vida -= p.daño;
                if (jefe.vida <= 0) {
                    jefe.vida = 0;
                    cambiarEstadoJefe("derrotado");
                    jefe.proximaExplosionMuerte = tiempoEtapa;
                    disparosEnemigos.length = 0;
                    puntosStage += 15000;
                    contextoJuego.sumarPuntos(15000);
                }
            }
        }

        const hitboxJugador = obtenerHitboxJugador();

        // 2. Recoger potenciadores
        for (let i = potenciadores.length - 1; i >= 0; i--) {
            const pot = potenciadores[i];
            if (seSuperponen(hitboxJugador, pot)) {
                aplicarPotenciador(pot.tipo);
                potenciadores.splice(i, 1);
            }
        }

        // 3. Disparos enemigos contra jugador
        for (let i = disparosEnemigos.length - 1; i >= 0; i--) {
            const d = disparosEnemigos[i];
            if (circuloTocaRectangulo(d.x, d.y, d.radio, hitboxJugador)) {
                disparosEnemigos.splice(i, 1);
                recibirImpactoJugador(canvas, contextoJuego);
                if (contextoJuego.estado !== "jugando") return;
            }
        }

        // 4. Colisión cuerpo a cuerpo con enemigos
        for (let i = enemigos.length - 1; i >= 0; i--) {
            const e = enemigos[i];
            if (seSuperponen(hitboxJugador, e)) {
                if (e.tipo !== 4) {
                    crearExplosionCristal(e.x + e.ancho / 2, e.y + e.alto / 2, 0.85, "#ff66f5");
                    enemigos.splice(i, 1);
                }
                recibirImpactoJugador(canvas, contextoJuego);
                if (contextoJuego.estado !== "jugando") return;
            }
        }

        // 5. Colisión con el cuerpo o el Rayo Láser del Jefe Final
        if (jefe && jefe.estado !== "derrotado") {
            if (seSuperponen(hitboxJugador, jefe)) {
                recibirImpactoJugador(canvas, contextoJuego);
                if (contextoJuego.estado !== "jugando") return;
            }

            if (jefe.laserActivo) {
                const rectLaser = {
                    x: jefe.x + jefe.ancho / 2 - 20,
                    y: jefe.y + jefe.alto * 0.72,
                    ancho: 40,
                    alto: canvas.height
                };
                if (seSuperponen(hitboxJugador, rectLaser)) {
                    recibirImpactoJugador(canvas, contextoJuego);
                    if (contextoJuego.estado !== "jugando") return;
                }
            }
        }
    }

    function verificarMejoraPorPuntos() {
        if (!mejoradoPorPuntos && puntosStage >= umbralMejoraPuntos) {
            mejoradoPorPuntos = true;
            nivelCristal = Math.max(nivelCristal, 1);
        }
    }

    function aplicarPotenciador(tipo) {
        if (tipo === "cristal") {
            nivelCristal = Math.min(2, nivelCristal + 1);
            if (nivelCristal >= 2) {
                escudoCristalActivo = true;
                jugador.velocidad = jugador.velocidadBase * 1.25;
            }
        } else if (tipo === "escudo") {
            escudoCristalActivo = true;
            jugador.velocidad = jugador.velocidadBase * 1.25;
        } else if (tipo === "vida") {
            vidas = Math.min(3, vidas + 1);
        }
    }

    function recibirImpactoJugador(canvas, contextoJuego) {
        if (tiempoEtapa < invulnerableHasta) return;

        if (G.Sonido) {
            G.Sonido.reproducirImpactoNave();
        }

        if (escudoCristalActivo) {
            escudoCristalActivo = false;
            jugador.velocidad = jugador.velocidadBase;
            invulnerableHasta = tiempoEtapa + 1.2;
            crearExplosionCristal(
                jugador.x + jugador.ancho / 2,
                jugador.y + jugador.alto / 2,
                0.95,
                "#55f7ff"
            );
            return;
        }

        vidas--;
        nivelCristal = 0;
        mejoradoPorPuntos = false;
        jugador.velocidad = jugador.velocidadBase;
        mostrarEstadoDanioHasta = tiempoEtapa + 2.8;
        crearExplosionCristal(
            jugador.x + jugador.ancho / 2,
            jugador.y + jugador.alto / 2,
            1.25,
            "#d955ff"
        );

        if (vidas <= 0) {
            contextoJuego.alPerderPartida();
        } else {
            invulnerableHasta = tiempoEtapa + 1.8;
        }
    }

    function crearExplosionCristal(x, y, escala, colorPrincipal) {
        const esc = escala || 1;
        const colores = [colorPrincipal || "#55f7ff", "#ff66f5", "#ffffff", "#a382ff"];
        const particulas = [];
        for (let i = 0; i < 36; i++) {
            const angulo = Math.random() * Math.PI * 2;
            const rapidez = (70 + Math.random() * 210) * esc;
            particulas.push({
                x: x,
                y: y,
                vx: Math.cos(angulo) * rapidez,
                vy: Math.sin(angulo) * rapidez,
                tamano: (2.5 + Math.random() * 4.5) * esc,
                anguloRotacion: Math.random() * Math.PI * 2,
                velRotacion: (Math.random() - 0.5) * 10,
                edad: 0,
                duracion: 0.45 + Math.random() * 0.45,
                color: colores[Math.floor(Math.random() * colores.length)]
            });
        }
        explosionesCristal.push({
            x: x,
            y: y,
            edad: 0,
            duracion: 0.9,
            escala: esc,
            color: colorPrincipal || "#55f7ff",
            particulas: particulas
        });
    }

    function actualizarExplosionesCristal(deltaSegundos) {
        for (let i = explosionesCristal.length - 1; i >= 0; i--) {
            const exp = explosionesCristal[i];
            exp.edad += deltaSegundos;
            for (const part of exp.particulas) {
                part.edad += deltaSegundos;
                part.x += part.vx * deltaSegundos;
                part.y += part.vy * deltaSegundos;
                part.vx *= 0.96;
                part.vy *= 0.96;
                part.anguloRotacion += part.velRotacion * deltaSegundos;
            }
            if (exp.edad >= exp.duracion) {
                explosionesCristal.splice(i, 1);
            }
        }
    }

    function obtenerSpriteJugadorActual(imgs) {
        // Prioridad visual de los 4 estados de la Nave de Cristal:
        // 1. Si sufrió daño recientemente o está en su última vida (1 vida) -> DAMAGE
        // 2. Si está mejorada (UPGRADED) -> UPGRADED
        // 3. Si acaba de disparar -> DISPARO
        // 4. Por defecto -> IDLE
        if (vidas === 1 || tiempoEtapa < mostrarEstadoDanioHasta) {
            return imgs.jugadorDamage;
        }
        if (estaMejorado()) {
            return imgs.jugadorUpgraded;
        }
        if (tiempoEtapa < mostrarEstadoDisparoHasta) {
            return imgs.jugadorDisparo;
        }
        return imgs.jugadorIdle;
    }

    function dibujar(ctx, canvas, contextoJuego) {
        const imgs = G.Recursos.imagenes.stage3;
        ctx.imageSmoothingEnabled = true;

        // 1. Fondo desplazable en bucle continuo por las Cavernas de Cristal
        if (imgs.fondo && imgs.fondo.complete && imgs.fondo.naturalWidth > 0) {
            const altoEscenario = imgs.fondo.naturalHeight * canvas.width / imgs.fondo.naturalWidth;
            const velocidadScroll = 85; // px/s
            const offset = (tiempoEtapa * velocidadScroll) % altoEscenario;

            ctx.drawImage(imgs.fondo, 0, offset - altoEscenario, canvas.width, altoEscenario);
            ctx.drawImage(imgs.fondo, 0, offset, canvas.width, altoEscenario);
            if (offset + altoEscenario < canvas.height) {
                ctx.drawImage(imgs.fondo, 0, offset + altoEscenario, canvas.width, altoEscenario);
            }
        }

        // 2. Potenciadores de cristal
        for (const pot of potenciadores) {
            dibujarPotenciadorCristal(ctx, pot);
        }

        // 3. Oponentes voladores de la caverna
        const mapaSpritesEnemigos = {
            1: imgs.enemigo1,
            2: imgs.enemigo2,
            3: imgs.enemigo3,
            4: imgs.enemigo4
        };

        for (const e of enemigos) {
            const sprite = mapaSpritesEnemigos[e.tipo];
            ctx.save();
            ctx.shadowColor = e.tipo % 2 === 0 ? "#ff45e8" : "#38f3ff";
            ctx.shadowBlur = e.tipo === 4 ? 18 : 10;
            ctx.drawImage(sprite, e.x, e.y, e.ancho, e.alto);
            ctx.restore();

            if (e.barraVida) {
                ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
                ctx.fillRect(e.x + 4, e.y - 9, e.ancho - 8, 5);
                ctx.fillStyle = e.tipo === 4 ? "#df55ff" : "#42f5ff";
                ctx.fillRect(
                    e.x + 4,
                    e.y - 9,
                    (e.ancho - 8) * Math.max(0, e.vida) / e.vidaMaxima,
                    5
                );
            }
        }

        // 4. Jefe Final: THE CRYSTAL ARCH-DREADNOUGHT
        if (jefe) {
            dibujarJefeFinal(ctx, canvas, imgs);
        }

        // 5. Proyectiles del jugador
        for (const p of proyectilesJugador) {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(Math.atan2(p.vy, p.vx) + Math.PI / 2);
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 12;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.moveTo(0, -p.largo / 2);
            ctx.lineTo(p.radio, 0);
            ctx.lineTo(0, p.largo / 2);
            ctx.lineTo(-p.radio, 0);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = p.nucleo;
            ctx.fillRect(-2, -p.largo * 0.3, 4, p.largo * 0.6);
            ctx.restore();
        }

        // 6. Disparos enemigos
        for (const d of disparosEnemigos) {
            ctx.save();
            ctx.translate(d.x, d.y);
            ctx.shadowColor = d.color;
            ctx.shadowBlur = 10;
            ctx.fillStyle = d.color;
            if (d.tipo === "esquirla") {
                const ang = Math.atan2(d.vy, d.vx) + Math.PI / 2;
                ctx.rotate(ang);
                ctx.beginPath();
                ctx.moveTo(0, -d.radio * 1.7);
                ctx.lineTo(d.radio, 0);
                ctx.lineTo(0, d.radio * 1.7);
                ctx.lineTo(-d.radio, 0);
                ctx.closePath();
                ctx.fill();
            } else {
                ctx.beginPath();
                ctx.arc(0, 0, d.radio, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#ffffff";
                ctx.beginPath();
                ctx.arc(0, 0, d.radio * 0.45, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // 7. Nave del Jugador (respeta la nave elegida en el menú de Naves o la Nave de Cristal con sus 4 estados)
        const juegoTerminado = contextoJuego.estado === "derrota";
        const parpadea = tiempoEtapa < invulnerableHasta && Math.floor(tiempoEtapa * 14) % 2 === 0;
        if (!juegoTerminado && !parpadea) {
            G.Efectos.dibujarNaveJugador(ctx, 3, jugador, {
                estaMejorado: estaMejorado(),
                disparandoReciente: tiempoEtapa < mostrarEstadoDisparoHasta,
                enDanio: vidas === 1 || tiempoEtapa < mostrarEstadoDanioHasta
            });
        }

        if (escudoCristalActivo && !juegoTerminado) {
            dibujarEscudoCristal(ctx);
        }

        // 8. Explosiones de fragmentos de cristal
        dibujarExplosionesCristal(ctx);

        // 9. HUD Superior y estado de la Nave de Cristal
        const porcentajeCaverna = Math.min(100, Math.round((tiempoEtapa / duracionRecorridoBase) * 100));
        G.Efectos.dibujarHUDSuperior(ctx, canvas, {
            stage: 3,
            vidas: vidas,
            puntuacion: contextoJuego.puntuacion,
            textoDerecho: jefeActivo ? "BOSS" : `${porcentajeCaverna}%`
        });

        ctx.save();
        ctx.font = "14px Arial";
        ctx.textAlign = "left";
        let estadoNaveTexto = "IDLE";
        let colorEstado = "#b8f4ff";
        if (vidas === 1 || tiempoEtapa < mostrarEstadoDanioHasta) {
            estadoNaveTexto = "DAMAGE (Casco fracturado)";
            colorEstado = "#ff7be5";
        } else if (estaMejorado()) {
            estadoNaveTexto = "UPGRADED (Triple Cristal)";
            colorEstado = "#57f7ff";
        }
        ctx.fillStyle = colorEstado;
        ctx.fillText(`Nave de Cristal: ${estadoNaveTexto}`, 16, 64);
        if (escudoCristalActivo) {
            ctx.fillStyle = "#8affff";
            ctx.fillText("Prisma de Escudo Activo (+25% vel.)", 16, 84);
        }
        ctx.restore();

        // 10. Aviso de llegada de The Crystal Arch-Dreadnought
        if (jefeActivo && !jefe && !victoriaEnCurso) {
            dibujarAvisoArchDreadnought(ctx, canvas);
        }
    }

    function dibujarJefeFinal(ctx, canvas, imgs) {
        let spriteJefe = imgs.jefeIdle;
        if (
            jefe.estado === "preparando_taladro" ||
            jefe.estado === "embestida_taladro" ||
            jefe.estado === "preparando_laser"
        ) {
            spriteJefe = imgs.jefeCarga;
        } else if (jefe.estado === "disparando_laser") {
            spriteJefe = imgs.jefeLaser;
        } else if (jefe.estado === "derrotado") {
            spriteJefe = imgs.jefeDerrotado;
        }

        const centroX = jefe.x + jefe.ancho / 2;

        // Línea guía de advertencia durante preparando_laser
        if (jefe.estado === "preparando_laser") {
            const pulso = (Math.sin(tiempoEtapa * 28) + 1) / 2;
            ctx.save();
            ctx.strokeStyle = `rgba(255, 75, 240, ${0.35 + pulso * 0.55})`;
            ctx.lineWidth = 3 + pulso * 3;
            ctx.setLineDash([10, 8]);
            ctx.beginPath();
            ctx.moveTo(centroX, jefe.y + jefe.alto * 0.75);
            ctx.lineTo(centroX, canvas.height);
            ctx.stroke();
            ctx.restore();
        }

        // Rayo Láser Cristalino activo (Crystal Barrage & Laser)
        if (jefe.laserActivo) {
            const origenLaserY = jefe.y + jefe.alto * 0.76;
            const anchoLaser = 38 + Math.sin(tiempoEtapa * 40) * 6;

            ctx.save();
            const gradLaser = ctx.createLinearGradient(
                centroX - anchoLaser / 2,
                0,
                centroX + anchoLaser / 2,
                0
            );
            gradLaser.addColorStop(0, "rgba(255, 50, 220, 0)");
            gradLaser.addColorStop(0.2, "rgba(255, 65, 235, 0.85)");
            gradLaser.addColorStop(0.5, "rgba(220, 255, 255, 1)");
            gradLaser.addColorStop(0.8, "rgba(65, 235, 255, 0.85)");
            gradLaser.addColorStop(1, "rgba(50, 220, 255, 0)");

            ctx.shadowColor = "#ff45e8";
            ctx.shadowBlur = 24;
            ctx.fillStyle = gradLaser;
            ctx.fillRect(
                centroX - anchoLaser / 2,
                origenLaserY,
                anchoLaser,
                canvas.height - origenLaserY
            );

            // Anillos de energía descendiendo por el haz láser
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 2;
            const desplazamientoOnda = (tiempoEtapa * 520) % 45;
            for (let y = origenLaserY + desplazamientoOnda; y < canvas.height; y += 45) {
                ctx.beginPath();
                ctx.ellipse(centroX, y, anchoLaser * 0.58, 7, 0, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.restore();
        }

        // Dibujo del sprite del Jefe Final
        ctx.save();
        if (jefe.estado === "derrotado" && Math.floor(tiempoEtapa * 14) % 2 === 0) {
            ctx.globalAlpha = 0.72;
        }
        ctx.shadowColor = jefe.estado === "idle" ? "#38f3ff" : "#ff45e8";
        ctx.shadowBlur = 22;
        ctx.drawImage(spriteJefe, jefe.x, jefe.y, jefe.ancho, jefe.alto);
        ctx.restore();

        // Barra de vida y nombre del Jefe Final
        if (jefe.estado !== "derrotado") {
            const barraAncho = 320;
            const barraX = (canvas.width - barraAncho) / 2;
            const barraY = 54;

            ctx.save();
            ctx.fillStyle = "rgba(8, 12, 28, 0.82)";
            ctx.fillRect(barraX - 2, barraY - 2, barraAncho + 4, 14);
            const gradBarra = ctx.createLinearGradient(barraX, 0, barraX + barraAncho, 0);
            gradBarra.addColorStop(0, "#38f3ff");
            gradBarra.addColorStop(1, "#ff45e8");
            ctx.fillStyle = gradBarra;
            ctx.fillRect(barraX, barraY, barraAncho * (jefe.vida / jefe.vidaMaxima), 10);

            ctx.font = "bold 12px Arial";
            ctx.fillStyle = "#f0fbff";
            ctx.textAlign = "center";
            ctx.fillText("THE CRYSTAL ARCH-DREADNOUGHT", canvas.width / 2, barraY + 25);
            ctx.restore();
        }
    }

    function dibujarPotenciadorCristal(ctx, pot) {
        const cx = pot.x + pot.ancho / 2;
        const cy = pot.y + pot.alto / 2;
        const pulso = (Math.sin(tiempoEtapa * 6) + 1) / 2;

        ctx.save();
        ctx.translate(cx, cy);

        let colorBorde = "#57f7ff";
        let colorCentro = "#ff66f5";
        let etiqueta = "◆";
        if (pot.tipo === "escudo") {
            colorBorde = "#75ffff";
            colorCentro = "#1d7bff";
            etiqueta = "⬡";
        } else if (pot.tipo === "vida") {
            colorBorde = "#ff7597";
            colorCentro = "#ff2e63";
            etiqueta = "♥";
        }

        ctx.shadowColor = colorBorde;
        ctx.shadowBlur = 12 + pulso * 6;
        ctx.fillStyle = "rgba(14, 22, 46, 0.88)";
        ctx.strokeStyle = colorBorde;
        ctx.lineWidth = 2.2;

        // Rombo de cristal
        ctx.beginPath();
        ctx.moveTo(0, -19);
        ctx.lineTo(17, 0);
        ctx.lineTo(0, 19);
        ctx.lineTo(-17, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = colorCentro;
        ctx.font = "bold 18px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(etiqueta, 0, 1);
        ctx.restore();
    }

    function dibujarEscudoCristal(ctx) {
        const cx = jugador.x + jugador.ancho / 2;
        const cy = jugador.y + jugador.alto / 2;
        const radio = 48;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(tiempoEtapa * 1.4);
        ctx.shadowColor = "#55f7ff";
        ctx.shadowBlur = 16;
        ctx.strokeStyle = "rgba(105, 248, 255, 0.78)";
        ctx.lineWidth = 2;

        // Hexágono cristalino protector
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const ang = i * Math.PI / 3;
            const px = Math.cos(ang) * radio;
            const py = Math.sin(ang) * radio;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();

        // 3 fragmentos orbitando
        for (let i = 0; i < 3; i++) {
            const ang = -tiempoEtapa * 2.8 + i * (Math.PI * 2 / 3);
            const sx = Math.cos(ang) * (radio + 4);
            const sy = Math.sin(ang) * (radio + 4);
            ctx.fillStyle = i % 2 === 0 ? "#ff77f5" : "#75ffff";
            ctx.beginPath();
            ctx.arc(sx, sy, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    function dibujarExplosionesCristal(ctx) {
        for (const exp of explosionesCristal) {
            const progreso = Math.min(1, exp.edad / exp.duracion);
            const intensidad = 1 - progreso;
            const radioOnda = exp.escala * (14 + progreso * 58);

            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            ctx.globalAlpha = intensidad * 0.85;
            ctx.strokeStyle = exp.color;
            ctx.lineWidth = 3 * intensidad + 1;
            ctx.shadowColor = exp.color;
            ctx.shadowBlur = 18;
            ctx.beginPath();
            ctx.arc(exp.x, exp.y, radioOnda, 0, Math.PI * 2);
            ctx.stroke();

            for (const part of exp.particulas) {
                const vida = Math.max(0, 1 - part.edad / part.duracion);
                if (vida <= 0) continue;
                ctx.save();
                ctx.globalAlpha = vida;
                ctx.translate(part.x, part.y);
                ctx.rotate(part.anguloRotacion);
                ctx.fillStyle = part.color;
                ctx.beginPath();
                ctx.moveTo(0, -part.tamano);
                ctx.lineTo(part.tamano * 0.65, 0);
                ctx.lineTo(0, part.tamano);
                ctx.lineTo(-part.tamano * 0.65, 0);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
            ctx.restore();
        }
    }

    function dibujarAvisoArchDreadnought(ctx, canvas) {
        const pulso = (Math.sin(tiempoEtapa * 10) + 1) / 2;
        ctx.save();
        ctx.textAlign = "center";
        ctx.font = "bold 25px Arial";
        ctx.fillStyle = pulso > 0.5 ? "#57f7ff" : "#ff66f5";
        ctx.shadowColor = "#ff38dc";
        ctx.shadowBlur = 18;
        ctx.fillText("¡ALERTA: THE CRYSTAL ARCH-DREADNOUGHT!", canvas.width / 2, 110);
        ctx.restore();
    }

    G.Stage3 = {
        reiniciar,
        actualizar,
        dibujar,
        obtenerVidas,
        tieneAnimacionPendiente
    };
})(window.Guardianes);
