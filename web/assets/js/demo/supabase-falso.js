/* SIGAE — Base falsa para la demo.
   Imita la parte del cliente de Supabase que usa el frontend (from/select/eq/insert/update/upsert/delete,
   auth, storage, rpc) sobre datos en memoria, persistidos en localStorage.
   Se activa con ?demo=1. NUNCA contiene datos reales. */

const KEY = 'sigae_demo_db_v6';
const KEY_SESION = 'sigae_demo_sesion';

/* ---------- utilidades de fechas ---------- */
const hoy = new Date(); hoy.setHours(0,0,0,0);
const iso = d => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0,10); };
const dia = off => { const x = new Date(hoy); x.setDate(x.getDate() + off); return iso(x); };
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36));
const pick = (arr, i) => arr[Math.abs(i) % arr.length];

/* ---------- datos de muestra ---------- */
function semilla() {
  const P = {
    dir: 'p-direccion', m1: 'p-daniela', m2: 'p-paola', m3: 'p-fernanda', f1: 'p-claudia', f2: 'p-ricardo', f3: 'p-monica', f1b: 'p-andres', esp1: 'p-terapeuta',
  };
  const perfiles = [
    { id: P.dir, rol: 'direccion', nombre: 'Dirección SHADOW', correo: 'direccion@shadow.demo', telefono: '614 000 0000', fecha_nacimiento: '1988-11-02', activo: true },
    { id: P.m1, rol: 'monitora', nombre: 'Daniela Ruiz Carrasco', correo: 'daniela@shadow.demo', telefono: '614 100 0001', fecha_nacimiento: '1996-' + dia(12).slice(5), activo: true },
    { id: P.m2, rol: 'monitora', nombre: 'Paola Hernández Luna', correo: 'paola@shadow.demo', telefono: '614 100 0002', fecha_nacimiento: '1999-03-14', activo: true },
    { id: P.m3, rol: 'monitora', nombre: 'Fernanda Ochoa Villa', correo: 'fernanda@shadow.demo', telefono: '614 100 0003', fecha_nacimiento: '1993-07-28', activo: true },
    { id: P.f1, rol: 'familia', nombre: 'Claudia Aguirre', correo: 'claudia@familia.demo', telefono: '614 200 0001', activo: true },
    { id: P.f1b, rol: 'familia', nombre: 'Andrés Mendoza', correo: 'andres@familia.demo', telefono: '614 200 0011', activo: true },
    { id: P.f2, rol: 'familia', nombre: 'Ricardo Torres', correo: 'ricardo@familia.demo', telefono: '614 200 0002', activo: true },
    { id: P.f3, rol: 'familia', nombre: 'Mónica Reyes', correo: 'monica@familia.demo', telefono: '614 200 0003', activo: true },
    { id: P.esp1, rol: 'especialista', subtipo_especialista: 'terapeuta', nombre: 'Lic. Karina Soto (terapia de lenguaje)', correo: 'karina@terapia.demo', activo: true },
  ];
  const familias = [
    { id: 'fam-mendoza', nombre_familia: 'Familia Mendoza Aguirre', dia_de_pago: Math.min(28, Number(dia(5).slice(8))), monto_mensual: 6500, notas: '' },
    { id: 'fam-torres', nombre_familia: 'Familia Torres Villalobos', dia_de_pago: 1, monto_mensual: 6500, notas: '' },
    { id: 'fam-gaytan', nombre_familia: 'Familia Gaytán Reyes', dia_de_pago: 15, monto_mensual: 7200, notas: 'Pagan por transferencia.' },
  ];
  const familia_tutores = [
    { familia_id: 'fam-mendoza', perfil_id: P.f1, parentesco: 'Madre' }, { familia_id: 'fam-mendoza', perfil_id: P.f1b, parentesco: 'Padre' },
    { familia_id: 'fam-torres', perfil_id: P.f2, parentesco: 'Padre' }, { familia_id: 'fam-gaytan', perfil_id: P.f3, parentesco: 'Madre' },
  ];
  const cumpleSantiago = new Date(hoy); cumpleSantiago.setDate(cumpleSantiago.getDate() + 3);
  const estudiantes = [
    { id: 'est-santiago', nombre: 'Santiago Mendoza Aguirre', fecha_nacimiento: `2018-${String(cumpleSantiago.getMonth()+1).padStart(2,'0')}-${String(cumpleSantiago.getDate()).padStart(2,'0')}`, foto_autorizada: false, escuela: 'Colegio Montessori del Valle', grado: '3º de primaria', grupo: 'A', direccion_escuela: 'Av. Universidad 2300, Chihuahua', zona: 'Centro', hora_entrada: '08:00', hora_salida: '14:30', hora_recreo_inicio: '10:30', hora_recreo_fin: '11:00', dias_asistencia: [1,2,3,4,5], diagnostico: 'Trastorno del espectro autista, nivel 1', perfil_desarrollo: 'Lenguaje funcional; dificultad con cambios de rutina y ruido. Intereses: dinosaurios y mapas.', necesidades_apoyo: ['Anticipación de transiciones', 'Regulación sensorial (ruido)', 'Apoyo para pedir ayuda con palabras'], dinamica_familiar: 'Vive con mamá (Claudia), papá (Andrés) y su hermana Regina (4). Abuela materna apoya por las tardes.', companeros_salon: 24, familia_id: 'fam-mendoza', activo: true, fecha_inicio_servicio: dia(-380) },
    { id: 'est-valentina', nombre: 'Valentina Torres Villalobos', fecha_nacimiento: '2016-05-19', foto_autorizada: true, escuela: 'Instituto La Salle', grado: '5º de primaria', grupo: 'B', direccion_escuela: 'Calle Allende 500, Chihuahua', zona: 'Sur', hora_entrada: '07:30', hora_salida: '13:30', hora_recreo_inicio: '10:00', hora_recreo_fin: '10:30', dias_asistencia: [1,2,3,4,5], diagnostico: 'TDAH, presentación combinada', perfil_desarrollo: 'Muy verbal y creativa; dificultad para iniciar y terminar tareas y para esperar turno.', necesidades_apoyo: ['Fraccionar tareas', 'Agenda y organización', 'Esperar turno'], dinamica_familiar: 'Vive con papá (Ricardo) entre semana y con mamá los fines de semana.', companeros_salon: 28, familia_id: 'fam-torres', activo: true, fecha_inicio_servicio: dia(-290) },
    { id: 'est-emiliano', nombre: 'Emiliano Gaytán Reyes', fecha_nacimiento: '2017-09-03', foto_autorizada: true, escuela: 'Primaria Benito Juárez', grado: '3º de primaria', grupo: 'C', direccion_escuela: 'Blvd. Ortiz Mena 1800, Chihuahua', zona: 'Poniente', hora_entrada: '08:00', hora_salida: '13:00', hora_recreo_inicio: '10:30', hora_recreo_fin: '11:00', dias_asistencia: [1,2,3,4,5], diagnostico: 'Síndrome de Down', perfil_desarrollo: 'Sociable y afectuoso; lectura de sílabas; motricidad fina en desarrollo.', necesidades_apoyo: ['Motricidad fina', 'Lectura con apoyo visual', 'Autonomía en rutinas'], dinamica_familiar: 'Vive con mamá (Mónica) y dos hermanos mayores.', companeros_salon: 31, familia_id: 'fam-gaytan', activo: true, fecha_inicio_servicio: dia(-640) },
  ];
  const monitoras = [
    { perfil_id: P.m1, formacion: 'educacion_especial', tiene_titulo: true, tiene_cedula: true, cedula: '12345678', experiencia: '4 años como maestra sombra en primaria; 1 año en CAM.', especialidades: ['TEA', 'Regulación emocional', 'Lenguaje'], zonas: ['Centro', 'Norte'], disponibilidad: { lun: ['07:00-15:00'], mar: ['07:00-15:00'], mie: ['07:00-15:00'], jue: ['07:00-15:00'], vie: ['07:00-15:00'] }, fecha_ingreso: dia(-400), estado: 'activa' },
    { perfil_id: P.m2, formacion: 'psicologia_educativa', tiene_titulo: true, tiene_cedula: false, experiencia: '2 años de acompañamiento escolar.', especialidades: ['TDAH', 'Dislexia'], zonas: ['Sur', 'Centro'], disponibilidad: { lun: ['07:00-14:00'], mar: ['07:00-14:00'], mie: ['07:00-14:00'], jue: ['07:00-14:00'], vie: ['07:00-14:00'] }, fecha_ingreso: dia(-300), estado: 'activa' },
    { perfil_id: P.m3, formacion: 'educacion', tiene_titulo: true, tiene_cedula: true, cedula: '87654321', experiencia: '6 años en educación inclusiva.', especialidades: ['Síndrome de Down', 'Discapacidad intelectual', 'Motriz'], zonas: ['Poniente'], disponibilidad: { lun: ['07:30-13:30'], mar: ['07:30-13:30'], mie: ['07:30-13:30'], jue: ['07:30-13:30'], vie: ['07:30-13:30'] }, fecha_ingreso: dia(-700), estado: 'activa' },
  ];
  const asignaciones = [
    { id: 'asig-0', estudiante_id: 'est-santiago', monitora_id: P.m2, fecha_inicio: dia(-380), fecha_fin: dia(-200), motivo_cambio: 'Cambio de horario de la monitora', activa: false },
    { id: 'asig-1', estudiante_id: 'est-santiago', monitora_id: P.m1, fecha_inicio: dia(-200), fecha_fin: null, motivo_cambio: null, activa: true },
    { id: 'asig-2', estudiante_id: 'est-valentina', monitora_id: P.m2, fecha_inicio: dia(-290), fecha_fin: null, motivo_cambio: null, activa: true },
    { id: 'asig-3', estudiante_id: 'est-emiliano', monitora_id: P.m3, fecha_inicio: dia(-640), fecha_fin: null, motivo_cambio: null, activa: true },
  ];
  const catalogos = [];
  const cat = (tipo, pares) => pares.forEach(([clave, etiqueta], i) => catalogos.push({ id: `cat-${tipo}-${clave}`, tipo, clave, etiqueta, orden: i + 1, activo: true }));
  cat('lonche', [['si','Sí, comió su lonche'],['no','No comió'],['parte','Dejó una parte']]);
  cat('uso_bano', [['orino','Orinó'],['evacuo','Evacuó'],['ambos','Ambos'],['intento','Intentó sin resultado'],['accidente','Accidente'],['otro','Otro']]);
  cat('conducta', [['ninguna','No se presentaron'],['autoagresion','Autoagresión'],['agresion_personas','Agresión hacia otras personas'],['agresion_objetos','Agresión con objetos']]);
  cat('actividades_realizadas', [['todas','Sí, todas'],['mayoria','Sí, la mayoría'],['casi_ninguna','Casi ninguna'],['ninguna','Ninguna']]);
  cat('participacion', [['todas','En todas'],['algunas','En algunas'],['ninguna','En ninguna']]);
  cat('estado_animo_estudiante', [['contento','Contento'],['enojado','Enojado'],['triste','Triste'],['cansado','Cansado'],['irritado','Irritado'],['aburrido','Aburrido'],['indiferente','Indiferente'],['otro','Otro']]);
  cat('sentir_monitora', [['comoda','Cómoda'],['activa','Activa'],['contenta','Contenta'],['incomoda','Incómoda'],['animo_bajo','Con ánimo bajo'],['triste','Triste'],['enojada','Enojada'],['cansada','Cansada'],['otra','Otra']]);
  cat('valor_bloque', [['trabajo','Trabajó'],['con_apoyo','Trabajó con apoyo'],['no_trabajo','No trabajó'],['no_aplica','No aplica']]);
  cat('formacion_academica', [['educacion_especial','Educación especial'],['educacion','Educación'],['puericultura','Técnico en puericultura'],['psicologia_general','Lic. en Psicología General'],['psicologia_clinica','Lic. en Psicología Clínica'],['psicologia_educativa','Lic. en Psicología Educativa'],['fisioterapia','Fisioterapia'],['medicina','Medicina'],['trabajo_social','Trabajo Social'],['otra','Otra formación']]);
  cat('dimension_evaluacion', [['atencion','Atención y permanencia'],['autonomia','Autonomía'],['comunicacion','Comunicación'],['regulacion','Regulación emocional'],['social','Interacción social'],['academico','Desempeño académico']]);
  cat('como_se_entero', [['redes','Redes sociales'],['recomendacion','Recomendación'],['bolsa','Bolsa de trabajo'],['escuela','Por una escuela'],['otro','Otro']]);

  /* bitácoras de los últimos ~25 días hábiles */
  const RES = {
    'est-santiago': ['Buen día en general. Toleró el cambio al salón de música con aviso previo. En matemáticas trabajó con material concreto y terminó la actividad.', 'Jornada difícil en la primera hora por el ruido del ensayo del festival; usamos los audífonos y se reguló. Después participó en ciencias.', 'Pidió ayuda con palabras dos veces sin que se lo recordara. Compartió el recreo con Mateo.', 'Día tranquilo. Lectura guiada con apoyo visual; en recreo prefirió estar solo con su libro de dinosaurios.'],
    'est-valentina': ['Usó su agenda sin recordatorio. Terminó la tarea de español en clase dividiéndola en tres partes.', 'Le costó esperar su turno en la exposición; hablamos de la señal acordada y la usó después.', 'Día productivo. Participó en todas las actividades de la maestra y organizó su mochila sola.', 'Se distrajo mucho después del recreo; cambiamos de lugar cerca del pizarrón y mejoró.'],
    'est-emiliano': ['Leyó cuatro palabras de dos sílabas con las tarjetas. Muy contento en educación física.', 'Trabajo de trazo con guía; se cansó rápido pero terminó la hoja. Fue al baño solo avisando.', 'Participó en la actividad grupal de ciencias repartiendo material. Comió todo su lonche.', 'Jornada con mucha energía; nos costó la actividad de escritura. Buena interacción con sus compañeros en el recreo.'],
  };
  const LOG = ['Pidió ayuda con palabras', 'Toleró el cambio con aviso previo', 'Terminó la actividad sin recordatorios', 'Compartió material con un compañero', 'Participó levantando la mano'];
  const bitacoras = [], bitacora_bloques = [], bitacora_banos = [], bitacora_sentir_monitora = [], bitacora_lecturas = [];
  const bloquesDe = est => { const out = []; let [h, m] = est.hora_entrada.split(':').map(Number); const [hs, ms] = est.hora_salida.split(':').map(Number); while (h * 60 + m < hs * 60 + ms) { const ini = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`; m += 30; if (m >= 60) { m -= 60; h++; } const fin = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`; out.push([ini, fin]); } return out; };
  let n = 0;
  for (let off = -34; off <= 0; off++) {
    const f = new Date(hoy); f.setDate(f.getDate() + off); const dow = f.getDay(); if (dow === 0 || dow === 6) continue;
    estudiantes.forEach((e, i) => {
      const asig = asignaciones.find(a => a.estudiante_id === e.id && a.activa); n++;
      const k = (Math.abs(off) * 7 + i * 3) % 10;
      if (off === 0) { if (e.id === 'est-emiliano') return; }         // hoy: Emiliano sin bitácora todavía
      else if (k === 9) return;                                          // alguna falta en el histórico
      const esBorrador = off === 0 && e.id === 'est-santiago';
      const requiereCorr = off === -1 && e.id === 'est-emiliano';
      const conducta = k === 3 ? ['agresion_objetos'] : ['ninguna'];
      const id = `bit-${e.id}-${dia(off)}`;
      bitacoras.push({
        id, estudiante_id: e.id, monitora_id: asig.monitora_id, asignacion_id: asig.id, fecha_jornada: dia(off),
        enviada_en: esBorrador ? null : `${dia(off)}T${['14:41','13:52','15:10','14:05'][k % 4]}:00`,
        estado: esBorrador ? 'borrador' : requiereCorr ? 'requiere_correccion' : 'enviada',
        valoracion_dia: pick([4, 3, 5, 4, 2, 4, 5, 3, 4, 4], k + i),
        hay_tareas: k % 3 === 0, tareas_pendientes: k % 3 === 0 ? 'Terminar la página 34 del libro de español y traer firmada la circular.' : null,
        lonche: pick(['si', 'si', 'parte', 'si', 'no'], k), fue_al_bano: k % 4 !== 1,
        conductas: conducta, conducta_detalle: conducta[0] === 'ninguna' ? null : { antes: 'Se le pidió guardar el material cuando aún no terminaba su dibujo.', que_hizo: 'Aventó las crayolas al piso.', despues: 'Lloró unos minutos y luego aceptó recogerlas conmigo.', respuesta: 'Le di un aviso de tiempo extra, nombré lo que sentía y esperamos juntos; después recogimos.' },
        habilidades_sociales: k % 2 === 0, habilidades_detalle: k % 2 === 0 ? 'Jugó en el recreo con dos compañeros a las atrapadas.' : null,
        actividades_realizadas: pick(['todas', 'mayoria', 'mayoria', 'casi_ninguna', 'todas'], k + i),
        participacion: pick(['todas', 'algunas', 'algunas', 'ninguna', 'todas'], k),
        estados_animo: pick([['contento'], ['contento', 'cansado'], ['irritado'], ['contento'], ['aburrido', 'indiferente'], ['triste']], k + i), estado_animo_otro: null,
        resumen_narrativo: esBorrador ? null : pick(RES[e.id], k),
        comentarios_adicionales: k === 5 ? 'La maestra pide una reunión breve la próxima semana.' : null,
        paso_actual: esBorrador ? 6 : 14,
        revisada_por: (!esBorrador && off < -1 && k % 5 !== 1) ? P.dir : (requiereCorr ? P.dir : null),
        revisada_en: (!esBorrador && off < -1 && k % 5 !== 1) ? `${dia(off + 1)}T09:00:00` : (requiereCorr ? `${dia(0)}T08:30:00` : null),
        observacion_direccion: requiereCorr ? 'Falta describir qué pasó antes de la conducta y cómo respondiste. ¿Puedes completarlo?' : null,
        creado_en: `${dia(off)}T08:05:00`, actualizado_en: `${dia(off)}T14:40:00`,
      });
      bloquesDe(e).forEach(([ini, fin], j) => {
        const recreo = ini >= e.hora_recreo_inicio && ini < e.hora_recreo_fin;
        if (esBorrador && j > 5) return;
        bitacora_bloques.push({ id: uuid(), bitacora_id: id, hora_inicio: ini, hora_fin: fin, valor: recreo ? 'no_aplica' : pick(['trabajo', 'trabajo', 'con_apoyo', 'trabajo', 'no_trabajo', 'con_apoyo'], j + k + i), nota: null });
      });
      if (k % 4 !== 1) bitacora_banos.push({ id: uuid(), bitacora_id: id, hora_aprox: '10:40', que_hizo: 'orino', nota: null });
      if (k % 5 === 0) bitacora_banos.push({ id: uuid(), bitacora_id: id, hora_aprox: '12:15', que_hizo: 'evacuo', nota: 'Avisó solo.' });
      if (!esBorrador) {
        const cansada = asig.monitora_id === P.m3 && off > -14 && k % 3 !== 2;   // tendencia: Fernanda reporta cansancio
        bitacora_sentir_monitora.push({ bitacora_id: id, sentimientos: cansada ? ['cansada', ...(k % 2 ? ['incomoda'] : [])] : pick([['comoda', 'activa'], ['contenta'], ['activa'], ['comoda'], ['cansada']], k + i), otro: null, comentario: cansada && k % 3 === 0 ? 'La maestra titular me pide cosas fuera de mi función (cuidar al grupo completo cuando sale). Me cuesta decir que no.' : (k === 7 ? 'Hoy me sentí muy bien, el día fluyó.' : null), actualizado_en: `${dia(off)}T14:40:00` });
        if (off < 0 && k % 3 !== 0) { const tut = familia_tutores.find(t => t.familia_id === e.familia_id); bitacora_lecturas.push({ bitacora_id: id, perfil_id: tut.perfil_id, leida_en: `${dia(off)}T18:${20 + k}:00` }); }
      }
    });
  }

  const ciclos = estudiantes.map(e => ({ id: `ciclo-${e.id}`, estudiante_id: e.id, nombre: 'Ciclo escolar 2026-2027', fecha_inicio: '2026-08-24', fecha_fin: '2027-07-09', activo: true }));
  const objetivos = [
    { id: uuid(), estudiante_id: 'est-santiago', ciclo_id: 'ciclo-est-santiago', descripcion: 'Permanecer en actividad grupal 20 minutos seguidos', estrategia: 'Aviso visual de tiempo y refuerzo específico al cumplir.', estado: 'en_proceso', prioridad: 1, visible_monitora: true, visible_familia: true },
    { id: uuid(), estudiante_id: 'est-santiago', ciclo_id: 'ciclo-est-santiago', descripcion: 'Pedir ayuda con palabras antes de frustrarse', estrategia: 'Tarjeta «necesito ayuda» como puente; modelar la frase.', estado: 'en_proceso', prioridad: 1, visible_monitora: true, visible_familia: true },
    { id: uuid(), estudiante_id: 'est-santiago', ciclo_id: 'ciclo-est-santiago', descripcion: 'Compartir el recreo con al menos un compañero', estrategia: 'Juego estructurado de 10 min con un compañero elegido por él.', estado: 'alcanzado', prioridad: 2, visible_monitora: true, visible_familia: true },
    { id: uuid(), estudiante_id: 'est-valentina', ciclo_id: 'ciclo-est-valentina', descripcion: 'Terminar las tareas en clase con dos recordatorios o menos', estrategia: 'Dividir en tres partes con marca de avance.', estado: 'en_proceso', prioridad: 1, visible_monitora: true, visible_familia: true },
    { id: uuid(), estudiante_id: 'est-valentina', ciclo_id: 'ciclo-est-valentina', descripcion: 'Usar la agenda todos los días', estrategia: 'Revisión al inicio y al final de la jornada.', estado: 'en_proceso', prioridad: 2, visible_monitora: true, visible_familia: true },
    { id: uuid(), estudiante_id: 'est-emiliano', ciclo_id: 'ciclo-est-emiliano', descripcion: 'Leer palabras de dos sílabas', estrategia: 'Tarjetas silábicas 10 min diarios.', estado: 'en_proceso', prioridad: 1, visible_monitora: true, visible_familia: true },
    { id: uuid(), estudiante_id: 'est-emiliano', ciclo_id: 'ciclo-est-emiliano', descripcion: 'Ir al baño avisando y sin apoyo físico', estrategia: 'Pictograma en la mesa; refuerzo al avisar.', estado: 'en_proceso', prioridad: 1, visible_monitora: true, visible_familia: true },
  ];
  const evaluaciones = [
    { id: uuid(), estudiante_id: 'est-santiago', ciclo_id: 'ciclo-est-santiago', tipo: 'diagnostica', fecha: '2026-09-04', realizada: true, aplicada_por: P.dir, resultados: { atencion: 2, autonomia: 3, comunicacion: 3, regulacion: 2, social: 2, academico: 3 }, observaciones: 'Se levanta constantemente; crisis ante cambios de rutina.', visible_monitora: true, visible_familia: true },
    { id: uuid(), estudiante_id: 'est-santiago', ciclo_id: 'ciclo-est-santiago', tipo: 'intermedia', fecha: dia(9), realizada: false, resultados: {}, visible_monitora: true, visible_familia: false },
    { id: uuid(), estudiante_id: 'est-valentina', ciclo_id: 'ciclo-est-valentina', tipo: 'diagnostica', fecha: '2026-09-01', realizada: true, aplicada_por: P.dir, resultados: { atencion: 2, autonomia: 2, comunicacion: 4, regulacion: 3, social: 4, academico: 3 }, observaciones: 'Dificultad para iniciar y terminar tareas.', visible_monitora: true, visible_familia: true },
    { id: uuid(), estudiante_id: 'est-valentina', ciclo_id: 'ciclo-est-valentina', tipo: 'intermedia', fecha: dia(-6), realizada: true, aplicada_por: P.dir, resultados: { atencion: 3, autonomia: 3, comunicacion: 4, regulacion: 3, social: 4, academico: 3 }, observaciones: 'Usa agenda con recordatorio; mejora en entregas.', visible_monitora: true, visible_familia: true },
    { id: uuid(), estudiante_id: 'est-emiliano', ciclo_id: 'ciclo-est-emiliano', tipo: 'diagnostica', fecha: '2026-08-28', realizada: true, aplicada_por: P.dir, resultados: { atencion: 3, autonomia: 2, comunicacion: 3, regulacion: 4, social: 5, academico: 2 }, observaciones: '', visible_monitora: true, visible_familia: true },
    { id: uuid(), estudiante_id: 'est-emiliano', ciclo_id: 'ciclo-est-emiliano', tipo: 'intermedia', fecha: dia(-12), realizada: false, resultados: {}, visible_monitora: true, visible_familia: false },
  ];
  const pagos = [];
  familias.forEach(f => {
    const mesPasado = new Date(hoy.getFullYear(), hoy.getMonth() - 1, Math.min(f.dia_de_pago, 28));
    const esteMes = new Date(hoy.getFullYear(), hoy.getMonth(), Math.min(f.dia_de_pago, 28));
    const prox = new Date(hoy.getFullYear(), hoy.getMonth() + 1, Math.min(f.dia_de_pago, 28));
    pagos.push({ id: uuid(), familia_id: f.id, fecha_vencimiento: iso(mesPasado), monto: f.monto_mensual, estado: 'pagado', pagado_en: iso(mesPasado) });
    const esteYaPaso = esteMes < hoy;
    pagos.push({ id: uuid(), familia_id: f.id, fecha_vencimiento: iso(esteMes), monto: f.monto_mensual, estado: esteYaPaso ? (f.id === 'fam-torres' ? 'vencido' : 'pagado') : 'pendiente', pagado_en: esteYaPaso && f.id !== 'fam-torres' ? iso(esteMes) : null });
    pagos.push({ id: uuid(), familia_id: f.id, fecha_vencimiento: iso(prox), monto: f.monto_mensual, estado: 'pendiente', pagado_en: null });
  });
  const tareas = [
    { id: uuid(), titulo: 'Visita escolar: Colegio Montessori (reunión con la maestra de Santiago)', tipo: 'visita_escolar', fecha: dia(4), estudiante_id: 'est-santiago', estado: 'pendiente', notas: '' },
    { id: uuid(), titulo: 'Llamar a la familia Torres por el pago vencido', tipo: 'general', fecha: dia(0), estudiante_id: 'est-valentina', estado: 'pendiente', notas: '' },
    { id: uuid(), titulo: 'Preparar evaluación intermedia de Santiago', tipo: 'revision', fecha: dia(7), estudiante_id: 'est-santiago', estado: 'pendiente', notas: '' },
  ];
  const solicitudes = [
    { id: uuid(), tipo: 'reporte_familia', estudiante_id: 'est-emiliano', solicitante_id: P.f3, datos: { motivo: 'Cita con el neurólogo', fecha_cita: dia(10), detalle: 'Quisiera llevar un resumen del último mes.' }, estado: 'recibida', creado_en: `${dia(-1)}T19:20:00`, actualizado_en: `${dia(-1)}T19:20:00` },
  ];
  const eventos = [
    { id: uuid(), tipo: 'visita_escolar', titulo: 'Visita escolar · Colegio Montessori del Valle', fecha: dia(4), hora: '09:30', lugar: 'Colegio Montessori del Valle', estudiante_id: 'est-santiago', monitora_id: P.m1, notas: 'Reunión con la maestra titular para revisar transiciones.', creado_por: P.dir },
    { id: uuid(), tipo: 'reunion', titulo: 'Reunión de seguimiento con la familia Torres', fecha: dia(8), hora: '17:00', lugar: 'Videollamada', estudiante_id: 'est-valentina', monitora_id: P.m2, notas: '', creado_por: P.dir },
    { id: uuid(), tipo: 'capacitacion', titulo: 'Capacitación mensual del equipo de monitoras', fecha: dia(15), hora: '16:00', lugar: 'Oficina SHADOW', estudiante_id: null, monitora_id: null, notas: 'Tema: plan de calma y registro de conductas.', creado_por: P.dir },
    { id: uuid(), tipo: 'entrevista', titulo: 'Entrevista a candidata (reclutamiento)', fecha: dia(6), hora: '11:00', lugar: 'Oficina SHADOW', estudiante_id: null, monitora_id: null, notas: '', creado_por: P.dir },
  ];
  const especialistas_estudiante = [
    { id: 'esp-1', estudiante_id: 'est-santiago', nombre: 'Lic. Karina Soto', especialidad: 'Terapia de lenguaje', tipo: 'terapeuta', contacto: '614 300 0001', lugar: 'Centro Integra, Av. Mirador 1200', dias_horarios: 'Martes y jueves 16:00', perfil_id: P.esp1, registrado_por: P.f1, activo: true },
    { id: 'esp-2', estudiante_id: 'est-santiago', nombre: 'Dr. Arturo Lozano', especialidad: 'Neurología pediátrica', tipo: 'externo', contacto: '614 300 0002', lugar: 'Hospital Ángeles, consultorio 410', dias_horarios: 'Cita cada 3 meses', perfil_id: null, registrado_por: P.f1, activo: true },
    { id: 'esp-3', estudiante_id: 'est-santiago', nombre: 'Mtra. Lourdes Chávez', especialidad: 'Maestra titular 3º A', tipo: 'personal_escolar', contacto: 'lchavez@montessoridelvalle.mx', lugar: 'Colegio Montessori del Valle', dias_horarios: '', perfil_id: null, registrado_por: P.dir, activo: true },
    { id: 'esp-4', estudiante_id: 'est-valentina', nombre: 'Psic. Daniel Ríos', especialidad: 'Psicología infantil', tipo: 'terapeuta', contacto: '614 300 0004', lugar: 'Consultorio privado, Col. San Felipe', dias_horarios: 'Miércoles 17:30', perfil_id: null, registrado_por: P.f2, activo: true },
    { id: 'esp-5', estudiante_id: 'est-emiliano', nombre: 'Lic. Fabiola Mena', especialidad: 'Terapia ocupacional', tipo: 'terapeuta', contacto: '614 300 0005', lugar: 'CRIT Chihuahua', dias_horarios: 'Lunes y miércoles 15:00', perfil_id: null, registrado_por: P.f3, activo: true },
  ];
  const citas = [
    { id: uuid(), estudiante_id: 'est-santiago', especialista_id: 'esp-2', especialista_nombre: 'Dr. Arturo Lozano', especialidad: 'Neurología pediátrica', fecha: dia(12), hora: '10:30', lugar_modalidad: 'Hospital Ángeles, consultorio 410', observaciones: 'Llevar reporte de SHADOW y la escuela.', creada_por: P.f1 },
    { id: uuid(), estudiante_id: 'est-santiago', especialista_id: 'esp-1', especialista_nombre: 'Lic. Karina Soto', especialidad: 'Terapia de lenguaje', fecha: dia(1), hora: '16:00', lugar_modalidad: 'Centro Integra', observaciones: '', creada_por: P.f1 },
    { id: uuid(), estudiante_id: 'est-emiliano', especialista_id: null, especialista_nombre: 'Dra. Elsa Martínez', especialidad: 'Pediatría', fecha: dia(10), hora: '09:00', lugar_modalidad: 'Clínica Santa Fe', observaciones: 'Revisión general.', creada_por: P.f3 },
    { id: uuid(), estudiante_id: 'est-valentina', especialista_id: 'esp-4', especialista_nombre: 'Psic. Daniel Ríos', especialidad: 'Psicología infantil', fecha: dia(3), hora: '17:30', lugar_modalidad: 'Consultorio', observaciones: '', creada_por: P.f2 },
  ];
  const solicitud_historial = solicitudes.map(sl => ({ id: uuid(), solicitud_id: sl.id, estado: 'recibida', nota: null, por: sl.solicitante_id, fecha: sl.creado_en }));
  const notificaciones = [];
  const accesos_sesion = [];
  for (let off = -30; off <= 0; off++) { [P.m1, P.m2, P.m3].forEach((m, i) => { if ((off + i) % 2 === 0) accesos_sesion.push({ id: uuid(), perfil_id: m, fecha_hora: `${dia(off)}T07:${50 + i}:00`, dispositivo: 'celular' }); }); if (off % 3 === 0) accesos_sesion.push({ id: uuid(), perfil_id: P.f1, fecha_hora: `${dia(off)}T18:30:00`, dispositivo: 'celular' }); }

  return { _ver: 6, _archivos: {}, resumenes: [], eventos, especialistas_estudiante, citas, solicitud_historial, perfiles, familias, familia_tutores, estudiantes, monitoras, asignaciones, catalogos, accesos_sesion, bitacoras, bitacora_banos, bitacora_bloques, bitacora_fotos: [], bitacora_sentir_monitora, bitacora_lecturas, ciclos, objetivos, evaluaciones, pagos, tareas, solicitudes, notificaciones };
}

