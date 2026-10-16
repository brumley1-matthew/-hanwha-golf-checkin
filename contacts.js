const consentText = 'I agree to receive text updates from the Hanwha Power Charity Golf Outing organizers about cancellations, rescheduling, and event changes. Message and data rates may apply. I can ask the organizer to stop messages at any time.';
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function normalizePhone(value) {
  const digits = value.replace(/\D/g, '');
  return /^1?[2-9]\d{2}[2-9]\d{6}$/.test(digits) ? '+1' + digits.slice(-10) : null;
}
export function publicSignup(client) {
  document.title = 'Golf Outing Text Updates';
  document.querySelector('.wrap').innerHTML = `<header class="hero"><div class="brand">HANWHA POWER</div><h1>Golf Outing Text Updates</h1><p>Stay informed about cancellations, rescheduling, and event changes.</p></header><section class="card"><form id="contactForm"><label for="contactName">Name</label><input id="contactName" name="name" autocomplete="name" maxlength="120" required style="margin:8px 0 18px"><label for="contactPhone">Mobile Number</label><input id="contactPhone" name="tel" type="tel" autocomplete="tel" inputmode="tel" maxlength="30" placeholder="(555) 555-5555" required style="margin:8px 0 18px"><label style="display:flex;gap:10px;align-items:flex-start;font-size:14px"><input id="contactConsent" type="checkbox" required style="width:20px;flex-shrink:0"> <span>${consentText}</span></label><button class="orange" style="margin-top:20px" type="submit">Sign Up for Updates</button><p id="contactResult" role="status" aria-live="polite"></p></form></section>`;
  const form = document.getElementById('contactForm');
  form.onsubmit = async event => {
    event.preventDefault();
    const result = document.getElementById('contactResult');
    const name = form.elements.name.value.trim().replace(/\s+/g, ' ');
    const phone = normalizePhone(form.elements.tel.value);
    if (!name || !phone || !document.getElementById('contactConsent').checked) {
      result.textContent = 'Enter your name, a valid US mobile number, and check the permission box.'; return;
    }
    const button = form.querySelector('button'); button.disabled = true;
    result.textContent = 'Saving…';
    try {
      const {error} = await client.from('golf_event_contacts').insert({name,phone,consent:true});
      if(error) throw error;
      form.reset(); result.textContent = 'Thank you! Your number has been saved for event updates.';
    } catch {result.textContent = 'We could not save your number. Please try again.';}
    finally {button.disabled = false;}
  };
}
export function contactDashboard(client) {
  const panel = document.createElement('section'); panel.className = 'card';
  panel.innerHTML = `<h2>Event Text Contacts</h2><p class="muted">Share the signup link to collect names and mobile numbers.</p><a id="signupLink" target="_blank" rel="noopener">Open signup form</a><div class="flex" style="margin:14px 0"><button id="copySignup">Copy signup link</button><button id="refreshContacts">Refresh contacts</button><button id="exportContacts">Export names &amp; numbers</button></div><p class="small muted">Bulk text sending needs a connected SMS service. The Text links below open an individual message on your phone.</p><p id="contactStatus" role="status"></p><div id="contactList"></div>`;
  document.getElementById('app').append(panel);
  const link = new URL(location.origin + location.pathname); link.searchParams.set('updates','1');
  panel.querySelector('#signupLink').href = link.href;
  let contacts = [];
  const status = panel.querySelector('#contactStatus');
  panel.querySelector('#copySignup').onclick = async () => {try {await navigator.clipboard.writeText(link.href); status.textContent='Signup link copied.';} catch {status.textContent=link.href;}};
  async function refresh() {
    status.textContent = 'Loading contacts…';
    const {data,error} = await client.from('golf_event_contacts').select('id,name,phone,created_at').order('created_at',{ascending:false});
    if(error) {contacts=[];panel.querySelector('#contactList').textContent='';status.textContent='Unable to load contacts. Sign in as an approved volunteer and try again.';return;}
    const seen = new Set(); contacts=(data||[]).filter(row=>{const key=row.name.toLowerCase()+'|'+row.phone;if(seen.has(key))return false;seen.add(key);return true;});
    status.textContent = `${contacts.length} contact${contacts.length===1?'':'s'} collected`;
    panel.querySelector('#contactList').innerHTML=contacts.map(row=>`<div class="person flex space"><div><strong>${escape(row.name)}</strong><div>${escape(row.phone)}</div><div class="small muted">${escape(new Date(row.created_at).toLocaleString())}</div></div><a href="sms:${escape(row.phone)}">Text</a></div>`).join('') || '<p>No numbers submitted yet.</p>';
  }
  panel.querySelector('#refreshContacts').onclick = refresh;
  panel.querySelector('#exportContacts').onclick = () => {
    if(!contacts.length){status.textContent='Refresh contacts before exporting.';return;}
    const cell = value => '"'+String(value).replace(/^[=+@-]/,'\t$&').replace(/"/g,'""')+'"';
    const csv = [['Name','Mobile Number'],...contacts.map(row=>[row.name,row.phone])].map(row=>row.map(cell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='golf-event-contacts.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  client.auth.onAuthStateChange((_event,session)=>{if(!session){contacts=[];panel.querySelector('#contactList').textContent='';status.textContent='';}else setTimeout(refresh,0);});
}
