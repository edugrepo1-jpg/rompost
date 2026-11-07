/* Public GitHub repository metadata for ROMPost. No GitHub login or token needed. */
'use strict';
const LIMIT_REPO = 160;
const HOST = 'api.github.com';
function respond(res, status, value) {
  res.statusCode = status;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control', status === 200 ? 'public, s-maxage=90, stale-while-revalidate=90' : 'no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.end(JSON.stringify(value));
}
function parseRepository(value) {
  if (typeof value !== 'string' || value.length > LIMIT_REPO) return null;
  let candidate = value.trim().replace(/\.git$/i,'').replace(/\/+$/,'');
  if (candidate.startsWith('https://')) {
    let url;
    try { url = new URL(candidate); } catch { return null; }
    if (url.hostname.toLowerCase() !== 'github.com' || url.port || url.username || url.password) return null;
    const match = /^\/([^/]+)\/([^/]+)(?:\/(?:tree|blob|releases|commits)(?:\/.*)?)?\/?$/.exec(url.pathname);
    if (!match || url.search || url.hash) return null;
    candidate = `${match[1]}/${match[2]}`;
  }
  if (!/^[a-z\d](?:[a-z\d-]{0,38})\/[a-z\d_.-]{1,100}$/i.test(candidate)) return null;
  if (candidate.includes('..') || candidate.includes('//')) return null;
  return candidate;
}
async function github(path, signal, optional = false) {
  const response = await fetch(`https://${HOST}${path}`, {
    signal,
    headers:{Accept:'application/vnd.github+json','User-Agent':'ROMPost-Generator','X-GitHub-Api-Version':'2022-11-28'},
    redirect:'error'
  });
  if (optional && response.status === 404) return null;
  if (response.status === 404) throw Object.assign(new Error('Repositório não encontrado ou privado.'),{status:404});
  if (response.status === 403 || response.status === 429) throw Object.assign(new Error('Limite de consultas públicas do GitHub atingido. Tente mais tarde.'),{status:429});
  if (!response.ok) throw new Error('O GitHub não respondeu corretamente.');
  const length = Number(response.headers.get('content-length') || '0');
  if (length > 700000) throw new Error('Resposta do GitHub muito grande.');
  const body = await response.text();
  if (body.length > 700000) throw new Error('Resposta do GitHub excedeu o limite.');
  return JSON.parse(body);
}
const trim = (value, size=2000) => typeof value === 'string' ? value.slice(0,size) : '';
function releaseZipAssets(release) {
  const assets = Array.isArray(release?.assets) ? release.assets : [];
  return assets.filter(a => {
    if (!a || a.state !== 'uploaded' || !/\.zip$/i.test(a.name || '')) return false;
    if (!/^https:\/\/github\.com\/[a-z\d-]+\/[a-z\d_.-]+\/releases\/download\//i.test(a.browser_download_url || '')) return false;
    // Android ROM ZIPs are large, or have familiar build naming conventions.
    return a.size >= 100_000_000 || /(?:rom|ota|lineage|aosp|pixel|evolution|crdroid|gapps|vanilla|signed|android)/i.test(a.name);
  }).slice(0, 8).map(a=>({ name:trim(a.name,160),url:a.browser_download_url,size:a.size }));
}
module.exports = async (req,res) => {
  if (req.method !== 'GET') return respond(res,405,{error:'Use GET.'});
  const origin = req.headers.origin;
  if (origin) {
    try { if (new URL(origin).host !== req.headers.host) return respond(res,403,{error:'Origem não autorizada.'}); }
    catch { return respond(res,403,{error:'Origem inválida.'}); }
  }
  const raw = req.query?.repo;
  const name = parseRepository(raw);
  if (!name) return respond(res,400,{error:'Cole o endereço público do GitHub, como https://github.com/dono/repositorio.'});
  const control = new AbortController();
  const timer = setTimeout(()=>control.abort(),18_000);
  try {
    const base = `/repos/${name}`;
    const repo = await github(base,control.signal);
    if (repo.private || repo.disabled || !repo.full_name) return respond(res,400,{error:'Use um repositório público e disponível.'});
    const [commits,releases,readme] = await Promise.all([
      github(`${base}/commits?per_page=45`,control.signal,true).catch(()=>null),
      github(`${base}/releases?per_page=15`,control.signal,true).catch(()=>null),
      github(`${base}/readme`,control.signal,true).catch(()=>null)
    ]);
    let readmeText = '';
    if (readme?.encoding === 'base64' && typeof readme.content === 'string' && readme.content.length < 50000) {
      try { readmeText = Buffer.from(readme.content,'base64').toString('utf8').slice(0,7000); } catch { /* Optional */ }
    }
    const allReleases = (Array.isArray(releases)? releases : []).filter(r=>r && !r.draft && r.published_at);
    allReleases.sort((a,b)=>new Date(b.published_at)-new Date(a.published_at));
    const release = allReleases[0];
    const result = {
      repo:{name:trim(repo.name,120),fullName:trim(repo.full_name,150),description:trim(repo.description,600),homepage:trim(repo.homepage,250),url:trim(repo.html_url,250),topics:Array.isArray(repo.topics)?repo.topics.slice(0,12).map(x=>trim(x,60)):[],defaultBranch:trim(repo.default_branch,80)},
      readme:readmeText,
      commits:(Array.isArray(commits)?commits:[]).slice(0,45).map(c=>({sha:trim(c.sha,40),message:trim(c.commit?.message?.split('\n')[0],220)})).filter(c=>c.message),
      release: release? {tag:trim(release.tag_name,120),title:trim(release.name,180),date:trim(release.published_at,30),notes:trim(release.body,8000),url:trim(release.html_url,300),prerelease:Boolean(release.prerelease),zipAssets:releaseZipAssets(release)}:null
    };
    return respond(res,200,{data:result});
  } catch(error) {
    return respond(res,error.status||502,{error:error.name==='AbortError'?'O GitHub demorou demais para responder.':error.message || 'Falha ao consultar GitHub.'});
  } finally {clearTimeout(timer);}
};
module.exports.parseRepository = parseRepository;
module.exports.releaseZipAssets = releaseZipAssets;
