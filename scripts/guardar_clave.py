"""Guarda en config.js la clave pública de Supabase que tengas copiada.

Uso: copia la "Publishable key" (Project Settings → API Keys) y corre
    python3 scripts/guardar_clave.py
Se niega a guardar claves secretas (sb_secret_… o service_role).
"""
import base64
import json
import re
import subprocess
import sys
from pathlib import Path

clave = subprocess.run(["pbpaste"], capture_output=True, text=True).stdout.strip()


def es_service_role(k):
    try:
        cuerpo = k.split(".")[1]
        datos = json.loads(base64.urlsafe_b64decode(cuerpo + "=" * (-len(cuerpo) % 4)))
        return datos.get("role") == "service_role"
    except Exception:
        return False


if clave.startswith("sb_secret_") or es_service_role(clave):
    sys.exit("✋ Eso es una clave SECRETA: no va en la página. Copia la 'Publishable key' (sb_publishable_…).")
if not (clave.startswith("sb_publishable_") or clave.startswith("eyJ")):
    sys.exit("No reconozco lo copiado como clave de Supabase. Copia la 'Publishable key' y vuelve a correrlo.")

ruta = Path(__file__).resolve().parent.parent / "config.js"
texto = ruta.read_text()
nuevo, n = re.subn(r"supabaseKey: '[^']*'", f"supabaseKey: '{clave}'", texto)
if n != 1:
    sys.exit("No encontré la línea supabaseKey en config.js.")
ruta.write_text(nuevo)
print(f"✅ Clave pública guardada en config.js ({clave[:18]}…)")
