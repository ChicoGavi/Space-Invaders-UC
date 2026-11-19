# Guardianes del Eje

Videojuego arcade shoot-'em-up 2D para navegador, construido con HTML5 Canvas, CSS3 y JavaScript nativo (Vanilla JS). No requiere instalar dependencias ni pasos de compilación para jugar.

Esta versión consolida e integra **Stage 1**, **Stage 2** y **Stage 3 (Las Cavernas de Cristal)** bajo una única arquitectura modular, conservando el soporte completo para escritorio (teclado) y dispositivos móviles (joystick táctil, botones en pantalla y modo pantalla completa).

## Ejecutar localmente

1. Abre una terminal en la carpeta del proyecto.
2. Inicia un servidor HTTP estático:

   ```bash
   python3 -m http.server 8000
   ```

3. Abre <http://localhost:8000> en el navegador.
4. Para detener el servidor, vuelve a la terminal y presiona `Ctrl+C`.

También se puede abrir `index.html` directamente en el navegador (`file://`), gracias a que la arquitectura modular utiliza el namespace `window.Guardianes` sin depender de bundlers.

## Controles

| Acción | Teclado / Mouse | Celular / Táctil |
| --- | --- | --- |
| Iniciar partida / Avanzar | `Enter` o clic en botón | Botones del panel (**Jugar Campaña**, **Jugar Stage 2**, **Jugar Stage 3**) |
| Elegir Nave por Stage | Botón **Naves** en el menú principal | Botón **Naves** en el menú principal |
| Mover la nave | Flechas o `W`, `A`, `S`, `D` | Joystick táctil analógico |
| Disparar | Barra espaciadora (`Space`) o **Clic izquierdo del mouse** | Mantener presionado el botón **Disparar** |
| Pausar o reanudar | `P` o `Escape` | Botón **Ⅱ / ▶** o botón **Continuar** |
| Reiniciar / Menú | `Enter` o botones del panel | Botones **Reiniciar Stage** / **Menú principal** |

## Progresión del Juego

### Stage 1
- El jugador cuenta con **6 vidas**.
- El escenario se desplaza verticalmente durante aproximadamente 89 segundos.
- **Enemigo 1**: aparece periódicamente desde el borde superior y dispara proyectiles dirigidos hacia el jugador.
- **Enemigo 2 (Pesado)**: entra desde un lateral a partir del 25% del recorrido, resiste 20 impactos y lanza cohetes dirigidos que detonan con **daño en área (AOE)**.
- **Enemigo 3 (Sub-jefe)**: a mitad del recorrido aparecen dos unidades simultáneas (50 impactos cada una) que disparan ráfagas en abanico de 7 direcciones.
- **Jefe Final del Stage 1**: aparece tras derrotar a ambos Enemigos 3, resiste 300 impactos y combina disparos dirigidos, cohetes explosivos y ráfagas en abanico. Al derrotarlo, se desencadenan 10 explosiones, la nave asciende y se habilita el paso al **Stage 2** conservando la puntuación acumulada.
- **Potenciadores del Stage 1**: el primer nivel habilita disparo doble; el segundo nivel activa un escudo eléctrico de 12 rayos y aumenta la velocidad un 30%.

### Stage 2
- El jugador cuenta con **4 vidas** y un reloj límite de **360 segundos (06:00)**.
- **Oleadas por bajas**: tras derrotar a 10 enemigos de tipo 1 (1 HP), comienzan a aparecer enemigos de tipo 2 (4 HP).
- **Secuencia de 3 Jefes**: tras derrotar a 20 enemigos de tipo 2 (y superado el primer minuto), aparecen sucesivamente **dos Sub-jefes (Tipo 3, 180 HP)** y finalmente el **Jefe Final (Tipo 4, 260 HP)**, acompañados por enemigos de apoyo.
- **Modo Furia**: al bajar al 50% de vida, el Jefe Final del Stage 2 entra en *Modo Furia* y añade salvas radiales de 10 espinas rotatorias.
- **Mejora por puntuación y Drones Auxiliares**: al acumular 1000 puntos en la etapa, se activa `¡NAVE MEJORADA!` (disparo doble de 2x daño con propulsores). Si con la nave mejorada se recoge la caja de arma, se despliegan **naves auxiliares teledirigidas**.
- **Poderes cíclicos del Stage 2**: Caja de Arma (15 s de doble disparo + drones si está mejorada), Escudo Atómico (10 s) y Vida Extra (+1 vida, máx. 4). Al derrotar al tercer jefe, se desbloquea el paso al **Stage 3**.

### Stage 3 — Las Cavernas de Cristal
- El jugador cuenta con **3 vidas**.
- **Nave de Cristal con 4 Estados Visuales Dinámicos**:
  - `IDLE`: estado base de navegación.
  - `DISPARO`: destello cristalino frontal al disparar proyectiles.
  - `UPGRADED`: alas de cristal desplegadas y **disparo triple de esquirlas** (se activa al recoger un potenciador de cristal `◆` o al alcanzar 1500 puntos en el stage).
  - `DAMAGE`: cristales fracturados y humo púrpura tras sufrir un impacto o cuando queda 1 sola vida.
- **Oponentes Voladores de la Caverna**:
  - **Crystal Drone**: dron rápido en zigzag que dispara orbes de energía cian.
  - **Crystal Cowl / Beetle**: escarabajo cristalino que se alinea con el jugador, acelera en picado y lanza agujas magenta gemelas.
  - **Cavern Skiff**: patrullero artillado (9 HP) que se desplaza horizontalmente y dispara abanicos de 3 cristales.
  - **Crystal Dredger / Heavy Flyer**: sub-jefe perforador pesado (35 HP) con taladro frontal que alterna salvas de 5 esquirlas con embestidas verticales.
- **Jefe Final — THE CRYSTAL ARCH-DREADNOUGHT (360 HP)**:
  - Aparece tras derrotar a 2 *Crystal Dredgers* o completar el recorrido de la caverna.
  - Combina 4 estados visuales y 3 patrones de ataque: patrulla artillada (`IDLE`), carga y embestida con taladro gigante (`DRILL RUSH & ENERGY CHARGE`), y barrido con Rayo Láser Cristalino acompañado de lluvia de esquirlas (`CRYSTAL BARRAGE & LASER`), culminando en su secuencia de colapso (`DEFEATED / FINAL EXPLOSION`).

## Estructura del Proyecto

```text
index.html          Página principal, canvas (800×500), panel modal y controles táctiles
css/
  estilos.css       Marco neón, panel de estados, controles móviles y modo pantalla completa
img/                Recursos gráficos unificados de Stage 1, Stage 2 y Stage 3
js/
  recursos.js       Precarga, caché y verificación de las 27 imágenes del juego
  sonido.js         Sintetizador Web Audio API (disparos, láseres, daño y sirena sísmica de Boss Final)
  entrada.js        Gestor unificado de teclado, clic izquierdo del mouse, joystick táctil y pantalla completa
  efectos.js        Colisiones, HUD superior, Hangar de Naves por Stage y sacudida de pantalla (Screen Shake)
  stage1.js         Lógica, enemigos, jefe final y renderizado del Stage 1
  stage2.js         Lógica, enemigos, 3 jefes, drones auxiliares y partículas del Stage 2
  stage3.js         Lógica, Nave de Cristal (4 estados), 4 enemigos y Arch-Dreadnought del Stage 3
  juego.js          Controlador principal, máquina de estados y Game Loop único
```
