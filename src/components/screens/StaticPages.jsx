import React from 'react';

export default function StaticPages({ currentTab }) {
  const contentMap = {
    terms: { 
      title: 'Términos y Condiciones de Uso', 
      content: (
        <div className="space-y-4">
          <p className="text-sm text-slate-500 font-semibold mb-6">Última actualización: 20 de Abril de 2026</p>
          
          <h3 className="text-[18px] font-bold text-slate-900 mt-6">1. Aceptación de los Términos</h3>
          <p>Al acceder y utilizar Mercasto (el "Servicio"), usted acepta quedar vinculado por estos Términos y Condiciones. Si no está de acuerdo con alguna parte de los términos, no podrá acceder al Servicio.</p>
          
          <h3 className="text-[18px] font-bold text-slate-900 mt-6">2. Cuentas de Usuario y KYC</h3>
          <p>Para publicar anuncios o contactar vendedores, debe crear una cuenta. Usted es responsable de salvaguardar su contraseña y de cualquier actividad o acción bajo su cuenta. Mercasto ofrece un programa voluntario de verificación de identidad (KYC). Los usuarios que envían documentos oficiales falsos o alterados serán suspendidos permanentemente y reportados a las autoridades competentes.</p>

          <h3 className="text-[18px] font-bold text-slate-900 mt-6">3. Reglas de Publicación</h3>
          <p>El usuario se compromete a no publicar:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Artículos robados, falsificados o ilegales según las leyes de los Estados Unidos Mexicanos.</li>
            <li>Armas de fuego, explosivos o sustancias controladas/narcóticos.</li>
            <li>Contenido discriminatorio, de odio, pornográfico o que incite a la violencia.</li>
            <li>Anuncios duplicados o con la intención de manipular los algoritmos de búsqueda (Spam).</li>
          </ul>

          <h3 className="text-[18px] font-bold text-slate-900 mt-6">4. Pagos y Suscripciones PRO</h3>
          <p>Los pagos para promociones de anuncios y suscripciones (Mercasto PRO, Mercasto Plus) se procesan de forma segura. Puedes pagar con tarjeta y, cuando esté disponible, en efectivo en OXXO. Todos los cargos se realizan en Pesos Mexicanos (MXN). Una vez que un anuncio es destacado o una suscripción es activada, el pago <strong>no es reembolsable</strong> a menos que exista una falla técnica comprobable en nuestra plataforma.</p>

          <h3 className="text-[18px] font-bold text-slate-900 mt-6">5. Limitación de Responsabilidad</h3>
          <p>Mercasto actúa únicamente como un intermediario tecnológico para conectar a compradores y vendedores. No somos propietarios de los artículos publicados, ni garantizamos la veracidad de las descripciones o la calidad de los productos. Toda transacción realizada fuera o dentro de la plataforma es bajo su propio riesgo.</p>
        </div>
      )
    },
    privacy: { 
      title: 'Aviso de Privacidad', 
      content: (
        <div className="space-y-4">
          <p className="text-sm text-slate-500 font-semibold mb-6">En cumplimiento con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP).</p>
          
          <h3 className="text-[18px] font-bold text-slate-900 mt-6">1. Identidad del Responsable</h3>
          <p>Mercasto México S.A. de C.V., es el responsable del tratamiento de los datos personales que nos proporcione.</p>
          
          <h3 className="text-[18px] font-bold text-slate-900 mt-6">2. Datos Personales que Recabamos</h3>
          <p>Para brindarle nuestros servicios, recabamos los siguientes datos personales:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Datos de identificación: Nombre, correo electrónico, número de teléfono.</li>
            <li>Datos patrimoniales: Historial de transacciones.</li>
            <li>Datos de navegación: Dirección IP (anonimizada), ubicación aproximada, cookies.</li>
            <li>Datos sensibles (Solo KYC): Identificación oficial (INE, Pasaporte) recabada exclusivamente para otorgar la insignia de "Usuario Verificado". Estos documentos se almacenan en servidores cifrados (AWS S3) con acceso restringido.</li>
          </ul>

          <h3 className="text-[18px] font-bold text-slate-900 mt-6">3. Finalidad del Tratamiento de Datos</h3>
          <p>Sus datos personales serán utilizados para las siguientes finalidades principales: crear su cuenta, permitir la publicación y búsqueda de anuncios, facilitar el contacto entre usuarios (WhatsApp/QR), y prevenir fraudes en la plataforma.</p>

          <h3 className="text-[18px] font-bold text-slate-900 mt-6">4. Derechos ARCO</h3>
          <p>Usted tiene derecho a conocer qué datos personales tenemos de usted (Acceso), solicitar su corrección (Rectificación), que los eliminemos de nuestras bases de datos (Cancelación), así como oponerse al uso de los mismos (Oposición). Puede ejercer estos derechos enviando un correo a <strong>privacidad@mercasto.com</strong> o utilizando el botón "Eliminar Cuenta" en la configuración de su perfil.</p>
        </div>
      )
    },
    help: { 
      title: 'Centro de Ayuda', 
      content: (
        <div className="space-y-6">
          <p>Bienvenido al Centro de Ayuda de Mercasto. Aquí encontrarás las respuestas a las preguntas más frecuentes.</p>
          
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
            <h4 className="font-bold text-slate-900 text-[16px]">¿Cómo publico un anuncio?</h4>
            <p className="mt-2 text-[14px]">Para publicar un anuncio, simplemente haz clic en el botón verde <strong>"Publicar"</strong> en el menú superior o inferior. Selecciona la categoría, sube hasta 10 fotografías, y si lo deseas, puedes usar nuestro Asistente de IA para escribir una descripción perfecta automáticamente.</p>
          </div>
          
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
            <h4 className="font-bold text-slate-900 text-[16px]">¿Cómo obtengo la insignia azul de "Verificado"?</h4>
            <p className="mt-2 text-[14px]">Ve a tu <strong>Panel de Usuario (Perfil)</strong>, desplázate hasta la sección de "Verificación de Identidad (KYC)" y sube una fotografía clara de tu INE o Pasaporte. Nuestro equipo de moderación revisará el documento y, si es válido, aprobará tu insignia en menos de 24 horas.</p>
          </div>

          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
            <h4 className="font-bold text-slate-900 text-[16px]">¿Cómo destaco mi anuncio para vender más rápido?</h4>
            <p className="mt-2 text-[14px]">Ve a la sección "Mis Anuncios" en tu perfil. Localiza el anuncio que deseas vender rápido y haz clic en el botón <strong>"Promocionar"</strong>. Podrás pagar 50 créditos o usar métodos de pago disponibles al finalizar, como tarjeta o efectivo en OXXO, para destacar tu anuncio durante 7 días.</p>
          </div>
        </div>
      )
    },
    safety: { 
      title: 'Centro de Seguridad', 
      content: (
        <div className="space-y-4">
          <div className="bg-blue-600 text-white p-6 rounded-3xl mb-8 shadow-lg">
            <h3 className="text-xl font-bold mb-2">Comunidad Segura Mercasto</h3>
            <p className="text-white/90 text-[14px]">Tu seguridad es nuestra máxima prioridad. Sigue estas recomendaciones esenciales para evitar estafas y tener transacciones exitosas.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border-l-4 border-emerald-500 pl-4 py-1">
              <h4 className="font-bold text-slate-900 text-[16px] mb-1">1. Encuentros en Persona</h4>
              <p className="text-[14px] leading-relaxed">Siempre que sea posible, reúnete con el comprador/vendedor en lugares públicos, bien iluminados y concurridos (plazas comerciales, cafeterías o estaciones de policía). Nunca invites a desconocidos a tu casa.</p>
            </div>
            
            <div className="border-l-4 border-red-500 pl-4 py-1">
              <h4 className="font-bold text-slate-900 text-[16px] mb-1">2. Cero Pagos por Adelantado</h4>
              <p className="text-[14px] leading-relaxed">Nunca transfieras dinero, ni envíes depósitos por OXXO o transferencias bancarias antes de haber visto y revisado el artículo en persona. Los estafadores suelen pedir un "apartado".</p>
            </div>
            
            <div className="border-l-4 border-blue-500 pl-4 py-1">
              <h4 className="font-bold text-slate-900 text-[16px] mb-1">3. Vendedores Verificados</h4>
              <p className="text-[14px] leading-relaxed">Busca la insignia azul de <strong>"Verificado"</strong> junto al nombre del vendedor. Esto significa que Mercasto tiene una copia de su identificación oficial en nuestros registros.</p>
            </div>
            
            <div className="border-l-4 border-amber-500 pl-4 py-1">
              <h4 className="font-bold text-slate-900 text-[16px] mb-1">4. Reporta Actividad Sospechosa</h4>
              <p className="text-[14px] leading-relaxed">Si ves un anuncio con un precio absurdamente bajo, o un usuario te pide información bancaria sensible, utiliza el botón "Reportar anuncio sospechoso" en la página del anuncio. Nuestro equipo actuará de inmediato.</p>
            </div>
          </div>
        </div>
      )
    }
  };
  
  const data = contentMap[currentTab] || contentMap.terms;
  
  return (
    <div className="max-w-[900px] mx-auto py-8 md:py-12 px-4 lg:px-6 min-h-[60vh]">
      <h1 className="text-[32px] font-black text-slate-900 mb-6">{data.title}</h1>
      <div className="bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-slate-200 text-slate-600 text-[15px] leading-relaxed">
        {data.content}
      </div>
    </div>
  );
}