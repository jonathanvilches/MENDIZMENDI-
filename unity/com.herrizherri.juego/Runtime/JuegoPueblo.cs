// HERRIZHERRI · Jugar en un pueblo en Unity: carga el pueblo exportado del juego web (exportar/pueblos/<pueblo>.glb, con
// npm run exportar:pueblos), le pone suelo y paredes, y deja al explorador donde le deja el juego al entrar, con su cámara.
// Lo pone el menú HERRIZHERRI → Jugar en un pueblo… (Editor/MenuJugar.cs), que guarda la escena y pulsa Play.
// Los .glb se leen con glTFast (com.unity.cloud.gltfast) al empezar, sin meterlos en Assets: un pueblo pesa 100-200 MB.
// Medidas del juego: 1 unidad = 1 metro, Y hacia arriba. Ver unity/LEEME.md y PORTAR.md.
using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using GLTFast;
using UnityEngine;
using UnityEngine.Rendering;

namespace Herrizherri
{
    public class JuegoPueblo : MonoBehaviour
    {
        [Tooltip("El pueblo: un .glb de exportar/pueblos (npm run exportar:pueblos)")]
        public string pueblo;
        [Tooltip("El personaje: explorador.glb o exploradora.glb (en el paquete, carpeta Modelos~)")]
        public string personaje;
        [Tooltip("Altura del personaje en metros (en el juego es un chaval, más bajo que los adultos)")]
        public float altura = 1.4f;

        const int SinRayos = 2;   // (capa «Ignore Raycast»: el explorador, para que la cámara y los rayos no le choquen)
        readonly List<GltfImport> importados = new List<GltfImport>();
        string aviso = "", nombre = "";
        bool listo;
        float ayudaHasta;
        Camera cam;
        Explorador explorador;
        CamaraSeguir sigue;
        PaseoLibre vuela;
        GUIStyle letra;
        Texture2D velo;

        async void Start()
        {
            nombre = Nombre(pueblo);
            cam = Camera.main;
            if (cam == null) { cam = new GameObject("Main Camera", typeof(Camera)).GetComponent<Camera>(); cam.tag = "MainCamera"; }
            cam.nearClipPlane = 0.1f; cam.farClipPlane = 6000f;
            Ambiente();
            try
            {
                if (string.IsNullOrEmpty(pueblo) || !File.Exists(pueblo))
                {
                    aviso = "No encuentro el pueblo. Usa el menú HERRIZHERRI → Jugar en un pueblo… y elige un .glb de exportar/pueblos.";
                    return;
                }
                aviso = $"Cargando {nombre}…";
                Transform raiz = await Cargar(pueblo, nombre, false);
                if (raiz == null) { aviso = $"No he podido abrir {Path.GetFileName(pueblo)} (mira la consola)."; return; }
                aviso = "Poniendo el suelo y las paredes…";
                Pose salida = Salida(raiz, out Bounds caja);
                await Colisiones(raiz);
                salida = AlSuelo(salida);
                aviso = "Llega el explorador…";
                await Personaje(salida, caja);
                aviso = ""; listo = true; ayudaHasta = Time.time + 15f;
            }
            catch (Exception e)
            {
                Debug.LogException(e);
                aviso = "Algo ha fallado al cargar (mira la consola).";
            }
        }

        void Update()
        {
            if (!listo) return;
            if (Entrada.Pulsa('h')) ayudaHasta = ayudaHasta > Time.time ? 0f : float.MaxValue;
            if (Entrada.Pulsa('f'))
            {
                if (vuela == null) { vuela = cam.gameObject.AddComponent<PaseoLibre>(); vuela.enabled = false; }
                bool volar = !vuela.enabled;
                sigue.enabled = !volar; explorador.enabled = !volar; vuela.enabled = volar;
            }
        }

        void OnDestroy()
        {
            foreach (var g in importados) g.Dispose();
            importados.Clear();
            if (velo != null) Destroy(velo);
        }

