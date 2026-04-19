import React from 'react';

export default function StaticPages({ currentTab }) {
  const contentMap = {
    terms: { title: 'Términos y Condiciones', text: '1. Introducción\nBienvenido a Mercasto. Al utilizar nuestra plataforma, aceptas estos términos.\n\n2. Uso del servicio\nEl usuario se compromete a no publicar contenido ilegal, falso o fraudulento.\n\n3. Pagos y Suscripciones\nLos pagos por suscripciones PRO y promociones no son reembolsables salvo fallo técnico comprobado.' },
    privacy: { title: 'Aviso de Privacidad', text: 'En Mercasto valoramos tu privacidad.\n\n1. Recopilación de datos\nRecopilamos tu email, nombre y datos de contacto para conectar compradores y vendedores.\n\n2. Uso de la información\nNo vendemos tu información a terceros. Usamos tus datos para mejorar tu experiencia en la plataforma.' },
    help: { title: 'Centro de Ayuda', text: '¿Necesitas ayuda?\n\n1. ¿Cómo publicar un anuncio?\nHaz clic en "Post ad" en la parte superior, llena el formulario y sube fotos.\n\n2. ¿Cómo destacar mi anuncio?\nVe a "Mi Perfil" > "Mis Anuncios" y haz clic en "Promocionar".' },
    safety: { title: 'Centro de Seguridad', text: 'Compra y vende seguro.\n\n- Nunca envíes dinero por adelantado.\n- Reúnete en lugares públicos y concurridos.\n- Desconfía de ofertas que parecen demasiado buenas para ser verdad.\n- Revisa la insignia de "Vendedor Verificado".' }
  };
  
  const data = contentMap[currentTab] || contentMap.terms;
  
  return (
    <div className="max-w-[800px] mx-auto py-12 px-6 min-h-[60vh]">
      <h1 className="text-[32px] font-black text-slate-900 mb-6">{data.title}</h1>
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 whitespace-pre-line text-slate-600 text-[15px] leading-relaxed">
        {data.text}
      </div>
    </div>
  );
}