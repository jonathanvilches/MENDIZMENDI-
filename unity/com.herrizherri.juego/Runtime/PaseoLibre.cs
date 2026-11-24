// HERRIZHERRI · Volar por el pueblo con la cámara (tecla F mientras se juega; ver unity/LEEME.md)
// W A S D o las flechas para moverse, arrastrar con el ratón para mirar, Mayúsculas para ir rápido y E / Q para subir y
// bajar. Para ver lo exportado del juego desde cualquier sitio; con F otra vez se vuelve al explorador.
using UnityEngine;

namespace Herrizherri
{
    public class PaseoLibre : MonoBehaviour
    {
        public float velocidad = 10f, rapido = 40f, sensibilidad = 0.15f;
        float yaw, pitch;

        void OnEnable()
        {
            Vector3 e = transform.eulerAngles;
            yaw = e.y; pitch = e.x > 180f ? e.x - 360f : e.x;
        }

        void Update()
        {
            Vector2 m = Entrada.Mover(), raton = Entrada.Mirar();
            if (raton != Vector2.zero)
            {
                yaw += raton.x * sensibilidad;
                pitch = Mathf.Clamp(pitch - raton.y * sensibilidad, -89f, 89f);
                transform.rotation = Quaternion.Euler(pitch, yaw, 0f);
            }
            Vector3 dir = transform.TransformDirection(new Vector3(m.x, 0f, m.y)) + Vector3.up * Entrada.Subir();
            transform.position += Vector3.ClampMagnitude(dir, 1f) * (Entrada.Correr() ? rapido : velocidad) * Time.deltaTime;
        }
    }
}
