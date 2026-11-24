// HERRIZHERRI · La cámara que sigue al explorador desde detrás y algo por encima, como en el juego web.
// Arrastrando con el ratón (o con la palanca derecha) se gira alrededor; la rueda acerca y aleja. Si una pared se mete
// entre la cámara y el explorador, la cámara se acerca para no quedarse detrás de la pared.
using UnityEngine;

namespace Herrizherri
{
    public class CamaraSeguir : MonoBehaviour
    {
        public Transform objetivo;
        public float distancia = 5.5f, minimo = 2f, maximo = 14f;
        public float altura = 1.25f, sensibilidad = 0.2f;
        [Range(-10f, 80f)] public float inclinacion = 16f;
        public float giro;

        float dist;

        void Start()
        {
            dist = distancia;
            if (objetivo != null) giro = objetivo.eulerAngles.y;
        }

        void LateUpdate()
        {
            if (objetivo == null) return;
            Vector2 d = Entrada.Mirar();
            giro += d.x * sensibilidad;
            inclinacion = Mathf.Clamp(inclinacion - d.y * sensibilidad, -10f, 80f);
            distancia = Mathf.Clamp(distancia - Entrada.Zoom() * 0.8f, minimo, maximo);

            Vector3 centro = objetivo.position + Vector3.up * altura;
            Quaternion q = Quaternion.Euler(inclinacion, giro, 0f);
            Vector3 atras = q * Vector3.back;
            float quiere = distancia;
            // (sin meterse detrás de las paredes ni bajo el suelo; las capas «Ignore Raycast» no cuentan)
            if (Physics.SphereCast(centro, 0.25f, atras, out RaycastHit hit, distancia, ~(1 << 2), QueryTriggerInteraction.Ignore))
                quiere = Mathf.Max(0.6f, hit.distance - 0.1f);
            dist = quiere < dist ? quiere : Mathf.Lerp(dist, quiere, 1f - Mathf.Exp(-4f * Time.deltaTime));
            transform.SetPositionAndRotation(centro + atras * dist, q);
        }
    }
}
