# Ficha · Puente medieval de Ochagavía / Otsagabia (BLD_Otsagabia_PuenteMedieval)

## Datos documentados
| Dato | Valor | Fuente |
|---|---|---|
| Río | Anduña, en el casco urbano | Valle de Salazar, MonumentalNet |
| Material | Piedra (sillería y mampostería) | Valle de Salazar |
| Arcos | 2, «circulares algo rebajados que se asemejan al arco carpanel» | Valle de Salazar |
| Luces | ~8 m («ojos de distinta amplitud») | Valle de Salazar, MonumentalNet |
| Longitud | ~20 m | Valle de Salazar |
| Anchura | 3,20 m | Valle de Salazar |
| Tajamar | Uno, aguas arriba, en ángulo muy agudo | Valle de Salazar, MonumentalNet |
| Época | Medieval (una fuente indica s. XIII) | MonumentalNet |
| Otros | Único puente de piedra que se conserva en el pueblo | Valle de Salazar |

## Supuestos del blockout (pendientes de confirmar con fotos u ortofoto de IDENA)
| Dato | Valor del blockout | Motivo |
|---|---|---|
| Luces de cada ojo | 8,0 m y 7,0 m | «luces de 8 m» y «distinta amplitud» |
| Flecha (rebaje) | 2,9 m y 2,6 m (≈0,36 de la luz) | arco rebajado tipo carpanel |
| Arranque sobre el agua | 1,10 m | |
| Rosca de dovelas en clave | 0,55 m | |
| Pila central | 2,20 m | 20 − 8 − 7 − 2 estribos de ~1,4 m |
| Tajamar | sale 2,6 m, ~50°, coronado en sombrerete piramidal | «ángulo muy agudo» |
| Aguas abajo | espolón rectangular corto | sin datos |
| Pretiles | 0,85 m de alto, 0,40 m de grosor, de piedra | típico de la zona |
| Tablero | 4,6 m en los extremos y 4,85 m en la pila (ligero lomo) | |
| Paso libre entre pretiles | 2,40 m | 3,20 − 2 × 0,40 |

## Adaptaciones para el juego (previstas)
- Colisión simple: tablero y pretiles en 3–4 cajas inclinadas (COL_), con menos de 50 triángulos.
- En el juego, el paso se orienta a la calle real de la orilla; las orillas y el cauce de esta escena son solo referencia (REF).

## Entorno de trabajo (diferencias con el encargo)
- Blender 4.2.0 sin conector interactivo: se ejecuta por Python en modo sin ventana. Las «capturas del viewport» se sustituyen por renders rápidos en Eevee desde las cámaras de validación.
- HDRI CC0: sin acceso a internet para descargar recursos, se usa un fondo gris neutro de intensidad 1 (equivalente para validar).
- El juego usa three.js r180 (no r128), así que los límites de r128 (8 shape keys, sin Draco o Meshopt) son conservadores.

## Fuentes
- Valle de Salazar · Arte y patrimonio: https://www.valledesalazar.com/valle-de-salazar/arte-y-patrimonio/
- MonumentalNet · Puente medieval de Ochagavía: https://www.monumentalnet.org/monumento.php?r=NA-185000400-OCH-OTS-PTE-MED-OCH
- Discover Navarra · Ochagavía: https://discovernavarra.com/en/ochagavia/
(Las páginas no se han podido abrir desde este entorno porque la red las bloquea; los datos proceden de los extractos de búsqueda. Pendiente de contrastar con IDENA.)
