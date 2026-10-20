#!/bin/bash
# Corre las pruebas del esquema contra un Postgres local (crea y borra la base "todomas_pruebas").
# Uso: PSQL="psql -h 127.0.0.1 -p 5432 -U postgres" ./correr.sh
set -e
cd "$(dirname "$0")"
PSQL=${PSQL:-psql}
$PSQL -qc "drop database if exists todomas_pruebas" -c "create database todomas_pruebas"
P="$PSQL -d todomas_pruebas -v ON_ERROR_STOP=1 -q"
$P -f 00_imitacion_supabase.sql > /dev/null 2>&1
sed -e 's/^create extension.*$/-- (extension omitida en la prueba)/' ../01_esquema.sql | $P > /dev/null 2>&1
$P -f 05_permisos.sql
for f in 10_privacidad.sql 20_programadas.sql; do
  $P -f "$f" 2>&1 | grep -E "OK|ERROR|FALLO" | sed 's/^psql:[^ ]* //; s/NOTICE:  //'
done
$PSQL -qc "drop database todomas_pruebas"
