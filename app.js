/* ROM Post · uma página, sem backend, sem dependências. */
(() => {
  'use strict';

  const STORAGE_KEY = 'rompost:material:onepage:v1';
  const THEME_KEY = 'rompost:theme:v2';
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
    by:'', follow:'', join:'', mode:'caption', tagsManual:false, links:defaultLinks()
  });
  const slice = (value, max = 20000) => typeof value === 'string' ? value.slice(0, max) : '';
  function restore(raw) {
    const clean = freshState();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return clean;
    for (const key of FIELDS) clean[key] = slice(raw[key]);
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
    renderPreview();
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (error) { console.warn('Armazenamento indisponível:', error); }
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
    state = freshState(); clearBanner(); renderFields(); save();
    window.scrollTo({top:0, behavior:'smooth'});
    toast('Novo post criado.');
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
  function bind() {
    for (const id of FIELDS) {
      const el = get(id);
      el.addEventListener(['SELECT'].includes(el.tagName) || el.type === 'date' ? 'change' : 'input', () => {
        state[id] = el.value;
        if (id === 'hashtags') state.tagsManual = true;
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
    window.addEventListener('pagehide', () => {clearTimeout(saveTimeout);save();});
  }
  bind();
  setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
  if (!state.tagsManual && state.romName.trim() && !state.hashtags.trim()) state.hashtags = generateTags();
  renderFields();
})();
