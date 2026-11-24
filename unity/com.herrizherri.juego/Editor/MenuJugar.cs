// HERRIZHERRI · Menú «HERRIZHERRI → Jugar en un pueblo…»: elegir un pueblo exportado (exportar/pueblos/<pueblo>.glb),
// y Unity prepara la escena (Assets/Escenas/Pueblo.unity) con JuegoPueblo y pulsa Play solo.
// «HERRIZHERRI → Jugar con la exploradora» cambia el personaje (como elegir chico o chica en el juego web).
using System;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Herrizherri.Editor
{
    public static class MenuJugar
    {
        const string Chica = "HERRIZHERRI.exploradora", Ultimo = "HERRIZHERRI.pueblo", Escena = "Assets/Escenas/Pueblo.unity";

        [MenuItem("HERRIZHERRI/Jugar en un pueblo…", false, 0)]
        public static void Jugar()
        {
            if (EditorApplication.isPlaying) { EditorApplication.isPlaying = false; return; }
            string inicio = Carpeta();
            string f = EditorUtility.OpenFilePanel("Elige un pueblo", inicio, "glb");
            if (string.IsNullOrEmpty(f)) return;
            EditorPrefs.SetString(Ultimo, f);
            Empezar(f);
        }

        [MenuItem("HERRIZHERRI/Jugar otra vez en el último pueblo", false, 1)]
        public static void OtraVez()
        {
            string f = EditorPrefs.GetString(Ultimo, "");
            if (File.Exists(f)) Empezar(f); else Jugar();
        }

        [MenuItem("HERRIZHERRI/Jugar con la exploradora", false, 20)]
        public static void CambiarPersonaje() => EditorPrefs.SetBool(Chica, !EditorPrefs.GetBool(Chica, false));

        [MenuItem("HERRIZHERRI/Jugar con la exploradora", true)]
        static bool MarcaPersonaje()
        {
            Menu.SetChecked("HERRIZHERRI/Jugar con la exploradora", EditorPrefs.GetBool(Chica, false));
            return !EditorApplication.isPlaying;
        }

        static void Empezar(string pueblo)
        {
            if (!EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo()) return;
            Scene escena = EditorSceneManager.NewScene(NewSceneSetup.DefaultGameObjects, NewSceneMode.Single);
            var juego = new GameObject("HERRIZHERRI").AddComponent<JuegoPueblo>();
            juego.pueblo = pueblo;
            juego.personaje = Personaje();
            Directory.CreateDirectory(Path.GetDirectoryName(Escena));
            EditorSceneManager.SaveScene(escena, Escena);
            EditorApplication.isPlaying = true;
        }

        // (el explorador o la exploradora del juego, que viajan con el paquete en Modelos~)
        static string Personaje()
        {
            string nombre = EditorPrefs.GetBool(Chica, false) ? "exploradora.glb" : "explorador.glb";
            var info = UnityEditor.PackageManager.PackageInfo.FindForAssembly(typeof(MenuJugar).Assembly);
            string paquete = info != null ? info.resolvedPath : Path.Combine(Repositorio.Buscar() ?? "", "unity", "com.herrizherri.juego");
            return Path.Combine(paquete, "Modelos~", nombre);
        }

        // (donde están los pueblos exportados; si aún no hay, la carpeta de Descargas, por si están en el .zip)
        static string Carpeta()
        {
            string repo = Repositorio.Buscar();
            if (repo != null)
            {
                string p = Path.Combine(repo, "exportar", "pueblos");
                if (Directory.Exists(p)) return p;
            }
            string casa = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), descargas = Path.Combine(casa, "Downloads");
            return Directory.Exists(descargas) ? descargas : casa;
        }
    }

    /// <summary>La carpeta del juego (la que tiene PORTAR.md), subiendo desde el proyecto de Unity (unity/HERRIZHERRI).</summary>
    public static class Repositorio
    {
        public static string Buscar()
        {
            var d = new DirectoryInfo(Application.dataPath);
            while (d != null)
            {
                if (File.Exists(Path.Combine(d.FullName, "PORTAR.md"))) return d.FullName;
                d = d.Parent;
            }
            return null;
        }
    }
}
