import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
const read = name => readFile(new URL('../web/' + name, import.meta.url), 'utf8');
const [html, menu, video, css] = await Promise.all([read('index.html'),read('profile-menu-v82.js'),read('welcome-video-v82.js'),read('v71-feature-merge-v82.css')]);
test('v82 preserves the five-item bottom navigation',()=>{for(const label of ['Home','Journey','Ask Zibur','Learn','Costs'])assert.match(html,new RegExp('<small>'+label+'</small>'))});
test('account menu restores useful member and admin routes',()=>{for(const label of ['Profile','Membership','Preferences','Privacy & legal','Articles','Videos','Bookings','Notifications','Feedback & support','Admin portal'])assert.match(menu,new RegExp(label.replace(/[&]/g,'&')));assert.match(menu,/role==='admin'/)});
test('welcome video is installed and rendered with native controls',async()=>{const info=await stat(new URL('../web/welcome-video-v82.mp4',import.meta.url));assert.ok(info.size>1_000_000);assert.match(video,/welcome-video-v82\.mp4/);assert.match(video,/controls playsinline/)});
test('login writing logo remains larger than the supporting story logo',()=>{assert.match(css,/authBrandLogoV69/);assert.match(css,/storyLogo/);assert.match(css,/310px/);assert.match(css,/145px/)});