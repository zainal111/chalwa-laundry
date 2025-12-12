// printer.js - basic 58mm ESC/POS via Web Bluetooth (best-effort) + fallback to window.print
async function printESC(dataLines){
  // try Web Bluetooth first (simple approach - not universal)
  if(navigator.bluetooth){
    try {
      const device = await navigator.bluetooth.requestDevice({acceptAllDevices:true});
      const server = await device.gatt.connect();
      console.log('Connected to printer:', device.name);
      alert('Terhubung ke printer: '+device.name+' (fungsi printing via Bluetooth mungkin terbatas pada browser)');
      generatePrintable(dataLines);
      return;
    } catch(e){
      console.warn('WebBluetooth print failed:', e);
      generatePrintable(dataLines);
      return;
    }
  } else {
    generatePrintable(dataLines);
  }
}

function generatePrintable(dataLines){
  const win = window.open('','_blank','width=320,height=600');
  let body = '<pre style="font-family:monospace;font-size:12px">';
  dataLines.forEach(l=> body += l + '\n');
  body += '</pre>';
  win.document.write(body);
  win.document.close();
  win.focus();
  setTimeout(()=> win.print(),500);
}

// helper available to app
window.printReceipt = function(obj){
  const lines = [];
  lines.push('      CHALWA LAUNDRY');
  lines.push('   Jl. Contoh No.1 • Telp: 0812-XXXX');
  lines.push('-------------------------------');
  lines.push('Tgl: ' + new Date(obj.time).toLocaleString());
  lines.push('Tipe: ' + (obj.type || 'sale'));
  lines.push('Nama: ' + (obj.name || '-'));
  if(obj.memberId) lines.push('Member: ' + obj.memberId);
  if(obj.service) lines.push('Layanan: ' + obj.service);
  lines.push('Total: Rp ' + obj.amount);
  lines.push('-------------------------------');
  lines.push('Terima kasih!');
  printESC(lines);
};
