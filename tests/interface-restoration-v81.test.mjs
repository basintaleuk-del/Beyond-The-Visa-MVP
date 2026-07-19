import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const index = await readFile(new URL('../web/index.html', import.meta.url), 'utf8');
const css = await readFile(new URL('../web/v71-feature-merge-v82.css', import.meta.url), 'utf8');
test('loads the requested v71 merge after feature styles',()=>{assert.ok(index.indexOf('v71-feature-merge-v82.css?v=88')>index.indexOf('learning-analytics-v79.css?v=79'));assert.match(index,/release-v68\.js\?v=88/);assert.match(index,/release-v71\.js\?v=88/)});
test('does not load photo dashboard replacement',()=>{assert.doesNotMatch(index,/dashboard-premium-v73\.css/);assert.doesNotMatch(index,/dashboard-premium-v73\.js/)});
test('retains original bottom navigation',()=>{for(const label of ['Home','Journey','Ask Zibur','Learn','Costs'])assert.match(index,new RegExp('<small>'+label+'</small>'))});
test('keeps feature, member-menu, video and security routes',()=>{assert.match(css,/authBrandLogoV69/);assert.match(index,/feature-routes-v73\.js/);assert.match(index,/security-hardening-v80\.js/);assert.match(index,/profile-menu-v82\.js/);assert.match(index,/welcome-video-v82\.js/)});