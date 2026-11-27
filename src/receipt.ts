export type ReceiptDetails = {
  id: string;
  name: string;
  email: string;
  country: string;
  rot: string;
  package: string;
  amount: number | string;
  currency: string;
  reference: string;
  created: string;
};

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]!));

export function receiptHtml(receipt: ReceiptDetails) {
  const label = receipt.package === 'evenOdd' ? 'Even / Odd · Regular'
    : receipt.package === 'overUnder' ? 'Over 6 / Under 3 · Regular'
      : receipt.package === 'matches' ? 'Matches · V.I.P.' : receipt.package;
  const rows = [
    ['Receipt', receipt.id], ['Package', label], ['Payment', `${receipt.currency} ${Number(receipt.amount).toFixed(2)} · one-time lifetime access`],
    ['Client', receipt.name], ['Email', receipt.email], ['Country', receipt.country], ['Deriv ROT', receipt.rot],
    ['TRON transaction hash', receipt.reference], ['Paid at', new Date(receipt.created).toLocaleString()],
  ].map(([heading, value]) => `<tr><th>${escapeHtml(heading)}</th><td>${escapeHtml(value)}</td></tr>`).join('');
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>BrandyFx receipt ${escapeHtml(receipt.id)}</title>
  <style>body{margin:0;padding:40px;background:#06100c;color:#f7fbf8;font:16px/1.6 system-ui,sans-serif}.receipt{max-width:760px;margin:auto;padding:36px;border:1px solid #2ee6a2;border-radius:22px;background:#0c1913}h1{margin:0;color:#2ee6a2}p{color:#c3d2c9}table{width:100%;border-collapse:collapse;margin-top:26px}th,td{padding:14px 10px;border-bottom:1px solid #31443a;text-align:left;vertical-align:top}th{width:32%;color:#9db4a7}td{overflow-wrap:anywhere}.thanks{margin-top:30px;padding:18px;border-radius:12px;background:#102b20;color:white}</style>
  <main class="receipt"><p>PAYMENT RECEIPT · TRC20</p><h1>Thank you for trusting BrandyFx.</h1><p>Keep this receipt as proof of the package and Deriv account covered by your payment.</p><table>${rows}</table><p class="thanks">Your access is a one-time purchase for the lifetime of the BrandyFx service, subject to the published terms and refund policy.</p></main></html>`;
}

export function downloadReceipt(receipt: ReceiptDetails) {
  const blob = new Blob([receiptHtml(receipt)], { type: 'text/html;charset=utf-8' });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = `BrandyFx-receipt-${receipt.id}.html`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(href), 1000);
}

export function receiptMailto(recipient: string, receipt: ReceiptDetails) {
  const subject = `BrandyFx payment receipt ${receipt.id}`;
  const body = [
    'Thank you for trusting BrandyFx. Here is your payment receipt.', '',
    `Receipt: ${receipt.id}`, `Package: ${receipt.package}`, `Paid: ${receipt.currency} ${Number(receipt.amount).toFixed(2)}`,
    `Client: ${receipt.name}`, `Deriv ROT: ${receipt.rot}`, `Transaction hash: ${receipt.reference}`,
    `Paid at: ${new Date(receipt.created).toLocaleString()}`, '',
    'This is a one-time purchase for lifetime access to the BrandyFx service, subject to the published terms and refund policy.',
  ].join('\n');
  return `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
