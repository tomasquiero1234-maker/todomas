// Textos en español e inglés. t('clave', { variable }) → texto
const ES = {
  you: 'Tú', save: 'Guardar', discard: 'Descartar', cancel: 'Cancelar', delete: 'Borrar', edit: 'Editar', send: 'Enviar', retry: 'Reintentar', yes: 'Sí', no: 'No',
  priority: 'Prioridad', dueDate: 'Fecha límite', recurring: 'Recurrente', sharedWith: 'Compartida con', privateHint: 'Privada: solo tú la ves',
  'prio.3': 'Alta', 'prio.2': 'Media', 'prio.1': 'Baja',
  'status.todo': 'Pendiente', 'status.doing': 'En curso', 'status.done': 'Done',
  'due.none': 'Sin fecha', 'due.today': 'Hoy', 'due.tomorrow': 'Mañana', 'due.overdue': 'Vencido hace {n} d', 'due.lateToday': 'Atrasado ({time})', 'due.doneOn': 'Hecho {date}',
  'nav.board': 'Mi tablero', 'nav.queue': 'Cola de {name}', 'nav.myQueue': 'Mi cola', 'nav.team': 'Equipo', 'nav.metrics': 'Métricas', 'nav.settings': 'Ajustes', 'nav.admin': 'Usuarios', 'nav.signOut': 'Salir', 'nav.account': 'Mi cuenta',
  'board.title': 'Mi tablero', 'board.summary': '{n} abierto|{n} abiertos', 'board.summaryReq': '{n} pedido|{n} pedidos', 'board.summaryUrgent': 'urgentes (hoy o atrasados): {n}', 'board.myTasks': 'Mis pendientes',
  'filter.all': 'Todo', 'filter.requests': 'Pedidos', 'filter.mine': 'Mías', 'filter.clear': 'Quitar filtro',
  'col.emptyTodo': 'Nada pendiente 🎉', 'col.emptyTodoReceiver': 'Sin pendientes. Los pedidos nuevos llegan aquí.', 'col.emptyDoing': 'Arrastra aquí lo que estás haciendo', 'col.emptyDone': 'Lo terminado aparece aquí', 'col.showAll': 'Ver todos ({n})', 'col.showLess': 'Ver menos',
  'card.from': 'Pedido de {name}', 'card.to': 'Para {name}', 'card.queuePos': 'Lugar en la cola',
  'strip.title': 'Tus pedidos a {name}', 'strip.seeQueue': 'Ver la cola de {name}', 'strip.of': 'de {n}', 'strip.ask': 'Pedirle algo a {name}',
  'new.title': 'Nuevo', 'new.task': 'Nueva tarea', 'new.request': 'Pedir a {name}', 'new.kindRequest': 'Pedido a {name}', 'new.kindRequestHint': 'Entra a la cola de {name}', 'new.kindMine': 'Tarea mía', 'new.kindMineHint': 'Queda en tu tablero',
  'new.to': 'Para', 'new.send': 'Enviar pedido', 'new.create': 'Crear tarea', 'new.needTitle': 'Ponle un título', 'new.sent': 'Pedido enviado', 'new.sentPos': 'Pedido enviado: va {pos} de {total} en la cola de {name}', 'new.created': 'Tarea creada',
  'new.requestVisibility': 'Todos ven en la cola que existe (sin detalle). El detalle lo ven tú y {name}.',
  'quick.today': 'Hoy', 'quick.tomorrow': 'Mañana', 'quick.friday': 'Viernes', 'quick.nextMonday': 'Próx. lunes',
  'field.title': 'Título', 'field.titlePh': '¿Qué hay que hacer?', 'field.titlePhRequest': '¿Qué necesitas?', 'field.client': 'Cliente', 'field.clientPh': 'Opcional', 'field.detail': 'Detalle', 'field.detailPh': 'Contexto, links, lo que sirva…', 'field.time': 'Hora',
  'field.private': 'Privada', 'field.privateHint': 'Solo tú la ves. No aparece en ninguna cola ni conteo.',
  'task.notFound': 'No encontramos este pendiente', 'task.notFoundText': 'Puede que lo hayan borrado o que no tengas acceso.', 'task.saved': 'Guardado', 'task.unsaved': 'Cambios sin guardar', 'task.uploaded': 'Archivo subido', 'task.deleted': 'Borrado', 'task.cancelled': 'Pedido cancelado',
  'task.requestFromTo': 'Pedido de {from} a {to}', 'task.requestFrom': 'Pedido de {name}', 'task.privateKind': 'Tarea privada', 'task.personalKind': 'Tarea de {name}', 'task.yourTask': 'Tu tarea',
  'task.queuePos': 'Va {pos} en la cola de {name}', 'task.onlyAssigneeMoves': 'el estado lo mueve {name}', 'task.doneNote': 'Respuesta de {name}',
  'task.visibility': 'Quién lo ve', 'task.requestVisibility': 'En la cola todos ven que existe, sin detalle. El detalle lo ven quien lo pidió, {name} y a quien se lo compartas.',
  'task.shareDetailToo': 'Compartir el detalle también con', 'task.shareWith': 'Compartir con', 'task.seenBy': 'Lo ven', 'task.ownInQueue': 'Si no es privada, aparece en tu cola sin detalle.',
  'task.files': 'Adjuntos', 'task.addFile': 'Adjuntar', 'task.noFiles': 'Sin adjuntos', 'task.responseFile': 'Respuesta', 'task.comments': 'Comentarios', 'task.commentPh': 'Escribe un comentario… (⌘/Ctrl + Enter envía)',
  'task.createdBy': 'Creado por {name} · {date}', 'task.completedAt': 'Done · {date}', 'task.addToCalendar': 'Google Calendar', 'task.cancelRequest': 'Cancelar pedido',
  'task.confirmCancel': '¿Cancelar este pedido? Se le avisará a {name}.', 'task.confirmDelete': '¿Borrar este pendiente?', 'task.confirmDeleteFile': '¿Borrar {name}?',
  'done.title': 'Marcar como Done', 'done.confirm': 'Listo, avisar', 'done.willNotify': 'Le llega un aviso por email a {name}.', 'done.note': 'Respuesta (opcional)', 'done.notePh': 'Lo que quieras contarle…', 'done.files': 'Adjuntar respuesta (opcional)', 'done.toast': 'Done. Le avisamos a {name}',
  'queue.title': 'La cola de {name}', 'queue.titleOwner': 'Mi cola', 'queue.sub': 'Así va el trabajo de {name}. Ves el detalle solo de tus pedidos y de lo que te compartieron.',
  'queue.subOwner': 'Así la ven los banqueros: ven que existe cada pedido y su lugar, pero el detalle solo quien lo pidió. Tus privados no aparecen.',
  'queue.statOpen': 'En la cola', 'queue.statDoing': 'En curso', 'queue.statWeek': 'Vencen esta semana', 'queue.statMine': 'Tus pedidos', 'queue.statBest': 'El primero va {pos}', 'queue.statNone': 'Ninguno abierto',
  'queue.whose': '¿De quién es la cola?', 'queue.ownTasks': 'Tareas de {name}', 'queue.requestOf': 'Pedido de {name}', 'queue.taskOf': 'Tarea de {name}', 'queue.hidden': 'Detalle privado',
  'queue.yours': 'Tu pedido', 'queue.by': 'De {name}', 'queue.ownTask': 'Tarea propia', 'queue.empty': '{name} no tiene nada en la cola', 'queue.emptyText': 'Buen momento para pedirle algo.',
  'queue.dragHint': 'Arrastra los pendientes para cambiar el orden.', 'queue.noReceiver': 'Nadie recibe pedidos todavía', 'queue.noReceiverText': 'El administrador debe activar a alguien en Usuarios.',
  'team.title': 'Equipo', 'team.sub': 'Los pendientes que cada uno te compartió. Lo privado no aparece.', 'team.alone': 'Todavía no hay más personas', 'team.aloneText': 'Invítalas desde Usuarios.',
  'team.askedYou': '{name} te pidió ({n})', 'team.boardOf': 'Tablero de {name}', 'team.onlyShared': 'solo lo compartido contigo', 'team.nothingShared': '{name} no te ha compartido pendientes', 'team.nothingSharedText': 'Cuando lo haga, aparecerán aquí.',
  'metrics.title': 'Métricas', 'metrics.sub': 'Solo las ves tú.', 'metrics.received': 'Pedidos recibidos', 'metrics.perWeek': '{n} por semana', 'metrics.completed': 'Completados', 'metrics.completedSplit': '{req} pedidos · {own} propias',
  'metrics.response': 'Tiempo de respuesta', 'metrics.responseSub': 'mediana, del pedido al Done', 'metrics.onTime': 'A tiempo', 'metrics.onTimeSub': '{a} de {b} con fecha', 'metrics.openNow': 'Abiertos ahora', 'metrics.overdue': '{n} atrasado|{n} atrasados', 'metrics.noOverdue': 'nada atrasado',
  'metrics.completedChart': 'Completados en el tiempo', 'metrics.seriesRequests': 'Pedidos', 'metrics.seriesOwn': 'Propias', 'metrics.byBanker': 'Pedidos por banquero', 'metrics.byBankerSub': 'Recibidos en el período.', 'metrics.openShort': '{n} abierto|{n} abiertos',
  'metrics.respByBanker': 'Tiempo de respuesta por banquero', 'metrics.respByBankerSub': 'Mediana del pedido al Done.', 'metrics.nDone': '{n} hecho|{n} hechos', 'metrics.noData': 'Sin datos en este período.',
  'metrics.history': 'Historial', 'metrics.search': 'Buscar', 'metrics.colDone': 'Done', 'metrics.colTitle': 'Título', 'metrics.colFrom': 'De', 'metrics.colClient': 'Cliente', 'metrics.colTime': 'Tiempo', 'metrics.colOnTime': 'Plazo',
  'metrics.own': 'Propia', 'metrics.late': 'Tarde', 'metrics.ok': 'A tiempo', 'metrics.moreInExcel': '{n} más en el Excel', 'metrics.noHistory': 'Nada completado en este período',
  'period.30': '30 días', 'period.90': '90 días', 'period.365': '12 meses', 'period.all': 'Todo',
  'chart.showTable': 'Ver tabla', 'chart.showChart': 'Ver gráfico', 'chart.total': 'Total', 'chart.weekOf': 'Semana del {date}',
  'dur.lt1h': '< 1 h', 'dur.hours': '{n} h', 'dur.days': '{n} día|{n} días',
  'settings.title': 'Ajustes', 'settings.profile': 'Perfil', 'settings.name': 'Nombre', 'settings.color': 'Color', 'settings.colorUsed': 'Lo usa otra persona', 'settings.language': 'Idioma',
  'settings.emails': 'Avisos por email', 'settings.emailsHint': 'Pedidos nuevos, Done, cambios de fecha, por vencer y resumen diario.',
  'settings.password': 'Contraseña', 'settings.newPw': 'Nueva contraseña', 'settings.repeatPw': 'Repítela', 'settings.changePw': 'Cambiar', 'settings.pwChanged': 'Contraseña cambiada',
  'settings.calendar': 'Calendario', 'settings.calendarSub': 'Tus fechas límite en Google Calendar, actualizadas solas.', 'settings.copy': 'Copiar', 'settings.copied': 'Copiado',
  'settings.calStep1': 'En Google Calendar, junto a "Otros calendarios", toca "+".', 'settings.calStep2': 'Elige "Desde URL" y pega el link.', 'settings.calStep3': 'Listo: Google lo actualiza cada algunas horas.',
  'settings.calNote': 'El link es personal: no lo compartas.', 'settings.calRegen': 'Generar uno nuevo', 'settings.calRegenConfirm': 'El link anterior dejará de funcionar. ¿Seguir?', 'settings.calRegenDone': 'Link nuevo generado',
  'settings.calMissing': 'No encontramos tu link de calendario.', 'settings.calDemo': 'En modo demo no hay calendario. Con Supabase configurado, aquí aparece tu link.',
  'settings.recurring': 'Recurrentes', 'settings.recurringSub': 'Se crean solas en tu tablero el día que corresponde.', 'settings.recEmpty': 'Sin recurrentes', 'settings.recAdd': 'Agregar recurrente',
  'settings.recEvery': 'Cada {day}', 'settings.recDay': 'Día', 'settings.recTime': 'Hora', 'settings.recPrivateHint': 'Si es privada, no aparece en tu cola.', 'settings.recDeleteConfirm': '¿Borrar "{title}"?',
  'settings.export': 'Exportar a Excel', 'settings.exportSub': 'Todo lo que puedes ver, en un .xlsx.', 'settings.exportBtn': 'Descargar ({n})',
  'admin.title': 'Usuarios', 'admin.sub': 'Solo pueden crear cuenta los correos que invites.', 'admin.only': 'Solo para el administrador', 'admin.invite': 'Invitar', 'admin.email': 'Correo',
  'admin.role': 'Rol', 'admin.receives': 'Recibe pedidos', 'admin.receivesHint': 'Tendrá su propia cola.', 'admin.inviteBtn': 'Invitar', 'admin.invited': 'Invitación guardada',
  'admin.badEmail': 'Correo no válido', 'admin.needName': 'Falta el nombre', 'admin.howTo': 'Después avísale que entre a {url}, toque "Crear cuenta" y use ese mismo correo.', 'admin.copyMsg': 'Copiar mensaje',
  'admin.inviteMsg': 'Te invité a TODOmás, donde vamos a llevar los pedidos y pendientes. Entra a {url}, toca "Crear cuenta" y usa tu correo del banco.',
  'admin.pending': 'Invitaciones pendientes', 'admin.invitedOn': 'invitado {date}', 'admin.confirmRemoveInvite': '¿Quitar la invitación de {email}?', 'admin.users': 'Personas', 'admin.receivesTag': 'Recibe pedidos', 'admin.active': 'Activo', 'admin.inactive': 'Desactivado',
  'role.admin': 'Admin', 'role.banker': 'Banquero',
  'notif.title': 'Avisos', 'notif.readAll': 'Marcar todo leído', 'notif.empty': 'Sin avisos por ahora',
  'notif.new_request': '{actor} te pidió: {title}', 'notif.done': '{actor} marcó como Done: {title}', 'notif.date_changed': '{actor} cambió la fecha de "{title}" a {date}',
  'notif.cancelled': '{actor} canceló: {title}', 'notif.comment': '{actor} comentó en "{title}": {comment}', 'notif.due_soon': 'Tienes {n} pendiente por vencer|Tienes {n} pendientes por vencer', 'notif.digest': 'Resumen del día: {n} en tu cola',
  'login.tagline': 'Pedidos y pendientes del equipo, en orden.', 'login.signIn': 'Entrar', 'login.signUp': 'Crear cuenta', 'login.createAccount': 'Crear mi cuenta', 'login.email': 'Correo', 'login.password': 'Contraseña', 'login.password2': 'Repite la contraseña',
  'login.signUpHint': 'Solo funciona con el correo que te invitaron.', 'login.forgot': '¿Olvidaste tu contraseña?', 'login.back': 'Volver', 'login.resetTitle': 'Recuperar contraseña', 'login.sendReset': 'Mandarme un link', 'login.resetSent': 'Si el correo existe, te llegó un link para elegir una nueva.',
  'login.checkEmail': 'Revisa tu correo para confirmar la cuenta.', 'login.needEmail': 'Escribe tu correo', 'login.pwShort': 'Mínimo 8 caracteres', 'login.pwMismatch': 'Las contraseñas no coinciden', 'login.newPwTitle': 'Elige tu nueva contraseña',
  'auth.noProfile': 'Tu cuenta no está habilitada', 'auth.noProfileText': 'Pídele al administrador que te invite.', 'auth.inactive': 'Tu acceso está desactivado', 'auth.inactiveText': 'Habla con el administrador si es un error.',
  'demo.title': 'Modo demo.', 'demo.text': 'Datos de ejemplo guardados solo en este navegador. Entra como distintas personas para ver qué ve cada una.', 'demo.admin': 'Admin · recibe pedidos', 'demo.banker': 'Banquero',
  'demo.badge': 'DEMO', 'demo.viewingAs': 'viendo como {name}', 'demo.switch': 'Cambiar de persona', 'demo.reset': 'Reiniciar datos', 'demo.resetConfirm': '¿Volver a los datos de ejemplo?',
  'xl.status': 'Estado', 'xl.type': 'Tipo', 'xl.request': 'Pedido', 'xl.own': 'Propia', 'xl.title': 'Título', 'xl.client': 'Cliente', 'xl.requester': 'Pedido por', 'xl.assignee': 'Responsable', 'xl.priority': 'Prioridad',
  'xl.due': 'Fecha límite', 'xl.dueTime': 'Hora', 'xl.created': 'Creado', 'xl.started': 'Iniciado', 'xl.completed': 'Done', 'xl.hours': 'Horas a Done', 'xl.onTime': 'A tiempo', 'xl.private': 'Privada', 'xl.detail': 'Detalle', 'xl.reply': 'Respuesta',
  'error.generic': 'Algo falló. Intenta de nuevo.', 'error.load': 'No se pudieron cargar los datos.', 'error.export': 'No se pudo generar el Excel.',
  'error.BAD_CREDENTIALS': 'Correo o contraseña incorrectos', 'error.EMAIL_NOT_CONFIRMED': 'Confirma tu correo primero', 'error.NOT_INVITED': 'Ese correo no está invitado. Pídeselo al administrador.',
  'error.ALREADY_USER': 'Ese correo ya tiene cuenta', 'error.WEAK_PASSWORD': 'Contraseña muy débil', 'error.PW_SHORT': 'Mínimo 8 caracteres', 'error.PW_MISMATCH': 'Las contraseñas no coinciden',
  'error.TODOMAS_FORBIDDEN': 'No tienes permiso para eso', 'error.TODOMAS_ONLY_ASSIGNEE': 'Solo quien hace el pedido puede moverlo', 'error.TODOMAS_ONLY_REQUESTER': 'El contenido lo edita quien lo pidió',
  'error.TODOMAS_CANNOT_DEMOTE_SELF': 'No puedes desactivarte a ti mismo', 'error.FILE_TOO_BIG': 'Máximo 10 MB por archivo', 'error.DEMO_FILE_TOO_BIG': 'En demo, máximo 1 MB por archivo', 'error.DEMO_NO_EMAIL': 'En demo no hay emails',
};

