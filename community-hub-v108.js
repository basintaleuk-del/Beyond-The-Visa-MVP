(() => {
  'use strict';

  // ─── constants ───────────────────────────────────────────────────────────────
  const TOPICS = ['All','Introductions','CBT study','NCLEX study','Registration journey','Jobs and interviews','Settling in'];
  let activeTopic = 'All', query = '', cachedPosts = [], cachedLikedIds = new Set(), loading = false;

  // ─── helpers ─────────────────────────────────────────────────────────────────
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const db  = () => window.btvSupabase;
  const uid = () => db()?.auth?.getSession ? null : null; // filled lazily via session
  const memberName = () => {
    let extra = {}, account = {};
    try { extra = window.profileExtra?.() || {}; } catch {}
    try { account = window.authAccount?.() || {}; } catch {}
    return extra.preferred || account.name || 'Member';
  };
  const initials = name => String(name || 'M').trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();
  const ago = date => {
    const s = Math.max(1, Math.round((Date.now() - new Date(date).getTime()) / 1000));
    if (s < 60)    return 'Just now';
    if (s < 3600)  return `${Math.floor(s/60)}m ago`;
    if (s < 86400) return `${Math.floor(s/3600)}h ago`;
    return new Date(date).toLocaleDateString('en-GB', {day:'numeric',month:'short',year:new Date(date).getFullYear()===new Date().getFullYear()?undefined:'numeric'});
  };

  // ─── Supabase data layer ──────────────────────────────────────────────────────
  async function fetchPosts() {
    const client = db();
    if (!client) return [];
    const { data, error } = await client
      .from('btv_community_posts')
      .select(`id, author_name, topic, body, likes, created_at,
               btv_community_replies(id, author_name, body, created_at)`)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) { console.warn('[Community] fetchPosts error', error.message); return []; }
    return data || [];
  }

  async function fetchLikedIds(userId) {
    if (!userId) return new Set();
    const client = db();
    if (!client) return new Set();
    const { data } = await client
      .from('btv_community_likes')
      .select('post_id')
      .eq('user_id', userId);
    return new Set((data || []).map(r => r.post_id));
  }

  async function submitPost(topic, body) {
    const client = db();
    if (!client) throw new Error('Database not available');
    const { data: { session } } = await client.auth.getSession();
    if (!session) throw new Error('Please sign in to post');
    const { error } = await client.from('btv_community_posts').insert({
      user_id: session.user.id,
      author_name: memberName(),
      topic,
      body,
    });
    if (error) throw new Error(error.message);
  }

  async function submitReply(postId, body) {
    const client = db();
    if (!client) throw new Error('Database not available');
    const { data: { session } } = await client.auth.getSession();
    if (!session) throw new Error('Please sign in to reply');
    const { error } = await client.from('btv_community_replies').insert({
      post_id: postId,
      user_id: session.user.id,
      author_name: memberName(),
      body,
    });
    if (error) throw new Error(error.message);
  }

  async function toggleLike(postId) {
    const client = db();
    if (!client) return;
    const { data } = await client.rpc('btv_toggle_post_like', { p_post_id: postId });
    return data;
  }

  // ─── feed renderer (never re-renders the whole screen) ───────────────────────
  function renderFeed(host) {
    if (!host) return;
    const visible = cachedPosts.filter(p =>
      (activeTopic === 'All' || p.topic === activeTopic) &&
      (!query || `${p.author_name} ${p.topic} ${p.body}`.toLowerCase().includes(query))
    );
    if (!visible.length) {
      host.innerHTML = `<div class="communityEmpty108"><span aria-hidden="true">◎</span>
        <h3>${query || activeTopic !== 'All' ? 'No matching conversations' : 'Start the conversation'}</h3>
        <p>${query || activeTopic !== 'All' ? 'Try another topic or search term.' : 'Introduce yourself, ask a thoughtful question or share a useful study tip.'}</p>
      </div>`;
      return;
    }
    host.innerHTML = visible.map(p => {
      const replies = p.btv_community_replies || [];
      const liked = cachedLikedIds.has(p.id);
      return `<article data-post-id="${esc(p.id)}">
        <div class="postIdentity108">
          <span class="postAvatar108" aria-hidden="true">${esc(initials(p.author_name))}</span>
          <div><b>${esc(p.author_name)}</b><time datetime="${esc(p.created_at)}">${esc(ago(p.created_at))}</time></div>
          <span class="topicBadge108">${esc(p.topic)}</span>
        </div>
        <p class="postText108">${esc(p.body)}</p>
        <div class="postActions108">
          <button type="button" data-like108="${esc(p.id)}" aria-label="Like post" class="${liked?'liked108':''}">${liked?'♥':'♡'} ${Number(p.likes||0)}</button>
          <button type="button" data-reply108="${esc(p.id)}">Reply · ${replies.length}</button>
        </div>
        ${replies.length ? `<div class="communityReplies108">${replies.map(r=>`<div class="communityReply108"><b>${esc(r.author_name)}:</b> ${esc(r.body)}</div>`).join('')}</div>` : ''}
        <form class="replyForm108" data-reply-form="${esc(p.id)}" hidden>
          <textarea rows="2" maxlength="600" required placeholder="Write a supportive reply…"></textarea>
          <button type="submit">Post reply</button>
        </form>
      </article>`;
    }).join('');

    // Like buttons
    host.querySelectorAll('[data-like108]').forEach(btn => btn.addEventListener('click', async () => {
      const postId = btn.dataset.like108;
      btn.disabled = true;
      await toggleLike(postId);
      // optimistic update in cache
      const post = cachedPosts.find(p => p.id === postId);
      if (post) {
        if (cachedLikedIds.has(postId)) { cachedLikedIds.delete(postId); post.likes = Math.max(0, post.likes - 1); }
        else { cachedLikedIds.add(postId); post.likes = (post.likes || 0) + 1; }
      }
      renderFeed(host);
    }));

    // Reply toggles
    host.querySelectorAll('[data-reply108]').forEach(btn => btn.addEventListener('click', () => {
      const form = host.querySelector(`[data-reply-form="${btn.dataset.reply108}"]`);
      if (!form) return;
      form.hidden = !form.hidden;
      if (!form.hidden) form.querySelector('textarea').focus();
    }));

    // Reply submit — does NOT call render(), only refreshes feed
    host.querySelectorAll('[data-reply-form]').forEach(form => form.addEventListener('submit', async e => {
      e.preventDefault();
      const body = form.querySelector('textarea').value.trim();
      if (!body) return;
      const postId = form.dataset.replyForm;
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true; btn.textContent = 'Posting…';
      try {
        await submitReply(postId, body);
        form.querySelector('textarea').value = '';
        form.hidden = true;
        // refresh only the feed
        cachedPosts = await fetchPosts();
        renderFeed(host);
      } catch (err) {
        btn.disabled = false; btn.textContent = 'Post reply';
        alert(err.message);
      }
    }));
  }

  // ─── update stats bar without full re-render ──────────────────────────────────
  function updateStats() {
    const totalPosts = document.getElementById('communityStatPosts108');
    const totalReplies = document.getElementById('communityStatReplies108');
    if (totalPosts) totalPosts.textContent = cachedPosts.length;
    if (totalReplies) totalReplies.textContent = cachedPosts.reduce((n, p) => n + (p.btv_community_replies?.length || 0), 0);
  }

  // ─── full screen render (called once per navigation) ─────────────────────────
  async function render() {
    const root = document.getElementById('community');
    if (!root) return;
    root.className = 'screen communityHub108';

    root.innerHTML = `
      <div class="communityTop108">
        <button type="button" class="back" data-history-back aria-label="Go back">←</button>
        <div><span>COMMUNITY HUB</span><h1>Learn, connect and move forward</h1></div>
      </div>
      <section class="communityHero108">
        <div>
          <small>NURSES &amp; MIDWIVES WORLDWIDE</small>
          <h2>You do not have to navigate alone.</h2>
          <p>Share encouragement, exam strategies and relocation experience in a respectful professional space.</p>
        </div>
        <div class="communityPeople108">
          <div class="communityAvatars108" aria-hidden="true"><i>AM</i><i>RN</i><i>MW</i></div>
          <div class="communityStats108">
            <span><b id="communityStatPosts108">…</b><small>POSTS</small></span>
            <span><b id="communityStatReplies108">…</b><small>REPLIES</small></span>
            <span><b>${TOPICS.length - 1}</b><small>TOPICS</small></span>
          </div>
        </div>
      </section>
      <div class="communityLayout108">
        <aside class="communityAside108">
          <form id="communityForm108" class="communityCard108 communityComposer108">
            <div><h2>Share with the community</h2><p>Ask a question or post something genuinely useful.</p></div>
            <label>TOPIC
              <select id="communityTopic108">${TOPICS.slice(1).map(t=>`<option>${esc(t)}</option>`).join('')}</select>
            </label>
            <label>MESSAGE
              <textarea id="communityText108" rows="5" maxlength="1200" required placeholder="What would you like to share?"></textarea>
            </label>
            <button id="communitySubmitBtn108" type="submit">Post to community</button>
            <small class="communityPrivacy108">Do not include identifiable patient information, private employer material or sensitive personal documents.</small>
            <p id="communityFormError108" class="communityFormError108" hidden></p>
          </form>
          <section class="communityCard108 communitySafety108">
            <h2>Community standard</h2>
            <p>Keep every contribution professional, constructive and safe.</p>
            <ul>
              <li>Protect confidentiality</li><li>Be respectful and inclusive</li>
              <li>Use official sources for requirements</li><li>Never replace clinical escalation</li>
            </ul>
          </section>
        </aside>
        <section class="communityMain108">
          <div class="communityTools108">
            <label class="communitySearch108">
              <span aria-hidden="true">⌕</span>
              <input type="search" id="communitySearchInput108" placeholder="Search conversations" aria-label="Search community conversations">
            </label>
          </div>
          <div class="communityTopicFilters108" aria-label="Filter community topics">
            ${TOPICS.map(t=>`<button type="button" class="${t===activeTopic?'active':''}" data-topic108="${esc(t)}">${esc(t)}</button>`).join('')}
          </div>
          <div id="communityFeed108" class="communityFeed108"><div class="communityLoadingMsg108">Loading posts…</div></div>
        </section>
      </div>`;

    // ── post submit — no render() call, only feed refresh ──
    const form    = root.querySelector('#communityForm108');
    const feedEl  = root.querySelector('#communityFeed108');
    const errEl   = root.querySelector('#communityFormError108');
    const submitBtn = root.querySelector('#communitySubmitBtn108');

    form.addEventListener('submit', async e => {
      e.preventDefault();
      e.stopPropagation(); // prevent platform router intercepting
      const body  = root.querySelector('#communityText108').value.trim();
      const topic = root.querySelector('#communityTopic108').value;
      if (!body) return;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Posting…';
      errEl.hidden = true;
      try {
        await submitPost(topic, body);
        root.querySelector('#communityText108').value = '';
        // refresh feed only — do NOT call render()
        cachedPosts = await fetchPosts();
        updateStats();
        activeTopic = 'All';
        // reset active filter
        root.querySelectorAll('[data-topic108]').forEach(b => b.classList.toggle('active', b.dataset.topic108 === 'All'));
        renderFeed(feedEl);
      } catch (err) {
        errEl.textContent = err.message;
        errEl.hidden = false;
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Post to community';
      }
    });

    // ── search ──
    root.querySelector('#communitySearchInput108').addEventListener('input', e => {
      query = e.target.value.trim().toLowerCase();
      renderFeed(feedEl);
    });

    // ── topic filters ──
    root.querySelectorAll('[data-topic108]').forEach(btn => btn.addEventListener('click', () => {
      activeTopic = btn.dataset.topic108;
      root.querySelectorAll('[data-topic108]').forEach(b => b.classList.toggle('active', b === btn));
      renderFeed(feedEl);
    }));

    // ── load data ──
    loading = true;
    try {
      const client = db();
      let userId = null;
      if (client) {
        const { data: { session } } = await client.auth.getSession();
        userId = session?.user?.id || null;
      }
      [cachedPosts, cachedLikedIds] = await Promise.all([fetchPosts(), fetchLikedIds(userId)]);
    } finally {
      loading = false;
    }
    updateStats();
    renderFeed(feedEl);
  }

  function install() {
    window.renderCommunity = render;
    window.buildCommunity?.();
    render();
    document.addEventListener('click', event => {
      if (event.target.closest('[data-open="community"],[data-go="community"]')) setTimeout(render, 50);
    });
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', install, { once: true })
    : install();
})();