        // ── Cargar un .glb (el pueblo sin luces ni cámaras: las pone Unity; el personaje con sus animaciones) ──
        async Task<Transform> Cargar(string ruta, string nombreRaiz, bool animaciones)
        {
            var g = new GltfImport();
            importados.Add(g);
            var ajustes = new ImportSettings
            {
                NodeNameMethod = NameImportMethod.Original,
                AnimationMethod = animaciones ? AnimationMethod.Legacy : AnimationMethod.None,
                GenerateMipMaps = true,
                AnisotropicFilterLevel = 8,
            };
            string llena = Path.GetFullPath(ruta);
            if (!await g.LoadFile(llena, new Uri(llena), ajustes)) return null;
            var raiz = new GameObject(nombreRaiz).transform;
            var inst = new GameObjectInstantiator(g, raiz, null, new InstantiationSettings
            {
                Mask = ComponentType.Mesh | ComponentType.Animation,
                SceneObjectCreation = SceneObjectCreation.Never,
            });
            if (!await g.InstantiateMainSceneAsync(inst)) { Destroy(raiz.gameObject); return null; }
            return raiz;
        }

        // ── Suelo y paredes: una malla de choque en cada pieza que no sea diminuta (flores, piedrecillas) ──
        async Task Colisiones(Transform raiz)
        {
            int n = 0;
            foreach (var mf in raiz.GetComponentsInChildren<MeshFilter>())
            {
                Mesh m = mf.sharedMesh;
                var r = mf.GetComponent<Renderer>();
                if (m == null || m.vertexCount < 3 || r == null || !r.enabled) continue;
                Vector3 s = r.bounds.size;
                if (Mathf.Max(s.x, Mathf.Max(s.y, s.z)) < 0.4f) continue;
                mf.gameObject.AddComponent<MeshCollider>().sharedMesh = m;
                if (++n % 150 == 0) await Task.Yield();
            }
        }

        // ── Dónde empieza: donde el juego deja al explorador al entrar (va en el .glb, con su material «Explorador»);
        // si no está, en las afueras, a unos 60 m del centro, mirando al pueblo ──
        Pose Salida(Transform raiz, out Bounds caja)
        {
            caja = new Bounds(Vector3.zero, Vector3.one);
            bool hay = false;
            foreach (var r in raiz.GetComponentsInChildren<Renderer>())
            {
                if (!hay) { caja = r.bounds; hay = true; } else caja.Encapsulate(r.bounds);
            }
            foreach (var r in raiz.GetComponentsInChildren<SkinnedMeshRenderer>(true))
            {
                bool esEl = false;
                foreach (var mat in r.sharedMaterials) if (mat != null && mat.name.StartsWith("Explorador")) esEl = true;
                if (!esEl) continue;
                Transform t = r.transform;
                while (t.parent != null && t.parent != raiz) t = t.parent;
                Bounds b = r.bounds;
                Vector3 p = new Vector3(b.center.x, b.min.y, b.center.z);
                Vector3 f = Vector3.ProjectOnPlane(t.forward, Vector3.up);
                t.gameObject.SetActive(false);   // (el de la escena exportada: el que se mueve es el nuestro)
                return new Pose(p, f.sqrMagnitude > 1e-4f ? Quaternion.LookRotation(f) : Quaternion.identity);
            }
            return new Pose(new Vector3(0f, caja.max.y + 10f, -60f), Quaternion.identity);
        }

