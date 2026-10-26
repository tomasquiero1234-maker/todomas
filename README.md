# TODOmás

Pendientes y pedidos del equipo, en orden. Los banqueros llevan sus propios pendientes y le agendan pedidos a Tomás. Todos ven la cola de Tomás ("vas 3º"), pero el detalle de cada pedido solo lo ven quien lo pidió, Tomás y las personas a quienes se lo compartan. Los pendientes privados no los ve nadie más, ni siquiera el administrador.

- **Página:** HTML y JavaScript, sin nada que instalar. Se publica gratis en GitHub Pages.
- **Datos:** Supabase, también gratis. Ahí viven la base de datos, el login, los archivos adjuntos y los avisos programados.
- **Privacidad:** la aplica la base de datos (reglas RLS), no la pantalla. Aunque alguien sepa programar, no puede saltársela desde el navegador.

---

## Probarla sin configurar nada (modo demo)

Con `config.js` vacío, la app abre en **modo demo**: trae datos de ejemplo guardados solo en tu navegador y te deja entrar como Tomás, Karime o los banqueros para ver qué ve cada uno.

```bash
cd ~/Claude/todomas && python3 -m http.server 8771
```

Después abre http://localhost:8771. Una vez publicada, también puedes ver la demo agregando `?demo` al final del link.

---

## Puesta en marcha (una sola vez, unos 30 minutos)

### 1. Crear el proyecto en Supabase
1. Entra a https://supabase.com y crea una cuenta gratis.
2. Crea un proyecto nuevo con nombre `todomas` y región **South America (São Paulo)**.

### 2. Crear la base de datos
1. En Supabase abre **SQL Editor → New query**.
2. Pega todo el contenido de `supabase/01_esquema.sql` y toca **Run**.
   - Si da un error sobre `pg_cron` o `pg_net`, ve a **Database → Extensions**, activa las dos y vuelve a correrlo.
3. Abre `supabase/02_configuracion.sql`, cambia los 4 valores marcados con `<<<` y córrelo igual. Esos valores son:
   - la URL del proyecto (**Project Settings → API**);
   - la URL que tendrá la app en GitHub Pages (paso 6);
   - tu correo del banco;
   - tu nombre.

### 3. Configurar el login
En **Authentication**:
1. **Sign In / Providers → Email:** deja Email activado y **desactiva "Confirm email"**. Solo pueden registrarse los correos que invites, así que no hace falta confirmar.
2. **URL Configuration:** en *Site URL* y en *Redirect URLs* pon la URL de la app, por ejemplo `https://tomasquiero1234-maker.github.io/todomas/`.

### 4. Cuenta que manda los avisos (opcional)
Los emails están **apagados** desde `supabase/04_emails_apagados.sql`. Mientras sigan así, los avisos llegan solo a la campana de la app. Para prenderlos, carga los secrets del paso 5 y corre esto en el SQL Editor:

```sql
update public.app_config set value = 'true' where key = 'emails_enabled';
```

Sirve cualquier correo que permita "contraseñas de aplicación" y SMTP por el puerto 465. Supabase bloquea el 587, así que Outlook e iCloud no sirven.

- **Yahoo (recomendado):** crea una cuenta, por ejemplo `tu-cuenta@yahoo.com`. Después ve a *Account security → Generate app password* y crea una con el nombre `TODOmás`.
- **Gmail:** activa la verificación en 2 pasos y crea la contraseña de aplicación en https://myaccount.google.com/apppasswords.

Guarda la contraseña de aplicación en el Llavero y no la pegues en ningún chat. Después, en Supabase, **Authentication → Emails → SMTP Settings**, activa *Custom SMTP*. Esto sirve para el mail de "olvidé mi contraseña":
- **Host:** `smtp.mail.yahoo.com` (o `smtp.gmail.com`)
- **Port:** `465`
- **User:** la cuenta
- **Password:** la contraseña de aplicación
- **Sender name:** `TODOmás`

### 5. Las dos funciones: emails y calendario
En Supabase, **Edge Functions → Deploy a new function → Via editor**:
1. Crea una función llamada **`notify`**, pega el contenido de `supabase/functions/notify/index.ts` y despliégala.
2. Crea otra llamada **`calendar`** con `supabase/functions/calendar/index.ts`.
3. En la configuración de **cada una**, desactiva **"Verify JWT"** (o "Enforce JWT verification").
4. En **Edge Functions → Secrets**, agrega:
   - `SMTP_USER`: la cuenta que manda.
   - `SMTP_PASSWORD`: su contraseña de aplicación.
   - `SMTP_HOST`: `smtp.mail.yahoo.com` si es Yahoo. Si es Gmail no hace falta.

### 6. Conectar la página y publicarla
1. En `config.js` pega:
   - `supabaseUrl`: la URL del proyecto.
   - `supabaseKey`: la clave **publishable** (o *anon public*), que está en **Project Settings → API Keys**.

   Las dos son públicas por diseño. **Nunca pongas ahí la `service_role` ni la `secret` key.**
