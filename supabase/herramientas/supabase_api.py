# -*- coding: utf-8 -*-
"""SIGAE — acceso a Supabase por la Management API, sin depender del conector de Claude.

Usa un token personal de Supabase (Account → Access Tokens) de una cuenta que sea miembro de la
organización de SHADOW. El token se guarda en UN archivo fuera del repositorio:
    <carpeta que contiene al repo>/.supabase-token.txt      (solo el token, una línea, empieza con sbp_)
o bien en la variable de entorno SUPABASE_ACCESS_TOKEN. NUNCA se pega en el chat ni se sube a git.

El proyecto se identifica por su ref, guardado en supabase/herramientas/proyecto.json ({"ref": "...", "org": "..."}).

Uso:
  python supabase_api.py orgs                                  -> organizaciones visibles
  python supabase_api.py proyectos                             -> proyectos visibles
  python supabase_api.py crear <org_slug> <nombre> <region>    -> crea el proyecto y guarda proyecto.json
  python supabase_api.py estado                                -> estado del proyecto
  python supabase_api.py llaves                                -> URL y llaves públicas (anon / publishable)
  python supabase_api.py migraciones                           -> migraciones aplicadas
  python supabase_api.py migrar <archivo.sql> [nombre]         -> aplica un archivo SQL como migración registrada
  python supabase_api.py sql "select ..."                      -> consulta directa (lectura o escritura)
  python supabase_api.py sql-archivo <archivo.sql>             -> ejecuta el SQL de un archivo
"""
import io, json, os, secrets, string, sys, urllib.request, urllib.error

AQUI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(AQUI))
TOKEN_FILE = os.path.join(os.path.dirname(REPO), ".supabase-token.txt")
PROYECTO_FILE = os.path.join(AQUI, "proyecto.json")
API = "https://api.supabase.com/v1"


def token():
    t = os.environ.get("SUPABASE_ACCESS_TOKEN", "").strip()
    if not t and os.path.exists(TOKEN_FILE):
        t = io.open(TOKEN_FILE, encoding="utf-8").read().strip()
    if not t:
        sys.exit("Falta el token personal de Supabase: guárdalo en " + TOKEN_FILE + " o en SUPABASE_ACCESS_TOKEN.")
    if not t.startswith("sbp_"):
        sys.exit("El token no parece un token personal de Supabase (debe empezar con sbp_).")
    return t


def llamar(ruta, cuerpo=None, metodo=None):
    datos = None if cuerpo is None else json.dumps(cuerpo).encode("utf-8")
    metodo = metodo or ("POST" if cuerpo is not None else "GET")
    req = urllib.request.Request(API + ruta, data=datos, method=metodo,
                                 headers={"Authorization": "Bearer " + token(), "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            cuerpo = r.read().decode("utf-8")
            return json.loads(cuerpo) if cuerpo else None
    except urllib.error.HTTPError as e:
        sys.exit("ERROR %s en %s: %s" % (e.code, ruta, e.read().decode("utf-8", "replace")[:800]))


def proyecto():
    if not os.path.exists(PROYECTO_FILE):
        sys.exit("Falta " + PROYECTO_FILE + " (se crea con `crear` o a mano: {\"ref\": \"...\"}).")
    return json.load(io.open(PROYECTO_FILE, encoding="utf-8"))["ref"]


def mostrar(x):
    print(json.dumps(x, ensure_ascii=False, indent=1))


def main(a):
    if not a:
        sys.exit(__doc__)
    cmd = a[0]
    if cmd == "orgs":
        mostrar(llamar("/organizations"))
    elif cmd == "proyectos":
        mostrar([{k: p.get(k) for k in ("id", "name", "organization_id", "region", "status", "created_at")} for p in llamar("/projects")])
    elif cmd == "crear":
        org, nombre, region = a[1], a[2], a[3]
        # Contraseña fuerte generada aquí y NO guardada: SIGAE no la necesita (todo va por API, tablero y funciones).
        # Si algún día hace falta, se restablece desde Settings → Database.
        alfabeto = string.ascii_letters + string.digits
        clave = "".join(secrets.choice(alfabeto) for _ in range(32))
        r = llamar("/projects", {"organization_slug": org, "name": nombre, "region": region, "db_pass": clave})
        io.open(PROYECTO_FILE, "w", encoding="utf-8").write(json.dumps({"ref": r["id"], "org": org, "name": nombre, "region": region}, indent=1))
        mostrar({k: r.get(k) for k in ("id", "name", "region", "status")})
    elif cmd == "estado":
        mostrar(llamar("/projects/" + proyecto()))
    elif cmd == "llaves":
        ref = proyecto()
        llaves = llamar("/projects/%s/api-keys?reveal=false" % ref)
        publicas = [k for k in llaves if k.get("type") in ("publishable", "legacy") and k.get("name") in ("anon", "default") or k.get("type") == "publishable"]
        mostrar({"url": "https://%s.supabase.co" % ref, "llaves_publicas": [{"name": k.get("name"), "type": k.get("type"), "api_key": k.get("api_key")} for k in publicas]})
    elif cmd == "migraciones":
        mostrar(llamar("/projects/%s/database/migrations" % proyecto()))
    elif cmd == "migrar":
        archivo = a[1]
        nombre = a[2] if len(a) > 2 else os.path.splitext(os.path.basename(archivo))[0]
        sql = io.open(archivo, encoding="utf-8").read()
        mostrar(llamar("/projects/%s/database/migrations" % proyecto(), {"name": nombre, "query": sql}))
        print("Migración aplicada:", nombre)
    elif cmd == "sql":
        mostrar(llamar("/projects/%s/database/query" % proyecto(), {"query": " ".join(a[1:])}))
    elif cmd == "sql-archivo":
        mostrar(llamar("/projects/%s/database/query" % proyecto(), {"query": io.open(a[1], encoding="utf-8").read()}))
    else:
        sys.exit("Comando desconocido. " + __doc__)


if __name__ == "__main__":
    main(sys.argv[1:])
