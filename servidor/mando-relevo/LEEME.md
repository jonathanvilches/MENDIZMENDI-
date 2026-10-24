# El servidor propio del mando

El ordenador y el móvil se saludan por aquí y, si la wifi no les deja hablar directamente, se pasan por aquí los mensajes del mando. Todo llega cifrado de punta a punta: el servidor no puede leerlo. Va en Cloudflare Workers, con una sala por partida en un Durable Object de la Unión Europea.

Mientras no esté desplegado, el juego sigue con los servidores públicos de siempre (PeerJS, MQTT y ntfy).

## Desplegar

Desde esta carpeta, con una cuenta de Cloudflare (el plan gratuito vale):

```sh
npx wrangler login
npx wrangler deploy
```

Al terminar, wrangler da la dirección, algo como `https://herrizherri-mando.TU-SUBDOMINIO.workers.dev`.

## Conectar el juego

Con esa dirección, dos cambios:

1. En `src/mando/senal.js`, la constante `PROPIO`: en vez de `''`, la dirección con `wss://`.
   ```js
   const PROPIO = Q.has('propio') ? Q.get('propio') : 'wss://herrizherri-mando.TU-SUBDOMINIO.workers.dev';
   ```
2. En `public/mando/index.html`, la misma dirección en la lista `connect-src`.

Después, compilar y publicar como siempre.

## Probar en local

```sh
npx wrangler dev --port 8787
```

Y el juego con `?propio=ws://127.0.0.1:8787` (y `&sinpeer=1&mqtt=&ntfy=` para que no use nada más).

## Límites

- 8 conexiones por sala.
- 64 KB por mensaje.
- 200 mensajes por segundo y conexión.
- Si el móvil vuelve a entrar con el mismo nombre, se queda la conexión nueva y la vieja se cierra.
