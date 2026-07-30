import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (file) => readFileSync(file, "utf8");
const index = read("web/index.html");
const dashboard = read("web/dashboard-premium-v73.js");
const profile = read("web/profile-menu-v82.js");
const client = read("web/inbox-centre-v234.js");
const css = read("web/inbox-centre-v234.css");
const migration = read("supabase/migrations/20260730220000_member_inbox_v234.sql");

test("the member-facing Bookings menu is replaced by the Inbox without deleting booking services", () => {
  assert.match(dashboard, /\["Inbox", "inbox"\]/);
  assert.doesNotMatch(dashboard, /\["Bookings", "bookings"\]/);
  assert.match(profile, /item\("inbox", "Inbox", "Mentor, job and account messages"\)/);
  assert.doesNotMatch(profile, /item\("bookings"/);
  assert.match(index, /bookings-centre-v224\.js\?v=224/);
  assert.match(index, /inbox-centre-v234\.js\?v=234/);
  assert.match(index, /inbox-centre-v234\.css\?v=239/);
});

test("the inbox uses real owner-protected Supabase threads and messages", () => {
  assert.match(migration, /create table if not exists public\.btv_inbox_threads/);
  assert.match(migration, /create table if not exists public\.btv_inbox_messages/);
  assert.match(migration, /user_id = \(select auth\.uid\(\)\)/);
  assert.match(migration, /alter table public\.btv_inbox_threads enable row level security/);
  assert.match(migration, /revoke insert, update, delete on public\.btv_inbox_threads from anon, authenticated/);
  assert.match(client, /\.from\("btv_inbox_threads"\)/);
  assert.match(client, /\.from\("btv_inbox_messages"\)/);
  assert.match(client, /\.from\("btv_notifications"\)/);
  assert.match(client, /\.from\("notifications"\)/);
});

test("job offers require authorised senders and mentor messages require a real booking", () => {
  assert.match(migration, /p_category = 'job_offer'/);
  assert.match(migration, /v_service or v_admin/);
  assert.match(migration, /status = 'approved'/);
  assert.match(migration, /from public\.btv_mentor_bookings b/);
  assert.match(migration, /A valid mentor booking is required/);
});

test("member replies are server-controlled and pass contact-sharing enforcement", () => {
  assert.match(migration, /create or replace function public\.btv_inbox_send_reply/);
  assert.match(migration, /public\.btv_enforce_contact_sharing\('inbox_reply', p_body, v_user\)/);
  assert.match(migration, /v_thread\.category not in \('mentor','application','support'\)/);
  assert.match(client, /\.rpc\("btv_inbox_send_reply"/);
  assert.match(client, /contact details, external links and off-platform payments cannot be shared/);
});

test("the inbox is a responsive desktop workspace and mobile conversation flow", () => {
  assert.match(css, /grid-template-columns:minmax\(250px,310px\) minmax\(340px,430px\) minmax\(430px,1fr\)/);
  assert.match(css, /\.inboxRail234 nav\{position:static;inset:auto;width:auto;transform:none/);
  assert.match(css, /@media\(max-width:520px\)/);
  assert.match(css, /\.inboxRail234 nav\{position:fixed;inset:auto 0 0;width:100%;transform:none/);
  assert.match(css, /grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
  assert.match(css, /\.inboxFolder234\{min-width:0;width:100%;height:46px/);
  assert.match(css, /\.showConversation \.inboxReader234\{display:flex/);
  assert.match(client, /aria-label="Inbox folders"/);
  assert.match(client, /aria-label="Search messages"/);
  assert.match(client, /data-inbox-list/);
});
