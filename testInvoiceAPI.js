// testInvoiceAPI.js
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5001/api/invoices';
const CLIENTS_URL = 'http://localhost:5001/api/clients';

console.log('🚀 Starting Invoice API Test Sequence...\n');

/* ------------------------------------------------------------
   🧩 1️⃣ CREATE TEST CLIENT (to satisfy foreign key)
------------------------------------------------------------ */
async function createTestClient() {
  const res = await fetch(CLIENTS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_name: 'Invoice Test Client',
      email: `invoice_test_${Date.now()}@example.com`,
      company_name: 'Test Co',
      phone: '1234567890'
    })
  });

  const data = await res.json();
  console.log('✅ Created Client:', data);
  return data.client_id;
}

/* ------------------------------------------------------------
   🧾 2️⃣ CREATE INVOICE
------------------------------------------------------------ */
async function createInvoice(clientId) {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      invoice_number: `INV-${Date.now()}`,
      issue_date: '2025-11-08',  // ✅ valid date
      due_date: '2025-12-01',     // ✅ valid date
      amount: 2500,
      status: 'Pending',          // ✅ use capitalized
      description: 'Testing invoice backend'
    })
  });

  const data = await res.json();
  console.log('🧾 Created Invoice:', data);
  return data.invoice_id;
}

/* ------------------------------------------------------------
   📜 3️⃣ GET ALL INVOICES
------------------------------------------------------------ */
async function getAllInvoices() {
  const res = await fetch(BASE_URL);
  const data = await res.json();
  console.log('📜 All Invoices:', data);
}

/* ------------------------------------------------------------
   🔍 4️⃣ GET SINGLE INVOICE
------------------------------------------------------------ */
async function getInvoiceById(id) {
  const res = await fetch(`${BASE_URL}/${id}`);
  const data = await res.json();
  console.log('🔍 Single Invoice:', data);
}

/* ------------------------------------------------------------
   ✏️ 5️⃣ UPDATE INVOICE
------------------------------------------------------------ */
async function updateInvoice(id) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'Paid',
      description: 'Client completed payment'
    })
  });
  const data = await res.json();
  console.log('✏️ Updated Invoice:', data);
}

/* ------------------------------------------------------------
   🗑 6️⃣ DELETE INVOICE
------------------------------------------------------------ */
async function deleteInvoice(id) {
  const res = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' });
  console.log('🗑 Deleted Invoice Status:', res.status);
}

/* ------------------------------------------------------------
   🧹 7️⃣ DELETE TEST CLIENT
------------------------------------------------------------ */
async function deleteClient(clientId) {
  const res = await fetch(`${CLIENTS_URL}/${clientId}`, { method: 'DELETE' });
  console.log('🧹 Deleted Test Client Status:', res.status);
}

/* ------------------------------------------------------------
   🚀 MAIN TEST RUNNER
------------------------------------------------------------ */
(async () => {
  try {
    const clientId = await createTestClient();
    const invoiceId = await createInvoice(clientId);
    await getAllInvoices();
    if (invoiceId) {
      await getInvoiceById(invoiceId);
      await updateInvoice(invoiceId);
      await deleteInvoice(invoiceId);
    }
    await deleteClient(clientId);
    console.log('\n✅ All invoice tests completed successfully!');
  } catch (err) {
    console.error('❌ Test sequence failed:', err);
  }
})();