const EN = {
  you: 'You', save: 'Save', discard: 'Discard', cancel: 'Cancel', delete: 'Delete', edit: 'Edit', send: 'Send', retry: 'Retry', yes: 'Yes', no: 'No',
  priority: 'Priority', dueDate: 'Due date', recurring: 'Recurring', sharedWith: 'Shared with', privateHint: 'Private: only you see it',
  'prio.3': 'High', 'prio.2': 'Medium', 'prio.1': 'Low',
  'status.todo': 'To do', 'status.doing': 'In progress', 'status.done': 'Done',
  'due.none': 'No date', 'due.today': 'Today', 'due.tomorrow': 'Tomorrow', 'due.overdue': '{n}d overdue', 'due.lateToday': 'Late ({time})', 'due.doneOn': 'Done {date}',
  'nav.board': 'My board', 'nav.queue': "{name}'s queue", 'nav.myQueue': 'My queue', 'nav.team': 'Team', 'nav.metrics': 'Metrics', 'nav.settings': 'Settings', 'nav.admin': 'Users', 'nav.signOut': 'Sign out', 'nav.account': 'My account',
  'board.title': 'My board', 'board.summary': '{n} open', 'board.summaryReq': '{n} request|{n} requests', 'board.summaryUrgent': 'urgent (today or overdue): {n}', 'board.myTasks': 'My tasks',
  'filter.all': 'All', 'filter.requests': 'Requests', 'filter.mine': 'Mine', 'filter.clear': 'Clear filter',
  'col.emptyTodo': 'Nothing to do 🎉', 'col.emptyTodoReceiver': 'All clear. New requests land here.', 'col.emptyDoing': "Drag here what you're working on", 'col.emptyDone': 'Finished items show up here', 'col.showAll': 'Show all ({n})', 'col.showLess': 'Show less',
  'card.from': 'From {name}', 'card.to': 'To {name}', 'card.queuePos': 'Place in queue',
  'strip.title': 'Your requests to {name}', 'strip.seeQueue': "See {name}'s queue", 'strip.of': 'of {n}', 'strip.ask': 'Ask {name} for something',
  'new.title': 'New', 'new.task': 'New task', 'new.request': 'Ask {name}', 'new.kindRequest': 'Request to {name}', 'new.kindRequestHint': "Goes into {name}'s queue", 'new.kindMine': 'My task', 'new.kindMineHint': 'Stays on your board',
  'new.to': 'To', 'new.send': 'Send request', 'new.create': 'Create task', 'new.needTitle': 'Add a title', 'new.sent': 'Request sent', 'new.sentPos': "Request sent: you're {pos} of {total} in {name}'s queue", 'new.created': 'Task created',
  'new.requestVisibility': 'Everyone sees it exists in the queue (no details). Details: you and {name}.',
  'quick.today': 'Today', 'quick.tomorrow': 'Tomorrow', 'quick.friday': 'Friday', 'quick.nextMonday': 'Next Monday',
  'field.title': 'Title', 'field.titlePh': 'What needs doing?', 'field.titlePhRequest': 'What do you need?', 'field.client': 'Client', 'field.clientPh': 'Optional', 'field.detail': 'Details', 'field.detailPh': 'Context, links, anything useful…', 'field.time': 'Time',
  'field.private': 'Private', 'field.privateHint': 'Only you see it. Not in any queue or count.',
  'task.notFound': "We couldn't find this item", 'task.notFoundText': "It may have been deleted, or you don't have access.", 'task.saved': 'Saved', 'task.unsaved': 'Unsaved changes', 'task.uploaded': 'File uploaded', 'task.deleted': 'Deleted', 'task.cancelled': 'Request cancelled',
  'task.requestFromTo': 'Request from {from} to {to}', 'task.requestFrom': 'Request from {name}', 'task.privateKind': 'Private task', 'task.personalKind': "{name}'s task", 'task.yourTask': 'Your task',
  'task.queuePos': "{pos} in {name}'s queue", 'task.onlyAssigneeMoves': '{name} moves the status', 'task.doneNote': 'Reply from {name}',
  'task.visibility': 'Who sees it', 'task.requestVisibility': 'Everyone sees it exists in the queue, without details. Details: the requester, {name} and whoever you share with.',
  'task.shareDetailToo': 'Also share details with', 'task.shareWith': 'Share with', 'task.seenBy': 'Seen by', 'task.ownInQueue': 'If not private, it shows in your queue without details.',
  'task.files': 'Attachments', 'task.addFile': 'Attach', 'task.noFiles': 'No attachments', 'task.responseFile': 'Reply', 'task.comments': 'Comments', 'task.commentPh': 'Write a comment… (⌘/Ctrl + Enter sends)',
  'task.createdBy': 'Created by {name} · {date}', 'task.completedAt': 'Done · {date}', 'task.addToCalendar': 'Google Calendar', 'task.cancelRequest': 'Cancel request',
  'task.confirmCancel': 'Cancel this request? {name} will be notified.', 'task.confirmDelete': 'Delete this item?', 'task.confirmDeleteFile': 'Delete {name}?',
  'done.title': 'Mark as Done', 'done.confirm': 'Done, notify', 'done.willNotify': '{name} gets an email.', 'done.note': 'Reply (optional)', 'done.notePh': 'Anything to tell them…', 'done.files': 'Attach a reply (optional)', 'done.toast': 'Done. We let {name} know',
  'queue.title': "{name}'s queue", 'queue.titleOwner': 'My queue', 'queue.sub': "How {name}'s work is going. You see details only of your requests and what was shared with you.",
  'queue.subOwner': 'This is how bankers see it: every request and its place, but details only for the requester. Your private items are hidden.',
  'queue.statOpen': 'In queue', 'queue.statDoing': 'In progress', 'queue.statWeek': 'Due this week', 'queue.statMine': 'Your requests', 'queue.statBest': 'First one is {pos}', 'queue.statNone': 'None open',
  'queue.whose': 'Whose queue is it?', 'queue.ownTasks': "{name}'s tasks", 'queue.requestOf': 'Request from {name}', 'queue.taskOf': "{name}'s task", 'queue.hidden': 'Private details',
  'queue.yours': 'Your request', 'queue.by': 'From {name}', 'queue.ownTask': 'Own task', 'queue.empty': "{name}'s queue is empty", 'queue.emptyText': 'Good time to ask for something.',
  'queue.dragHint': 'Drag items to reorder.', 'queue.noReceiver': 'Nobody takes requests yet', 'queue.noReceiverText': 'The admin needs to enable someone in Users.',
  'team.title': 'Team', 'team.sub': 'What each person shared with you. Private items never show.', 'team.alone': 'No one else yet', 'team.aloneText': 'Invite people from Users.',
  'team.askedYou': '{name} asked you ({n})', 'team.boardOf': "{name}'s board", 'team.onlyShared': 'only what was shared with you', 'team.nothingShared': "{name} hasn't shared anything", 'team.nothingSharedText': "When they do, it'll show here.",
  'metrics.title': 'Metrics', 'metrics.sub': 'Only you see these.', 'metrics.received': 'Requests received', 'metrics.perWeek': '{n} per week', 'metrics.completed': 'Completed', 'metrics.completedSplit': '{req} requests · {own} own',
  'metrics.response': 'Response time', 'metrics.responseSub': 'median, request to Done', 'metrics.onTime': 'On time', 'metrics.onTimeSub': '{a} of {b} with a date', 'metrics.openNow': 'Open now', 'metrics.overdue': '{n} overdue', 'metrics.noOverdue': 'nothing overdue',
  'metrics.completedChart': 'Completed over time', 'metrics.seriesRequests': 'Requests', 'metrics.seriesOwn': 'Own', 'metrics.byBanker': 'Requests by banker', 'metrics.byBankerSub': 'Received in the period.', 'metrics.openShort': '{n} open',
  'metrics.respByBanker': 'Response time by banker', 'metrics.respByBankerSub': 'Median from request to Done.', 'metrics.nDone': '{n} done', 'metrics.noData': 'No data for this period.',
  'metrics.history': 'History', 'metrics.search': 'Search', 'metrics.colDone': 'Done', 'metrics.colTitle': 'Title', 'metrics.colFrom': 'From', 'metrics.colClient': 'Client', 'metrics.colTime': 'Time', 'metrics.colOnTime': 'Deadline',
  'metrics.own': 'Own', 'metrics.late': 'Late', 'metrics.ok': 'On time', 'metrics.moreInExcel': '{n} more in the Excel file', 'metrics.noHistory': 'Nothing completed in this period',
  'period.30': '30 days', 'period.90': '90 days', 'period.365': '12 months', 'period.all': 'All',
  'chart.showTable': 'Show table', 'chart.showChart': 'Show chart', 'chart.total': 'Total', 'chart.weekOf': 'Week of {date}',
  'dur.lt1h': '< 1 h', 'dur.hours': '{n} h', 'dur.days': '{n} day|{n} days',
  'settings.title': 'Settings', 'settings.profile': 'Profile', 'settings.name': 'Name', 'settings.color': 'Color', 'settings.colorUsed': 'Someone else uses it', 'settings.language': 'Language',
  'settings.emails': 'Email notifications', 'settings.emailsHint': 'New requests, Done, date changes, coming due and daily summary.',
  'settings.password': 'Password', 'settings.newPw': 'New password', 'settings.repeatPw': 'Repeat it', 'settings.changePw': 'Change', 'settings.pwChanged': 'Password changed',
  'settings.calendar': 'Calendar', 'settings.calendarSub': 'Your due dates in Google Calendar, kept up to date.', 'settings.copy': 'Copy', 'settings.copied': 'Copied',
  'settings.calStep1': 'In Google Calendar, next to "Other calendars", tap "+".', 'settings.calStep2': 'Choose "From URL" and paste the link.', 'settings.calStep3': 'Done: Google refreshes it every few hours.',
  'settings.calNote': "This link is personal: don't share it.", 'settings.calRegen': 'Generate a new one', 'settings.calRegenConfirm': 'The old link will stop working. Continue?', 'settings.calRegenDone': 'New link generated',
  'settings.calMissing': "We couldn't find your calendar link.", 'settings.calDemo': 'No calendar in demo mode. With Supabase set up, your link shows here.',
  'settings.recurring': 'Recurring', 'settings.recurringSub': 'Created automatically on your board on the right day.', 'settings.recEmpty': 'No recurring items', 'settings.recAdd': 'Add recurring',
  'settings.recEvery': 'Every {day}', 'settings.recDay': 'Day', 'settings.recTime': 'Time', 'settings.recPrivateHint': "If private, it won't show in your queue.", 'settings.recDeleteConfirm': 'Delete "{title}"?',
  'settings.export': 'Export to Excel', 'settings.exportSub': 'Everything you can see, as .xlsx.', 'settings.exportBtn': 'Download ({n})',
  'admin.title': 'Users', 'admin.sub': 'Only invited emails can create an account.', 'admin.only': 'Admin only', 'admin.invite': 'Invite', 'admin.email': 'Email',
  'admin.role': 'Role', 'admin.receives': 'Takes requests', 'admin.receivesHint': 'Gets their own queue.', 'admin.inviteBtn': 'Invite', 'admin.invited': 'Invitation saved',
  'admin.badEmail': 'Invalid email', 'admin.needName': 'Name missing', 'admin.howTo': 'Then tell them to open {url}, tap "Create account" and use that same email.', 'admin.copyMsg': 'Copy message',
  'admin.inviteMsg': "I invited you to TODOmás, where we'll track requests and to-dos. Go to {url}, tap \"Create account\" and use your work email.",
  'admin.pending': 'Pending invitations', 'admin.invitedOn': 'invited {date}', 'admin.confirmRemoveInvite': 'Remove the invitation for {email}?', 'admin.users': 'People', 'admin.receivesTag': 'Takes requests', 'admin.active': 'Active', 'admin.inactive': 'Disabled',
  'role.admin': 'Admin', 'role.banker': 'Banker',
  'notif.title': 'Notifications', 'notif.readAll': 'Mark all read', 'notif.empty': 'Nothing yet',
  'notif.new_request': '{actor} asked you: {title}', 'notif.done': '{actor} marked Done: {title}', 'notif.date_changed': '{actor} moved "{title}" to {date}',
  'notif.cancelled': '{actor} cancelled: {title}', 'notif.comment': '{actor} commented on "{title}": {comment}', 'notif.due_soon': 'You have {n} item coming due|You have {n} items coming due', 'notif.digest': 'Daily summary: {n} in your queue',
  'login.tagline': "The team's requests and to-dos, in order.", 'login.signIn': 'Sign in', 'login.signUp': 'Create account', 'login.createAccount': 'Create my account', 'login.email': 'Email', 'login.password': 'Password', 'login.password2': 'Repeat password',
  'login.signUpHint': 'Only works with the email you were invited with.', 'login.forgot': 'Forgot your password?', 'login.back': 'Back', 'login.resetTitle': 'Reset password', 'login.sendReset': 'Send me a link', 'login.resetSent': 'If the email exists, you got a link to choose a new one.',
  'login.checkEmail': 'Check your email to confirm the account.', 'login.needEmail': 'Enter your email', 'login.pwShort': 'At least 8 characters', 'login.pwMismatch': "Passwords don't match", 'login.newPwTitle': 'Choose your new password',
  'auth.noProfile': 'Your account is not enabled', 'auth.noProfileText': 'Ask the admin to invite you.', 'auth.inactive': 'Your access is disabled', 'auth.inactiveText': 'Talk to the admin if this is a mistake.',
  'demo.title': 'Demo mode.', 'demo.text': 'Sample data stored only in this browser. Sign in as different people to see what each one sees.', 'demo.admin': 'Admin · takes requests', 'demo.banker': 'Banker',
  'demo.badge': 'DEMO', 'demo.viewingAs': 'viewing as {name}', 'demo.switch': 'Switch person', 'demo.reset': 'Reset data', 'demo.resetConfirm': 'Go back to the sample data?',
  'xl.status': 'Status', 'xl.type': 'Type', 'xl.request': 'Request', 'xl.own': 'Own', 'xl.title': 'Title', 'xl.client': 'Client', 'xl.requester': 'Requested by', 'xl.assignee': 'Owner', 'xl.priority': 'Priority',
  'xl.due': 'Due date', 'xl.dueTime': 'Time', 'xl.created': 'Created', 'xl.started': 'Started', 'xl.completed': 'Done', 'xl.hours': 'Hours to Done', 'xl.onTime': 'On time', 'xl.private': 'Private', 'xl.detail': 'Details', 'xl.reply': 'Reply',
  'error.generic': 'Something went wrong. Try again.', 'error.load': "Couldn't load the data.", 'error.export': "Couldn't build the Excel file.",
  'error.BAD_CREDENTIALS': 'Wrong email or password', 'error.EMAIL_NOT_CONFIRMED': 'Confirm your email first', 'error.NOT_INVITED': "That email isn't invited. Ask the admin.",
  'error.ALREADY_USER': 'That email already has an account', 'error.WEAK_PASSWORD': 'Password too weak', 'error.PW_SHORT': 'At least 8 characters', 'error.PW_MISMATCH': "Passwords don't match",
  'error.TODOMAS_FORBIDDEN': "You don't have permission for that", 'error.TODOMAS_ONLY_ASSIGNEE': 'Only the person doing the request can move it', 'error.TODOMAS_ONLY_REQUESTER': 'Only the requester edits the content',
  'error.TODOMAS_CANNOT_DEMOTE_SELF': "You can't disable yourself", 'error.FILE_TOO_BIG': 'Max 10 MB per file', 'error.DEMO_FILE_TOO_BIG': 'Max 1 MB per file in demo', 'error.DEMO_NO_EMAIL': 'No emails in demo',
};

const DICT = { es: ES, en: EN };

function ordinalEn(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function makeT(lang) {
  const d = DICT[lang] || ES;
  return (key, vars = {}) => {
    if (key === 'ordinal') return lang === 'en' ? ordinalEn(vars.n) : `${vars.n}º`;
    let s = d[key] ?? ES[key];
    if (s == null) return key;
    if (s.includes('|') && vars.n != null) s = s.split('|')[Number(vars.n) === 1 ? 0 : 1];
    return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
  };
}

export function detectLang() {
  try {
    const saved = localStorage.getItem('todomas-lang');
    if (saved === 'es' || saved === 'en') return saved;
  } catch { /* */ }
  return (navigator.language || 'es').toLowerCase().startsWith('en') ? 'en' : 'es';
}

export function saveLang(l) {
  try { localStorage.setItem('todomas-lang', l); } catch { /* */ }
}
