/**
 * Módulo del Stage 2 — Guardianes del Eje.
 * Conserva el 100% de las mecánicas originales del Stage 2:
 * - Reloj regresivo de etapa (360 s) con condición de tiempo agotado
 * - Progresión por bajas: 10 enemigos tipo 1 → enemigos tipo 2 → tras 20 bajas de tipo 2 y t >= 60 s,
 *   secuencia de 3 Jefes (2 sub-jefes tipo 3 de 180 HP y el Jefe Final tipo 4 de 260 HP)
 * - Modo Furia en el Jefe Final al 50% de vida (salva radial de 10 espinas rotatorias)
 * - Mejora de nave cada 1000 puntos en el stage (disparo doble de 2x daño + drones auxiliares teledirigidos)
 * - 3 tipos de poderes cíclicos (arma, escudo atómico, vida)
 * - Sistema de explosiones por partículas (56 chispas + 14 de humo)
 */
window.Guardianes = window.Guardianes || {};

(function(G) {
    const duracionEtapa = 360;
    const tiempoMinimoParaJefe = 60;
    const derrotasPorTipoParaAvanzar = 10;
    const enemigos2RequeridosParaJefe = 20;
    const jefesDerrotadosParaGanar = 3;
    const puntosPorMejora = 1000;
    const intervaloAparicion = 3;
    const intervaloEnemigoApoyo = 5;
    const primerPoderEn = 8;
    const intervaloPoderes = 15;

    const configuracionEnemigos = {
        1: { ancho: 64, alto: 64, vida: 1, velocidad: 100, intervaloDisparo: [0.9, 1.6], disparos: [1, 2], rapidezDisparo: 185 },
        2: { ancho: 112, alto: 60, vida: 4, velocidad: 130, intervaloDisparo: [0.7, 1.3], disparos: [1, 3], rapidezDisparo: 205 },
        3: { ancho: 138, alto: 82, vida: 180, velocidad: 105, intervaloDisparo: [1.6, 2.2], disparos: [2, 2], rapidezDisparo: 165 },
        4: { ancho: 190, alto: 112, vida: 260, velocidad: 135, intervaloDisparo: [1.2, 1.8], disparos: [3, 4], rapidezDisparo: 200 }
    };
    const secuenciaPoderes = ["arma", "escudo", "vida"];

    const jugador = {
        x: 368,
        y: 400,
        ancho: 64,
        alto: 64,
        velocidad: 250,
        inclinacion: 0
    };

    const disparosJugador = [];
    const disparosEnemigo = [];
    const disparosAuxiliares = [];
    const enemigos = [];
    const poderes = [];
    const explosiones = [];
    const navesAuxiliares = [];

    let ultimoDisparoJugador = -Infinity;
    let tiempoEtapa = 0;
    let proximaAparicion = 0;
    let proximaAparicionJefe = tiempoMinimoParaJefe;
    let proximaAparicionEnemigoApoyo = Infinity;
    let enemigos1Derrotados = 0;
    let enemigos2Derrotados = 0;
    let jefesDerrotados = 0;
    let proximaAparicionPoder = primerPoderEn;
    let poderesAparecidos = 0;
    let vidasJugador = 4;
    let invulnerableHasta = -Infinity;
    let jugadorReapareceEn = Infinity;
    let puntosEtapa = 0;
    let proximaMejoraEn = puntosPorMejora;
    let armaHasta = 0;
    let habilidadAuxiliarActiva = false;
    let proximaNaveAuxiliar = Infinity;
    let ladoNaveAuxiliar = 1;
    let naveMejorada = false;
    let animacionMejoraInicio = null;
    let escudoHasta = 0;
    let escudoActivo = false;
    let siguienteSalva = 0;
    let explosionJefeIniciada = null;
    let animacionDerrotaActiva = false;
    let jugadorDestruido = false;
    let avisoJefeFinalInicio = null;
    let avisoFuriaInicio = null;

    function reiniciar(canvas) {
        vidasJugador = 4;
        jugadorDestruido = false;
        invulnerableHasta = -Infinity;
        jugadorReapareceEn = Infinity;
        animacionDerrotaActiva = false;
        jugador.x = (canvas.width - jugador.ancho) / 2;
        jugador.y = canvas.height - 100;
        jugador.inclinacion = 0;
        puntosEtapa = 0;
        enemigos1Derrotados = 0;
        enemigos2Derrotados = 0;
        enemigos.length = 0;
        disparosJugador.length = 0;
        disparosEnemigo.length = 0;
        disparosAuxiliares.length = 0;
        navesAuxiliares.length = 0;
        poderes.length = 0;
        explosiones.length = 0;
        tiempoEtapa = 0;
        ultimoDisparoJugador = -Infinity;
        proximaAparicion = 0;
        proximaAparicionJefe = tiempoMinimoParaJefe;
        proximaAparicionEnemigoApoyo = Infinity;
        jefesDerrotados = 0;
        proximaAparicionPoder = primerPoderEn;
        poderesAparecidos = 0;
        armaHasta = 0;
        proximaMejoraEn = puntosPorMejora;
        habilidadAuxiliarActiva = false;
        proximaNaveAuxiliar = Infinity;
        ladoNaveAuxiliar = 1;
        naveMejorada = false;
        animacionMejoraInicio = null;
        escudoHasta = 0;
        escudoActivo = false;
        siguienteSalva = 0;
        explosionJefeIniciada = null;
        avisoJefeFinalInicio = null;
        avisoFuriaInicio = null;
    }

    function obtenerVidas() {
        return vidasJugador;
    }

    function tieneAnimacionPendiente(estado) {
        return (estado === "victoria" && explosionJefeIniciada !== null) ||
               (estado === "derrota" && animacionDerrotaActiva);
    }

    function formatearTiempo(elapsed) {
        const segundos = Math.max(0, duracionEtapa - Math.floor(elapsed));
        const minutos = Math.floor(segundos / 60);
        return `${String(minutos).padStart(2, "0")}:${String(segundos % 60).padStart(2, "0")}`;
    }

    function actualizar(deltaSegundos, canvas, contextoJuego) {
        if (contextoJuego.estado === "jugando") {
            tiempoEtapa = Math.min(tiempoEtapa + deltaSegundos, duracionEtapa);
            if (tiempoEtapa >= duracionEtapa) {
                contextoJuego.alAgotarTiempo();
            } else {
                actualizarTemporizadoresPoderes(tiempoEtapa);
                actualizarReaparicionJugador(tiempoEtapa);
                actualizarJugador(deltaSegundos, canvas);
                actualizarEnemigo(deltaSegundos, tiempoEtapa, canvas);
                actualizarPoderes(deltaSegundos, tiempoEtapa, canvas);
                actualizarNavesAuxiliares(deltaSegundos, tiempoEtapa, canvas);
                actualizarDisparos(deltaSegundos, tiempoEtapa, canvas, contextoJuego);
            }
        }

        if (
            contextoJuego.estado === "jugando" ||
            (contextoJuego.estado === "victoria" && explosionJefeIniciada !== null) ||
            (contextoJuego.estado === "derrota" && animacionDerrotaActiva)
        ) {
            actualizarExplosiones(deltaSegundos);
            if (contextoJuego.estado === "victoria" && explosiones.length === 0) {
                explosionJefeIniciada = null;
            }
            if (contextoJuego.estado === "derrota" && explosiones.length === 0) {
                animacionDerrotaActiva = false;
            }
        }
    }

    function actualizarTemporizadoresPoderes(elapsed) {
        if (armaHasta > 0 && armaHasta <= elapsed) desactivarPoderDisparo();
        if (escudoHasta <= elapsed) {
            escudoHasta = 0;
            escudoActivo = false;
        }
    }

    function desactivarPoderDisparo() {
        armaHasta = 0;
        habilidadAuxiliarActiva = false;
        proximaNaveAuxiliar = Infinity;
        limpiarNavesAuxiliares();
    }

    function limpiarNavesAuxiliares() {
        navesAuxiliares.length = 0;
        disparosAuxiliares.length = 0;
    }

    function actualizarReaparicionJugador(elapsed) {
        if (jugadorDestruido && vidasJugador > 0 && elapsed >= jugadorReapareceEn) {
            jugadorDestruido = false;
            jugadorReapareceEn = Infinity;
        }
    }

    function actualizarJugador(deltaSegundos, canvas) {
        if (jugadorDestruido) return;

        const vector = G.Entrada.obtenerVectorMovimiento();
        jugador.x += vector.x * jugador.velocidad * deltaSegundos;
        jugador.y += vector.y * jugador.velocidad * deltaSegundos;
        jugador.x = Math.max(0, Math.min(canvas.width - jugador.ancho, jugador.x));
        jugador.y = Math.max(0, Math.min(canvas.height - jugador.alto, jugador.y));

        const ahora = tiempoEtapa * 1000;
        const intervaloDisparo = 250;
        if (G.Entrada.estaDisparando() && ahora - ultimoDisparoJugador >= intervaloDisparo) {
            const centro = jugador.x + jugador.ancho / 2;
            const posiciones = naveMejorada || armaHasta > tiempoEtapa ? [-14, 14] : [0];
            const salva = ++siguienteSalva;
            for (const desplazamiento of posiciones) {
                disparosJugador.push({
                    x: centro + desplazamiento,
                    y: jugador.y,
                    color: naveMejorada ? "#7cfaff" : "#ffe66d",
                    damage: naveMejorada ? 2 : 1,
                    salva
                });
            }
            if (G.Sonido) {
                G.Sonido.reproducirDisparo(naveMejorada || armaHasta > tiempoEtapa);
            }
            ultimoDisparoJugador = ahora;
        }
    }

    function actualizarMejoraPuntuacion(elapsed) {
        if (naveMejorada || puntosEtapa < proximaMejoraEn) return;
        naveMejorada = true;
        proximaMejoraEn = siguienteUmbralMejora();
        animacionMejoraInicio = elapsed;
    }

    function siguienteUmbralMejora() {
        return (Math.floor(puntosEtapa / puntosPorMejora) + 1) * puntosPorMejora;
    }

    function crearNaveAuxiliar(elapsed, canvas) {
        const ancho = 24;
        const alto = 30;
        const xInicial = ladoNaveAuxiliar < 0
            ? jugador.x - ancho - 8
            : jugador.x + jugador.ancho + 8;
        const x = Math.max(0, Math.min(canvas.width - ancho, xInicial));
        navesAuxiliares.push({
            x,
            y: jugador.y + 18,
            ancho,
            alto,
            edad: 0,
            duracion: 4.5,
            angulo: 0
        });
        ladoNaveAuxiliar *= -1;
        proximaNaveAuxiliar = elapsed + 3;
    }

    function enemigoMasCercano(x, y) {
        let masCercano = null;
        let menorDistancia = Infinity;
        for (const enemigo of enemigos) {
            const diferenciaX = enemigo.x + enemigo.ancho / 2 - x;
            const diferenciaY = enemigo.y + enemigo.alto / 2 - y;
            const distancia = Math.hypot(diferenciaX, diferenciaY);
            if (distancia < menorDistancia) {
                menorDistancia = distancia;
                masCercano = enemigo;
            }
        }
        return masCercano;
    }

    function actualizarNavesAuxiliares(deltaSegundos, elapsed, canvas) {
        if (!habilidadAuxiliarActiva || armaHasta <= elapsed || !naveMejorada) return;
        if (elapsed >= proximaNaveAuxiliar && navesAuxiliares.length === 0) {
            crearNaveAuxiliar(elapsed, canvas);
        }

        for (let indice = navesAuxiliares.length - 1; indice >= 0; indice--) {
            const nave = navesAuxiliares[indice];
            nave.edad += deltaSegundos;
            const centroX = nave.x + nave.ancho / 2;
            const centroY = nave.y + nave.alto / 2;
            const objetivo = enemigoMasCercano(centroX, centroY);

            if (objetivo) {
                const diferenciaX = objetivo.x + objetivo.ancho / 2 - centroX;
                const diferenciaY = objetivo.y + objetivo.alto / 2 - centroY;
                const distancia = Math.hypot(diferenciaX, diferenciaY) || 1;
                nave.angulo = Math.atan2(diferenciaY, diferenciaX) + Math.PI / 2;
                if (distancia <= 145) {
                    disparosAuxiliares.push({
                        x: centroX,
                        y: centroY,
                        vx: diferenciaX / distancia * 430,
                        vy: diferenciaY / distancia * 430,
                        edad: 0,
                        damage: 2
                    });
                    navesAuxiliares.splice(indice, 1);
                    continue;
                }
                nave.x += diferenciaX / distancia * 230 * deltaSegundos;
                nave.y += diferenciaY / distancia * 230 * deltaSegundos;
            } else {
                nave.y -= 190 * deltaSegundos;
                nave.angulo = 0;
            }

            if (
                nave.edad >= nave.duracion ||
                nave.x < -nave.ancho ||
                nave.x > canvas.width ||
                nave.y < -nave.alto ||
                nave.y > canvas.height
            ) {
                navesAuxiliares.splice(indice, 1);
            }
        }
    }

    function crearEnemigo(elapsed, canvas, tipo) {
        const tipoFinal = tipo !== undefined
            ? tipo
            : (enemigos1Derrotados < derrotasPorTipoParaAvanzar ? 1 : 2);
        const config = configuracionEnemigos[tipoFinal];
        return {
            tipo: tipoFinal,
            x: Math.random() * (canvas.width - config.ancho),
            y: -config.alto,
            ancho: config.ancho,
            alto: config.alto,
            vida: config.vida,
            vidaMaxima: config.vida,
            velocidad: config.velocidad,
            fase: Math.random() * Math.PI * 2,
            proximoDisparo: elapsed + 0.8 + Math.random() * 0.8,
            jefe: false
        };
    }

    function crearJefe(elapsed, canvas, tipo) {
        const tipoJefe = tipo || 3;
        const config = configuracionEnemigos[tipoJefe];
        const yBase = tipoJefe === 4 ? 56 : 38;
        return {
            tipo: tipoJefe,
            x: Math.random() * (canvas.width - config.ancho),
            y: yBase,
            ancho: config.ancho,
            alto: config.alto,
            vida: config.vida,
            vidaMaxima: config.vida,
            velocidad: config.velocidad,
            fase: Math.random() * Math.PI * 2,
            direccion: Math.random() < 0.5 ? -1 : 1,
            proximoDisparo: elapsed + 0.8,
            jefe: true,
            jefeFinal: tipoJefe === 4,
            faseDos: false,
            proximoRadial: elapsed + 6,
            yBase,
            amplitud: tipoJefe === 4 ? 18 : 12
        };
    }

    function dispararAlAzar(elapsed, enemigo) {
        const config = configuracionEnemigos[enemigo.tipo];
        const cantidad = config.disparos[0] +
            Math.floor(Math.random() * (config.disparos[1] - config.disparos[0] + 1));
        const centroX = enemigo.x + enemigo.ancho / 2;
        const centroY = enemigo.y + enemigo.alto * 0.75;

        for (let indice = 0; indice < cantidad; indice++) {
            let vx;
            let vy;
            if (enemigo.jefe) {
                const diferenciaX = jugador.x + jugador.ancho / 2 - centroX;
                const diferenciaY = jugador.y + jugador.alto / 2 - centroY;
                const angulo = Math.atan2(diferenciaY, diferenciaX) +
                    (indice - (cantidad - 1) / 2) * 0.12;
                vx = Math.cos(angulo) * config.rapidezDisparo;
                vy = Math.sin(angulo) * config.rapidezDisparo;
            } else {
                const angulo = (Math.random() * 110 - 55) * Math.PI / 180;
                vx = Math.sin(angulo) * config.rapidezDisparo;
                vy = Math.cos(angulo) * config.rapidezDisparo;
            }
            disparosEnemigo.push({
                x: centroX,
                y: centroY,
                vx,
                vy,
                tipo: enemigo.jefe ? "espina" : "normal",
                radio: enemigo.jefe ? 5 : undefined,
                angulo: 0
            });
        }

        if (enemigo.jefe && G.Sonido) {
            G.Sonido.reproducirLaser(false);
        }

        if (enemigo.jefeFinal && enemigo.faseDos && elapsed >= enemigo.proximoRadial) {
            if (G.Sonido) {
                G.Sonido.reproducirLaser(true);
            }
            const cantidadRadial = 10;
            for (let indice = 0; indice < cantidadRadial; indice++) {
                const angulo = (Math.PI * 2 * indice) / cantidadRadial +
                    enemigo.fase * 0.2;
                disparosEnemigo.push({
                    x: centroX,
                    y: centroY,
                    vx: Math.cos(angulo) * 175,
                    vy: Math.sin(angulo) * 175,
                    tipo: "espina",
                    radio: 5,
                    angulo
                });
            }
            enemigo.proximoRadial = elapsed + 6;
        }

        enemigo.proximoDisparo = elapsed +
            config.intervaloDisparo[0] +
            Math.random() * (config.intervaloDisparo[1] - config.intervaloDisparo[0]);
    }

    function actualizarEnemigo(deltaSegundos, elapsed, canvas) {
        if (elapsed >= proximaAparicion && enemigos2Derrotados < enemigos2RequeridosParaJefe) {
            const enemigo = crearEnemigo(elapsed, canvas);
            enemigos.push(enemigo);
            proximaAparicion = elapsed + intervaloAparicion;
        }

        if (
            enemigos2Derrotados >= enemigos2RequeridosParaJefe &&
            elapsed >= proximaAparicionJefe &&
            explosionJefeIniciada === null &&
            !enemigos.some(function(e) { return e.jefe; })
        ) {
            const tipoJefe = jefesDerrotados < jefesDerrotadosParaGanar - 1 ? 3 : 4;
            enemigos.push(crearJefe(elapsed, canvas, tipoJefe));
            if (tipoJefe === 4) {
                avisoJefeFinalInicio = elapsed;
                G.Efectos.iniciarSacudida(2.5, 9);
                if (G.Sonido) {
                    G.Sonido.reproducirAparicionJefe();
                }
            } else {
                G.Efectos.iniciarSacudida(1.2, 5);
            }
            proximaAparicionJefe = elapsed + 30;
            if (proximaAparicionEnemigoApoyo === Infinity) {
                proximaAparicionEnemigoApoyo = elapsed + intervaloEnemigoApoyo;
            }
        }

        if (proximaAparicionEnemigoApoyo !== Infinity && elapsed >= proximaAparicionEnemigoApoyo) {
            enemigos.push(crearEnemigo(elapsed, canvas, 1));
            proximaAparicionEnemigoApoyo = elapsed + intervaloEnemigoApoyo;
        }

        for (let indice = enemigos.length - 1; indice >= 0; indice--) {
            const enemigo = enemigos[indice];
            enemigo.fase += deltaSegundos * (1.5 + enemigo.tipo * 0.4);
            if (enemigo.jefeFinal && !enemigo.faseDos && enemigo.vida <= enemigo.vidaMaxima / 2) {
                enemigo.faseDos = true;
                enemigo.proximoRadial = elapsed + 1.2;
                avisoFuriaInicio = elapsed;
            }
            if (enemigo.jefe) {
                const limiteIzquierdo = 12;
                const limiteDerecho = canvas.width - enemigo.ancho - 12;
                enemigo.x += enemigo.velocidad * enemigo.direccion * deltaSegundos;
                if (enemigo.x <= limiteIzquierdo || enemigo.x >= limiteDerecho) {
                    enemigo.x = Math.max(limiteIzquierdo, Math.min(limiteDerecho, enemigo.x));
                    enemigo.direccion *= -1;
                }
                enemigo.y = enemigo.yBase + enemigo.amplitud * Math.sin(enemigo.fase * 0.5);
            } else {
                enemigo.x += enemigo.velocidad * Math.sin(enemigo.fase) * deltaSegundos;
                enemigo.x = Math.max(0, Math.min(canvas.width - enemigo.ancho, enemigo.x));
                enemigo.y += (70 + enemigo.tipo * 15) * deltaSegundos;
            }

            if (elapsed >= enemigo.proximoDisparo) {
                dispararAlAzar(elapsed, enemigo);
            }
            if (enemigo.y > canvas.height) {
                enemigos.splice(indice, 1);
            }
        }
    }

    function colisiona(disparo, objetivo) {
        const radio = disparo.radio || (disparo.tipo === "espina" ? 11 :
            disparo.vx === undefined ? 3 : 5);
        return G.Efectos.circuloTocaRectangulo(disparo.x, disparo.y, radio, objetivo);
    }

    function actualizarPoderes(deltaSegundos, elapsed, canvas) {
        while (elapsed >= proximaAparicionPoder && proximaAparicionPoder < duracionEtapa) {
            const tipo = secuenciaPoderes[poderesAparecidos % secuenciaPoderes.length];
            poderes.push({
                tipo,
                x: Math.random() * (canvas.width - 40),
                y: -40,
                ancho: 40,
                alto: 40
            });
            poderesAparecidos += 1;
            proximaAparicionPoder += intervaloPoderes;
        }

        for (let indice = poderes.length - 1; indice >= 0; indice--) {
            const poder = poderes[indice];
            poder.y += 75 * deltaSegundos;
            if (G.Efectos.seSuperponen(poder, jugador)) {
                if (poder.tipo === "arma") {
                    armaHasta = elapsed + 15;
                    habilidadAuxiliarActiva = naveMejorada;
                    proximaNaveAuxiliar = habilidadAuxiliarActiva ? elapsed + 3 : Infinity;
                    if (!habilidadAuxiliarActiva) limpiarNavesAuxiliares();
                } else if (poder.tipo === "escudo") {
                    escudoActivo = true;
                    escudoHasta = elapsed + 10;
                } else {
                    vidasJugador = Math.min(4, vidasJugador + 1);
                }
                poderes.splice(indice, 1);
            } else if (poder.y > canvas.height) {
                poderes.splice(indice, 1);
            }
        }
    }

    function aplicarImpactoJugador(elapsed, contextoJuego) {
        if (jugadorDestruido || elapsed < invulnerableHasta) return;

        if (G.Sonido) {
            G.Sonido.reproducirImpactoNave();
        }

        desactivarPoderDisparo();
        if (escudoActivo && escudoHasta > elapsed) {
            escudoActivo = false;
            escudoHasta = 0;
            invulnerableHasta = elapsed + 1.2;
            return;
        }

        vidasJugador -= 1;
        if (naveMejorada) {
            naveMejorada = false;
            animacionMejoraInicio = null;
            proximaMejoraEn = siguienteUmbralMejora();
        }
        invulnerableHasta = elapsed + 2.2;
        jugadorDestruido = true;
        jugadorReapareceEn = elapsed + 0.65;
        crearExplosion(
            jugador.x + jugador.ancho / 2,
            jugador.y + jugador.alto / 2,
            1.25
        );
        if (vidasJugador <= 0) {
            jugadorReapareceEn = Infinity;
            animacionDerrotaActiva = true;
            contextoJuego.alPerderPartida();
        }
    }

    function aplicarDanioEnemigo(enemigo, damage, elapsed, contextoJuego) {
        if (!enemigos.includes(enemigo)) return;
        enemigo.vida -= damage;
        if (enemigo.vida > 0) return;

        crearExplosion(
            enemigo.x + enemigo.ancho / 2,
            enemigo.y + enemigo.alto / 2,
            Math.max(0.8, (enemigo.ancho + enemigo.alto) / 145)
        );
        let puntosGanados = 0;
        if (enemigo.tipo === 1) {
            enemigos1Derrotados += 1;
            puntosGanados = 100;
        } else if (enemigo.tipo === 2) {
            enemigos2Derrotados += 1;
            puntosGanados = 250;
            if (enemigos2Derrotados === enemigos2RequeridosParaJefe) {
                for (let indice = enemigos.length - 1; indice >= 0; indice--) {
                    if (enemigos[indice] !== enemigo && enemigos[indice].tipo === 2) {
                        enemigos.splice(indice, 1);
                    }
                }
            }
        } else {
            puntosGanados = enemigo.tipo === 4 ? 12000 : 5000;
            jefesDerrotados += 1;
            if (jefesDerrotados < jefesDerrotadosParaGanar) {
                proximaAparicionJefe = elapsed + intervaloAparicion;
            } else {
                explosionJefeIniciada = elapsed;
            }
        }
        puntosEtapa += puntosGanados;
        contextoJuego.sumarPuntos(puntosGanados);
        actualizarMejoraPuntuacion(elapsed);
        enemigos.splice(enemigos.indexOf(enemigo), 1);
        if (enemigo.jefe && jefesDerrotados >= jefesDerrotadosParaGanar) {
            contextoJuego.alCompletarStage2();
        }
    }

    function actualizarDisparos(deltaSegundos, elapsed, canvas, contextoJuego) {
        for (const disparo of disparosJugador) {
            disparo.y -= 480 * deltaSegundos;
        }
        for (const disparo of disparosEnemigo) {
            disparo.x += disparo.vx * deltaSegundos;
            disparo.y += disparo.vy * deltaSegundos;
            if (disparo.tipo === "espina") disparo.angulo += deltaSegundos * 4;
        }

        for (let indiceDisparo = disparosJugador.length - 1; indiceDisparo >= 0; indiceDisparo--) {
            const disparo = disparosJugador[indiceDisparo];
            for (let indiceEnemigo = enemigos.length - 1; indiceEnemigo >= 0; indiceEnemigo--) {
                const enemigo = enemigos[indiceEnemigo];
                if (!colisiona(disparo, enemigo)) continue;

                disparosJugador.splice(indiceDisparo, 1);
                if (enemigo.ultimaSalva !== disparo.salva) {
                    enemigo.ultimaSalva = disparo.salva;
                    aplicarDanioEnemigo(enemigo, disparo.damage || 1, elapsed, contextoJuego);
                }
                if (contextoJuego.estado !== "jugando") return;
                break;
            }
        }

        for (let indiceDisparo = disparosAuxiliares.length - 1; indiceDisparo >= 0; indiceDisparo--) {
            const disparo = disparosAuxiliares[indiceDisparo];
            disparo.edad += deltaSegundos;
            disparo.x += disparo.vx * deltaSegundos;
            disparo.y += disparo.vy * deltaSegundos;
            if (
                disparo.edad >= 1.8 ||
                disparo.x < -10 ||
                disparo.x > canvas.width + 10 ||
                disparo.y < -10 ||
                disparo.y > canvas.height + 10
            ) {
                disparosAuxiliares.splice(indiceDisparo, 1);
                continue;
            }

            for (const enemigo of enemigos) {
                if (!colisiona(disparo, enemigo)) continue;
                disparosAuxiliares.splice(indiceDisparo, 1);
                aplicarDanioEnemigo(enemigo, disparo.damage, elapsed, contextoJuego);
                if (contextoJuego.estado !== "jugando") return;
                break;
            }
        }

        for (let indice = disparosJugador.length - 1; indice >= 0; indice--) {
            if (disparosJugador[indice].y < 0) disparosJugador.splice(indice, 1);
        }

        for (let indice = disparosEnemigo.length - 1; indice >= 0; indice--) {
            const disparo = disparosEnemigo[indice];
            if (
                disparo.x < -10 ||
                disparo.x > canvas.width + 10 ||
                disparo.y < -10 ||
                disparo.y > canvas.height + 10
            ) {
                disparosEnemigo.splice(indice, 1);
                continue;
            }

            if (colisiona(disparo, jugador)) {
                disparosEnemigo.splice(indice, 1);
                aplicarImpactoJugador(elapsed, contextoJuego);
                if (contextoJuego.estado !== "jugando") return;
            }
        }

        for (const enemigo of enemigos) {
            if (!G.Efectos.seSuperponen(enemigo, jugador)) continue;
            aplicarImpactoJugador(elapsed, contextoJuego);
            if (contextoJuego.estado !== "jugando") return;
        }
    }

    function crearExplosion(x, y, escala) {
        const esc = escala === undefined ? 1 : escala;
        const coloresChispas = ["#ffffff", "#fff4a3", "#ffb52e", "#ff593d"];
        const particulas = [];
        for (let indice = 0; indice < 56; indice++) {
            const angulo = Math.random() * Math.PI * 2;
            const rapidez = (100 + Math.random() * 260) * esc;
            particulas.push({
                tipo: "chispa",
                x,
                y,
                xAnterior: x,
                yAnterior: y,
                vx: Math.cos(angulo) * rapidez,
                vy: Math.sin(angulo) * rapidez,
                radio: (1 + Math.random() * 2.5) * esc,
                edad: 0,
                duracion: 0.45 + Math.random() * 0.45,
                color: coloresChispas[Math.floor(Math.random() * coloresChispas.length)]
            });
        }

        const coloresHumo = ["#5e3a32", "#87513b", "#bb6740"];
        for (let indice = 0; indice < 14; indice++) {
            const angulo = Math.random() * Math.PI * 2;
            const rapidez = 25 + Math.random() * 65;
            particulas.push({
                tipo: "humo",
                x,
                y,
                xAnterior: x,
                yAnterior: y,
                vx: Math.cos(angulo) * rapidez,
                vy: Math.sin(angulo) * rapidez - 25,
                radio: (5 + Math.random() * 8) * esc,
                edad: 0,
                duracion: 0.75 + Math.random() * 0.5,
                color: coloresHumo[Math.floor(Math.random() * coloresHumo.length)]
            });
        }

        explosiones.push({
            x,
            y,
            edad: 0,
            duracion: 1.25,
            escala: esc,
            particulas
        });
    }

    function actualizarExplosiones(deltaSegundos) {
        for (let indice = explosiones.length - 1; indice >= 0; indice--) {
            const explosion = explosiones[indice];
            explosion.edad += deltaSegundos;
            for (const particula of explosion.particulas) {
                particula.edad += deltaSegundos;
                particula.xAnterior = particula.x;
                particula.yAnterior = particula.y;
                particula.x += particula.vx * deltaSegundos;
                particula.y += particula.vy * deltaSegundos;
                const resistencia = particula.tipo === "humo" ? 0.97 : 0.98;
                particula.vx *= resistencia;
                particula.vy *= resistencia;
                if (particula.tipo === "humo") particula.vy -= 35 * deltaSegundos;
            }
            if (explosion.edad >= explosion.duracion) explosiones.splice(indice, 1);
        }
    }

    function dibujar(ctx, canvas, contextoJuego) {
        const elapsed = tiempoEtapa;
        const imgs = G.Recursos.imagenes.stage2;

        // Fondo desplazable
        const alturaMundo = imgs.fondo.naturalHeight * canvas.width / imgs.fondo.naturalWidth;
        const desplazamientoMaximo = Math.max(0, alturaMundo - canvas.height);
        const progreso = Math.min(elapsed / duracionEtapa, 1);
        const desplazamientoFondo = desplazamientoMaximo * (1 - progreso);

        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(imgs.fondo, 0, -desplazamientoFondo, canvas.width, alturaMundo);

        // Pixel art de sprites en Stage 2
        ctx.imageSmoothingEnabled = false;

        for (const disparo of disparosJugador) {
            ctx.fillStyle = disparo.color || "#ffe66d";
            ctx.fillRect(
                disparo.x - (disparo.damage > 1 ? 4 : 3),
                disparo.y - 10,
                disparo.damage > 1 ? 8 : 6,
                14
            );
        }

        ctx.save();
        for (const disparo of disparosAuxiliares) {
            ctx.fillStyle = "#8ffcff";
            ctx.shadowColor = "#37f4ff";
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(disparo.x, disparo.y, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        dibujarDisparosEnemigos(ctx, disparosEnemigo, "#ff5a5a", 5);

        const mapaSpritesEnemigos = {
            1: imgs.enemigo1,
            2: imgs.enemigo2,
            3: imgs.enemigo3,
            4: imgs.enemigo4
        };

        for (const enemigo of enemigos) {
            const auraFuria = enemigo.jefeFinal && enemigo.faseDos;
            if (auraFuria) {
                ctx.save();
                ctx.shadowColor = "#ff6a24";
                ctx.shadowBlur = 16 + Math.sin(elapsed * 7) * 8;
            }
            ctx.drawImage(
                mapaSpritesEnemigos[enemigo.tipo],
                enemigo.x,
                enemigo.y,
                enemigo.ancho,
                enemigo.alto
            );
            if (auraFuria) ctx.restore();

            if (enemigo.jefe) {
                const barraAncho = enemigo.ancho;
                const barraX = enemigo.x + (enemigo.ancho - barraAncho) / 2;
                const barraY = enemigo.y + enemigo.alto + 6;
                ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
                ctx.fillRect(barraX, barraY, barraAncho, 10);
                ctx.fillStyle = enemigo.jefeFinal ? "#5c2c10" : "#542020";
                ctx.fillRect(barraX + 1, barraY + 1, barraAncho - 2, 8);
                ctx.fillStyle = enemigo.jefeFinal ? "#ffa133" : "#ff4040";
                ctx.fillRect(
                    barraX + 1,
                    barraY + 1,
                    (barraAncho - 2) * (enemigo.vida / enemigo.vidaMaxima),
                    8
                );
            }
        }

        for (const nave of navesAuxiliares) dibujarNaveAuxiliar(ctx, nave);
        for (const poder of poderes) dibujarPoder(ctx, poder, elapsed);
        dibujarExplosiones(ctx);

        const parpadea = elapsed < invulnerableHasta && Math.floor(elapsed * 12) % 2 === 0;
        if (!jugadorDestruido && !parpadea) {
            if (naveMejorada) dibujarMejoraJugador(ctx, canvas, elapsed);
            G.Efectos.dibujarNaveJugador(ctx, 2, jugador, {
                estaMejorado: naveMejorada || armaHasta > elapsed,
                disparandoReciente: (elapsed * 1000) - ultimoDisparoJugador < 120,
                enDanio: vidasJugador === 1 || elapsed < invulnerableHasta
            });
        } else if (
            !jugadorDestruido &&
            naveMejorada &&
            animacionMejoraInicio !== null &&
            elapsed - animacionMejoraInicio < 1.8
        ) {
            dibujarMejoraJugador(ctx, canvas, elapsed);
        }

        if (escudoActivo && !jugadorDestruido) dibujarEscudoAtomico(ctx, elapsed);

        G.Efectos.dibujarHUDSuperior(ctx, canvas, {
            stage: 2,
            vidas: vidasJugador,
            puntuacion: contextoJuego.puntuacion,
            textoDerecho: formatearTiempo(elapsed)
        });

        const tiempoArma = Math.max(0, armaHasta - elapsed);
        const tiempoEscudo = Math.max(0, escudoHasta - elapsed);
        if (naveMejorada || tiempoArma > 0 || tiempoEscudo > 0) {
            ctx.save();
            ctx.textAlign = "left";
            ctx.font = "14px Arial";
            let posicionY = 64;
            if (naveMejorada) {
                ctx.fillStyle = "#75ffff";
                ctx.fillText("Potencia permanente (2x daño)", 16, posicionY);
                posicionY += 20;
            }
            if (tiempoArma > 0) {
                ctx.fillStyle = "#ffe66d";
                ctx.fillText(`Doble disparo: ${tiempoArma.toFixed(1)} s`, 16, posicionY);
                posicionY += 20;
            }
            if (tiempoEscudo > 0) {
                ctx.fillStyle = "#75ffff";
                ctx.fillText(`Escudo atómico: ${tiempoEscudo.toFixed(1)} s`, 16, posicionY);
            }
            ctx.restore();
        }

        dibujarAvisos(ctx, canvas, elapsed);
    }

    function dibujarDisparosEnemigos(ctx, disparos, color, radio) {
        for (const disparo of disparos) {
            if (disparo.tipo === "espina") {
                ctx.save();
                ctx.translate(disparo.x, disparo.y);
                ctx.rotate(disparo.angulo || 0);
                ctx.shadowColor = "#ff4b3e";
                ctx.shadowBlur = 10;
                ctx.fillStyle = "#ff563f";
                for (let punta = 0; punta < 8; punta++) {
                    ctx.save();
                    ctx.rotate(punta * Math.PI / 4);
                    ctx.beginPath();
                    ctx.moveTo(-2, -4);
                    ctx.lineTo(0, -11);
                    ctx.lineTo(2, -4);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                }
                ctx.fillStyle = "#ffd7a1";
                ctx.beginPath();
                ctx.arc(0, 0, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                continue;
            }
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(disparo.x, disparo.y, radio, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function dibujarPoder(ctx, poder, elapsed) {
        ctx.save();
        ctx.translate(poder.x + poder.ancho / 2, poder.y + poder.alto / 2);
        ctx.strokeStyle = "#ffffff";
        ctx.fillStyle = "#ffffff";
        ctx.lineWidth = 3;

        if (poder.tipo === "arma") {
            const caja = ctx.createLinearGradient(0, -18, 0, 18);
            caja.addColorStop(0, "#294d67");
            caja.addColorStop(1, "#102638");
            ctx.shadowColor = "#ffc857";
            ctx.shadowBlur = 12;
            ctx.fillStyle = caja;
            ctx.beginPath();
            ctx.moveTo(-12, -18);
            ctx.lineTo(12, -18);
            ctx.quadraticCurveTo(18, -18, 18, -12);
            ctx.lineTo(18, 12);
            ctx.quadraticCurveTo(18, 18, 12, 18);
            ctx.lineTo(-12, 18);
            ctx.quadraticCurveTo(-18, 18, -18, 12);
            ctx.lineTo(-18, -12);
            ctx.quadraticCurveTo(-18, -18, -12, -18);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = "#ffd166";
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.strokeStyle = "rgba(255, 244, 200, 0.65)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-13, -14);
            ctx.lineTo(13, -14);
            ctx.lineTo(13, 14);
            ctx.lineTo(-13, 14);
            ctx.closePath();
            ctx.stroke();

            ctx.fillStyle = "#ffd166";
            for (const x of [-13, 13]) {
                for (const y of [-13, 13]) {
                    ctx.beginPath();
                    ctx.arc(x, y, 1.4, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            ctx.shadowColor = "#57e7ff";
            ctx.shadowBlur = 7;
            ctx.fillStyle = "#d9f5ff";
            ctx.beginPath();
            ctx.moveTo(-11, -4);
            ctx.lineTo(5, -4);
            ctx.lineTo(8, -2);
            ctx.lineTo(13, -2);
            ctx.lineTo(13, 2);
            ctx.lineTo(7, 2);
            ctx.lineTo(5, 4);
            ctx.lineTo(-8, 4);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = "#43c8ed";
            ctx.fillRect(1, -2, 8, 2);
            ctx.fillRect(10, -1, 5, 2);
            ctx.fillStyle = "#ffb84d";
            ctx.beginPath();
            ctx.moveTo(-5, 3);
            ctx.lineTo(1, 3);
            ctx.lineTo(-1, 10);
            ctx.lineTo(-7, 10);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = "#f4fbff";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-8, -1);
            ctx.lineTo(3, -1);
            ctx.stroke();
        } else if (poder.tipo === "escudo") {
            const pulso = 1 + Math.sin(elapsed * 7) * 0.05;
            ctx.scale(pulso, pulso);
            ctx.shadowColor = "#6efcff";
            ctx.shadowBlur = 18;
            ctx.fillStyle = "rgba(8, 32, 66, 0.92)";
            ctx.beginPath();
            ctx.arc(0, 0, 19, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#75ffff";
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(0, 0, 17, 0, Math.PI * 2);
            ctx.stroke();
            ctx.strokeStyle = "#d8ffff";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, 12, 0, Math.PI * 2);
            ctx.stroke();
            ctx.strokeStyle = "#77f7ff";
            ctx.lineWidth = 2;
            for (let indice = 0; indice < 8; indice++) {
                const angulo = indice * Math.PI / 4;
                const x1 = Math.cos(angulo) * 17;
                const y1 = Math.sin(angulo) * 17;
                const x2 = Math.cos(angulo + 0.12) * 23;
                const y2 = Math.sin(angulo + 0.12) * 23;
                const x3 = Math.cos(angulo + 0.3) * 27;
                const y3 = Math.sin(angulo + 0.3) * 27;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.lineTo(x3, y3);
                ctx.stroke();
            }
            ctx.beginPath();
            ctx.moveTo(2, -12);
            ctx.lineTo(-5, 1);
            ctx.lineTo(1, 1);
            ctx.lineTo(-2, 12);
            ctx.lineTo(6, -2);
            ctx.lineTo(0, -2);
            ctx.closePath();
            ctx.fill();
        } else {
            ctx.fillStyle = "#ff5b78";
            ctx.beginPath();
            ctx.arc(0, 0, 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.moveTo(0, 12);
            ctx.bezierCurveTo(-4, 8, -14, 2, -12, -5);
            ctx.bezierCurveTo(-10, -13, -2, -11, 0, -6);
            ctx.bezierCurveTo(4, -13, 12, -11, 12, -4);
            ctx.bezierCurveTo(12, 2, 4, 9, 0, 12);
            ctx.fill();
        }
        ctx.restore();
    }

    function dibujarEscudoAtomico(ctx, elapsed) {
        const centroX = jugador.x + jugador.ancho / 2;
        const centroY = jugador.y + jugador.alto / 2;
        const tiempo = elapsed * 2.4;
        const orbitaAncho = jugador.ancho / 2 + 11;
        const orbitaAlto = jugador.alto / 2 + 10;

        ctx.save();
        ctx.lineWidth = 2;
        ctx.shadowColor = "#69faff";
        ctx.shadowBlur = 12;

        for (let indice = 0; indice < 3; indice++) {
            ctx.save();
            ctx.translate(centroX, centroY);
            ctx.rotate(tiempo + indice * Math.PI / 3);
            ctx.strokeStyle = indice === 1 ? "rgba(190, 255, 255, 0.9)" :
                "rgba(61, 225, 255, 0.78)";
            ctx.beginPath();
            ctx.ellipse(0, 0, orbitaAncho, orbitaAlto * 0.48, 0, 0, Math.PI * 2);
            ctx.stroke();

            const angulo = tiempo * (indice % 2 === 0 ? 1 : -1) + indice * 2.1;
            const radioX = orbitaAncho * Math.cos(angulo);
            const radioY = orbitaAlto * 0.48 * Math.sin(angulo);
            ctx.fillStyle = indice === 1 ? "#ffffff" : "#71faff";
            ctx.beginPath();
            ctx.arc(radioX, radioY, indice === 1 ? 3.5 : 2.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        ctx.shadowBlur = 16;
        ctx.strokeStyle = "rgba(149, 255, 255, 0.72)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(centroX, centroY, orbitaAncho + 3, orbitaAlto + 2, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    function dibujarMejoraJugador(ctx, canvas, elapsed) {
        const centroX = jugador.x + jugador.ancho / 2;
        const centroY = jugador.y + jugador.alto / 2;
        const pulso = 0.75 + Math.sin(elapsed * 9) * 0.25;

        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.shadowColor = "#48f5ff";
        ctx.shadowBlur = 17 * pulso;
        ctx.strokeStyle = `rgba(99, 245, 255, ${0.5 + pulso * 0.35})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(
            centroX,
            centroY,
            jugador.ancho * 0.48,
            jugador.alto * 0.46,
            Math.sin(elapsed * 1.8) * 0.08,
            0,
            Math.PI * 2
        );
        ctx.stroke();
        ctx.shadowBlur = 0;

        for (const desplazamiento of [-11, 11]) {
            const x = centroX + desplazamiento;
            const alto = 12 + pulso * 9;
            const gradiente = ctx.createLinearGradient(
                0,
                jugador.y + jugador.alto - 2,
                0,
                jugador.y + jugador.alto + alto
            );
            gradiente.addColorStop(0, "rgba(255, 255, 255, 0.95)");
            gradiente.addColorStop(0.35, "rgba(89, 251, 255, 0.9)");
            gradiente.addColorStop(1, "rgba(27, 105, 255, 0)");
            ctx.fillStyle = gradiente;
            ctx.beginPath();
            ctx.moveTo(x - 5, jugador.y + jugador.alto - 4);
            ctx.lineTo(x, jugador.y + jugador.alto + alto);
            ctx.lineTo(x + 5, jugador.y + jugador.alto - 4);
            ctx.closePath();
            ctx.fill();
        }

        if (animacionMejoraInicio !== null) {
            const progreso = elapsed - animacionMejoraInicio;
            if (progreso >= 0 && progreso < 1.8) {
                const avance = progreso / 1.8;
                ctx.globalAlpha = 1 - avance;
                ctx.strokeStyle = "#b8ffff";
                ctx.lineWidth = 3 * (1 - avance) + 1;
                ctx.shadowColor = "#47f5ff";
                ctx.shadowBlur = 22;
                ctx.beginPath();
                ctx.arc(centroX, centroY, 20 + avance * 76, 0, Math.PI * 2);
                ctx.stroke();

                ctx.globalAlpha = 1;
                ctx.font = "bold 26px Arial";
                ctx.textAlign = "center";
                ctx.fillStyle = "#baffff";
                ctx.shadowColor = "#15cfff";
                ctx.shadowBlur = 18;
                ctx.fillText("¡NAVE MEJORADA!", canvas.width / 2, 132);
            }
        }
        ctx.restore();
    }

    function dibujarNaveAuxiliar(ctx, nave) {
        ctx.save();
        ctx.translate(nave.x + nave.ancho / 2, nave.y + nave.alto / 2);
        ctx.rotate(nave.angulo);
        ctx.globalCompositeOperation = "lighter";
        ctx.shadowColor = "#70faff";
        ctx.shadowBlur = 12;
        ctx.fillStyle = "#5ef5ff";
        ctx.beginPath();
        ctx.moveTo(0, -nave.alto / 2);
        ctx.lineTo(nave.ancho / 2, nave.alto / 2);
        ctx.lineTo(0, nave.alto / 2 - 5);
        ctx.lineTo(-nave.ancho / 2, nave.alto / 2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function dibujarExplosiones(ctx) {
        for (const explosion of explosiones) {
            const progreso = Math.min(explosion.edad / explosion.duracion, 1);
            const escala = explosion.escala;
            const intensidad = 1 - progreso;
            const radioOnda = escala * (12 + progreso * 68);

            ctx.save();
            ctx.globalCompositeOperation = "lighter";

            ctx.globalAlpha = intensidad * 0.85;
            ctx.strokeStyle = "#ffd98a";
            ctx.lineWidth = escala * (5 * intensidad + 1);
            ctx.shadowColor = "#ff7338";
            ctx.shadowBlur = 20 * escala * intensidad;
            ctx.beginPath();
            ctx.arc(explosion.x, explosion.y, radioOnda, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;

            const radioLuz = escala * (42 * intensidad + 4);
            const resplandor = ctx.createRadialGradient(
                explosion.x,
                explosion.y,
                0,
                explosion.x,
                explosion.y,
                radioLuz
            );
            resplandor.addColorStop(0, `rgba(255, 255, 225, ${intensidad})`);
            resplandor.addColorStop(0.2, `rgba(255, 205, 87, ${intensidad * 0.9})`);
            resplandor.addColorStop(0.55, `rgba(255, 79, 32, ${intensidad * 0.65})`);
            resplandor.addColorStop(1, "rgba(255, 48, 20, 0)");
            ctx.globalAlpha = 1;
            ctx.fillStyle = resplandor;
            ctx.beginPath();
            ctx.arc(explosion.x, explosion.y, radioLuz, 0, Math.PI * 2);
            ctx.fill();

            for (const particula of explosion.particulas) {
                const vida = Math.max(0, 1 - particula.edad / particula.duracion);
                if (vida === 0) continue;

                ctx.globalAlpha = vida * (particula.tipo === "humo" ? 0.45 : 1);
                ctx.fillStyle = particula.color;
                if (particula.tipo === "humo") {
                    ctx.shadowColor = particula.color;
                    ctx.shadowBlur = 14 * escala;
                    ctx.beginPath();
                    ctx.arc(
                        particula.x,
                        particula.y,
                        particula.radio * (1 + particula.edad * 0.6),
                        0,
                        Math.PI * 2
                    );
                    ctx.fill();
                    ctx.shadowBlur = 0;
                } else {
                    ctx.strokeStyle = particula.color;
                    ctx.lineWidth = particula.radio;
                    ctx.lineCap = "round";
                    ctx.beginPath();
                    ctx.moveTo(particula.xAnterior, particula.yAnterior);
                    ctx.lineTo(particula.x, particula.y);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.arc(
                        particula.x,
                        particula.y,
                        particula.radio * 0.7,
                        0,
                        Math.PI * 2
                    );
                    ctx.fill();
                }
            }
            ctx.restore();
        }
    }

    function dibujarAvisos(ctx, canvas, elapsed) {
        if (avisoJefeFinalInicio !== null) {
            const progreso = elapsed - avisoJefeFinalInicio;
            if (progreso >= 0 && progreso < 3) {
                dibujarAviso(ctx, canvas, "¡JEFE FINAL!", progreso, 148, "#ffb347", "#ff4b1f");
            } else if (progreso >= 3) {
                avisoJefeFinalInicio = null;
            }
        }
        if (avisoFuriaInicio !== null) {
            const progreso = elapsed - avisoFuriaInicio;
            if (progreso >= 0 && progreso < 2) {
                dibujarAviso(ctx, canvas, "¡MODO FURIA!", progreso, 118, "#ffd166", "#ff3d1f");
            } else if (progreso >= 2) {
                avisoFuriaInicio = null;
            }
        }
    }

    function dibujarAviso(ctx, canvas, texto, progreso, posicionY, color, brillo) {
        const pulso = 1 + Math.sin(progreso * 9) * 0.06;
        ctx.save();
        ctx.translate(canvas.width / 2, posicionY);
        ctx.scale(pulso, pulso);
        ctx.globalAlpha = Math.min(1, progreso / 0.25);
        ctx.textAlign = "center";
        ctx.font = "bold 30px Arial";
        ctx.fillStyle = color;
        ctx.shadowColor = brillo;
        ctx.shadowBlur = 20;
        ctx.fillText(texto, 0, 0);
        ctx.restore();
    }

    G.Stage2 = {
        reiniciar,
        actualizar,
        dibujar,
        obtenerVidas,
        tieneAnimacionPendiente
    };
})(window.Guardianes);
