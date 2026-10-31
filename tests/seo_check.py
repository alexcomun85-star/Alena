"""Offline SEO integrity checks. Requires beautifulsoup4 (existing build dependency)."""
from bs4 import BeautifulSoup
from pathlib import Path
from urllib.parse import urlsplit,unquote
import importlib.util,json,re,xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
pages={p.name:BeautifulSoup(p.read_text(),'html.parser') for p in ROOT.glob('*.html')}
indexable={n:s for n,s in pages.items() if not any('noindex' in m.get('content','') for m in s.select('meta[name=robots]'))}
titles=set();descs=set()
for n,s in indexable.items():
 title=s.title.get_text();desc=s.select_one('meta[name=description]')['content']
 assert title and title not in titles,n; titles.add(title)
 assert desc and desc not in descs,n;descs.add(desc)
 assert len(s.select('h1'))==1,n
 assert [l['href'] for l in s.select('link[rel=canonical]')]==['https://alenafit.com/'+('' if n=='index.html' else n)],n
for n,s in pages.items():
 for im in s.select('img'):assert all(a in im.attrs for a in ['alt','width','height']),(n,im)
 for sc in s.select('script[type="application/ld+json"]'):
  d=json.loads(sc.string);assert d['@context']=='https://schema.org';assert d['@type'] in {'Person','WebSite'}
 for a in s.select('[href],[src]'):
  ref=a.get('href') or a.get('src');u=urlsplit(ref)
  if u.scheme or u.netloc:continue
  path=unquote(u.path).lstrip('/') or n;target=ROOT/path
  if target.is_dir():target=target/'index.html'
  assert target.exists(),(n,ref)
  if u.fragment and target.suffix=='.html':
   fragment=unquote(u.fragment)
   generated=target.name=='recepty.html' and fragment in re.findall(r"id:'([^']+)'",(ROOT/'js/recepty.js').read_text())
   assert pages[target.name].find(id=fragment) or pages[target.name].find(attrs={'name':fragment}) or generated,(n,ref)
urls={e.text for e in ET.parse(ROOT/'sitemap.xml').iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')}
assert urls=={s.select_one('link[rel=canonical]')['href'] for s in indexable.values()}
spec=importlib.util.spec_from_file_location('sitemap',ROOT/'scripts/build_sitemap.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
for html in ["<meta content='follow, NOINDEX' name='ROBOTS'>",'<META NAME="googlebot" CONTENT="none">','<meta name=yandex content="noindex,follow">']:
 p=m.RobotsParser();p.feed(html);assert p.noindex,html
p=m.RobotsParser();p.feed('<meta name=robots content="index,follow">');assert not p.noindex
assert '/offline.html' not in (ROOT/'robots.txt').read_text()
assert pages['offline.html'].select_one('meta[name=robots]')['content']=='noindex'
print(f'PASS: {len(pages)} HTML, {len(indexable)} indexable: unique metadata, H1, canonical, links/anchors, image attributes, JSON-LD syntax, sitemap membership, robots parsing.')
