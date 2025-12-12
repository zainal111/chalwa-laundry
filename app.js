// Chalwa Laundry PWA - app.js
const OWNER_PASSWORD = '12345';
const CONFIG_KEY = 'chalwa_config';
const DATA_KEY = 'chalwa_data';
const HISTORY_KEY = 'chalwa_history';

// default config
const defaultConfig = {
  services: {
    'Cuci Lipat': 3000,
    'Cuci Setrika': 5000,
    'Setrika Saja': 2000
  },
  theme: { primary: '#2B7A78' }
};

function loadConfig(){
  const raw = localStorage.getItem(CONFIG_KEY);
  if(!raw) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(defaultConfig));
    return defaultConfig;
  }
  try { return JSON.parse(raw); } catch(e){ localStorage.setItem(CONFIG_KEY, JSON.stringify(defaultConfig)); return defaultConfig;}
}

function saveConfig(cfg){ localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg)); }

function loadHistory(){
  const raw = localStorage.getItem(HISTORY_KEY);
  if(!raw) return [];
  try { return JSON.parse(raw); } catch(e){ return []; }
}
function saveHistory(h){ localStorage.setItem(HISTORY_KEY, JSON.stringify(h)); }

function renderServices(){
  const cfg = loadConfig();
  const sel = document.getElementById('serviceSelect');
  sel.innerHTML = '';
  for(const k of Object.keys(cfg.services)){
    const opt = document.createElement('option');
    opt.value = k;
    opt.textContent = `${k} — Rp ${cfg.services[k]}`;
    sel.appendChild(opt);
  }
  renderPriceList();
}

function renderPriceList(){
  const cfg = loadConfig();
  const wrap = document.getElementById('priceList');
  wrap.innerHTML = '';
  for(const [k,v] of Object.entries(cfg.services)){
    const div = document.createElement('div');
    div.innerHTML = `<strong>${k}</strong> — Rp ${v} ${isOwnerLogged()? '<button data-key="'+k+'" class="editPrice">Edit</button>' : ''}`;
    wrap.appendChild(div);
  }
  // attach edit handlers
  document.querySelectorAll('.editPrice').forEach(btn=>{
    btn.onclick = ()=>{
      const key = btn.getAttribute('data-key');
      const val = prompt('Masukkan harga baru untuk '+key, cfg.services[key]);
      const n = parseInt(val);
      if(!isNaN(n) && n>0){ cfg.services[key]=n; saveConfig(cfg); renderServices(); alert('Disimpan'); }
    };
  });
}

function isOwnerLogged(){
  return sessionStorage.getItem('chal_owner') === '1';
}

function renderHistory(){
  const hist = loadHistory();
  const ul = document.getElementById('history');
  ul.innerHTML = '';
  hist.slice().reverse().forEach(h=>{
    const li = document.createElement('li');
    li.innerHTML = `<div><strong>${h.type.toUpperCase()}</strong> Rp ${h.amount} — ${h.service||''}</div><div style="font-size:12px;color:#666">${h.name||''} • ${new Date(h.time).toLocaleString()}</div>`;
    ul.appendChild(li);
  });
}

function calcTotal(){
  const cfg = loadConfig();
  const svc = document.getElementById('serviceSelect').value;
  const qty = parseInt(document.getElementById('qty').value) || 1;
  const price = cfg.services[svc] || 0;
  const total = price * qty;
  document.getElementById('total').textContent = total;
  return total;
}

function addHistory(entry){
  const hist = loadHistory();
  hist.push(entry);
  saveHistory(hist);
  renderHistory();
}

