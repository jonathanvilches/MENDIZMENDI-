// HERRIZHERRI · Los mandos, en un solo sitio (teclado, ratón y mando de consola)
// Funciona con el «Input System» nuevo de Unity si el proyecto lo tiene, y si no con el de siempre (Input Manager).
using UnityEngine;
#if ENABLE_INPUT_SYSTEM && HERRI_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

namespace Herrizherri
{
    public static class Entrada
    {
        /// <summary>Hacia dónde andar: x = derecha/izquierda, y = adelante/atrás (W A S D, flechas o la palanca izquierda).</summary>
        public static Vector2 Mover()
        {
            Vector2 v = Vector2.zero;
#if ENABLE_INPUT_SYSTEM && HERRI_INPUT_SYSTEM
            var k = Keyboard.current;
            if (k != null)
            {
                if (k.wKey.isPressed || k.upArrowKey.isPressed) v.y += 1f;
                if (k.sKey.isPressed || k.downArrowKey.isPressed) v.y -= 1f;
                if (k.dKey.isPressed || k.rightArrowKey.isPressed) v.x += 1f;
                if (k.aKey.isPressed || k.leftArrowKey.isPressed) v.x -= 1f;
            }
            if (Gamepad.current != null) v += Gamepad.current.leftStick.ReadValue();
#else
            if (!Viejo()) return v;
            if (Input.GetKey(KeyCode.W) || Input.GetKey(KeyCode.UpArrow)) v.y += 1f;
            if (Input.GetKey(KeyCode.S) || Input.GetKey(KeyCode.DownArrow)) v.y -= 1f;
            if (Input.GetKey(KeyCode.D) || Input.GetKey(KeyCode.RightArrow)) v.x += 1f;
            if (Input.GetKey(KeyCode.A) || Input.GetKey(KeyCode.LeftArrow)) v.x -= 1f;
            if (v == Vector2.zero) v = Palanca();
#endif
            return Vector2.ClampMagnitude(v, 1f);
        }

        /// <summary>Correr: Mayúsculas (o el botón de la palanca izquierda del mando).</summary>
        public static bool Correr()
        {
#if ENABLE_INPUT_SYSTEM && HERRI_INPUT_SYSTEM
            var k = Keyboard.current; var g = Gamepad.current;
            return (k != null && (k.leftShiftKey.isPressed || k.rightShiftKey.isPressed)) || (g != null && (g.leftStickButton.isPressed || g.leftTrigger.isPressed));
#else
            return Viejo() && (Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift) || Input.GetKey(KeyCode.JoystickButton8));
#endif
        }

        /// <summary>Cuánto girar la cámara este fotograma, en píxeles: arrastrando con el ratón (cualquier botón) o la palanca derecha.</summary>
        public static Vector2 Mirar()
        {
#if ENABLE_INPUT_SYSTEM && HERRI_INPUT_SYSTEM
            Vector2 v = Vector2.zero; var m = Mouse.current;
            if (m != null && (m.leftButton.isPressed || m.rightButton.isPressed)) v = m.delta.ReadValue();
            if (Gamepad.current != null) v += Gamepad.current.rightStick.ReadValue() * 600f * Time.unscaledDeltaTime;
            return v;
#else
            if (!Viejo()) return Vector2.zero;
            Vector2 p = Input.mousePosition, d = p - ultimoRaton;
            bool arrastra = Input.GetMouseButton(0) || Input.GetMouseButton(1), empieza = Input.GetMouseButtonDown(0) || Input.GetMouseButtonDown(1);
            ultimoRaton = p;
            return arrastra && !empieza ? d : Vector2.zero;
#endif
        }

        /// <summary>Acercar (+1) o alejar (-1) la cámara: la rueda del ratón.</summary>
        public static float Zoom()
        {
#if ENABLE_INPUT_SYSTEM && HERRI_INPUT_SYSTEM
            float y = Mouse.current != null ? Mouse.current.scroll.ReadValue().y : 0f;
#else
            float y = Viejo() ? Input.mouseScrollDelta.y : 0f;
#endif
            return Mathf.Abs(y) < 0.01f ? 0f : Mathf.Sign(y);
        }

        /// <summary>Tecla pulsada en este fotograma (F para volar, R para volver al principio).</summary>
        public static bool Pulsa(char letra)
        {
#if ENABLE_INPUT_SYSTEM && HERRI_INPUT_SYSTEM
            var k = Keyboard.current;
            if (k == null) return false;
            switch (char.ToLowerInvariant(letra))
            {
                case 'f': return k.fKey.wasPressedThisFrame;
                case 'r': return k.rKey.wasPressedThisFrame;
                case 'h': return k.hKey.wasPressedThisFrame;
                default: return false;
            }
#else
            return Viejo() && Input.GetKeyDown(char.ToLowerInvariant(letra).ToString());
#endif
        }

        /// <summary>Subir (+1) o bajar (-1) al volar: E y Q.</summary>
        public static float Subir()
        {
#if ENABLE_INPUT_SYSTEM && HERRI_INPUT_SYSTEM
            var k = Keyboard.current;
            return k == null ? 0f : (k.eKey.isPressed ? 1f : 0f) - (k.qKey.isPressed ? 1f : 0f);
#else
            return Viejo() ? (Input.GetKey(KeyCode.E) ? 1f : 0f) - (Input.GetKey(KeyCode.Q) ? 1f : 0f) : 0f;
#endif
        }

#if !(ENABLE_INPUT_SYSTEM && HERRI_INPUT_SYSTEM)
        static Vector2 ultimoRaton;
        static bool? viejo;
        static bool sinPalanca;

        // (si el proyecto solo tiene el Input System nuevo y no está su paquete, el de siempre no funciona: se avisa una vez)
        static bool Viejo()
        {
            if (viejo.HasValue) return viejo.Value;
            try { Input.GetKey(KeyCode.Space); viejo = true; }
            catch (System.InvalidOperationException)
            {
                viejo = false;
                Debug.LogWarning("HERRIZHERRI: los mandos no responden. En Edit → Project Settings → Player → Active Input Handling, elige «Both».");
            }
            return viejo.Value;
        }

        static Vector2 Palanca()
        {
            if (sinPalanca) return Vector2.zero;
            try
            {
                var v = new Vector2(Input.GetAxis("Horizontal"), Input.GetAxis("Vertical"));
                return v.sqrMagnitude > 0.04f ? v : Vector2.zero;
            }
            catch (System.ArgumentException) { sinPalanca = true; return Vector2.zero; }
        }
#endif
    }
}
