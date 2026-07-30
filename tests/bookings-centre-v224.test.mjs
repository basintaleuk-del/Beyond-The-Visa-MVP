import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const index=read('web/index.html');
const client=read('web/bookings-centre-v224.js');
const css=read('web/bookings-centre-v224.css');
const dashboard=read('web/dashboard-premium-v73.js');
const menu=read('web/profile-menu-v82.js');

test('bookings centre is loaded and replaces both static booking entry points',()=>{
  assert.match(index,/bookings-centre-v224\.css\?v=224/);
  assert.match(index,/bookings-centre-v224\.js\?v=224/);
  assert.match(dashboard,/BTVBookingsCentre\?\.open/);
  assert.match(menu,/BTVBookingsCentre\?\.open/);
});

test('member ledger reads real owner-scoped Supabase records',()=>{
  assert.match(client,/from\('booking_services'\)/);
  assert.match(client,/from\('availability_rules'\)/);
  assert.match(client,/from\('bookings'\)/);
  assert.match(client,/from\('btv_mentor_bookings'\)/);
  assert.match(client,/\.eq\('user_id',state\.user\.id\)/);
  assert.match(client,/getSession\(\)/);
});

test('booking creation and management use existing protected server actions',()=>{
  assert.match(client,/rpc\('create_booking'/);
  assert.match(client,/rpc\('manage_own_booking'/);
  assert.match(client,/functions\/v1\/booking-checkout/);
  assert.match(client,/Authorization:`Bearer \$\{active\.access_token\}`/);
  assert.match(client,/p_action:'reschedule'/);
  assert.match(client,/p_action:'cancel'/);
});

test('premium layout is responsive and accessible',()=>{
  assert.match(css,/@media\(max-width:900px\)/);
  assert.match(css,/@media\(max-width:620px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css,/overflow-wrap:anywhere/);
  assert.match(client,/role="status"/);
  assert.match(client,/aria-pressed/);
  assert.match(client,/aria-label="Refresh bookings"/);
  assert.match(css,/min-height:48px/);
});