function exportCSV(){
  const hist = loadHistory();
  if(hist.length===0){ alert('Riwayat kosong'); return; }
  const rows = [['type','amount','service','name','memberId','time']];
  hist.forEach(h=> rows.push([h.type,h.amount,h.service||'',''+(h.name||''),h.memberId||'',new Date(h.time).toISOString()]));
  const csv = rows.map(r=> r.map(c=> '"'+(''+c).replace(/"/g,'""')+'"').join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'chalwa_history.csv'; a.click();
  URL.revokeObjectURL(url);
}

function backupData(){
  const cfg = localStorage.getItem(CONFIG_KEY);
  const hist = localStorage.getItem(HISTORY_KEY);
  const balances = localStorage.getItem('chalwa_balances');
  const data = {config: JSON.parse(cfg||'{}'), history: JSON.parse(hist||'[]'), balances: JSON.parse(balances||'{}')};
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='chalwa_backup.json'; a.click();
  URL.revokeObjectURL(url);
}

function restoreData(){
  const inp = document.createElement('input'); inp.type='file'; inp.accept='.json';
  inp.onchange = (e)=>{
    const f = inp.files[0];
    if(!f) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      try {
        const obj = JSON.parse(reader.result);
        if(obj.config) localStorage.setItem(CONFIG_KEY, JSON.stringify(obj.config));
        if(obj.history) localStorage.setItem(HISTORY_KEY, JSON.stringify(obj.history));
        if(obj.balances) localStorage.setItem('chalwa_balances', JSON.stringify(obj.balances));
        alert('Restore selesai');
        renderServices(); renderHistory(); renderPriceList();
      } catch(err){ alert('File tidak valid'); }
    };
    reader.readAsText(f);
  };
  inp.click();
}

function payCash(){
  const total = calcTotal();
  const name = document.getElementById('customerName').value || 'Tamu';
  addHistory({type:'cash', amount: total, service: document.getElementById('serviceSelect').value, name: name, memberId: null, time: Date.now()});
  alert('Pembayaran tunai tercatat. Total Rp '+total);
  window.printReceipt && window.printReceipt({type:'cash', amount: total, service: document.getElementById('serviceSelect').value, name, time: Date.now()});
}

async function payMember(){
  const memberId = document.getElementById('memberId').value.trim();
  if(!memberId){ alert('Masukkan Member ID untuk bayar pakai saldo'); return; }
  const total = calcTotal();
  const balancesRaw = localStorage.getItem('chalwa_balances');
  const balances = balancesRaw ? JSON.parse(balancesRaw) : {};
  const bal = balances[memberId] || 0;
  if(bal < total){ alert('Saldo tidak cukup (saldo: Rp '+bal+')'); return; }
  balances[memberId] = bal - total;
  localStorage.setItem('chalwa_balances', JSON.stringify(balances));
  addHistory({type:'use', amount: total, service: document.getElementById('serviceSelect').value, name: document.getElementById('customerName').value||'', memberId, time: Date.now()});
  alert('Berhasil potong saldo. Sisa saldo Rp '+balances[memberId]);
  window.printReceipt && window.printReceipt({type:'use', amount: total, service: document.getElementById('serviceSelect').value, name: document.getElementById('customerName').value||'', time: Date.now()});
}

function depositToMember(){
  const memberId = prompt('Masukkan Member ID');
  if(!memberId) return;
  const v = parseInt(prompt('Masukkan nominal deposit (Rp)', '10000')) || 0;
  if(v<=0) return alert('Nominal tidak valid');
  const balancesRaw = localStorage.getItem('chalwa_balances');
  const balances = balancesRaw ? JSON.parse(balancesRaw) : {};
  const before = balances[memberId] || 0;
  balances[memberId] = before + v;
  localStorage.setItem('chalwa_balances', JSON.stringify(balances));
  addHistory({type:'deposit', amount: v, service: null, name:'', memberId, time: Date.now()});
  alert('Deposit sukses. Saldo member '+memberId+' = Rp '+balances[memberId]);
}

function resetData(){
  if(!confirm('Yakin reset semua data? Tindakan ini tidak dapat dibatalkan.')) return;
  localStorage.removeItem(HISTORY_KEY);
  localStorage.removeItem('chalwa_balances');
  localStorage.removeItem(CONFIG_KEY);
  location.reload();
}

// PWA install prompt handling
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e)=>{
  e.preventDefault();
  deferredPrompt = e;
  document.getElementById('btn-install').style.display = 'inline-block';
});

document.addEventListener('DOMContentLoaded', ()=>{
  renderServices();
  renderHistory();
  document.getElementById('btn-calc').addEventListener('click', calcTotal);
  document.getElementById('btn-pay').addEventListener('click', payMember);
  document.getElementById('btn-cash').addEventListener('click', payCash);
  document.getElementById('btn-export').addEventListener('click', exportCSV);
  document.getElementById('btn-backup').addEventListener('click', backupData);
  document.getElementById('btn-restore').addEventListener('click', restoreData);
  document.getElementById('btn-owner').addEventListener('click', ()=>{ document.getElementById('kasir-section').classList.add('hidden'); document.getElementById('owner-section').classList.remove('hidden'); });
  document.getElementById('btn-login-owner').addEventListener('click', ()=>{
    const pass = document.getElementById('ownerPass').value;
    if(pass === OWNER_PASSWORD){ sessionStorage.setItem('chal_owner','1'); document.getElementById('ownerArea').classList.remove('hidden'); renderPriceList(); renderHistory(); } else alert('Password salah');
  });
  document.getElementById('btn-reset').addEventListener('click', resetData);
  document.getElementById('btn-install').addEventListener('click', async ()=>{
    if(deferredPrompt){ deferredPrompt.prompt(); const choice = await deferredPrompt.userChoice; deferredPrompt = null; }
  });
  // attach deposit shortcut
  document.getElementById('btn-owner').addEventListener('dblclick', ()=>{ depositToMember(); });
});

// print handler uses printer.js
