import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const root=new URL("../",import.meta.url),read=path=>readFile(new URL(path,root),"utf8");

test("notification upgrade extends the established production architecture",async()=>{
  const [old,sql]=await Promise.all([read("supabase/migrations/20260718153804_remote_schema.sql"),read("supabase/migrations/20260731010000_web_push_notifications_v250.sql")]);
  for(const table of ["notification_preferences","notifications","push_subscriptions","notification_delivery_logs"])assert.match(old,new RegExp(`create table \"public\"\\.\"${table}\"`));
  assert.match(sql,/alter table public\.push_subscriptions/);
  assert.match(sql,/alter table public\.notification_preferences/);
  assert.match(sql,/alter table public\.notifications/);
  assert.doesNotMatch(sql,/create table if not exists public\.profiles|create table if not exists auth\.users/i);
  assert.match(sql,/public\.btv_is_admin\(\)/);
});

test("subscription and preference records are owner scoped and secrets remain server-side",async()=>{
  const [sql,client,endpoint,config]=await Promise.all([read("supabase/migrations/20260731010000_web_push_notifications_v250.sql"),read("web/notification-centre-v250.js"),read("api/push-subscription.js"),read("web/platform-config.js")]);
  assert.match(sql,/user_id=\(select auth\.uid\(\)/);
  assert.match(sql,/grant execute on function public\.btv_notification_register_subscription/);
  assert.match(sql,/revoke all on function public\.btv_notification_register_subscription[\s\S]*from public,anon/);
  assert.match(endpoint,/userFromRequest/);
  assert.match(endpoint,/Authorization:\s*`Bearer \$\{token\}`/);
  assert.match(client,/registration\.pushManager\.getSubscription/);
  assert.match(client,/subscription\.unsubscribe\(\)/);
  assert.match(endpoint,/btv_notification_disable_subscription/);
  assert.doesNotMatch(client,/SERVICE_ROLE|VAPID_PRIVATE_KEY/);
  assert.doesNotMatch(config,/VAPID_PRIVATE_KEY|SERVICE_ROLE/);
});

test("push permission is explicit and every browser state has safe UX",async()=>{
  const client=await read("web/notification-centre-v250.js");
  for(const state of ["unsupported","denied","default","granted"])assert.match(client,new RegExp(state));
  assert.match(client,/data-enable-push/);
  assert.match(client,/Notification\.requestPermission\(\)/);
  const enable=client.indexOf("async function enablePush"),request=client.indexOf("Notification.requestPermission()");
  assert.ok(enable>-1&&request>enable);
  assert.match(client,/Add to Home Screen/);
  assert.match(client,/Safari/);
  assert.match(client,/btv-ios-push-guide-dismissed/);
  assert.doesNotMatch(client,/DOMContentLoaded[^]*requestPermission/);
});

test("service worker validates routing, expiry, tags, actions and duplicate display",async()=>{
  const sw=await read("web/sw.js");
  assert.match(sw,/self\.addEventListener\('push'/);
  assert.match(sw,/data\.expiresAt/);
  assert.match(sw,/getNotifications\(\{tag\}\)/);
  assert.match(sw,/notificationclick/);
  assert.match(sw,/event\.action==='dismiss'/);
  assert.match(sw,/clients\.matchAll/);
  assert.match(sw,/clients\.openWindow/);
  assert.match(sw,/url\.origin===self\.location\.origin/);
  assert.match(sw,/BTV_PUSH_SUBSCRIPTION_CHANGED/);
});

test("campaign dispatch is admin protected, targeted, preference aware and idempotent",async()=>{
  const [sender,lib,sql]=await Promise.all([read("api/notification-dispatch.js"),read("api/_lib/notifications.cjs"),read("supabase/migrations/20260731010000_web_push_notifications_v250.sql")]);
  assert.match(sender,/requireAdmin/);
  assert.match(sender,/status\(429\)/);
  assert.match(sender,/already being processed/);
  assert.match(sender,/idempotency_key/);
  for(const target of ["destination_country","role","account_type","profession","registration_stage","user_id"])assert.match(lib,new RegExp(target));
  for(const preference of ["job_alerts_enabled","visa_updates_enabled","mentor_messages_enabled","booking_updates_enabled","learning_reminders_enabled","marketing_enabled","account_alerts_enabled"])assert.match(lib,new RegExp(preference));
  assert.match(lib,/inQuietHours/);
  assert.match(lib,/queueDigest/);
  assert.match(lib,/deliverDigests/);
  assert.match(lib,/offset \+= 100/);
  assert.match(sql,/idempotency_key text not null unique/);
  assert.match(sql,/notifications_user_dedupe_uidx/);
});

test("job notifications match destinations and suppress expired or duplicate jobs",async()=>{
  const [lib,sql]=await Promise.all([read("api/_lib/notifications.cjs"),read("supabase/migrations/20260731010000_web_push_notifications_v250.sql")]);
  assert.match(lib,/generateJobAlerts/);
  assert.match(lib,/job\.closing_date/);
  assert.match(lib,/job\.country[\s\S]*destination/);
  assert.match(lib,/job_alerts_enabled=eq\.true/);
  assert.match(lib,/notification_job_matches/);
  assert.match(lib,/notification_job_matches\?select=user_id,job_id/);
  assert.match(sql,/primary key\(user_id,job_id\)/);
});

test("scheduled processing uses cron authentication, locking and invalid endpoint cleanup",async()=>{
  const [scheduler,lib,vercel]=await Promise.all([read("api/notification-scheduler.js"),read("api/_lib/notifications.cjs"),read("vercel.json")]);
  assert.match(scheduler,/CRON_SECRET/);
  assert.match(scheduler,/status=eq\.scheduled/);
  assert.match(scheduler,/status: "processing"/);
  assert.match(scheduler,/if \(!locked\?\.length\) continue/);
  assert.match(scheduler,/generateJobAlerts/);
  assert.match(vercel,/"path": "\/api\/notification-scheduler"/);
  assert.match(lib,/\[404, 410\]/);
  assert.match(lib,/is_active: false/);
  assert.match(lib,/notification_delivery_logs/);
});

test("member and admin interfaces are loaded, responsive and accessible",async()=>{
  const [index,admin,client,clientCss,adminJs,adminCss]=await Promise.all([read("web/index.html"),read("web/admin.html"),read("web/notification-centre-v250.js"),read("web/notification-centre-v250.css"),read("web/admin-notifications-v250.js"),read("web/admin-notifications-v250.css")]);
  assert.match(index,/notification-centre-v250\.js\?v=250/);
  assert.match(index,/notification-centre-v250\.css\?v=254/);
  assert.match(admin,/admin-notifications-v250\.js\?v=250/);
  assert.match(admin,/admin-notifications-v250\.css\?v=250/);
  for(const marker of ["aria-modal","aria-live","aria-label","role=\"status\""])assert.match(client,new RegExp(marker));
  assert.match(clientCss,/@media\(max-width:850px\)/);
  assert.match(clientCss,/min-height:44px/);
  assert.match(clientCss,/body\.dark/);
  assert.match(clientCss,/prefers-reduced-motion:reduce/);
  assert.match(adminJs,/Review & send/);
  assert.match(adminJs,/confirm\(`You are about to send this notification to/);
  assert.match(adminJs,/Send test to me/);
  assert.match(adminCss,/@media\(max-width:650px\)/);
});

test("Notification Centre owns its desktop canvas and mobile scroll region",async()=>{
  const css=await read("web/notification-centre-v250.css");
  assert.match(css,/\.notifyMain250\{[^}]*max-width:none!important/);
  assert.match(css,/\.notifyMain250\{[^}]*padding:0!important/);
  assert.match(css,/\.notifyMain250\{[^}]*min-height:0/);
  assert.match(css,/\.notifyBody250\{[^}]*min-height:0/);
  assert.match(css,/\.notifyBody250\{[^}]*overflow-y:auto/);
  assert.match(css,/body\.notifyOpen250\{overflow:hidden!important/);
  assert.match(css,/@media\(min-width:851px\) and \(max-width:1100px\)/);
});

test("PWA and environment documentation support browser and iOS deployment without secrets",async()=>{
  const [manifest,env,docs,pkg]=await Promise.all([read("web/manifest.json"),read(".env.example"),read("docs/WEB-PUSH-NOTIFICATIONS.md"),read("package.json")]);
  const parsed=JSON.parse(manifest);
  assert.equal(parsed.display,"standalone");
  assert.ok(parsed.shortcuts.some(item=>item.url.includes("notifications")));
  assert.match(env,/NEXT_PUBLIC_VAPID_PUBLIC_KEY=public-vapid-key/);
  assert.match(env,/VAPID_PRIVATE_KEY=server-only-private-vapid-key/);
  assert.match(docs,/Add the following Vercel/);
  assert.match(docs,/iPhone or iPad/);
  assert.match(docs,/Do not use a broad audience while testing/);
  assert.equal(JSON.parse(pkg).dependencies["web-push"],"^3.6.7");
});
