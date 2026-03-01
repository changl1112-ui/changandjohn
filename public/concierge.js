(function () {
  const AUTH_KEY = 'wedding_site_auth_v1';

  const copy = {
    en: {
      title: 'Wedding Concierge',
      subtitle: 'Ask me wedding logistics or Q&A questions',
      placeholder: 'Type your question…',
      send: 'Send',
      greet: 'Hi! I can help with wedding FAQs (travel, RSVP, schedule, accommodation, dress code, registry).',
      fallback: 'Please reach out to Chang and John directly.',
      quick: ['dress code', 'visa', 'airport', 'shuttle', 'RSVP', 'accommodation', 'registry']
    },
    es: {
      title: 'Conserje de la boda',
      subtitle: 'Pregúntame sobre logística o preguntas frecuentes',
      placeholder: 'Escribe tu pregunta…',
      send: 'Enviar',
      greet: '¡Hola! Te puedo ayudar con preguntas de la boda (viaje, RSVP, itinerario, hospedaje, código de vestimenta, registro).',
      fallback: 'Por favor, comunícate directamente con Chang y John.',
      quick: ['código de vestimenta', 'visa', 'aeropuerto', 'shuttle', 'RSVP', 'hospedaje', 'registro']
    },
    'zh-cn': {
      title: '婚礼小助手',
      subtitle: '可回答婚礼行程与常见问题',
      placeholder: '请输入问题…',
      send: '发送',
      greet: '你好！我可以帮助解答婚礼常见问题（出行、RSVP、日程、住宿、着装、礼金/礼物）。',
      fallback: '请直接联系 Chang 和 John。',
      quick: ['着装', '签证', '机场', '接驳', 'RSVP', '住宿', '礼物']
    }
  };

  const faq = [
    { keys: ['dress code', 'vestimenta', '着装'], answer: { en: 'Wedding day is formal / black-tie optional. Welcome party and brunch are smart casual. Beach day is resort casual.', es: 'El día de la boda es formal / black-tie opcional. La bienvenida y el brunch son smart casual. El día de playa es casual de resort.', 'zh-cn': '婚礼当天为正式着装（可选黑领结）。欢迎活动和早午餐为精致休闲，海滩日为度假休闲。' } },
    { keys: ['visa', 'schengen', '签证'], answer: { en: 'U.S./Canadian passport holders generally do not need a visa for short stays. Please verify current Schengen rules for your passport.', es: 'Generalmente, titulares de pasaporte de EE. UU./Canadá no necesitan visa para estancias cortas. Verifica los requisitos Schengen vigentes para tu pasaporte.', 'zh-cn': '美国/加拿大护照持有人短期停留通常无需签证，请以最新申根政策为准。' } },
    { keys: ['airport', 'fco', 'aoi', 'aeropuerto', '机场'], answer: { en: 'Main option is Rome Fiumicino (FCO). Closest airport is Ancona (AOI). We can coordinate transfers.', es: 'La opción principal es Roma Fiumicino (FCO). El aeropuerto más cercano es Ancona (AOI). Podemos coordinar traslados.', 'zh-cn': '主要建议罗马菲乌米奇诺机场（FCO），最近机场是安科纳（AOI），可协助安排接送。' } },
    { keys: ['shuttle', 'transfer', 'tiburtina', 'traslado', '接驳'], answer: { en: 'Main shuttle departs around 2:00 PM from Rome Tiburtina on Aug 31. Return shuttle is around 11:00 AM on Sep 4.', es: 'El shuttle principal sale aprox. a las 2:00 PM desde Roma Tiburtina el 31 de agosto. El regreso es aprox. a las 11:00 AM el 4 de septiembre.', 'zh-cn': '主接驳车预计8月31日下午2:00从罗马Tiburtina出发，返程接驳约为9月4日上午11:00。' } },
    { keys: ['rsvp'], answer: { en: 'Please complete RSVP as early as possible so we can finalize planning and transportation.', es: 'Por favor completa tu RSVP lo antes posible para cerrar la planeación y transporte.', 'zh-cn': '请尽早完成RSVP，以便我们完成整体安排与交通协调。' } },
    { keys: ['accommodation', 'palazzo', '280', 'hospedaje', '住宿'], answer: { en: 'Palazzo stay is €280 per person (12+). Please bring €280 in cash and place it in the envelope in your room upon arrival.', es: 'El hospedaje en el Palazzo es de €280 por persona (12+). Por favor trae €280 en efectivo y colócalos en el sobre de tu habitación al llegar.', 'zh-cn': 'Palazzo住宿费用为每位12岁以上宾客280欧元。请携带280欧元现金，并在到达后放入房间内的信封。' } },
    { keys: ['registry', 'gift', 'regalo', '礼物'], answer: { en: 'Your presence is the greatest gift. Registry details are on the Registry page (Venmo / e-transfer / check options).', es: 'Tu presencia es el mejor regalo. Los detalles están en la sección Registro (Venmo / e-transfer / cheque).', 'zh-cn': '你们的到来就是最好的礼物。礼物信息请查看“登记处/礼物”页面（Venmo / 转账 / 支票）。' } }
  ];

  function locale() {
    return (window.__LOCALE__ || document.body.getAttribute('data-locale') || 'en').toLowerCase();
  }

  function t(key) {
    const l = locale();
    return (copy[l] && copy[l][key]) || copy.en[key];
  }

  function authOk() {
    const requires = document.body.getAttribute('data-requires-auth') === '1';
    if (!requires) return true;
    return sessionStorage.getItem(AUTH_KEY) === 'ok';
  }

  function answerFor(q) {
    const l = locale();
    const lower = (q || '').toLowerCase();
    const hit = faq.find((f) => f.keys.some((k) => lower.includes(k.toLowerCase())));
    if (hit) return hit.answer[l] || hit.answer.en;
    return t('fallback');
  }

  function render() {
    if (document.getElementById('wedding-chat-widget')) return;

    const style = document.createElement('style');
    style.textContent = `
      #wedding-chat-bubble{position:fixed;right:18px;bottom:18px;z-index:9999;background:#3D5A80;color:#fff;border:none;border-radius:999px;padding:12px 16px;font:500 14px Outfit,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.2);cursor:pointer}
      #wedding-chat-widget{position:fixed;right:18px;bottom:72px;width:min(92vw,340px);max-height:72vh;background:#fff;border:1px solid #e3ddd0;border-radius:14px;box-shadow:0 20px 45px rgba(0,0,0,.25);display:none;flex-direction:column;z-index:9999;overflow:hidden}
      #wedding-chat-widget.open{display:flex}
      #wedding-chat-head{padding:10px 12px;background:#f7f4ee;border-bottom:1px solid #ece5d8}
      #wedding-chat-head h4{margin:0;color:#2f4361;font:600 15px Outfit,sans-serif}
      #wedding-chat-head p{margin:3px 0 0;color:#7b7468;font:400 12px Outfit,sans-serif}
      #wedding-chat-messages{padding:10px;overflow:auto;display:flex;flex-direction:column;gap:8px;background:#fff}
      .wm{border-radius:10px;padding:8px 10px;font:400 13px/1.4 Outfit,sans-serif}
      .wm.bot{background:#f2f4f8;color:#20314b}
      .wm.you{background:#eef7ef;color:#24462a;align-self:flex-end}
      #wedding-chat-form{display:flex;gap:6px;padding:10px;border-top:1px solid #ece5d8;background:#faf9f6}
      #wedding-chat-input{flex:1;border:1px solid #d7d0c3;border-radius:8px;padding:8px;font:13px Outfit,sans-serif}
      #wedding-chat-send{border:none;background:#f26a2e;color:#fff;border-radius:8px;padding:8px 10px;font:600 12px Outfit,sans-serif;cursor:pointer}
    `;
    document.head.appendChild(style);

    const bubble = document.createElement('button');
    bubble.id = 'wedding-chat-bubble';
    bubble.textContent = '💬 ' + t('title');

    const widget = document.createElement('div');
    widget.id = 'wedding-chat-widget';
    widget.innerHTML = `
      <div id="wedding-chat-head"><h4>${t('title')}</h4><p>${t('subtitle')}</p></div>
      <div id="wedding-chat-messages"></div>
      <form id="wedding-chat-form">
        <input id="wedding-chat-input" placeholder="${t('placeholder')}" />
        <button id="wedding-chat-send" type="submit">${t('send')}</button>
      </form>
    `;

    document.body.appendChild(widget);
    document.body.appendChild(bubble);

    const msgs = widget.querySelector('#wedding-chat-messages');
    const form = widget.querySelector('#wedding-chat-form');
    const input = widget.querySelector('#wedding-chat-input');

    const say = (txt, who) => {
      const d = document.createElement('div');
      d.className = 'wm ' + (who || 'bot');
      d.textContent = txt;
      msgs.appendChild(d);
      msgs.scrollTop = msgs.scrollHeight;
    };

    say(t('greet'), 'bot');

    bubble.addEventListener('click', () => {
      widget.classList.toggle('open');
      if (widget.classList.contains('open')) input.focus();
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = (input.value || '').trim();
      if (!q) return;
      say(q, 'you');
      say(answerFor(q), 'bot');
      input.value = '';
    });
  }

  window.initWeddingChat = function () {
    if (!authOk()) return;
    render();
  };
})();
