# Mullvad VPN

Comprueba que la conexión a Internet de la casa sale realmente por la [VPN de Mullvad](https://mullvad.net/), como la
prueba de conexión del sitio de Mullvad, y avisa a sus escenas cuando deja de ser así. Desarrollada sin túnel Mullvad
por parte del desarrollador: sus comentarios son bienvenidos.

## Lo que obtiene

Un dispositivo **Mullvad VPN** con tres funciones de solo lectura:

- **A través de Mullvad**: 1 cuando el tráfico de Gladys sale a Internet por un servidor Mullvad, 0 si no.
- **IP en lista negra**: 1 cuando la IP de salida figura en una lista negra conocida por Mullvad (listas antispam…).
- **País de salida**: el país desde el que Internet ve llegar su tráfico.

La IP pública y el servidor Mullvad no son funciones a propósito, para no guardarse nunca en el historial: se muestran
en el widget (la IP solo si lo pide) y en el mensaje del botón **Comprobar la conexión ahora**.

## Funcionamiento

Cada pocos minutos, la integración consulta `https://am.i.mullvad.net/json`, la prueba de conexión pública de Mullvad
(sin cuenta ni clave). Solo se comprueba **el tráfico de Gladys**: indica si la casa sale por Mullvad cuando la VPN
funciona en el router o en la máquina de Gladys, no si otro ordenador de la casa la usa.

## Instalación

En Gladys, vaya a **Integraciones → Instalar desde GitHub** e introduzca `https://github.com/guim31/gladys-mullvad`.
Después abra la pestaña **Descubrir** de la integración y añada el dispositivo **Mullvad VPN**.

## Configuración

- **Intervalo de comprobación**: de 1 a 60 minutos, 5 por defecto. Una pequeña petición cada vez.
- **Idioma de los nombres de funciones**: el idioma de los nombres de funciones (fijados al añadir el dispositivo) y de
  los mensajes. Francés por defecto.

## Widget del panel

El widget **Mullvad VPN** muestra de un vistazo: un «Sí» verde o un «No» rojo, el lugar de salida, el servidor Mullvad
usado (o su proveedor fuera de Mullvad), las listas negras y la hora de la última comprobación. Sus ajustes:

- **Mostrar el servidor o el proveedor** (activado por defecto);
- **Mostrar la IP pública** (desactivado por defecto: cualquiera que vea el panel la vería);
- **Mostrar el botón «Comprobar»** (activado por defecto).

## Escenas

Disparadores:

- **La conexión ya no pasa por Mullvad**: una comprobación ve el tráfico salir fuera de Mullvad, cuando antes pasaba
  por él. Variable: país de salida.
- **La conexión vuelve a pasar por Mullvad**: variables: país de salida, servidor Mullvad.
- **Comprobación de Mullvad inaccesible**: dos comprobaciones seguidas fallaron. A menudo un corte de Internet, o un
  kill switch que bloquea el tráfico mientras el túnel está caído. Variable: error. Una sola vez por corte.

Acción: **Comprobar la conexión Mullvad** comprueba enseguida y pasa `success`, `through_mullvad`, `country`, `server`
y `blacklisted` a las acciones siguientes. Cuando la comprobación no puede hacerse, `success` es falso: compruébelo
primero.

La primera comprobación tras un arranque nunca dispara nada (no hay nada con qué comparar).

## Comprobar la conexión ahora

En la pantalla Configuración de la integración, el botón **Comprobar la conexión ahora** comprueba enseguida y muestra
el resultado: por Mullvad o no, servidor, lugar de salida, proveedor, IP pública y listas negras. Se muestra en rojo
cuando am.i.mullvad.net no responde.

## Límites y privacidad

- Solo se comprueba el tráfico del contenedor de la integración de Gladys (vea «Funcionamiento»).
- Mientras la comprobación falla, las funciones conservan su último valor conocido: un fallo no dice nada del túnel.
- am.i.mullvad.net es un servicio público y gratuito de Mullvad sin cuota publicada: mantenga un intervalo razonable
  (una petición cada 5 minutos por defecto). Mullvad ve la petición, como en cualquier visita a su sitio.
- No se escribe nada en el disco, y la IP pública nunca se escribe en los registros.

## Solución de problemas

- «am.i.mullvad.net no responde»: compruebe la conexión a Internet de Gladys, o su kill switch.
- Nombres de funciones en el idioma equivocado: cambie el idioma, luego elimine y añada de nuevo el dispositivo (los
  nombres se fijan al crearlo).
- Más detalles con `LOG_LEVEL=debug`. Informe de los problemas en
  [GitHub](https://github.com/guim31/gladys-mullvad/issues).

Esta integración no está afiliada a Mullvad VPN AB.
