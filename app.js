/* ROM Post · uma página, sem backend, sem dependências. */
(() => {
  'use strict';

  const STORAGE_KEY = 'rompost:material:onepage:v1';
  const THEME_KEY = 'rompost:theme:v2';
  const STYLE_KEY = 'rompost:style:v1';
  const PROFILE_KEY = 'rompost:profile:v1';
  const SIGNATURE_TEXT = 'Post Gerado by @GMNevz';
  const SIGNATURE_HTML = 'Post Gerado by <a href="https://t.me/GMNevz">@GMNevz</a>';
  const FIELDS = ['romName', 'romVersion', 'androidVersion', 'buildType', 'deviceName', 'releaseDate', 'hashtags', 'changelog', 'notes', 'credits', 'by', 'follow', 'join'];
  const get = id => document.getElementById(id);
  const htmlEsc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[character]);
  const localDate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const defaultLinks = () => ['Download', 'Recovery', 'Screenshots'].map(label => ({ label, url: '' }));
  const freshState = () => ({
    romName:'', romVersion:'', androidVersion:'', buildType:'', deviceName:'',
    releaseDate:localDate(), hashtags:'', changelog:'', notes:'', credits:'',
    by:'', follow:'', join:'', repoUrl:'', mode:'caption', tagsManual:false, commitsCache:'', links:defaultLinks()
  });
  const slice = (value, max = 20000) => typeof value === 'string' ? value.slice(0, max) : '';
  function restore(raw) {
    const clean = freshState();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return clean;
    for (const key of FIELDS) clean[key] = slice(raw[key]);
    clean.repoUrl = slice(raw.repoUrl, 160);
    clean.commitsCache = slice(raw.commitsCache, 15000);
    if (!['', 'UNOFFICIAL', 'OFFICIAL', 'BETA', 'STABLE'].includes(clean.buildType)) clean.buildType = '';
    if (!['', '17', '16', '15', '14', '13', '12', '11', '10'].includes(clean.androidVersion)) clean.androidVersion = '';
    if (clean.releaseDate && !/^\d{4}-\d{2}-\d{2}$/.test(clean.releaseDate)) clean.releaseDate = ''; 
    clean.mode = raw.mode === 'message' ? 'message' : 'caption';
    clean.tagsManual = Boolean(raw.tagsManual);
    if (Array.isArray(raw.links)) {
      clean.links = raw.links.slice(0, 18).filter(item => item && typeof item === 'object').map(item => ({ label:slice(item.label, 80), url:slice(item.url, 2048) }));
    }
    return clean;
  }
  let state;
  try { state = restore(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')); }
  catch { state = freshState(); }
  let bannerUrl = '';
  let saveTimeout;
  let toastTimeout;

  function isValidUrl(url) {
    try { const parsed = new URL(String(url).trim()); return ['http:', 'https:'].includes(parsed.protocol) && Boolean(parsed.hostname); }
    catch { return false; }
  }
  function usernameUrl(value) {
    const username = String(value).trim();
    return /^@[a-zA-Z0-9_]{5,32}$/.test(username) ? `https://t.me/${username.slice(1)}` : '';
  }
  const inlineRegex = /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|__([^_]+)__|https?:\/\/[^\s<>()]+|@[a-zA-Z0-9_]{5,32})/gi;
  function inline(source, mode = 'html') {
    const raw = String(source ?? '');
    let result = '';
    let offset = 0;
    for (const match of raw.matchAll(inlineRegex)) {
      const token = match[0];
      const before = raw.slice(offset, match.index);
      result += mode === 'html' ? htmlEsc(before) : before;
      let label = token;
      let url = '';
      let tag = '';
      let trailing = '';
      if (match[2] !== undefined && match[3] !== undefined) {
        label = match[2];
        url = isValidUrl(match[3]) ? match[3] : '';
      } else if (match[4] !== undefined) {
        label = match[4]; tag = 'b';
      } else if (match[5] !== undefined) {
        label = match[5]; tag = 'i';
      } else if (/^https?:\/\//i.test(token)) {
        label = token.replace(/[.,;!?]+$/, '');
        trailing = token.slice(label.length);
        url = isValidUrl(label) ? label : '';
      } else if (token[0] === '@') {
        // Não transformar parte de e-mails como pessoa@dominio.com em menção.
        const preceding = raw.charAt(match.index - 1);
        url = /[\w.%+\-]/.test(preceding) ? '' : usernameUrl(token);
      }
      if (mode === 'html') {
        if (url) result += `<a href="${htmlEsc(url)}" target="_blank" rel="noopener noreferrer">${htmlEsc(label)}</a>`;
        else if (tag) result += `<${tag}>${htmlEsc(label)}</${tag}>`;
        else result += htmlEsc(label);
        if (trailing) result += htmlEsc(trailing);
      } else {
        result += label;
        if (mode === 'safe' && url && url !== label) result += ` (${url})`;
        if (trailing) result += trailing;
      }
      offset = match.index + token.length;
    }
    const remainder = raw.slice(offset);
    return result + (mode === 'html' ? htmlEsc(remainder) : remainder);
  }
  function bulletLines(input) {
    return String(input || '').replace(/\r\n?/g, '\n').split('\n').map(line => line.trim()).filter(Boolean).map(line => `• ${line.replace(/^(?:[•-]\s*|\*\s+|\d+[.)]\s*)/, '')}`);
  }
  function dateDisplay(value) {
    const found = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    return found ? `${found[3]}/${found[2]}/${found[1]}` : '';
  }
  function generateTags() {
    const compact = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '');
    const name = compact(state.romName);
    const deviceParts = state.deviceName.split(/[\/(),]/).map(part => part.trim()).filter(Boolean);
    const candidate = deviceParts.find(part => /^[a-z][a-z0-9_-]{2,23}$/.test(part));
    const device = compact(candidate || deviceParts.at(-1) || '');
    const tags = [name ? `#${name}` : '', '#ROM', state.buildType ? `#${compact(state.buildType)}` : '', state.androidVersion ? `#A${state.androidVersion}` : '', device ? `#${device}` : ''];
    return [...new Set(tags.filter(Boolean))].join(' ');
  }
  function footer(label, source) {
    const entry = String(source || '').trim();
    if (!entry) return null;
    return {
      html:`${htmlEsc(label)} ${inline(entry)}`,
      display:`${label} ${inline(entry, 'display')}`,
      safe:`${label} ${inline(entry, 'safe')}`
    };
  }
  function buildPost() {
    const rows = [];
    const add = (html, display, safe = display) => rows.push({html, display, safe});
    const gap = () => { if (rows.length && rows[rows.length - 1].display !== '') add('', ''); };
    const addText = text => add(inline(text), inline(text, 'display'), inline(text, 'safe'));
    const tags = state.hashtags.trim();
    if (tags) add(`<span class="tags">${htmlEsc(tags)}</span>`, tags);
    const romName = [state.romName.trim(), state.romVersion.trim()].filter(Boolean).join(' ');
    if (romName) {
      const heading = [romName, state.buildType, state.androidVersion ? `Android ${state.androidVersion}` : ''].filter(Boolean).join(' | ');
      add(`<b>${htmlEsc(heading)}</b>`, heading);
    }
    if (state.deviceName.trim()) addText(`Device: ${state.deviceName.trim()}`);
    if (romName && state.releaseDate) addText(`Released: ${dateDisplay(state.releaseDate)}`);
    const links = state.links.filter(entry => entry.label.trim() && isValidUrl(entry.url));
    if (links.length) {
      gap();
      add('▪ ' + links.map(item => `<a href="${htmlEsc(item.url.trim())}" target="_blank" rel="noopener noreferrer">${htmlEsc(item.label.trim())}</a>`).join(' | '),
        '▪ ' + links.map(item => item.label.trim()).join(' | '),
        '▪ ' + links.map(item => `${item.label.trim()}: ${item.url.trim()}`).join(' | '));
    }
    const addSection = (name, contents) => {
      const lines = bulletLines(contents);
      if (!lines.length) return;
      gap();
      add(`<b>${htmlEsc(name)}:</b>`, `${name}:`);
      for (const line of lines) addText(line);
    };
    addSection('Changelog', state.changelog);
    addSection('Notes', state.notes);
    addSection('Credits', state.credits);
    const footerItems = [footer('By', state.by), footer('Follow', state.follow), footer('Join', state.join)].filter(Boolean);
    if (footerItems.length) {
      gap();
      for (const item of footerItems) add(item.html, item.display, item.safe);
    }
    const html = rows.map(item => item.html).join('<br>');
    const display = rows.map(item => item.display).join('\n').trim();
    const safe = rows.map(item => item.safe).join('\n').trim();
    return { html, display, safe, hasContent:Boolean(display) };
  }
  function forCopy() {
    const result = buildPost();
    // A assinatura obrigatória é aplicada somente ao conteúdo enviado à área de transferência.
    // Ela NÃO é exibida nos campos nem na prévia.
    return {
      html:`${result.html}<br><br>${SIGNATURE_HTML}`,
      safe:`${result.safe}\n\n${SIGNATURE_TEXT}`,
      count:result.display.length + 2 + SIGNATURE_TEXT.length
    };
  }
  function renderPreview() {
    const post = buildPost();
    get('postPreview').innerHTML = post.hasContent ? post.html : '<span class="empty-preview">O post aparece aqui conforme você preenche.</span>';
    const cap = state.mode === 'caption' ? 1024 : 4096;
    const copied = post.hasContent ? forCopy() : null;
    const count = copied ? copied.count : 0;
    const tooLong = count > cap;
    const fallbackTooLong = copied && copied.safe.length > cap;
    get('counterLabel').textContent = `${count.toLocaleString('pt-BR')} / ${cap.toLocaleString('pt-BR')} caracteres`;
    get('countStatus').textContent = tooLong ? 'Excedeu' : 'OK';
    get('countStatus').classList.toggle('bad', tooLong);
    get('progressFill').style.width = `${Math.min(100, Math.round(count / cap * 100))}%`;
    get('progressFill').classList.toggle('bad', tooLong);
    get('lengthWarning').hidden = !tooLong && !fallbackTooLong;
    get('lengthWarning').textContent = !copied ? '' : tooLong
      ? (state.mode === 'caption' ? 'Legenda acima do limite padrão. Use “Mensagem” para enviar o texto separado do banner.' : 'Mensagem acima do limite padrão. Divida o texto antes de publicar.')
      : `A opção “Copiar com URLs visíveis” terá ${copied.safe.length.toLocaleString('pt-BR')} caracteres e pode ultrapassar o limite.`;
    const tgPost = document.querySelector('.tg-post');
    tgPost.classList.toggle('is-message', state.mode === 'message');
    tgPost.classList.toggle('no-banner', !bannerUrl && state.mode === 'message');
    document.querySelectorAll('input[name="mode"]').forEach(input => input.checked = input.value === state.mode);
  }
  function renderLinks() {
    const list = get('linksList');
    list.innerHTML = state.links.map((row, index) => `<div class="link-row" data-index="${index}">
       <input class="label-input" aria-label="Nome do link ${index + 1}" type="text" data-field="label" value="${htmlEsc(row.label)}" placeholder="Nome" maxlength="80">
       <input aria-label="URL do link ${index + 1}" type="url" data-field="url" class="${isIncompleteLink(row) && row.label.trim() ? 'invalid' : ''}" value="${htmlEsc(row.url)}" placeholder="https://..." maxlength="2048">
       <button type="button" class="remove-link" data-remove="true" aria-label="Remover link ${index + 1}"><svg class="icon"><use href="#i-close"/></svg></button>
    </div>`).join('');
  }
  function renderFields() {
    for (const field of FIELDS) get(field).value = state[field];
    renderLinks();
    renderTagChips();
    get('repoUrl').value = state.repoUrl || '';
    renderPreview();
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (error) { console.warn('Armazenamento indisponível:', error); }
  }
  /* Perfil do canal (By/Follow/Join) — persistido à parte e reaplicado em novos posts. */
  let profileSaveTimer;
  function scheduleProfileSave() {
    clearTimeout(profileSaveTimer);
    profileSaveTimer = setTimeout(() => {
      try { localStorage.setItem(PROFILE_KEY, JSON.stringify({ by: state.by, follow: state.follow, join: state.join })); } catch { /* armazenamento bloqueado */ }
    }, 400);
  }
  function applyProfile(target) {
    try {
      const profile = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}');
      if (profile && typeof profile === 'object') {
        target.by = slice(profile.by, 300);
        target.follow = slice(profile.follow, 300);
        target.join = slice(profile.join, 300);
      }
    } catch { /* sem perfil salvo */ }
    return target;
  }
  /* Memória de estilo: exemplos de posts antigos usados como few-shot pela IA. */
  let styleSaveTimer;
  function scheduleStyleSave() {
    clearTimeout(styleSaveTimer);
    styleSaveTimer = setTimeout(() => {
      try { localStorage.setItem(STYLE_KEY, get('styleMemory').value.slice(0, 6000)); } catch { /* armazenamento bloqueado */ }
    }, 400);
  }
  function styleExamples() {
    const raw = String(get('styleMemory')?.value || '').trim();
    if (!raw) return [];
    return raw.split(/\n\s*\n/).map(part => part.trim()).filter(part => part.length > 40).slice(0, 2);
  }
  function update() {
    renderPreview();
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(save, 260);
  }
  function toast(message, kind = '') {
    const element = get('toast');
    clearTimeout(toastTimeout);
    element.textContent = message;
    element.className = `toast ${kind}`;
    requestAnimationFrame(() => element.classList.add('visible'));
    toastTimeout = setTimeout(() => element.classList.remove('visible'), 4000);
  }
  function clearBanner() {
    if (bannerUrl) URL.revokeObjectURL(bannerUrl);
    bannerUrl = '';
    get('bannerInput').value = '';
    get('uploadThumb').innerHTML = '<svg class="icon"><use href="#i-image"/></svg>';
    get('uploadTitle').textContent = 'Selecionar imagem';
    get('uploadSubtitle').textContent = 'PNG, JPG ou WebP';
    get('previewBanner').innerHTML = '<div class="image-fallback"><svg class="icon"><use href="#i-image"/></svg><strong>Banner da ROM</strong><small>Selecione uma imagem</small></div>';
    get('removeBanner').hidden = true;
    get('bannerDownload').hidden = true;
    renderPreview();
  }
  function loadBanner(file) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return toast('Escolha uma imagem JPG, PNG ou WebP.', 'error');
    if (file.size > 15 * 1024 * 1024) return toast('Imagem muito grande: máximo de 15 MB.', 'error');
    if (bannerUrl) URL.revokeObjectURL(bannerUrl);
    bannerUrl = URL.createObjectURL(file);
    const thumb = document.createElement('img');
    thumb.src = bannerUrl;
    thumb.alt = '';
    get('uploadThumb').replaceChildren(thumb);
    const preview = document.createElement('img');
    preview.src = bannerUrl;
    preview.alt = `Banner da ROM: ${file.name}`;
    get('previewBanner').replaceChildren(preview);
    get('uploadTitle').textContent = file.name;
    get('uploadSubtitle').textContent = 'Banner adicionado à prévia';
    get('removeBanner').hidden = false;
    renderPreview();
    toast('Banner carregado. Anexe essa imagem no Telegram antes de colar.');
  }
  function isIncompleteLink(item) {
    const label = item.label.trim();
    const url = item.url.trim();
    if (url) return !label || !isValidUrl(url);
    return Boolean(label && !['Download', 'Recovery', 'Screenshots'].includes(label));
  }
  function invalidLinks() {
    const missing = state.links.some(isIncompleteLink);
    return missing;
  }
  function canCopy() {
    if (!state.romName.trim()) { get('romName').focus(); toast('Preencha o nome da ROM para copiar.', 'warn'); return false; }
    if (invalidLinks()) {
      toast('Há links incompletos ou inválidos. Confira os campos de links.', 'error');
      const row = state.links.findIndex(isIncompleteLink);
      const field = state.links[row]?.label.trim() ? 'url' : 'label';
      document.querySelector(`.link-row[data-index="${row}"] input[data-field="${field}"]`)?.focus();
      return false;
    }
    return true;
  }
  async function legacyCopyHtml(html) {
    const node = document.createElement('div');
    node.contentEditable = 'true';
    node.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0;pointer-events:none';
    node.innerHTML = html;
    document.body.appendChild(node);
    const selection = window.getSelection();
    const previousRanges = [];
    if (selection) for (let n = 0; n < selection.rangeCount; n++) previousRanges.push(selection.getRangeAt(n).cloneRange());
    const range = document.createRange();
    range.selectNodeContents(node);
    if (selection) { selection.removeAllRanges(); selection.addRange(range); }
    let success = false;
    try { success = document.execCommand('copy'); }
    finally { if (selection) { selection.removeAllRanges(); previousRanges.forEach(range => selection.addRange(range)); } node.remove(); }
    return success;
  }
  async function copyPlainText(text) {
    if (navigator.clipboard?.writeText && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; }
    const input = document.createElement('textarea');
    input.value = text;
    input.style.cssText = 'position:fixed;left:-9999px;top:0';
    document.body.appendChild(input);
    input.select();
    let success;
    try { success = document.execCommand('copy'); }
    finally { input.remove(); }
    return Boolean(success);
  }
  async function copyRich() {
    if (!canCopy()) return;
    const result = forCopy();
    const limit = state.mode === 'caption' ? 1024 : 4096;
    const overLimit = result.count > limit;
    const rich = `<html><body><div>${result.html}</div></body></html>`;
    if (window.isSecureContext && navigator.clipboard?.write && window.ClipboardItem) {
      try {
        await navigator.clipboard.write([new ClipboardItem({
          'text/html': new Blob([rich], { type:'text/html' }),
          'text/plain': new Blob([result.safe], { type:'text/plain' })
        })]);
        toast(overLimit ? 'Post copiado, mas o texto excede o limite do modo selecionado.' : 'Post copiado. Confira os links ao colar no Telegram.', overLimit ? 'warn' : '');
        return;
      } catch (e) { console.warn('Cópia de HTML indisponível:', e); }
    }
    try {
      if (await legacyCopyHtml(result.html)) { toast(overLimit ? 'Copiado, mas excede o limite do modo selecionado.' : 'Post copiado. Confira os links no Telegram.', overLimit ? 'warn' : ''); return; }
    } catch (e) { console.warn('Seleção de conteúdo falhou:', e); }
    try {
      if (await copyPlainText(result.safe)) { toast(result.safe.length > limit ? 'URLs visíveis copiadas. O texto excede o limite selecionado.' : 'Copiado com URLs visíveis; seu navegador não aceitou os links formatados.', 'warn'); return; }
    } catch (e) { console.warn('Cópia de texto falhou:', e); }
    toast('Não foi possível copiar. Tente acessar o site por HTTPS.', 'error');
  }
  async function copySafe() {
    if (!canCopy()) return;
    try { const text = forCopy().safe; const copied = await copyPlainText(text); const cap = state.mode === 'caption' ? 1024 : 4096; toast(!copied ? 'Não foi possível copiar.' : text.length > cap ? 'Copiado, mas o texto com URLs excede o limite selecionado.' : 'Texto copiado com URLs visíveis.', !copied ? 'error' : text.length > cap ? 'warn' : ''); }
    catch { toast('Permissão para copiar negada pelo navegador.', 'error'); }
  }
  function example() {
    if (state.romName.trim() && !window.confirm('Substituir o rascunho pelo exemplo?')) return;
    state = freshState();
    Object.assign(state, {
      romName:'PixelOS', romVersion:'17.0', androidVersion:'16', buildType:'UNOFFICIAL', deviceName:'POCO F3 / alioth',
      changelog:'Initial release\nImproved system performance\nUpdated security patches',
      notes:'GApps included\nSELinux: Enforcing\nClean flash recommended',
      credits:'Thanks @developer for device trees\nThanks @tester01 for testing',
      by:'@developer', follow:'@ROMUpdates', join:'@ROMCommunity',
      links:[{label:'Download',url:'https://example.com/rom.zip'}, {label:'Recovery',url:'https://example.com/recovery.img'}, {label:'Screenshots',url:'https://example.com/screenshots'}]
    });
    state.hashtags = generateTags();
    clearBanner(); renderFields(); save();
    toast('Exemplo carregado. Substitua os links fictícios antes de publicar.');
  }
  function reset() {
    if (state.romName.trim() && !window.confirm('Limpar o rascunho e começar outro post?')) return;
    state = applyProfile(freshState()); clearBanner(); renderFields(); save();
    window.scrollTo({top:0, behavior:'smooth'});
    toast('Novo post criado.' + (state.by.trim() || state.follow.trim() || state.join.trim() ? ' Rodapé do canal mantido.' : ''));
  }
  function setTheme(theme) {
    const dark = theme === 'dark';
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    get('themeIcon').querySelector('use').setAttribute('href', dark ? '#i-sun' : '#i-moon');
    get('themeLabel').textContent = dark ? 'Claro' : 'Escuro';
    get('themeToggle').setAttribute('aria-label', dark ? 'Ativar modo claro' : 'Ativar modo escuro');
    document.querySelector('meta[name="theme-color"]').setAttribute('content', dark ? '#15131d' : '#f6f4fa');
    try { localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light'); } catch { /* armazenamento bloqueado */ }
  }
  // IA: only field-level actions. Inputs are not saved or sent anywhere other than /api/ai.
  let aiBusy = false;
  const undoValues = Object.create(null);
  async function askAI(task, input, useStyle = false) {
    if (aiBusy) return null;
    if (input.length > 15000) { toast('Use no máximo 15.000 caracteres por consulta.', 'warn'); return null; }
    aiBusy = true;
    const buttons = [...document.querySelectorAll('.ai-actions button,[data-translate],#summarizeBtn,#verifyBtn,#smartRun')];
    buttons.forEach(b => b.disabled = true);
    try {
      const payload = { task, text: input };
      if (useStyle) { const examples = styleExamples(); if (examples.length) payload.style = examples; }
      const response = await fetch('/api/ai', {
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),
        signal:AbortSignal.timeout ? AbortSignal.timeout(30000) : undefined
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || `Falha na IA (${response.status}).`);
      if (!result.data || typeof result.data !== 'object') throw new Error('Resposta da IA inválida.');
      return result.data;
    } catch (e) {
      toast(e.name === 'TimeoutError' ? 'A IA demorou demais. Tente novamente.' : e.message || 'Não foi possível usar a IA.', 'error');
      return null;
    } finally { aiBusy = false;buttons.forEach(b=>b.disabled=false); }
  }
  function setEditedField(key, value) {
    if (typeof value !== 'string' || !FIELDS.includes(key)) return;
    undoValues[key] = state[key];
    state[key] = slice(value, 12000);
    get(key).value = state[key];
    const undoButton = document.querySelector(`[data-undo="${key}"]`);
    if (undoButton) undoButton.hidden = false;
    update();
  }
  function maskForTranslation(source) {
    const tokens = [];
    // Preserve all markup delimiters, exact URLs, @mentions, hashtags, code and file names.
    // The model translates only text between placeholders; an altered token means rejection.
    const re = /```[\s\S]*?```|`[^`\n]*`|\]\(https?:\/\/[^\s)]+\)|\[|\*\*|__|https?:\/\/[^\s<>()]+|(?<![\w.%+\-])@[a-zA-Z0-9_]{5,32}\b|#[a-zA-Z0-9_]+\b|\b[a-zA-Z0-9_.\-]+\.(?:zip|img|apk|tar|xml|prop|sh|json)\b|\r?\n/g;
    const masked = source.replace(re, match => {
      const mark = `[[[RP_${tokens.length}]]]`;
      tokens.push(match);
      return mark;
    });
    return {masked,tokens};
  }
  function restoreTranslation(answer, tokens) {
    const found = [...answer.matchAll(/\[\[\[RP_(\d+)\]\]\]/g)].map(m => Number(m[1]));
    if (found.length !== tokens.length || found.some((v,i)=>v!==i)) return null;
    return answer.replace(/\[\[\[RP_(\d+)\]\]\]/g, (_,n) => tokens[Number(n)]);
  }
  async function translateField(field) {
    if (aiBusy) return;
    const area = get(field);
    const start = area.selectionStart;
    const end = area.selectionEnd;
    const snapshot = area.value;
    const selected = start !== end;
    const original = selected ? snapshot.slice(start,end) : snapshot;
    if (!original.trim()) { toast('Escreva algo para traduzir.', 'warn'); return; }
    if (original.includes('[[[RP_')) {toast('O texto contém uma marca reservada do tradutor.', 'warn');return;}
    const {masked,tokens} = maskForTranslation(original);
    const data = await askAI('translate', masked);
    if (!data) return;
    if (state[field] !== snapshot) {toast('O campo foi editado durante a tradução; nada foi substituído.', 'warn');return;}
    const translated = restoreTranslation(data.text, tokens);
    if (!translated) {toast('A tradução mudou links ou marcações. Texto original preservado.', 'error');return;}
    const next = selected ? snapshot.slice(0,start)+translated+snapshot.slice(end) : translated;
    setEditedField(field, next);
    area.focus();
    if (selected) area.setSelectionRange(start,start+translated.length);
    toast(selected ? 'Trecho traduzido. Confira antes de publicar.' : 'Campo traduzido. Confira antes de publicar.');
  }
  async function processAIInput(task) {
    const source = get('aiSource').value;
    const text = get('aiInput').value.trim();
    if (text.length < 4) {toast('Cole o conteúdo antes de gerar.', 'warn');return false;}
    const realTask = source === 'oldpost' ? 'import' : task;
    const before = get('aiInput').value;
    const data = await askAI(realTask, text, realTask !== 'import');
    if (!data) return false;
    if (get('aiInput').value !== before || get('aiSource').value !== source) {toast('O conteúdo mudou durante a análise. Resultado não aplicado.', 'warn');return false;}
    if (realTask === 'import') {
      const keys = FIELDS.filter(k => k !== 'releaseDate' || /^\d{4}-\d{2}-\d{2}$/.test(data[k] || ''));
      const existing = FIELDS.some(k => state[k]?.trim()) || state.links.some(l=>l.url.trim());
      if (existing && !window.confirm('Substituir os dados atuais pelos extraídos do post antigo?')) return;
      const updated = {...state};
      for (const key of keys) if (typeof data[key] === 'string') updated[key] = data[key];
      if (Array.isArray(data.links)) updated.links = data.links.filter(l=>l && typeof l.label === 'string' && typeof l.url === 'string' && isValidUrl(l.url)).slice(0,18);
      updated.androidVersion = String(updated.androidVersion).replace(/^android\s*/i,'').trim();
      updated.buildType = String(updated.buildType).toUpperCase();
      updated.tagsManual = Boolean(updated.hashtags.trim());
      state = restore(updated);
      if (!state.hashtags.trim()) {state.tagsManual=false;state.hashtags=generateTags();}
      renderFields();save();
      toast('Dados importados. Confira links e campos antes de copiar.');
      return true;
    } else if (typeof data.text === 'string' && data.text.trim()) {
      state.commitsCache = text.slice(0, 15000);
      get('verifyStatus').hidden = true;
      setEditedField('changelog',data.text);
      toast(realTask==='organize'?'Commits organizados. Revise o changelog.':'Changelog gerado. Revise as mudanças.');
      return true;
    }
    return false;
  }
  async function summarizeChangelog() {
    const before = state.changelog;
    if (!before.trim()) {toast('Preencha o changelog para resumir.', 'warn');return;}
    const data = await askAI('summarize',before);
    if (!data) return;
    if (state.changelog !== before) {toast('O changelog mudou durante o resumo. Nada foi substituído.','warn');return;}
    if (typeof data.text === 'string' && data.text.trim()) {setEditedField('changelog',data.text);toast('Changelog resumido. Confira antes de copiar.');}
  }
  function insertCredit() {
    const typed = get('creditUser').value.trim();
    const user = typed.startsWith('@') ? typed : `@${typed}`;
    const role = get('creditRole').value.trim().replace(/\s+/g,' ');
    if (!usernameUrl(user)) {toast('Use um @usuario válido do Telegram (5 a 32 caracteres).','warn');get('creditUser').focus();return;}
    if (!role) {toast('Informe a contribuição.', 'warn');get('creditRole').focus();return;}
    const line = `Thanks ${user} for ${role.replace(/^for\s+/i,'')}`;
    state.credits += (state.credits.trim()?'\n':'') + line;
    get('credits').value = state.credits;
    get('creditUser').value='';get('creditRole').value='';
    update();toast('Crédito adicionado com menção clicável.');
  }
  function getZipProperty(content, key) {
    const line = String(content).split(/\r?\n/).find(row => row.startsWith(key+'='));
    return line ? line.slice(key.length+1).trim() : '';
  }
  async function inspectRomZip(file) {
    if (!file) return;
    const info = get('zipStatus');
    if (!/\.zip$/i.test(file.name)) {toast('Selecione um ZIP de ROM.','warn');return;}
    info.textContent='Lendo metadados...';
    try {
      const size = `${(file.size/1024/1024).toFixed(1)} MB`;
      if (file.size < 22) throw new Error('ZIP muito pequeno ou inválido.');
      const tailSize = Math.min(file.size, 65557);
      const tail = new DataView(await file.slice(file.size-tailSize).arrayBuffer());
      let eocd = -1;
      for (let i=tail.byteLength-22;i>=0;i--) if (tail.getUint32(i,true)===0x06054b50 && i+22+tail.getUint16(i+20,true)<=tail.byteLength) {eocd=i;break;}
      if (eocd < 0) throw new Error('Não foi possível localizar o índice do ZIP.');
      const entriesCount = tail.getUint16(eocd+10,true);
      const centralSize = tail.getUint32(eocd+12,true);
      const centralOffset = tail.getUint32(eocd+16,true);
      if (entriesCount===65535 || centralOffset===0xffffffff || centralSize>12*1024*1024 || centralOffset+centralSize>file.size) throw new Error('ZIP64 ou índice grande demais para leitura rápida.');
      const view = new DataView(await file.slice(centralOffset,centralOffset+centralSize).arrayBuffer());
      const decoder = new TextDecoder();
      let off=0;
      const targets=[];
      const namePattern = /(?:^|\/)(?:META-INF\/com\/(?:android|google\/android)\/metadata|(?:system\/)?system\/build\.prop|(?:system\/)?product\/build\.prop|vendor\/build\.prop)$/i;
      for (let i=0;i<entriesCount;i++) {
        if (off+46>view.byteLength || view.getUint32(off,true)!==0x02014b50) throw new Error('Índice ZIP danificado.');
        const method=view.getUint16(off+10,true);
        const compressed=view.getUint32(off+20,true);
        const plain=view.getUint32(off+24,true);
        const n=view.getUint16(off+28,true),x=view.getUint16(off+30,true),c=view.getUint16(off+32,true);
        const local=view.getUint32(off+42,true);
        if (off+46+n+x+c>view.byteLength) throw new Error('Nome de arquivo ZIP inválido.');
        const name=decoder.decode(new Uint8Array(view.buffer,off+46,n));
        if (namePattern.test(name) && plain<256*1024 && compressed<256*1024 && (method===0||method===8)) targets.push({name,method,compressed,plain,local});
        off+=46+n+x+c;
      }
      const contents={};
      for (const entry of targets.slice(0,12)) {
        const header=new DataView(await file.slice(entry.local,entry.local+30).arrayBuffer());
        if (header.byteLength<30 || header.getUint32(0,true)!==0x04034b50) continue;
        const start=entry.local+30+header.getUint16(26,true)+header.getUint16(28,true);
        if (start+entry.compressed>file.size) continue;
        let bytes=new Uint8Array(await file.slice(start,start+entry.compressed).arrayBuffer());
        if (entry.method===8) {
          if (typeof DecompressionStream==='undefined') continue;
          const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
          bytes=new Uint8Array(await new Response(stream).arrayBuffer());
        }
        if (bytes.byteLength>256*1024 || bytes.byteLength!==entry.plain) continue;
        contents[entry.name]=decoder.decode(bytes);
      }
      const combined=Object.entries(contents);
      const metadata=combined.filter(([name])=>/metadata$/i.test(name)).map(([,data])=>data).join('\n');
      const props=combined.filter(([name])=>/build\.prop$/i.test(name)).map(([,data])=>data).join('\n');
      let android=getZipProperty(props,'ro.build.version.release');
      if (android) android = (android.match(/^\d+/)||[])[0] || '';
      const device=getZipProperty(metadata,'post-device') || getZipProperty(props,'ro.product.device') || getZipProperty(props,'ro.product.system.device');
      const cleanDevice=/^[a-z0-9_-]{2,35}$/i.test(device) ? device : '';
      // ROM e versão: lê ro.<rom>.version das propriedades conhecidas (LineageOS, crDroid, PixelOS…)
      const ROM_BY_PROP={lineage:'LineageOS',crdroid:'crDroid',pixelos:'PixelOS',evolution:'EvolutionX',havoc:'Havoc-OS',aex:'AOSP Extended',dotos:'dotOS',arrow:'ArrowOS',aospa:'AOSPA',pixelexperience:'Pixel Experience'};
      let zipRomName='';let zipRomVersion='';
      for (const line of props.split('\n')) {
        const trimmed=line.trim();
        const modern=/^ro\.([a-z0-9_]+)\.version\s*=\s*(.+)$/i.exec(trimmed);
        const legacy=/^ro\.modversion\s*=\s*(.+)$/i.exec(trimmed);
        if (modern) {
          const key=modern[1].toLowerCase();const value=modern[2].trim();
          if (!value || ['build','system','product','vendor','sdk','security'].includes(key)) continue;
          if (ROM_BY_PROP[key]) { zipRomName=ROM_BY_PROP[key]; zipRomVersion=(value.match(/^v?[\d.]+/)||[])[0]||value; }
          break;
        }
        if (legacy) { zipRomName='LineageOS'; zipRomVersion=(legacy[1].trim().match(/^v?[\d.]+/)||[])[0]||legacy[1].trim(); break; }
      }
      const buildUtc=Number(getZipProperty(props,'ro.build.date.utc'));
      const buildDate=buildUtc>946684800 ? new Date(buildUtc*1000) : null; // depois de 2000
      const changes=[];
      if (android && ['', '17','16','15','14','13','12','11','10'].includes(android) && android !== state.androidVersion) changes.push(['androidVersion',android]);
      if (cleanDevice && !state.deviceName.toLowerCase().includes(cleanDevice.toLowerCase())) changes.push(['deviceName',cleanDevice]);
      if (zipRomName && !state.romName.trim()) changes.push(['romName',zipRomName]);
      if (zipRomVersion && !state.romVersion.trim()) changes.push(['romVersion',zipRomVersion]);
      if (buildDate && !state.releaseDate) changes.push(['releaseDate',`${buildDate.getFullYear()}-${String(buildDate.getMonth()+1).padStart(2,'0')}-${String(buildDate.getDate()).padStart(2,'0')}`]);
      info.hidden=false;
      info.textContent=`${file.name} · ${size}`;
      if (!changes.length) return toast('ZIP lido. Nenhum campo novo compatível encontrado.');
      const FIELD_LABELS={androidVersion:'Android',deviceName:'Dispositivo',romName:'ROM',romVersion:'Versão',releaseDate:'Data'};
      if (window.confirm(`ZIP: ${size}\n\nDados encontrados:\n${changes.map(([k,v])=>`${FIELD_LABELS[k]||k}: ${k==='releaseDate'?dateDisplay(v):v}`).join('\n')}\n\nUsar esses dados?`)) {
        for (const [key,value] of changes) {state[key]=value;get(key).value=value;}
        if (!state.tagsManual) {state.hashtags=generateTags();get('hashtags').value=state.hashtags;}
        renderTagChips();
        update();toast('Dados do ZIP aplicados. Confira antes de publicar.');
      }
    } catch (e) {info.textContent='Não foi possível ler os metadados';toast(e.message || 'Erro ao ler ZIP.','error');}
    finally {get('romZipInput').value='';}
  }

  let repoBusy = false;
  function extractRepoLink(value) {
    const raw = String(value || '').trim().replace(/\.git$/i,'').replace(/\/+$/,'');
    if (/^[a-z0-9-]+\/[a-z0-9_.-]+$/i.test(raw)) return raw;
    try {
      const url = new URL(raw);
      if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'github.com' || url.username || url.password || url.search || url.hash) return '';
      const match = /^\/([a-z0-9-]+)\/([a-z0-9_.-]+)(?:\/(?:tree|blob|releases|commits)(?:\/.*)?)?\/?$/i.exec(url.pathname);
      return match ? `${match[1]}/${match[2]}` : '';
    } catch {return '';}
  }
  function appendRepoLink(rows, label, url) {
    if (!isValidUrl(url)) return;
    if (rows.some(r => r.url === url)) return;
    const standard = rows.find(r => r.label === label && !r.url);
    if (standard) standard.url = url;
    else if (rows.length < 18) rows.push({label,url});
  }
  function bundleRepoEvidence(info, mode) {
    return JSON.stringify({mode, repository:info.repo, hints:info.hints||null, readme:String(info.readme||'').slice(0,3000),
      release:info.release ? {name:info.release.title,tag:info.release.tag,notes:info.release.notes.slice(0,4000),prerelease:info.release.prerelease, date:info.release.date} : null,
      releaseCommits:(info.releaseCommits||[]).slice(0,60).map(c => c.message.slice(0,150)),
      commits:(info.commits || []).slice(0,15).map(c => c.message.slice(0,150))}).slice(0,14950);
  }
  const cap = value => String(value || '').charAt(0).toUpperCase() + String(value || '').slice(1);
  function repoFieldsFromAI(data, info, mode) {
    const keys = mode==='full' ? ['romName','romVersion','androidVersion','buildType','deviceName','changelog','notes','credits','by','follow','join'] : ['romName','romVersion','androidVersion','buildType','deviceName'];
    const changes = {};
    for (const k of keys) if (typeof data[k] === 'string' && data[k].trim()) changes[k] = slice(data[k].trim(), get(k).maxLength > 0 ? get(k).maxLength : 8000);
    if (changes.androidVersion) {
      changes.androidVersion = changes.androidVersion.replace(/^android\s*/i,'').trim();
      if (!['17','16','15','14','13','12','11','10'].includes(changes.androidVersion)) delete changes.androidVersion;
    }
    if (changes.buildType) {
      changes.buildType = changes.buildType.toUpperCase();
      if (!['UNOFFICIAL','OFFICIAL','STABLE','BETA'].includes(changes.buildType)) delete changes.buildType;
    }
    const hints = info.hints || {};
    // Fallback determinístico: device tree tem codinome comprovado pelo nome do repositório.
    if (!changes.deviceName && hints.deviceCode) {
      const known = DEVICE_INDEX.get(hints.deviceCode);
      changes.deviceName = known ? `${known.n.split(' / ')[0]} / ${hints.deviceCode}` : (hints.deviceOem ? `${cap(hints.deviceOem)} ${hints.deviceCode} / ${hints.deviceCode}` : hints.deviceCode);
    }
    if (!changes.romVersion && hints.romVersion) changes.romVersion = hints.romVersion;
    if (mode==='full' && info.release?.date && /^\d{4}-\d{2}-\d{2}/.test(info.release.date)) changes.releaseDate=info.release.date.slice(0,10);
    if (mode==='full' && info.release?.prerelease && !changes.buildType) changes.buildType = 'BETA';
    return changes;
  }
  async function generateFromRepository(mode, urlOverride, statusEl) {
    if (repoBusy || aiBusy) return;
    const input = String(urlOverride || get('repoUrl').value).trim();
    const repoName = extractRepoLink(input);
    if (!repoName) {
      toast('Informe um link de repositório público do GitHub.','warn');
      if (urlOverride) { get('aiPanel').open = true; get('repoUrl').focus(); } else get('repoUrl').focus();
      return;
    }
    repoBusy = true;
    const buttons = [get('repoBasic'),get('repoFull'),get('smartRun')];
    buttons.forEach(b => b.disabled = true);
    const status = statusEl || get('repoResult');
    // Vindo da caixa única: sincroniza o campo do painel avançado para a guarda anti-edição funcionar.
    if (urlOverride) get('repoUrl').value = input;
    status.textContent = 'Consultando o repositório no GitHub...';
    try {
      const response = await fetch(`/api/repository?repo=${encodeURIComponent(repoName)}`,{signal:AbortSignal.timeout?.(25000)});
      const result = await response.json().catch(()=>({}));
      if (!response.ok || !result.data) throw new Error(result.error || 'Falha ao consultar o GitHub.');
      const info = result.data;
      if (get('repoUrl').value.trim() !== input) {toast('O link do repositório mudou. Nada foi aplicado.','warn');return;}
      status.textContent = 'Analisando dados públicos com Gemini...';
      const aiData = await askAI('repository',bundleRepoEvidence(info,mode), true);
      if (!aiData) {status.textContent='Não foi possível analisar. Configure GEMINI_API_KEY na Vercel para ativar a IA.';return false;}
      if (get('repoUrl').value.trim() !== input) {toast('O link mudou durante a geração. Nada foi alterado.','warn');return false;}
      const hasData=FIELDS.filter(k=>k!=='releaseDate').some(k=>state[k]?.trim()) || state.links.some(l=>l.url.trim());
      if (hasData && !window.confirm('Substituir os dados atuais pelos dados do repositório?')) {
        status.textContent = 'Importação cancelada. Nenhum campo foi alterado.';
        return false;
      }
      const changes=repoFieldsFromAI(aiData,info,mode);
      const keepMode=state.mode;
      state=freshState();
      state.mode=keepMode;
      state.repoUrl=input;
      state.releaseDate=''; // Never treat today's date as a repository release date.
      state.commitsCache=((info.releaseCommits?.length ? info.releaseCommits : info.commits) || []).map(c=>c.message).join('\n').slice(0,15000);
      get('verifyStatus').hidden = true;
      for (const [key,value] of Object.entries(changes)) state[key]=value;
      state.hashtags=generateTags();
      if (mode==='full') {
        appendRepoLink(state.links,'Source',info.repo.url);
        if (info.release?.url) appendRepoLink(state.links,'Release',info.release.url);
        const assets = info.release?.zipAssets || [];
        for (const asset of assets.slice(0,5)) {
          let label = assets.length===1 ? 'Download' : `Download — ${String(asset.name||'ZIP').replace(/\.zip$/i,'').slice(0,34)}`;
          appendRepoLink(state.links,label,asset.url);
        }
        if (!assets.length) {
          status.textContent='Dados carregados. Nenhum ZIP publicado na release mais recente; informe o download manualmente.';
        } else {
          status.textContent=`Dados carregados da release ${info.release.tag || info.release.title}. ${assets.length} ZIP(s) encontrado(s). Confira versão e variantes.`;
        }
        if (!info.release) status.textContent='Dados carregados, mas o repositório não possui Releases publicadas. Sem link de download.';
      } else {
        appendRepoLink(state.links,'Source',info.repo.url);
        status.textContent='Informações básicas geradas. Revise os dados antes de publicar.';
      }
      clearBanner();renderFields();save();
      get('repoResult').textContent = status.textContent;
      // Keep the git log ready for generating a separate changelog and for AI verification.
      const commitSource=(info.releaseCommits?.length ? info.releaseCommits : info.commits) || [];
      if (commitSource.length) {get('aiSource').value='commits';get('aiSource').dispatchEvent(new Event('change'));get('aiInput').value=commitSource.map(c=>c.message).join('\n').slice(0,15000);}
      toast('Campos preenchidos. Confira o post e os links.');
      return true;
    } catch(e) {status.textContent=e.message || 'Não foi possível consultar o repositório.';toast(status.textContent,'error');return false;}
    finally {repoBusy=false;buttons.forEach(b=>b.disabled=false);}
  }

  /* ---- Base de dispositivos (devices.js) ---- */
  const devices = Array.isArray(window.ROMPOST_DEVICES) ? window.ROMPOST_DEVICES : [];
  const DEVICE_INDEX = new Map(devices.map(d => [d.c, d]));
  const normalizeText = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  function deviceMatches(query, limit = 8) {
    const q = normalizeText(query.trim());
    if (q.length < 2) return [];
    const out = [];
    for (const d of devices) {
      const code = normalizeText(d.c);
      const name = normalizeText(d.n);
      const vendor = normalizeText(d.v);
      if (code.startsWith(q) || code.includes(q) || name.includes(q) || vendor.includes(q) || `${vendor} ${name}`.includes(q)) {
        out.push(d);
        if (out.length >= limit) break;
      }
    }
    return out;
  }
  function showDeviceSuggest() {
    const input = get('deviceName');
    const box = get('deviceSuggest');
    const items = deviceMatches(input.value);
    if (!items.length) { box.hidden = true; box.innerHTML = ''; return; }
    box.innerHTML = items.map(d => `<button type="button" data-code="${htmlEsc(d.c)}" data-name="${htmlEsc(d.n)}"><strong>${htmlEsc(d.n)}</strong><span>${htmlEsc(d.v)} · ${htmlEsc(d.c)}</span></button>`).join('');
    box.hidden = false;
  }
  function pickDevice(button) {
    const name = button.dataset.name.split(' / ')[0];
    const code = button.dataset.code;
    state.deviceName = `${name} / ${code}`;
    get('deviceName').value = state.deviceName;
    get('deviceSuggest').hidden = true;
    if (!state.tagsManual) { state.hashtags = generateTags(); get('hashtags').value = state.hashtags; renderTagChips(); }
    update();
    toast(`Dispositivo aplicado: ${name} (${code}).`);
  }
  /* ---- Chips de hashtags ---- */
  function tagTokens() { return state.hashtags.split(/\s+/).map(t => t.trim()).filter(Boolean); }
  function renderTagChips() {
    const box = get('tagChips');
    if (!box) return;
    const tokens = tagTokens();
    box.innerHTML = tokens.map((t, i) => `<span class="tag-chip">${htmlEsc(t)}<button type="button" data-tag="${i}" aria-label="Remover ${htmlEsc(t)}">×</button></span>`).join('');
    box.hidden = !tokens.length;
  }
  function removeTag(index) {
    const tokens = tagTokens();
    tokens.splice(index, 1);
    state.hashtags = tokens.join(' ');
    state.tagsManual = true;
    get('hashtags').value = state.hashtags;
    renderTagChips();
    update();
  }
  /* ---- Caixa única inteligente ---- */
  function detectKind(text) {
    const t = String(text || '').trim();
    if (!t) return null;
    if (/^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+/i.test(t) || /^[\w.-]+\/[\w.-]+$/.test(t)) return 'repo';
    const tagCount = (t.match(/#[A-Za-z0-9_]+/g) || []).length;
    if (tagCount >= 2 && /(t\.me|@[a-zA-Z0-9_]{5,32}|▪|Download|Changelog|By:|Join:|Follow:)/i.test(t)) return 'oldpost';
    return 'commits';
  }
  const KIND_LABEL = { repo: 'repositório do GitHub', oldpost: 'post antigo', commits: 'commits' };
  async function runSmart() {
    if (aiBusy || repoBusy) { toast('Aguarde a análise anterior terminar.', 'warn'); return; }
    const raw = get('smartInput').value;
    const kind = detectKind(raw);
    if (!kind) { toast('Cole algo para analisar: link do GitHub, commits ou post antigo.', 'warn'); return; }
    const status = get('smartStatus');
    const box = get('smartBox');
    status.textContent = `Detectado: ${KIND_LABEL[kind]}. Analisando…`;
    box.classList.add('busy');
    let ok = false;
    try {
      if (kind === 'repo') {
        ok = await generateFromRepository('full', raw.trim(), status);
      } else if (kind === 'oldpost') {
        get('aiSource').value = 'oldpost';
        get('aiSource').dispatchEvent(new Event('change'));
        get('aiInput').value = raw.trim();
        ok = await processAIInput('import');
      } else {
        get('aiSource').value = 'commits';
        get('aiSource').dispatchEvent(new Event('change'));
        get('aiInput').value = raw.trim();
        ok = await processAIInput('changelog');
      }
      if (ok) status.textContent = 'Análise concluída. Revise os campos e a prévia ao lado.';
      else if (kind !== 'repo') status.textContent = 'Não foi possível analisar agora. Tente novamente em instantes.';
    } finally { box.classList.remove('busy'); }
  }
  /* ---- Verificador do changelog (LLM-as-judge) ---- */
  async function verifyChangelog() {
    if (aiBusy) return;
    const changelog = state.changelog.trim();
    if (!changelog) { toast('Preencha o changelog antes de verificar.', 'warn'); return; }
    const commits = state.commitsCache.trim();
    if (!commits) { toast('Sem commits para comparar. Gere um post de um repositório ou cole commits na caixa de análise.', 'warn'); return; }
    const status = get('verifyStatus');
    status.hidden = false;
    status.className = 'verify-status';
    status.textContent = 'Verificando cada linha contra os commits originais…';
    const data = await askAI('verify', JSON.stringify({ changelog, commits: commits.split('\n').slice(0, 120) }), true);
    if (!data) { status.textContent = 'Não foi possível verificar agora. Tente novamente.'; return; }
    if (data.status === 'ok') {
      status.className = 'verify-status ok';
      status.textContent = '✓ Todas as linhas do changelog têm suporte nos commits.';
    } else {
      status.className = 'verify-status bad';
      status.innerHTML = `${data.issues.length} linha(s) sem suporte claro:<br>${data.issues.map(htmlEsc).join('<br>')}`;
    }
  }
  /* ---- Gerador de banner em canvas ---- */
  let bannerObjectUrl = '';
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  async function generateBanner() {
    const name = state.romName.trim() || 'Custom ROM';
    try { if (document.fonts?.ready) await document.fonts.ready; } catch { /* fontes opcionais */ }
    const canvas = document.createElement('canvas');
    canvas.width = 1280; canvas.height = 640;
    const ctx = canvas.getContext('2d');
    const background = ctx.createLinearGradient(0, 0, 1280, 640);
    background.addColorStop(0, '#221b3a');
    background.addColorStop(.55, '#35235c');
    background.addColorStop(1, '#1b2440');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, 1280, 640);
    const glow = (x, y, radius, color) => {
      const rg = ctx.createRadialGradient(x, y, 0, x, y, radius);
      rg.addColorStop(0, color);
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    };
    glow(1120, 90, 340, 'rgba(139,92,246,.4)');
    glow(140, 560, 380, 'rgba(99,102,241,.32)');
    glow(640, 700, 420, 'rgba(236,72,153,.14)');
    ctx.strokeStyle = 'rgba(255,255,255,.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= 1280; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 640); ctx.stroke(); }
    for (let y = 0; y <= 640; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1280, y); ctx.stroke(); }
    ctx.textBaseline = 'alphabetic';
    let size = 108;
    const font = weight => `${weight} ${size}px Manrope, 'Segoe UI', sans-serif`;
    ctx.font = font(800);
    while (ctx.measureText(name).width > 1120 && size > 40) { size -= 4; ctx.font = font(800); }
    ctx.fillStyle = '#ffffff';
    ctx.fillText(name, 80, 300);
    const meta = [state.romVersion.trim(), state.androidVersion ? `Android ${state.androidVersion}` : ''].filter(Boolean).join('  ·  ');
    if (meta) { ctx.font = `600 44px Manrope, 'Segoe UI', sans-serif`; ctx.fillStyle = '#c9b8ff'; ctx.fillText(meta, 80, 372); }
    if (state.deviceName.trim()) { ctx.font = `500 38px Manrope, 'Segoe UI', sans-serif`; ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillText(state.deviceName.trim(), 80, 430); }
    const stamp = [state.releaseDate ? dateDisplay(state.releaseDate) : '', 'rompost.'].filter(Boolean).join('   ·   ');
    ctx.font = `700 26px Manrope, 'Segoe UI', sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.fillText(stamp, 80, 570);
    if (state.buildType) {
      ctx.font = `800 30px Manrope, 'Segoe UI', sans-serif`;
      const w = ctx.measureText(state.buildType).width + 48;
      ctx.fillStyle = 'rgba(139,92,246,.28)';
      roundRect(ctx, 1280 - 80 - w, 90, w, 54, 27); ctx.fill();
      ctx.strokeStyle = 'rgba(201,184,255,.6)';
      ctx.lineWidth = 2;
      roundRect(ctx, 1280 - 80 - w, 90, w, 54, 27); ctx.stroke();
      ctx.fillStyle = '#e9e0ff';
      ctx.fillText(state.buildType, 1280 - 80 - w + 24, 127);
    }
    canvas.toBlob(blob => {
      if (!blob) { toast('Não foi possível gerar o banner neste navegador.', 'error'); return; }
      if (bannerObjectUrl) URL.revokeObjectURL(bannerObjectUrl);
      bannerObjectUrl = URL.createObjectURL(blob);
      loadBanner(new File([blob], 'rompost-banner.png', { type: 'image/png' }));
      const download = get('bannerDownload');
      download.href = bannerObjectUrl;
      download.hidden = false;
      toast('Banner gerado. Baixe o PNG e anexe no Telegram.');
    }, 'image/png');
  }

  function bind() {
    get('repoUrl').addEventListener('input', e => {state.repoUrl=e.target.value;update();});
    get('repoBasic').addEventListener('click',()=>generateFromRepository('basic'));
    get('repoFull').addEventListener('click',()=>generateFromRepository('full'));
    get('aiSource').addEventListener('change', () => {
      const old = get('aiSource').value === 'oldpost';
      get('aiGenerate').textContent = old ? 'Importar post' : 'Gerar changelog';
      get('aiOrganize').hidden = old;
      get('aiTextLabel').textContent = old ? 'Cole o post antigo' : 'Cole os commits';
      get('aiInput').placeholder = old ? 'Cole aqui o texto do Telegram...' : 'fix: camera crash\nupdate power HAL\nsepolicy: address denials';
    });
    get('aiGenerate').addEventListener('click',()=>processAIInput('changelog'));
    get('aiOrganize').addEventListener('click',()=>processAIInput('organize'));
    get('summarizeBtn').addEventListener('click',summarizeChangelog);
    document.querySelectorAll('[data-translate]').forEach(button=>button.addEventListener('click',()=>translateField(button.dataset.translate)));
    document.querySelectorAll('[data-undo]').forEach(button=>button.addEventListener('click',()=>{
      const field=button.dataset.undo;
      if (!Object.prototype.hasOwnProperty.call(undoValues,field)) return;
      const previous=undoValues[field];
      undoValues[field]=state[field];
      state[field]=previous;
      get(field).value=previous;
      update();toast('Texto anterior restaurado.');
    }));
    get('creditRole').addEventListener('keydown', e=>{if(e.key==='Enter'){e.preventDefault();insertCredit();}});
    get('creditUser').addEventListener('keydown', e=>{if(e.key==='Enter'){e.preventDefault();insertCredit();}});
    get('addCredit').addEventListener('click',insertCredit);
    get('romZipInput').addEventListener('change', e=>inspectRomZip(e.target.files?.[0]));
    for (const id of FIELDS) {
      const el = get(id);
      el.addEventListener(['SELECT'].includes(el.tagName) || el.type === 'date' ? 'change' : 'input', () => {
        state[id] = el.value;
        if (id === 'hashtags') { state.tagsManual = true; renderTagChips(); }
        if (['romName','androidVersion','buildType','deviceName'].includes(id) && !state.tagsManual) {
          state.hashtags = generateTags();
          get('hashtags').value = state.hashtags;
        }
        update();
      });
    }
    get('autoTags').addEventListener('click', () => {state.tagsManual = false;state.hashtags = generateTags();get('hashtags').value = state.hashtags;update();toast('Hashtags atualizadas!');});
    get('linksList').addEventListener('input', event => {
      const input = event.target;
      const row = input.closest('.link-row');
      if (!row || !input.dataset.field) return;
      const item = state.links[Number(row.dataset.index)];
      if (!item) return;
      item[input.dataset.field] = input.value;
      row.querySelector('[data-field="url"]').classList.toggle('invalid', isIncompleteLink(item) && Boolean(item.label.trim()));
      row.querySelector('[data-field="label"]').classList.toggle('invalid', Boolean(item.url.trim() && !item.label.trim()));
      update();
    });
    get('linksList').addEventListener('click', event => {
      const button = event.target.closest('button[data-remove]');
      if (!button) return;
      const row = button.closest('.link-row');
      state.links.splice(Number(row.dataset.index), 1);
      renderLinks(); update();
    });
    get('addLink').addEventListener('click', () => {
      if (state.links.length >= 18) return toast('Máximo de 18 links por post.', 'warn');
      state.links.push({label:'',url:''});
      renderLinks();update();
      get('linksList').lastElementChild?.querySelector('input')?.focus();
    });
    const uploadArea = get('uploadArea');
    uploadArea.addEventListener('click', () => get('bannerInput').click());
    uploadArea.addEventListener('keydown', e => {if (['Enter',' '].includes(e.key)) {e.preventDefault();get('bannerInput').click();}});
    get('bannerInput').addEventListener('change', e => loadBanner(e.target.files?.[0]));
    for (const type of ['dragenter','dragover']) uploadArea.addEventListener(type, e => {e.preventDefault();uploadArea.classList.add('drag-over');});
    for (const type of ['dragleave','drop']) uploadArea.addEventListener(type, e => {e.preventDefault();uploadArea.classList.remove('drag-over');});
    uploadArea.addEventListener('drop', e => loadBanner(e.dataTransfer?.files?.[0]));
    get('removeBanner').addEventListener('click', clearBanner);
    document.querySelectorAll('input[name="mode"]').forEach(el => el.addEventListener('change', () => {if (el.checked) {state.mode = el.value;update();}}));
    get('copyRich').addEventListener('click', copyRich);
    get('copyMobile').addEventListener('click', copyRich);
    get('copyPlain').addEventListener('click', copySafe);
    get('themeToggle').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
    get('exampleBtn').addEventListener('click', example);
    get('resetBtn').addEventListener('click', reset);
    get('smartRun').addEventListener('click', runSmart);
    const smartBox = get('smartBox');
    for (const type of ['dragenter','dragover']) smartBox.addEventListener(type, e => {e.preventDefault();smartBox.classList.add('drag-over');});
    for (const type of ['dragleave','drop']) smartBox.addEventListener(type, e => {e.preventDefault();smartBox.classList.remove('drag-over');});
    smartBox.addEventListener('drop', e => {
      const file = e.dataTransfer?.files?.[0];
      if (!file) return;
      if (/\.zip$/i.test(file.name) || file.type === 'application/zip') inspectRomZip(file);
      else if (/^image\/(png|jpe?g|webp)$/.test(file.type)) loadBanner(file);
    });
    smartBox.addEventListener('paste', e => {
      const file = [...(e.clipboardData?.files || [])][0];
      if (!file) return;
      if (/\.zip$/i.test(file.name) || file.type === 'application/zip') { e.preventDefault(); inspectRomZip(file); }
      else if (/^image\/(png|jpe?g|webp)$/.test(file.type)) { e.preventDefault(); loadBanner(file); }
    });
    get('deviceName').addEventListener('input', showDeviceSuggest);
    get('deviceName').addEventListener('focus', showDeviceSuggest);
    get('deviceSuggest').addEventListener('mousedown', e => { const b = e.target.closest('button[data-code]'); if (b) { e.preventDefault(); pickDevice(b); } });
    document.addEventListener('click', e => { if (!e.target.closest('.device-field')) get('deviceSuggest').hidden = true; });
    get('tagChips').addEventListener('click', e => { const b = e.target.closest('button[data-tag]'); if (b) removeTag(Number(b.dataset.tag)); });
    get('bannerGen').addEventListener('click', generateBanner);
    get('verifyBtn').addEventListener('click', verifyChangelog);
    get('styleMemory').addEventListener('input', scheduleStyleSave);
    ['by','follow','join'].forEach(id => get(id).addEventListener('input', scheduleProfileSave));
    window.addEventListener('pagehide', () => {clearTimeout(saveTimeout);save();});
  }
  bind();
  setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
  if (!state.tagsManual && state.romName.trim() && !state.hashtags.trim()) state.hashtags = generateTags();
  try { get('styleMemory').value = localStorage.getItem(STYLE_KEY) || ''; } catch { /* armazenamento bloqueado */ }
  renderFields();
})();
