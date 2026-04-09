export const config = { runtime: 'edge' };

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get('key');

  // No key supplied
  if (!key) {
    return new Response('/* QuoteKit: no key supplied */', {
      headers: { 'Content-Type': 'application/javascript' }
    });
  }

  // Fetch plugin config from Supabase
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/plugins?license_key=eq.${key}&active=eq.true&select=config&limit=1`,
    {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      }
    }
  );

  const data = await res.json();

  // Key not found or inactive
  if (!data || data.length === 0) {
    return new Response('/* QuoteKit: invalid or inactive key */', {
      headers: { 'Content-Type': 'application/javascript' }
    });
  }

  const c = data[0].config;

  // Build the plugin script dynamically from the saved config
  const script = `
(function() {
  var config = ${JSON.stringify(c)};
  var selectedSize = null;

  var style = document.createElement('style');
  style.textContent = [
    '#qk-wrap { font-family: inherit; max-width: 580px; margin: 0 auto; padding: 32px 16px; }',
    '#qk-wrap h2 { font-size: 1.5rem; font-weight: 700; margin-bottom: 6px; color: #1a1a1a; }',
    '#qk-wrap .qk-sub { font-size: 0.9rem; color: #888; margin-bottom: 24px; }',
    '#qk-wrap .qk-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #aaa; margin-bottom: 8px; margin-top: 18px; }',
    '#qk-wrap .qk-services { display: flex; flex-direction: column; gap: 8px; }',
    '#qk-wrap .qk-svc { display: flex; justify-content: space-between; align-items: center; padding: 11px 14px; border: 2px solid #e8e8e8; border-radius: 10px; cursor: pointer; transition: all 0.15s; background: #fff; }',
    '#qk-wrap .qk-svc:hover { border-color: ' + config.accent + '; background: ' + config.accentLight + '; }',
    '#qk-wrap .qk-svc.sel { border-color: ' + config.accent + '; background: ' + config.accentLight + '; }',
    '#qk-wrap .qk-svc .qk-sn { font-weight: 600; font-size: 0.9rem; color: #1a1a1a; }',
    '#qk-wrap .qk-svc .qk-sp { font-size: 0.8rem; color: #aaa; }',
    '#qk-wrap .qk-sizes { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-top: 6px; }',
    '#qk-wrap .qk-size { text-align: center; padding: 10px 8px; border: 2px solid #e8e8e8; border-radius: 10px; cursor: pointer; transition: all 0.15s; background: #fff; }',
    '#qk-wrap .qk-size:hover { border-color: ' + config.accent + '; background: ' + config.accentLight + '; }',
    '#qk-wrap .qk-size.sel { border-color: ' + config.accent + '; background: ' + config.accentLight + '; }',
    '#qk-wrap .qk-size .qk-szn { font-weight: 700; font-size: 0.9rem; color: #1a1a1a; }',
    '#qk-wrap .qk-size .qk-szd { font-size: 0.75rem; color: #aaa; margin-top: 2px; }',
    '#qk-wrap .qk-input { width: 100%; margin-top: 10px; padding: 11px 14px; border: 2px solid #e8e8e8; border-radius: 10px; font-size: 0.9rem; font-family: inherit; transition: border-color 0.15s; box-sizing: border-box; }',
    '#qk-wrap .qk-input:focus { outline: none; border-color: ' + config.accent + '; }',
    '#qk-wrap .qk-btn { width: 100%; margin-top: 14px; padding: 14px; background: ' + config.accent + '; color: #fff; border: none; border-radius: 10px; font-size: 1rem; font-weight: 700; cursor: pointer; font-family: inherit; transition: opacity 0.15s; }',
    '#qk-wrap .qk-btn:hover { opacity: 0.88; }',
    '#qk-wrap .qk-result { display: none; margin-top: 20px; padding: 20px; background: #f9f9f9; border: 1px solid #ebebeb; border-radius: 12px; }',
    '#qk-wrap .qk-result-title { font-size: 0.95rem; font-weight: 700; margin-bottom: 12px; color: #1a1a1a; }',
    '#qk-wrap .qk-row { display: flex; justify-content: space-between; font-size: 0.85rem; color: #666; padding: 5px 0; border-bottom: 1px solid #ebebeb; }',
    '#qk-wrap .qk-total { display: flex; justify-content: space-between; font-size: 1rem; font-weight: 700; color: #1a1a1a; padding-top: 10px; margin-top: 2px; }',
    '#qk-wrap .qk-note { font-size: 0.75rem; color: #bbb; text-align: center; margin-top: 12px; }',
    '#qk-wrap .qk-err { color: #cc4444; font-size: 0.82rem; margin-top: 8px; display: none; }',
  ].join('');
  document.head.appendChild(style);

  var wrap = document.createElement('div');
  wrap.id = 'qk-wrap';

  var servicesHTML = config.services.map(function(s, i) {
    return '<div class="qk-svc" data-idx="' + i + '" onclick="this.classList.toggle(\'sel\')">' +
      '<span class="qk-sn">' + s.name + '</span>' +
      '<span class="qk-sp">from $' + Number(s.price).toLocaleString() + '</span>' +
      '</div>';
  }).join('');

  wrap.innerHTML =
    '<h2>' + config.name + '</h2>' +
    '<div class="qk-sub">' + config.tagline + '</div>' +
    '<div class="qk-label">Services needed</div>' +
    '<div class="qk-services">' + servicesHTML + '</div>' +
    '<div class="qk-label">Project size</div>' +
    '<div class="qk-sizes">' +
      '<div class="qk-size" onclick="qkSelSize(this,0)"><div class="qk-szn">Small</div><div class="qk-szd">1–2 deliverables</div></div>' +
      '<div class="qk-size" onclick="qkSelSize(this,1)"><div class="qk-szn">Medium</div><div class="qk-szd">A few revisions</div></div>' +
      '<div class="qk-size" onclick="qkSelSize(this,2)"><div class="qk-szn">Large</div><div class="qk-szd">Complex scope</div></div>' +
    '</div>' +
    '<input class="qk-input" id="qk-name" type="text" placeholder="Your name">' +
    '<input class="qk-input" id="qk-email" type="email" placeholder="Your email address">' +
    '<div class="qk-err" id="qk-err">Please select a service, project size, and enter your details.</div>' +
    '<button class="qk-btn" onclick="qkSubmit()">' + config.btnText + '</button>' +
    '<div class="qk-result" id="qk-result">' +
      '<div class="qk-result-title">Your estimate</div>' +
      '<div id="qk-lines"></div>' +
      '<div class="qk-total"><span>Total estimate</span><span id="qk-total"></span></div>' +
      '<div class="qk-note">This is an estimate. A full proposal follows after an initial chat.</div>' +
    '</div>';

  document.currentScript
    ? document.currentScript.insertAdjacentElement('afterend', wrap)
    : document.body.appendChild(wrap);

  window.qkSelSize = function(el, idx) {
    document.querySelectorAll('.qk-size').forEach(function(s) { s.classList.remove('sel'); });
    el.classList.add('sel');
    selectedSize = idx;
  };

  window.qkSubmit = function() {
    var name  = document.getElementById('qk-name').value.trim();
    var email = document.getElementById('qk-email').value.trim();
    var sel   = document.querySelectorAll('.qk-svc.sel');
    var err   = document.getElementById('qk-err');

    if (!name || !email || sel.length === 0 || selectedSize === null) {
      err.style.display = 'block'; return;
    }
    err.style.display = 'none';

    var mults = [
      config.multipliers.small,
      config.multipliers.medium,
      config.multipliers.large
    ];
    var mult  = mults[selectedSize];
    var lines = '';
    var total = 0;
    var linesTxt = '';

    sel.forEach(function(el) {
      var s     = config.services[parseInt(el.dataset.idx)];
      var price = Math.round(s.price * mult);
      total    += price;
      lines    += '<div class="qk-row"><span>' + s.name + '</span><span>$' + price.toLocaleString() + '</span></div>';
      linesTxt += s.name + ': $' + price.toLocaleString() + '\\n';
    });

    document.getElementById('qk-lines').innerHTML = lines;
    document.getElementById('qk-total').textContent = '$' + total.toLocaleString();
    document.getElementById('qk-result').style.display = 'block';
  };
})();
`;

  return new Response(script, {
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    }
  });
}