2. En GitHub crea un repositorio llamado `todomas`. Tiene que ser público para usar Pages gratis; el código no tiene datos, porque los datos viven en Supabase.
3. Súbelo desde la carpeta del proyecto:
   ```bash
   cd ~/Claude/todomas && git remote add origin https://github.com/tomasquiero1234-maker/todomas.git && git push -u origin main
   ```
4. En el repo, **Settings → Pages → Deploy from a branch → main / (root)**. En uno o dos minutos queda en `https://tomasquiero1234-maker.github.io/todomas/`.

### 7. Primer ingreso
1. Entra a la app, toca **Crear cuenta** y usa el correo que pusiste en el paso 2.
2. Corre `supabase/03_recurrentes.sql` con tu correo. Carga el acta del pipeline (lunes 12:00) y el mail de noticias (viernes 17:00).
3. En **Usuarios** (menú de tu avatar) invita a Karime y a los banqueros, y copia el mensaje de invitación para mandárselo.
4. Cada uno conecta su calendario en **Ajustes → Calendario**. Se copia el link y en Google Calendar se agrega desde *Otros calendarios → + → Desde URL*.

---

## Qué hace cada cosa

| | Banquero | Tomás |
|---|---|---|
| **Mi tablero** (Pendiente → En curso → Done, se arrastra) | Sus pendientes, más la tira "Tus pedidos a Tomás" con su lugar en la cola | Sus pendientes y los pedidos que recibe. Puede filtrar por banquero |
| **Cola de Tomás** | Todos los pedidos con su lugar. El detalle solo de los suyos y de los que le compartieron | La misma vista que ven los banqueros. Arrastra para reordenar |
| **Equipo** | Lo que otros le compartieron | Lo que cada banquero le compartió y lo que le pidió |
| **Métricas** | — | Volumen, tiempos de respuesta, % a tiempo, historial y Excel |

**Reglas:**
- Un pedido entra a la cola según su fecha límite y después su prioridad. Tomás puede reordenarla arrastrando.
- El banquero pone la prioridad y edita el contenido. Tomás mueve el estado y puede cambiar la fecha (le llega aviso al banquero). Los pedidos no se rechazan.
- Al marcar **Done**, Tomás puede dejar una respuesta y adjuntar archivos. Al banquero le llega un email y un aviso en la app.
- Las tareas propias de un banquero quedan **compartidas con Tomás por defecto**. Las puede marcar privadas o compartirlas con más gente.
- Las tareas de trabajo de Tomás que no son privadas aparecen en la cola como "Tarea de Tomás", sin detalle. Las privadas no aparecen ni en el conteo.

**Emails** (si están prendidos; además del aviso dentro de la app):
- pedido nuevo, a Tomás;
- Done, al banquero;
- cambio de fecha, a la otra persona;
- pedido cancelado, a Tomás;
- de lunes a viernes a las 08:00: "por vencer" a cada banquero y el resumen del día a Tomás.

Los comentarios solo avisan dentro de la app. Todo funciona en hora de Chile.

---

## Bueno saber

- **El panel de Supabase ve todo.** Dentro de la app nadie ve los privados de otros, tampoco el admin. Pero el dueño del proyecto en Supabase podría leer cualquier fila desde el panel (*Table Editor*), como pasa con cualquier sistema donde alguien administra la base. Si los banqueros necesitan una garantía total, la opción es cifrar los pendientes privados en el navegador; eso no está hecho.
- **Información de clientes:** se acordó no subir datos sensibles. Archivos: máximo 10 MB cada uno y 1 GB en total en el plan gratis.
- **Plan gratis de Supabase:** si el proyecto pasa una semana sin uso, Supabase lo puede pausar. Se reactiva con un clic desde el panel.
- **Emails:** el primero puede caer en spam; márquenlo como "no es spam". Si el correo del banco los bloquea, hay que probar con otro remitente o con un dominio propio.
- **Google Calendar** actualiza los calendarios por URL cada algunas horas, no al instante. Para algo puntual, cada ficha tiene el botón *Google Calendar*.

## Estructura

```
index.html, config.js, css/app.css
js/main.js            arranque, sesión, navegación
js/api/supabase.js    conexión real   ·  js/api/demo.js  modo demo (mismas reglas)
js/components/        tablero, cola, ficha, métricas, ajustes, usuarios…
supabase/01_esquema.sql        tablas, reglas de privacidad, cron
supabase/02_configuracion.sql  URL, zona horaria, admin
supabase/03_recurrentes.sql    tus recurrentes
supabase/04_emails_apagados.sql  interruptor de emails (apagado)
supabase/functions/            notify (emails) y calendar (.ics)
supabase/pruebas/              pruebas de privacidad del esquema
```

## Pruebas

`supabase/pruebas/` tiene 15 pruebas del esquema: privacidad, permisos, avisos, recurrentes y cola de emails. Se corren contra un Postgres local con una imitación mínima de Supabase:

```bash
cd ~/Claude/todomas/supabase/pruebas && PSQL="psql -h 127.0.0.1 -p 5432 -U postgres" ./correr.sh
```
