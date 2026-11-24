// HERRIZHERRI · El explorador (o la exploradora): anda, corre, cae por las cuestas y no atraviesa las casas.
// Se mueve hacia donde mira la cámara, como en el juego web, y pone su animación: «Breathe» quieto, «Walk» andando y
// «Run» corriendo (las del modelo de Meshy del juego, src/assets/meshy, que glTFast trae como animaciones «Legacy»).
using UnityEngine;

namespace Herrizherri
{
    [RequireComponent(typeof(CharacterController))]
    public class Explorador : MonoBehaviour
    {
        [Tooltip("Metros por segundo andando y corriendo")]
        public float andar = 2.2f, correr = 5.2f;
        public float gravedad = 20f;
        [Tooltip("La cámara que le sigue (para saber hacia dónde es «adelante»)")]
        public Transform camara;
        [Tooltip("Las animaciones del modelo (las pone JuegoPueblo al cargarlo)")]
        public Animation animaciones;

        CharacterController cc;
        Vector3 salida; Quaternion giroSalida;
        float vy, sueloMin = float.NegativeInfinity;
        string actual;

        void Awake()
        {
            cc = GetComponent<CharacterController>();
            salida = transform.position; giroSalida = transform.rotation;
        }

        /// <summary>Por debajo de esta altura se ha caído del pueblo: vuelve al principio.</summary>
        public void LimiteCaida(float y) => sueloMin = y;

        public void VolverAlPrincipio()
        {
            cc.enabled = false; transform.SetPositionAndRotation(salida, giroSalida); cc.enabled = true; vy = 0f;
        }

        void Update()
        {
            float dt = Time.deltaTime;
            Vector2 m = Entrada.Mover();
            bool corre = Entrada.Correr();
            Vector3 adelante = camara != null ? Vector3.ProjectOnPlane(camara.forward, Vector3.up) : transform.forward;
            if (adelante.sqrMagnitude < 1e-4f) adelante = transform.forward;
            adelante.Normalize();
            Vector3 derecha = Vector3.Cross(Vector3.up, adelante);
            Vector3 dir = adelante * m.y + derecha * m.x;
            float fuerza = Mathf.Clamp01(dir.magnitude);
            if (fuerza > 0.05f)
            {
                dir /= dir.magnitude;
                transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(dir), 1f - Mathf.Exp(-12f * dt));
            }
            else dir = Vector3.zero;

            if (cc.isGrounded && vy < 0f) vy = -2f;
            vy -= gravedad * dt;
            float vel = (corre ? correr : andar) * fuerza;
            cc.Move((dir * vel + Vector3.up * vy) * dt);

            if (transform.position.y < sueloMin || Entrada.Pulsa('r')) VolverAlPrincipio();
            Pose(fuerza < 0.05f ? "Breathe" : corre ? "Run" : "Walk");
        }

        // (al volar con la cámara, se queda quieto respirando)
        void OnDisable() => Pose("Breathe");

        void Pose(string clip)
        {
            if (clip == actual || animaciones == null) return;
            if (animaciones[clip] == null) return;
            animaciones[clip].wrapMode = WrapMode.Loop;
            animaciones.CrossFade(clip, 0.2f);
            actual = clip;
        }
    }
}