/* ---------- motor ---------- */
let DB = cargar();
function cargar() { try { const s = localStorage.getItem(KEY); if (s) { const o = JSON.parse(s); if (o && o._ver === 6) return o; } } catch (e) {} const d = semilla(); guardar(d); return d; }
function guardar(d) { try { localStorage.setItem(KEY, JSON.stringify(d || DB)); } catch (e) { console.warn('No se pudo guardar la base falsa', e); } }
export function reiniciarBaseFalsa() { localStorage.removeItem(KEY); DB = cargar(); }

const PK = { monitoras: ['perfil_id'], familia_tutores: ['familia_id', 'perfil_id'], bitacora_sentir_monitora: ['bitacora_id'], bitacora_lecturas: ['bitacora_id', 'perfil_id'] };

class Consulta {
  constructor(tabla) { this.t = tabla; this.filtros = []; this.ordenes = []; this.lim = null; this.modo = 'select'; this.payload = null; this.unico = null; this.conflicto = null; this.cols = '*'; }
  select(c = '*') { if (this.modo === 'select') this.cols = c; this.devolver = true; return this; }
  eq(k, v) { this.filtros.push(r => r[k] === v); return this; }
  neq(k, v) { this.filtros.push(r => r[k] !== v); return this; }
  in(k, arr) { this.filtros.push(r => arr.includes(r[k])); return this; }
  gte(k, v) { this.filtros.push(r => r[k] != null && r[k] >= v); return this; }
  lte(k, v) { this.filtros.push(r => r[k] != null && r[k] <= v); return this; }
  gt(k, v) { this.filtros.push(r => r[k] != null && r[k] > v); return this; }
  lt(k, v) { this.filtros.push(r => r[k] != null && r[k] < v); return this; }
  is(k, v) { this.filtros.push(r => (v === null ? r[k] == null : r[k] === v)); return this; }
  not(k, op, v) { if (op === 'is' && v === null) this.filtros.push(r => r[k] != null); return this; }
  ilike(k, pat) { const re = new RegExp('^' + pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.') + '$', 'i'); this.filtros.push(r => re.test(String(r[k] ?? ''))); return this; }
  contains(k, arr) { this.filtros.push(r => Array.isArray(r[k]) && arr.every(x => r[k].includes(x))); return this; }
  order(k, o = {}) { this.ordenes.push([k, o.ascending !== false]); return this; }
  limit(n) { this.lim = n; return this; }
  range(a, b) { this.desde = a; this.lim = b - a + 1; return this; }
  single() { this.unico = 'single'; return this; }
  maybeSingle() { this.unico = 'maybe'; return this; }
  insert(rows) { this.modo = 'insert'; this.payload = rows; return this; }
  update(obj) { this.modo = 'update'; this.payload = obj; return this; }
  upsert(rows, o = {}) { this.modo = 'upsert'; this.payload = rows; this.conflicto = o.onConflict ? o.onConflict.split(',').map(s => s.trim()) : null; return this; }
  delete() { this.modo = 'delete'; return this; }
  then(res, rej) { return Promise.resolve().then(() => this._correr()).then(res, rej); }
  _tabla() { if (!DB[this.t]) DB[this.t] = []; return DB[this.t]; }
  _filtrar(rows) { return rows.filter(r => this.filtros.every(f => f(r))); }
  _correr() {
    const tabla = this._tabla(); const ahora = new Date().toISOString(); let data;
    if (this.modo === 'select') {
      data = this._filtrar(tabla).map(r => ({ ...r }));
      for (const [k, asc] of [...this.ordenes].reverse()) data.sort((a, b) => (a[k] == null) - (b[k] == null) || (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * (asc ? 1 : -1));
      if (this.desde) data = data.slice(this.desde);
      if (this.lim != null) data = data.slice(0, this.lim);
    } else if (this.modo === 'insert' || this.modo === 'upsert') {
      const rows = Array.isArray(this.payload) ? this.payload : [this.payload]; data = [];
      const llaves = this.conflicto || PK[this.t] || ['id'];
      for (const r of rows) {
        const fila = { ...r }; if (!fila.id && !PK[this.t]) fila.id = uuid();
        const tieneLlaves = llaves.every(k => fila[k] !== undefined);
        const idx = this.modo === 'upsert' ? tabla.findIndex(x => tieneLlaves ? llaves.every(k => x[k] === fila[k]) : (fila.id && x.id === fila.id)) : -1;
        if (idx >= 0) { tabla[idx] = { ...tabla[idx], ...fila, actualizado_en: ahora }; data.push({ ...tabla[idx] }); }
        else { if (!fila.creado_en) fila.creado_en = ahora; fila.actualizado_en = ahora; tabla.push(fila); data.push({ ...fila }); }
      }
      guardar();
    } else if (this.modo === 'update') {
      data = []; tabla.forEach((r, i) => { if (this.filtros.every(f => f(r))) { tabla[i] = { ...r, ...this.payload, actualizado_en: ahora }; data.push({ ...tabla[i] }); } }); guardar();
    } else if (this.modo === 'delete') {
      data = this._filtrar(tabla); DB[this.t] = tabla.filter(r => !this.filtros.every(f => f(r))); guardar();
    }
    if (this.unico === 'single') { if (data.length !== 1) return { data: null, error: { message: `Se esperaba una fila y hay ${data.length}`, code: 'PGRST116' } }; return { data: data[0], error: null }; }
    if (this.unico === 'maybe') return { data: data[0] ?? null, error: null };
    return { data, error: null, count: data.length };
  }
}

/* ---------- auth falsa ---------- */
const auth = {
  _sesion() { try { return JSON.parse(localStorage.getItem(KEY_SESION) || 'null'); } catch (e) { return null; } },
  async getUser() { const s = this._sesion(); return { data: { user: s ? { id: s.id, email: s.email } : null }, error: null }; },
  async getSession() { const s = this._sesion(); return { data: { session: s ? { user: { id: s.id, email: s.email } } : null }, error: null }; },
  async signInWithPassword({ email }) {
    const p = DB.perfiles.find(x => (x.correo || '').toLowerCase() === String(email).toLowerCase() && x.activo);
    if (!p) return { data: { user: null }, error: { message: 'No existe un usuario con ese correo en la demo.' } };
    localStorage.setItem(KEY_SESION, JSON.stringify({ id: p.id, email: p.correo })); return { data: { user: { id: p.id, email: p.correo } }, error: null };
  },
  async signOut() { localStorage.removeItem(KEY_SESION); return { error: null }; },
  onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; },
};

/* ---------- storage falso ---------- */
function reducirImagen(file, max = 900, calidad = 0.72) {
  return new Promise(res => {
    if (!file.type || !file.type.startsWith('image/')) { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(file); return; }
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => { const esc = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * esc); c.height = Math.round(img.height * esc); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', calidad)); };
    img.onerror = () => res(null); img.src = url;
  });
}
const storage = {
  from(bucket) {
    return {
      async upload(path, file) { const data = await reducirImagen(file); if (!data) return { data: null, error: { message: 'No se pudo leer el archivo' } }; DB._archivos[bucket + '/' + path] = data; guardar(); return { data: { path }, error: null }; },
      async createSignedUrl(path, _seg) { const d = DB._archivos[bucket + '/' + path]; return d ? { data: { signedUrl: d }, error: null } : { data: null, error: { message: 'No existe el archivo' } }; },
      async createSignedUrls(paths) { return { data: paths.map(p => ({ path: p, signedUrl: DB._archivos[bucket + '/' + p] || null })), error: null }; },
      getPublicUrl(path) { return { data: { publicUrl: DB._archivos[bucket + '/' + path] || '' } }; },
      async remove(paths) { paths.forEach(p => delete DB._archivos[bucket + '/' + p]); guardar(); return { data: paths, error: null }; },
    };
  },
};

/* ---------- rpc falso ---------- */
const RPC = {
  cambiar_monitora({ p_estudiante, p_monitora, p_motivo }) {
    const hoyIso = dia(0);
    DB.asignaciones.forEach(a => { if (a.estudiante_id === p_estudiante && a.activa) { a.activa = false; a.fecha_fin = hoyIso; a.motivo_cambio = p_motivo || a.motivo_cambio; } });
    const nueva = { id: uuid(), estudiante_id: p_estudiante, monitora_id: p_monitora, fecha_inicio: hoyIso, fecha_fin: null, motivo_cambio: null, activa: true, creado_en: new Date().toISOString() };
    DB.asignaciones.push(nueva); guardar(); return nueva.id;
  },
};

export function crearClienteFalso() {
  return {
    esFalso: true,
    from: t => new Consulta(t),
    auth, storage,
    async rpc(nombre, args = {}) { if (!RPC[nombre]) return { data: null, error: { message: `RPC ${nombre} no existe en la demo` } }; try { return { data: RPC[nombre](args), error: null }; } catch (e) { return { data: null, error: { message: e.message } }; } },
    _db: () => DB,
  };
}