        Pose AlSuelo(Pose p)
        {
            if (Physics.Raycast(p.position + Vector3.up * 3f, Vector3.down, out RaycastHit h, 50f, ~(1 << SinRayos), QueryTriggerInteraction.Ignore))
                return new Pose(h.point, p.rotation);
            // (sin explorador en el .glb: entre los puntos llanos alrededor del centro, el de altura mediana)
            var llanos = new List<Vector3>();
            foreach (float radio in new[] { 60f, 90f, 40f })
            {
                for (int i = 0; i < 24; i++)
                {
                    float a = i * Mathf.PI * 2f / 24f;
                    var desde = new Vector3(Mathf.Cos(a) * radio, 3000f, Mathf.Sin(a) * radio);
                    if (Physics.Raycast(desde, Vector3.down, out h, 6000f, ~(1 << SinRayos), QueryTriggerInteraction.Ignore) && h.normal.y > 0.85f) llanos.Add(h.point);
                }
                if (llanos.Count >= 6) break;
            }
            if (llanos.Count == 0) return p;
            llanos.Sort((x, y) => x.y.CompareTo(y.y));
            Vector3 q = llanos[llanos.Count / 2], alCentro = Vector3.ProjectOnPlane(-q, Vector3.up);
            return new Pose(q, alCentro.sqrMagnitude > 1e-4f ? Quaternion.LookRotation(alCentro) : Quaternion.identity);
        }

        // ── El explorador: su modelo con animaciones, a su talla, con los pies en el suelo, y la cámara detrás ──
        async Task Personaje(Pose salida, Bounds caja)
        {
            var go = new GameObject("Explorador") { layer = SinRayos };
            go.transform.SetPositionAndRotation(salida.position + Vector3.up * 0.05f, salida.rotation);
            var cc = go.AddComponent<CharacterController>();
            cc.height = altura; cc.radius = Mathf.Max(0.18f, altura * 0.16f);
            cc.center = Vector3.up * (altura * 0.5f + 0.03f);
            cc.stepOffset = 0.35f; cc.slopeLimit = 50f; cc.skinWidth = 0.03f; cc.minMoveDistance = 0f;

            Animation anim = null;
            Transform modelo = !string.IsNullOrEmpty(personaje) && File.Exists(personaje) ? await Cargar(personaje, "Modelo", true) : null;
            if (modelo != null)
            {
                modelo.SetParent(go.transform, false);
                anim = modelo.GetComponentInChildren<Animation>();
                if (anim != null && anim["Breathe"] != null) { anim.Play("Breathe"); anim.Sample(); }
                Bounds b = Medir(modelo);
                if (b.size.y > 1e-3f)
                {
                    modelo.localScale *= altura / b.size.y;
                    b = Medir(modelo);
                    Vector3 pie = go.transform.position;
                    modelo.position += new Vector3(pie.x - b.center.x, pie.y - b.min.y, pie.z - b.center.z);
                }
                foreach (var r in modelo.GetComponentsInChildren<SkinnedMeshRenderer>(true)) r.updateWhenOffscreen = true;
            }
            else
            {
                // (sin el modelo: una cápsula de su talla, para poder andar igual)
                var c = GameObject.CreatePrimitive(PrimitiveType.Capsule);
                Destroy(c.GetComponent<Collider>());
                c.transform.SetParent(go.transform, false);
                c.transform.localScale = new Vector3(0.45f, altura * 0.5f, 0.45f);
                c.transform.localPosition = Vector3.up * altura * 0.5f;
            }
            foreach (var t in go.GetComponentsInChildren<Transform>(true)) t.gameObject.layer = SinRayos;

            sigue = cam.gameObject.AddComponent<CamaraSeguir>();
            sigue.objetivo = go.transform;
            explorador = go.AddComponent<Explorador>();
            explorador.camara = cam.transform;
            explorador.animaciones = anim;
            explorador.LimiteCaida(caja.min.y - 30f);
        }

