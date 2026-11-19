/**
 * Sintetizador de Efectos de Sonido Retro Arcade (Web Audio API) — Guardianes del Eje.
 * Genera efectos de sonido en tiempo real sin necesidad de archivos externos:
 * - Disparo del jugador (pulso láser rápido)
 * - Rayo láser / ráfaga especial (zumbido modulado de alta energía)
 * - Impacto recibido por la nave del jugador (explosión de ruido blanco filtrado + caída de tono)
 * - Alerta y aparición del Jefe Final (sirena grave + estruendo sísmico durante el screen shake)
 */
window.Guardianes = window.Guardianes || {};

(function(G) {
    let audioCtx = null;
    let bufferRuido = null;

    function obtenerContexto() {
        if (!audioCtx) {
            const ClaseAudio = window.AudioContext || window.webkitAudioContext;
            if (ClaseAudio) {
                audioCtx = new ClaseAudio();
            }
        }
        if (audioCtx && audioCtx.state === "suspended") {
            audioCtx.resume().catch(function() {});
        }
        return audioCtx;
    }

    function obtenerBufferRuido(ctx) {
        if (bufferRuido) return bufferRuido;
        const duracion = 1.5;
        const tamano = Math.floor(ctx.sampleRate * duracion);
        bufferRuido = ctx.createBuffer(1, tamano, ctx.sampleRate);
        const datos = bufferRuido.getChannelData(0);
        for (let i = 0; i < tamano; i++) {
            datos[i] = Math.random() * 2 - 1;
        }
        return bufferRuido;
    }

    /**
     * Sonido de disparo principal del jugador (varía ligeramente según la nave o mejora).
     */
    function reproducirDisparo(esMejorado) {
        const ctx = obtenerContexto();
        if (!ctx) return;

        const ahora = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = esMejorado ? "sawtooth" : "square";
        const frecInicial = esMejorado ? 920 : 760;
        const frecFinal = esMejorado ? 210 : 170;

        osc.frequency.setValueAtTime(frecInicial, ahora);
        osc.frequency.exponentialRampToValueAtTime(frecFinal, ahora + 0.11);

        gain.gain.setValueAtTime(0.11, ahora);
        gain.gain.exponentialRampToValueAtTime(0.001, ahora + 0.11);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ahora);
        osc.stop(ahora + 0.115);
    }

    /**
     * Sonido de láser energético (disparos de jefes, espinas, cohetes o el Rayo Láser del Arch-Dreadnought).
     */
    function reproducirLaser(esHazContinuo) {
        const ctx = obtenerContexto();
        if (!ctx) return;

        const ahora = ctx.currentTime;
        const duracion = esHazContinuo ? 1.15 : 0.24;

        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = "sawtooth";
        osc2.type = "triangle";

        if (esHazContinuo) {
            osc1.frequency.setValueAtTime(140, ahora);
            osc1.frequency.linearRampToValueAtTime(220, ahora + 0.25);
            osc1.frequency.linearRampToValueAtTime(115, ahora + duracion);

            osc2.frequency.setValueAtTime(284, ahora);
            osc2.frequency.linearRampToValueAtTime(440, ahora + 0.25);
            osc2.frequency.linearRampToValueAtTime(230, ahora + duracion);

            gain.gain.setValueAtTime(0.01, ahora);
            gain.gain.linearRampToValueAtTime(0.16, ahora + 0.12);
            gain.gain.exponentialRampToValueAtTime(0.001, ahora + duracion);
        } else {
            osc1.frequency.setValueAtTime(520, ahora);
            osc1.frequency.exponentialRampToValueAtTime(130, ahora + duracion);

            osc2.frequency.setValueAtTime(545, ahora);
            osc2.frequency.exponentialRampToValueAtTime(138, ahora + duracion);

            gain.gain.setValueAtTime(0.09, ahora);
            gain.gain.exponentialRampToValueAtTime(0.001, ahora + duracion);
        }

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(ahora);
        osc2.start(ahora);
        osc1.stop(ahora + duracion + 0.02);
        osc2.stop(ahora + duracion + 0.02);
    }

    /**
     * Sonido cuando la nave del jugador recibe un impacto.
     */
    function reproducirImpactoNave() {
        const ctx = obtenerContexto();
        if (!ctx) return;

        const ahora = ctx.currentTime;
        const duracion = 0.42;

        // 1. Ruido de impacto filtrado (explosión en el casco)
        const fuenteRuido = ctx.createBufferSource();
        fuenteRuido.buffer = obtenerBufferRuido(ctx);

        const filtro = ctx.createBiquadFilter();
        filtro.type = "lowpass";
        filtro.frequency.setValueAtTime(1100, ahora);
        filtro.frequency.exponentialRampToValueAtTime(140, ahora + duracion);

        const gainRuido = ctx.createGain();
        gainRuido.gain.setValueAtTime(0.24, ahora);
        gainRuido.gain.exponentialRampToValueAtTime(0.001, ahora + duracion);

        fuenteRuido.connect(filtro);
        filtro.connect(gainRuido);
        gainRuido.connect(ctx.destination);

        fuenteRuido.start(ahora);
        fuenteRuido.stop(ahora + duracion);

        // 2. Sub-bajo descendente de daño
        const osc = ctx.createOscillator();
        const gainOsc = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(190, ahora);
        osc.frequency.exponentialRampToValueAtTime(42, ahora + duracion);

        gainOsc.gain.setValueAtTime(0.18, ahora);
        gainOsc.gain.exponentialRampToValueAtTime(0.001, ahora + duracion);

        osc.connect(gainOsc);
        gainOsc.connect(ctx.destination);

        osc.start(ahora);
        osc.stop(ahora + duracion);
    }

    /**
     * Sonido cinemático cuando aparece el BOSS Final de cada Stage (sirena de alarma + temblor grave).
     */
    function reproducirAparicionJefe() {
        const ctx = obtenerContexto();
        if (!ctx) return;

        const ahora = ctx.currentTime;
        const duracion = 2.4;

        // 1. Estruendo sísmico grave (acompaña el screen shake)
        const fuenteRuido = ctx.createBufferSource();
        fuenteRuido.buffer = obtenerBufferRuido(ctx);
        fuenteRuido.loop = true;

        const filtro = ctx.createBiquadFilter();
        filtro.type = "lowpass";
        filtro.frequency.setValueAtTime(180, ahora);

        const gainRuido = ctx.createGain();
        gainRuido.gain.setValueAtTime(0.01, ahora);
        gainRuido.gain.linearRampToValueAtTime(0.22, ahora + 0.25);
        gainRuido.gain.setValueAtTime(0.20, ahora + duracion - 0.5);
        gainRuido.gain.exponentialRampToValueAtTime(0.001, ahora + duracion);

        fuenteRuido.connect(filtro);
        filtro.connect(gainRuido);
        gainRuido.connect(ctx.destination);

        fuenteRuido.start(ahora);
        fuenteRuido.stop(ahora + duracion);

        // 2. Tres pulsos de sirena de alerta de Jefe Final
        for (let pulso = 0; pulso < 3; pulso++) {
            const inicioPulso = ahora + pulso * 0.72;
            const osc = ctx.createOscillator();
            const gainSirena = ctx.createGain();

            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(110, inicioPulso);
            osc.frequency.linearRampToValueAtTime(260, inicioPulso + 0.34);
            osc.frequency.linearRampToValueAtTime(95, inicioPulso + 0.64);

            gainSirena.gain.setValueAtTime(0.001, inicioPulso);
            gainSirena.gain.linearRampToValueAtTime(0.14, inicioPulso + 0.08);
            gainSirena.gain.exponentialRampToValueAtTime(0.001, inicioPulso + 0.65);

            osc.connect(gainSirena);
            gainSirena.connect(ctx.destination);

            osc.start(inicioPulso);
            osc.stop(inicioPulso + 0.66);
        }
    }

    /**
     * Fanfarria triunfal de Victoria / Créditos (arpegio ascendente de sintetizador).
     */
    function reproducirFanfarriaVictoria() {
        const ctx = obtenerContexto();
        if (!ctx) return;

        const ahora = ctx.currentTime;
        const notas = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99];
        notas.forEach(function(frec, idx) {
            const inicio = ahora + idx * 0.11;
            const dur = idx === notas.length - 1 ? 0.65 : 0.18;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = "triangle";
            osc.frequency.setValueAtTime(frec, inicio);

            gain.gain.setValueAtTime(0.001, inicio);
            gain.gain.linearRampToValueAtTime(0.14, inicio + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, inicio + dur);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(inicio);
            osc.stop(inicio + dur + 0.02);
        });
    }

    G.Sonido = {
        reproducirDisparo,
        reproducirLaser,
        reproducirImpactoNave,
        reproducirAparicionJefe,
        reproducirFanfarriaVictoria
    };
})(window.Guardianes);
