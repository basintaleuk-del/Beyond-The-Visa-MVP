import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('main professional profile is stored through an authenticated owner-scoped backend contract', () => {
  const [index, client, migration] = [
    read('web/index.html'),
    read('web/profile-persistence-v266.js'),
    read('supabase/migrations/20260731120000_professional_profile_persistence.sql'),
  ];
  assert.match(index, /profile-persistence-v266\.js\?v=266/);
  assert.ok(index.indexOf('function buildProfile()') < index.indexOf('profile-persistence-v266.js'));
  assert.match(client, /auth\.getUser\(\)/);
  assert.match(client, /rpc\("btv_save_member_professional_profile"/);
  assert.doesNotMatch(client, /service_role|SUPABASE_SERVICE/);
  assert.match(migration, /v_user uuid := auth\.uid\(\)/);
  assert.match(migration, /security invoker/);
  assert.match(migration, /on conflict \(user_id\) do update/);
  assert.match(migration, /revoke all on function public\.btv_save_member_professional_profile[\s\S]*from public, anon/);
  assert.match(migration, /grant execute on function public\.btv_save_member_professional_profile[\s\S]*to authenticated/);
});

test('profile cache is account-scoped and logout cannot leak it into another account', () => {
  const [index, client, storage] = [read('web/index.html'), read('web/profile-persistence-v266.js'), read('web/storage-v21.js')];
  assert.match(client, /`btv-profile-extra:\$\{userId\}`/);
  assert.match(index, /localStorage\.setItem\(`btv-profile-extra:\$\{account\.id\}`/);
  assert.match(index, /localStorage\.removeItem\('btv-profile-extra'\);await window\.btvSupabase\.auth\.signOut/);
  assert.match(index, /previousAccount\?\.id&&oldExtra/);
  assert.match(storage, /btv:session-restored[\s\S]*user=null;avatarLoaded=false/);
  assert.equal((index.match(/\.auth\.onAuthStateChange\(/g) || []).length, 1);
});

test('saved values reload from Supabase after a fresh signed-in page state', async () => {
  const source = read('web/profile-persistence-v266.js');
  const ids = ['pfPreferred','pfSpecialty','pfExperience','pfArrival','pfLearning','pfSupport','pfGoal'];
  const fields = Object.fromEntries(ids.map((id) => [id, { value: '' }]));
  fields.pfName = { textContent: '' };
  const submit = { disabled: false };
  const form = {
    dataset: {},
    onsubmit: null,
    reportValidity: () => true,
    querySelector: () => submit,
  };
  const status = { textContent: '', dataset: {} };
  const profile = { classList: { contains: () => false } };
  const appShell = { hidden: true };
  const storage = new Map([['btv-account', JSON.stringify({ id: 'user-1', name: 'Member' })]]);
  const localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
  };
  let serverRow = {
    preferred_name: 'Amina', clinical_specialty: 'Critical care', experience_level: '6–10 years',
    target_arrival_month: '2027-03-01', learning_preference: 'Detailed explanations',
    priority_support: 'Finding a job', career_goal: 'Lead an international nursing team',
  };
  let rpcArgs;
  const query = { select() { return this; }, eq() { return this; }, async maybeSingle() { return { data: serverRow, error: null }; } };
  const listeners = {};
  const window = {
    btvSupabase: {
      auth: { async getUser() { return { data: { user: { id: 'user-1' } }, error: null }; } },
      from() { return query; },
      async rpc(name, args) { rpcArgs = { name, args }; serverRow = {
        preferred_name: args.p_preferred_name, clinical_specialty: args.p_clinical_specialty,
        experience_level: args.p_experience_level, target_arrival_month: `${args.p_target_arrival_month}-01`,
        learning_preference: args.p_learning_preference, priority_support: args.p_priority_support,
        career_goal: args.p_career_goal,
      }; return { data: serverRow, error: null }; },
    },
    addEventListener(type, handler) { listeners[type] = handler; },
    dispatchEvent() {},
  };
  const document = {
    readyState: 'complete',
    getElementById(id) { if (id === 'profileForm') return form; if (id === 'profile') return profile; if (id === 'appShell') return appShell; return fields[id] || null; },
    querySelector(selector) { return selector.includes('data-profile-save-status') ? status : null; },
    addEventListener() {},
  };
  const context = { window, document, localStorage, console, setTimeout, CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init?.detail; } } };
  vm.runInNewContext(source, context);
  await window.BTVProfilePersistence266.hydrate(true);
  assert.equal(fields.pfPreferred.value, 'Amina');
  assert.equal(fields.pfArrival.value, '2027-03');
  fields.pfGoal.value = 'Become a clinical director';
  await form.onsubmit({ preventDefault() {}, currentTarget: form });
  assert.equal(rpcArgs.name, 'btv_save_member_professional_profile');
  assert.equal(rpcArgs.args.p_career_goal, 'Become a clinical director');
  assert.equal(JSON.parse(storage.get('btv-profile-extra:user-1')).goal, 'Become a clinical director');
  for (const id of ids) fields[id].value = '';
  storage.delete('btv-profile-extra');
  await window.BTVProfilePersistence266.hydrate(true);
  assert.equal(fields.pfPreferred.value, 'Amina');
  assert.equal(fields.pfGoal.value, 'Become a clinical director');
});

test('existing browser-only profile is migrated once instead of overwritten by an empty cloud row', () => {
  const client = read('web/profile-persistence-v266.js');
  assert.match(client, /if \(!data && Object\.values\(cached\)\.some/);
  assert.match(client, /const migrated = await persist\(user, cached\)/);
  assert.ok(client.indexOf('const migrated = await persist(user, cached)') < client.indexOf('writeCache(user.id, fromServer(data || {}))', client.indexOf('const migrated')));
});
