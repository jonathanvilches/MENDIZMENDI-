// HERRIZHERRI · Pasear por un pueblo en Unity (ver unity/LEEME.md)
// En la cámara: al pulsar Play, W A S D (o las flechas) para moverse, botón derecho del ratón para mirar, Mayúsculas para
// ir rápido y E / Q para subir y bajar. Es solo para ver lo exportado del juego; el personaje y las misiones llegan
// cuando se pase la lógica a C# (PORTAR.md, fases 1 y 2).
using UnityEngine;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

namespace Herrizherri
{
    public class PaseoLibre : MonoBehaviour
    {
        public float velocidad = 8f, rapido = 30f, sensibilidad = 0.15f;
        float yaw, pitch;

        void Start()
        {
            Vector3 e = transform.eulerAngles;
            yaw = e.y; pitch = e.x > 180f ? e.x - 360f : e.x;
        }

        void Update()
        {
            Vector3 dir = Vector3.zero; Vector2 raton = Vector2.zero; bool mirar = false, corre = false;
#if ENABLE_INPUT_SYSTEM
            Keyboard k = Keyboard.current; Mouse m = Mouse.current;
            if (k != null)
            {
                if (k.wKey.isPressed || k.upArrowKey.isPressed) dir.z += 1f;
                if (k.sKey.isPressed || k.downArrowKey.isPressed) dir.z -= 1f;
                if (k.dKey.isPressed || k.rightArrowKey.isPressed) dir.x += 1f;
                if (k.aKey.isPressed || k.leftArrowKey.isPressed) dir.x -= 1f;
                if (k.eKey.isPressed) dir.y += 1f;
                if (k.qKey.isPressed) dir.y -= 1f;
                corre = k.leftShiftKey.isPressed;
            }
            if (m != null) { mirar = m.rightButton.isPressed; raton = m.delta.ReadValue(); }
#else
            dir.x = Input.GetAxisRaw("Horizontal"); dir.z = Input.GetAxisRaw("Vertical");
            if (Input.GetKey(KeyCode.E)) dir.y += 1f;
            if (Input.GetKey(KeyCode.Q)) dir.y -= 1f;
            corre = Input.GetKey(KeyCode.LeftShift); mirar = Input.GetMouseButton(1);
            raton = new Vector2(Input.GetAxis("Mouse X"), Input.GetAxis("Mouse Y")) * 10f;
#endif
            if (mirar)
            {
                yaw += raton.x * sensibilidad;
                pitch = Mathf.Clamp(pitch - raton.y * sensibilidad, -89f, 89f);
                transform.rotation = Quaternion.Euler(pitch, yaw, 0f);
            }
            transform.position += transform.TransformDirection(dir.normalized) * (corre ? rapido : velocidad) * Time.deltaTime;
        }
    }
}