        // (lo que ocupa de verdad, con la postura de la animación: las mallas con huesos se «hornean» para medirlas)
        static Bounds Medir(Transform t)
        {
            bool hay = false; Bounds b = default;
            var tmp = new Mesh();
            foreach (var r in t.GetComponentsInChildren<Renderer>())
            {
                if (r is SkinnedMeshRenderer s)
                {
                    s.BakeMesh(tmp, true);
                    Matrix4x4 m = Matrix4x4.TRS(s.transform.position, s.transform.rotation, Vector3.one);
                    foreach (Vector3 v in tmp.vertices)
                    {
                        Vector3 w = m.MultiplyPoint3x4(v);
                        if (!hay) { b = new Bounds(w, Vector3.zero); hay = true; } else b.Encapsulate(w);
                    }
                }
                else if (!hay) { b = r.bounds; hay = true; }
                else b.Encapsulate(r.bounds);
            }
            Destroy(tmp);
            return b;
        }

        // ── Luz de media mañana, cielo y algo de bruma a lo lejos, como en el juego ──
        static void Ambiente()
        {
            Light sol = null;
            foreach (var l in Light.GetLights(LightType.Directional, 0)) { sol = l; break; }
            if (sol == null) { sol = new GameObject("Sol").AddComponent<Light>(); sol.type = LightType.Directional; }
            sol.color = new Color(1f, 0.9f, 0.78f);
            sol.intensity = 1.25f;
            sol.shadows = LightShadows.Soft;
            sol.transform.rotation = Quaternion.Euler(42f, -35f, 0f);
            RenderSettings.sun = sol;
            QualitySettings.shadowDistance = 150f;
            RenderSettings.ambientMode = AmbientMode.Trilight;
            RenderSettings.ambientSkyColor = new Color(0.62f, 0.70f, 0.82f);
            RenderSettings.ambientEquatorColor = new Color(0.56f, 0.57f, 0.52f);
            RenderSettings.ambientGroundColor = new Color(0.32f, 0.28f, 0.24f);
            RenderSettings.fog = true;
            RenderSettings.fogMode = FogMode.Linear;
            RenderSettings.fogStartDistance = 300f;
            RenderSettings.fogEndDistance = 5000f;
            RenderSettings.fogColor = new Color(0.74f, 0.81f, 0.89f);
        }

        static string Nombre(string ruta)
        {
            if (string.IsNullOrEmpty(ruta)) return "el pueblo";
            string n = Path.GetFileNameWithoutExtension(ruta).Replace('-', ' ');
            return n.Length > 0 ? char.ToUpperInvariant(n[0]) + n.Substring(1) : n;
        }

        // ── Lo que se lee en pantalla: el aviso mientras carga y, al empezar, cómo se juega ──
        void OnGUI()
        {
            if (letra == null)
            {
                velo = new Texture2D(1, 1); velo.SetPixel(0, 0, new Color(0f, 0f, 0f, 0.55f)); velo.Apply();
                letra = new GUIStyle(GUI.skin.label) { wordWrap = true, richText = true };
                letra.normal.textColor = Color.white;
                letra.normal.background = velo;
            }
            float u = Mathf.Max(13f, Screen.height / 40f);
            letra.fontSize = Mathf.RoundToInt(u);
            letra.padding = new RectOffset((int)u, (int)u, (int)(u * 0.6f), (int)(u * 0.6f));
            if (!string.IsNullOrEmpty(aviso))
            {
                letra.alignment = TextAnchor.MiddleCenter;
                float w = Mathf.Min(Screen.width - 2f * u, u * 34f);
                GUI.Label(new Rect((Screen.width - w) / 2f, Screen.height / 2f - u * 2f, w, u * 4f), aviso, letra);
            }
            else if (listo && Time.time < ayudaHasta)
            {
                letra.alignment = TextAnchor.MiddleLeft;
                string t = "<b>W A S D</b> o flechas: andar · <b>Mayúsculas</b>: correr\n" +
                           "Arrastra con el ratón: mirar · <b>rueda</b>: acercar\n" +
                           "<b>F</b>: volar · <b>R</b>: volver a la entrada · <b>H</b>: esta ayuda";
                float w = Mathf.Min(Screen.width - 2f * u, u * 26f);
                GUI.Label(new Rect(u, Screen.height - u * 6.2f, w, u * 5.2f), t, letra);
            }
        }
    }
}
