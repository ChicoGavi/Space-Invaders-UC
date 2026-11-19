/**
 * Animación 3D de Space Invaders para el Menú Principal y Efectos de Victoria en Créditos.
 * Renderiza en tiempo real un escuadrón de Invaders Voxel 3D clásicos, una nave defensora 3D
 * en formación, disparos láser 3D, campo de estrellas con perspectiva y, en modo victoria/créditos,
 * fuegos artificiales de cristal/neón, ondas de choque triunfales y lluvia de estrellas doradas.
 */
window.Guardianes = window.Guardianes || {};

(function(G) {
    const modelosVoxel = {
        invaderCangrejo: [
            "00100000100",
            "00010001000",
            "00111111100",
            "01101110110",
            "11111111111",
            "10111111101",
            "10100000101",
            "00011011000"
        ],
        invaderCalamar: [
            "00011110000",
            "01111111100",
            "11111111110",
            "11001100110",
            "11111111110",
            "00110011000",
            "01101101100",
            "11000000110"
        ],
        naveDefensora: [
            "00000100000",
            "00001110000",
            "00001110000",
            "01111111110",
            "11111111111",
            "11111111111",
            "11011111011"
        ]
    };

    const estrellas3D = [];
    const lasers3D = [];
    const fuegosVictoria = [];
    let inicializado = false;
    let ultimoDisparo3D = 0;
    let ultimoFuegoVictoria = 0;

    function inicializarEstrellas() {
        if (inicializado) return;
        inicializado = true;
        for (let i = 0; i < 140; i++) {
            estrellas3D.push({
                x: (Math.random() - 0.5) * 900,
                y: (Math.random() - 0.5) * 600,
                z: Math.random() * 600 + 40,
                color: i % 3 === 0 ? "#57f7ff" : (i % 3 === 1 ? "#ff66f5" : "#ffffff")
            });
        }
    }

    function proyectarPunto(x, y, z, camYaw, camPitch, camDist, fov, cx, cy) {
        const cosY = Math.cos(camYaw);
        const sinY = Math.sin(camYaw);
        const x1 = x * cosY - z * sinY;
        const z1 = z * cosY + x * sinY;

        const cosP = Math.cos(camPitch);
        const sinP = Math.sin(camPitch);
        const y2 = y * cosP - z1 * sinP;
        const z2 = z1 * cosP + y * sinP + camDist;

        if (z2 <= 15) return null;
        const escala = fov / z2;
        return {
            x: cx + x1 * escala,
            y: cy + y2 * escala,
            escala: escala,
            z: z2
        };
    }

    function dibujarCuboVoxel(ctx, vx, vy, vz, tam, colores, camYaw, camPitch, camDist, fov, cx, cy) {
        const p = proyectarPunto(vx, vy, vz, camYaw, camPitch, camDist, fov, cx, cy);
        if (!p) return;

        const w = tam * p.escala;
        const h = tam * p.escala;
        const profX = Math.sin(camYaw) * w * 0.42;
        const profY = -Math.sin(camPitch) * h * 0.42 - w * 0.22;

        const x0 = p.x - w / 2;
        const y0 = p.y - h / 2;

        ctx.fillStyle = colores.arriba;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x0 + profX, y0 + profY);
        ctx.lineTo(x0 + w + profX, y0 + profY);
        ctx.lineTo(x0 + w, y0);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = colores.lado;
        ctx.beginPath();
        if (profX >= 0) {
            ctx.moveTo(x0 + w, y0);
            ctx.lineTo(x0 + w + profX, y0 + profY);
            ctx.lineTo(x0 + w + profX, y0 + h + profY);
            ctx.lineTo(x0 + w, y0 + h);
        } else {
            ctx.moveTo(x0, y0);
            ctx.lineTo(x0 + profX, y0 + profY);
            ctx.lineTo(x0 + profX, y0 + h + profY);
            ctx.lineTo(x0, y0 + h);
        }
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = colores.frente;
        ctx.fillRect(x0, y0, w + 0.6, h + 0.6);
    }

    function dibujarModeloVoxel3D(ctx, matriz, centroX, centroY, centroZ, tamVoxel, paleta, camYaw, camPitch, camDist, fov, cx, cy) {
        const filas = matriz.length;
        const cols = matriz[0].length;
        const dirX = camYaw >= 0 ? -1 : 1;
        const inicioCol = dirX === 1 ? 0 : cols - 1;

        for (let r = 0; r < filas; r++) {
            for (let paso = 0; paso < cols; paso++) {
                const c = inicioCol + paso * dirX;
                if (matriz[r][c] !== "1") continue;
                const vx = centroX + (c - (cols - 1) / 2) * tamVoxel;
                const vy = centroY + (r - (filas - 1) / 2) * tamVoxel;
                dibujarCuboVoxel(ctx, vx, vy, centroZ, tamVoxel * 0.9, paleta, camYaw, camPitch, camDist, fov, cx, cy);
            }
        }
    }

    function crearFuegoArtificialVictoria(w, h, tiempoSegundos) {
        const paletas = [
            ["#ffd166", "#fff3b0", "#ff9f1c"],
            ["#57f7ff", "#d8ffff", "#38b6ff"],
            ["#ff55e8", "#ffc4f7", "#b5179e"],
            ["#72efdd", "#c7f9cc", "#48bfe3"]
        ];
        const colores = paletas[Math.floor(Math.random() * paletas.length)];
        // Posicionar preferiblemente hacia los costados y parte superior para lucir alrededor de los créditos
        const lado = Math.random() < 0.5 ? 0.14 + Math.random() * 0.22 : 0.64 + Math.random() * 0.22;
        const x = w * lado;
        const y = h * (0.14 + Math.random() * 0.55);

        const particulas = [];
        const total = 34;
        for (let i = 0; i < total; i++) {
            const ang = (Math.PI * 2 * i) / total + (Math.random() - 0.5) * 0.15;
            const rapidez = 55 + Math.random() * 145;
            particulas.push({
                x: x,
                y: y,
                vx: Math.cos(ang) * rapidez,
                vy: Math.sin(ang) * rapidez,
                tamano: 2.2 + Math.random() * 3.2,
                color: colores[i % colores.length],
                rotacion: Math.random() * Math.PI * 2
            });
        }

        fuegosVictoria.push({
            x: x,
            y: y,
            inicio: tiempoSegundos,
            duracion: 1.35,
            colorOnda: colores[0],
            particulas: particulas
        });
    }

    function actualizarYDibujarEfectosVictoria(ctx, w, h, tiempoSegundos) {
        if (tiempoSegundos - ultimoFuegoVictoria >= 0.48) {
            ultimoFuegoVictoria = tiempoSegundos;
            crearFuegoArtificialVictoria(w, h, tiempoSegundos);
        }

        ctx.save();
        ctx.globalCompositeOperation = "lighter";

        for (let i = fuegosVictoria.length - 1; i >= 0; i--) {
            const f = fuegosVictoria[i];
            const edad = tiempoSegundos - f.inicio;
            if (edad >= f.duracion) {
                fuegosVictoria.splice(i, 1);
                continue;
            }
            const progreso = Math.max(0, Math.min(1, edad / f.duracion));
            const alfa = 1 - progreso;

            // Onda expansiva luminosa
            ctx.globalAlpha = alfa * 0.7;
            ctx.strokeStyle = f.colorOnda;
            ctx.shadowColor = f.colorOnda;
            ctx.shadowBlur = 16;
            ctx.lineWidth = 2.5 * alfa + 0.5;
            ctx.beginPath();
            ctx.arc(f.x, f.y, 8 + progreso * 72, 0, Math.PI * 2);
            ctx.stroke();

            // Destellos cristalinos y estrellas
            for (const p of f.particulas) {
                const px = p.x + p.vx * edad;
                const py = p.y + p.vy * edad + 38 * edad * edad; // ligera gravedad
                ctx.save();
                ctx.globalAlpha = alfa;
                ctx.translate(px, py);
                ctx.rotate(p.rotacion + edad * 5);
                ctx.fillStyle = p.color;
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 10;

                // Estrella / diamante de 4 puntas
                const t = p.tamano * (0.5 + alfa * 0.7);
                ctx.beginPath();
                ctx.moveTo(0, -t * 1.5);
                ctx.lineTo(t * 0.6, 0);
                ctx.lineTo(0, t * 1.5);
                ctx.lineTo(-t * 0.6, 0);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
        }

        // Haces de luz triunfales rotatorios desde el centro en modo victoria
        const cx = w / 2;
        const cy = h / 2;
        for (let rayo = 0; rayo < 8; rayo++) {
            const ang = tiempoSegundos * 0.35 + (rayo * Math.PI) / 4;
            const gradRayo = ctx.createLinearGradient(cx, cy, cx + Math.cos(ang) * 420, cy + Math.sin(ang) * 420);
            gradRayo.addColorStop(0, "rgba(255, 215, 102, 0.08)");
            gradRayo.addColorStop(0.5, "rgba(87, 247, 255, 0.05)");
            gradRayo.addColorStop(1, "rgba(0, 0, 0, 0)");

            ctx.fillStyle = gradRayo;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, 440, ang - 0.11, ang + 0.11);
            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();
    }

    function dibujarEscena3D(ctx, canvas, tiempoSegundos, modoVictoria) {
        inicializarEstrellas();

        const w = canvas.width;
        const h = canvas.height;
        const cx = w / 2;
        const cy = h / 2;

        // 1. Fondo espacial profundo con nebulosa neón
        const gradFondo = ctx.createRadialGradient(cx, cy * 0.85, 20, cx, cy, w * 0.75);
        if (modoVictoria) {
            gradFondo.addColorStop(0, "#1c1847");
            gradFondo.addColorStop(0.55, "#0b112c");
            gradFondo.addColorStop(1, "#030510");
        } else {
            gradFondo.addColorStop(0, "#101b3b");
            gradFondo.addColorStop(0.55, "#070c1e");
            gradFondo.addColorStop(1, "#02040a");
        }
        ctx.fillStyle = gradFondo;
        ctx.fillRect(0, 0, w, h);

        // 2. Rejilla Synthwave / Horizonte 3D en la parte inferior
        ctx.save();
        const horizonteY = h * 0.66;
        ctx.strokeStyle = modoVictoria ? "rgba(255, 209, 102, 0.25)" : "rgba(53, 223, 255, 0.22)";
        ctx.lineWidth = 1.2;
        for (let i = -10; i <= 10; i++) {
            ctx.beginPath();
            ctx.moveTo(cx + i * 22, horizonteY);
            ctx.lineTo(cx + i * 145, h);
            ctx.stroke();
        }
        const offsetGrid = (tiempoSegundos * (modoVictoria ? 65 : 45)) % 24;
        for (let d = 6; d < h - horizonteY; d *= 1.32) {
            const yLinea = Math.min(h, horizonteY + d + offsetGrid * (d / 120));
            ctx.beginPath();
            ctx.moveTo(0, yLinea);
            ctx.lineTo(w, yLinea);
            ctx.stroke();
        }
        ctx.restore();

        // 3. Campo de estrellas 3D avanzando hacia la cámara
        const velocidadEstrellas = modoVictoria ? 3.2 : 1.8;
        for (const est of estrellas3D) {
            est.z -= velocidadEstrellas;
            if (est.z <= 20) {
                est.z = 620;
                est.x = (Math.random() - 0.5) * 900;
                est.y = (Math.random() - 0.5) * 600;
            }
            const escala = 360 / est.z;
            const sx = cx + est.x * escala;
            const sy = cy + est.y * escala;
            if (sx >= 0 && sx <= w && sy >= 0 && sy <= h) {
                const radio = Math.max(0.8, 2.4 * (1 - est.z / 640));
                ctx.fillStyle = est.color;
                ctx.beginPath();
                ctx.arc(sx, sy, radio, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Parámetros de cámara 3D orbital suave
        const camYaw = Math.sin(tiempoSegundos * 0.75) * 0.34;
        const camPitch = -0.18 + Math.cos(tiempoSegundos * 0.55) * 0.08;
        const camDist = 370;
        const fov = 360;

        // 4. Escuadrón de Space Invaders 3D en formación
        const paletasInvaders = [
            { frente: "#ff47e8", arriba: "#ffa6f6", lado: "#a81897" },
            { frente: "#38f3ff", arriba: "#b0fbff", lado: "#1499a8" },
            { frente: "#ffb838", arriba: "#ffe19c", lado: "#b87414" }
        ];

        const desplazamientoEscuadronX = Math.sin(tiempoSegundos * 1.2) * 55;

        for (let fila = 0; fila < 2; fila++) {
            const modelo = fila === 0 ? modelosVoxel.invaderCangrejo : modelosVoxel.invaderCalamar;
            const paleta = paletasInvaders[(fila + (modoVictoria ? 1 : 0)) % paletasInvaders.length];
            for (let col = -1; col <= 1; col++) {
                const ix = col * 135 + desplazamientoEscuadronX;
                const iy = -105 + fila * 75 + Math.sin(tiempoSegundos * 2.4 + col + fila) * 10;
                const iz = 40 + fila * 35 + Math.cos(tiempoSegundos * 1.5 + col) * 18;
                dibujarModeloVoxel3D(
                    ctx,
                    modelo,
                    ix,
                    iy,
                    iz,
                    7.2,
                    paleta,
                    camYaw,
                    camPitch,
                    camDist,
                    fov,
                    cx,
                    cy
                );
            }
        }

        // 5. Nave Defensora 3D en el frente disparando hacia el escuadrón
        const naveX = Math.sin(tiempoSegundos * 1.65) * 95;
        const naveY = 122;
        const naveZ = -35;
        const paletaNave = modoVictoria
            ? { frente: "#ffd166", arriba: "#fff6cc", lado: "#c98a14" }
            : { frente: "#55f7ff", arriba: "#e0ffff", lado: "#1c8db0" };

        dibujarModeloVoxel3D(
            ctx,
            modelosVoxel.naveDefensora,
            naveX,
            naveY,
            naveZ,
            7.5,
            paletaNave,
            camYaw,
            camPitch,
            camDist,
            fov,
            cx,
            cy
        );

        // 6. Disparos láser 3D entre la nave defensora y los Invaders
        if (tiempoSegundos - ultimoDisparo3D >= 0.45) {
            ultimoDisparo3D = tiempoSegundos;
            lasers3D.push({
                x: naveX,
                y: naveY - 24,
                z: naveZ,
                vy: -260,
                vz: 90,
                color: modoVictoria ? "#ffd166" : "#ff55f0"
            });
        }

        for (let i = lasers3D.length - 1; i >= 0; i--) {
            const l = lasers3D[i];
            l.y += l.vy * 0.016;
            l.z += l.vz * 0.016;
            if (l.y < -160) {
                lasers3D.splice(i, 1);
                continue;
            }
            const p1 = proyectarPunto(l.x, l.y, l.z, camYaw, camPitch, camDist, fov, cx, cy);
            const p2 = proyectarPunto(l.x, l.y + 18, l.z - 6, camYaw, camPitch, camDist, fov, cx, cy);
            if (p1 && p2) {
                ctx.save();
                ctx.strokeStyle = l.color;
                ctx.shadowColor = l.color;
                ctx.shadowBlur = 12;
                ctx.lineWidth = Math.max(2, 4 * p1.escala);
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
                ctx.restore();
            }
        }

        // 7. Si estamos en Victoria / Créditos, renderizar fuegos artificiales y haces triunfales
        if (modoVictoria) {
            actualizarYDibujarEfectosVictoria(ctx, w, h, tiempoSegundos);
        }
    }

    G.Menu3D = {
        dibujarEscena3D
    };
})(window.Guardianes);
