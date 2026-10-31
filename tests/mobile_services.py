"""Compare the approved base with this branch; no requests to assistant or other external hosts."""
import json,os,subprocess,statistics
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright
BASE=os.environ.get('BASE','http://localhost:8766/')
BASELINE='18eeb8321ca7d50e444d7d04b1b9886353fc7460'
OUT=Path('qa-output');OUT.mkdir(exist_ok=True)
current=Path('index.html').read_text()
old=subprocess.check_output(['git','-c','safe.directory='+str(Path.cwd()),'show',BASELINE+':index.html'],text=True)
rows=[];geometry={}
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path=os.environ.get('ALENAFIT_CHROMIUM'))
 for phase in ['before','after']:
  for width,dpr in [(390,1),(390,2),(768,1),(1200,1)]:
   ctx=browser.new_context(viewport={'width':width,'height':844},device_scale_factor=dpr,service_workers='block',reduced_motion='reduce')
   assistant=[]
   def route(r):
    u=urlsplit(r.request.url)
    if 'assistant.alenafit.com' in u.netloc:assistant.append(r.request.url)
    if u.netloc!=urlsplit(BASE).netloc:r.abort()
    elif u.path in ['/','/index.html']:r.fulfill(status=200,body=old if phase=='before' else current,content_type='text/html; charset=utf-8')
    else:r.continue_()
   ctx.route('**/*',route)
   p=ctx.new_page()
   p.goto(BASE);p.evaluate('document.fonts.ready');p.wait_for_timeout(250)
   for sel in ['.hero-photo>img','.portrait img']:
    p.locator(sel).scroll_into_view_if_needed();p.wait_for_function('(s)=>{const i=document.querySelector(s);return i.complete&&i.naturalWidth>0}',arg=sel)
   rects=p.evaluate('''()=>Object.fromEntries(['.hero-photo','.hero-photo>img','.portrait','.portrait img','#plans','#quiz','#faq','#start'].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return [s,[r.x+scrollX,r.y+scrollY,r.width,r.height].map(x=>Math.round(x*100)/100)]}))''')
   key=f'{width}-{dpr}'
   if phase=='before':geometry[key]=rects
   else:assert rects==geometry[key],(key,rects,geometry[key])
   assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(phase,width)
   images=p.evaluate('''()=>['.hero-photo>img','.portrait img'].map(s=>{const i=document.querySelector(s);return {selector:s,url:i.currentSrc,naturalWidth:i.naturalWidth,displayWidth:i.getBoundingClientRect().width}})''')
   sizes=[]
   for im in images:
    name=urlsplit(im['url']).path.lstrip('/');sizes.append(Path(name).stat().st_size)
   if phase=='after':assert all('.webp' in im['url'] for im in images),images
   rows.append({'phase':phase,'width':width,'dpr':dpr,'images':images,'imageBytes':sum(sizes),'rectangles':rects})
   p.evaluate('window.scrollTo(0,0)');p.screenshot(path=str(OUT/f'mobile-services-{phase}-{key}.png'),full_page=True)
   assert not assistant,assistant
   if phase=='after':
    p.goto(BASE+'trener.html');p.evaluate('document.fonts.ready')
    assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),('services',width)
    for href in ['./#creds','./#plans','./#groups']:assert p.locator('main a[href="'+href+'"]').count()>0,href
    p.screenshot(path=str(OUT/f'services-{key}.png'),full_page=True)
   ctx.close()
 # Paired laboratory samples: mobile, 4x CPU, 150 ms latency and 1.6 Mbps download.
 for phase in ['before','after']:
  for run in range(3):
   ctx=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=2,service_workers='block')
   def local(r):
    u=urlsplit(r.request.url)
    if u.netloc!=urlsplit(BASE).netloc:r.abort()
    elif u.path in ['/','/index.html']:r.fulfill(status=200,body=old if phase=='before' else current,content_type='text/html; charset=utf-8')
    else:r.continue_()
   ctx.route('**/*',local);p=ctx.new_page();cdp=ctx.new_cdp_session(p)
   cdp.send('Network.enable');cdp.send('Network.emulateNetworkConditions',{'offline':False,'latency':150,'downloadThroughput':200000,'uploadThroughput':96000});cdp.send('Emulation.setCPUThrottlingRate',{'rate':4})
   p.add_init_script('''window.__metrics={cls:0,longTasks:0};new PerformanceObserver(l=>{window.__metrics.lcp=l.getEntries().at(-1).startTime}).observe({type:'largest-contentful-paint',buffered:true});new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__metrics.cls+=e.value}).observe({type:'layout-shift',buffered:true});new PerformanceObserver(l=>{for(const e of l.getEntries())window.__metrics.longTasks+=Math.max(0,e.duration-50)}).observe({type:'longtask',buffered:true});''')
   p.goto(BASE);p.evaluate('document.fonts.ready');p.wait_for_timeout(2500)
   rows.append({'phase':phase,'run':run+1,'lab':p.evaluate('({...window.__metrics,domReady:performance.getEntriesByType("navigation")[0].domContentLoadedEventEnd})')});ctx.close()
 browser.close()
summary={phase:{'medianLcpMs':statistics.median(r['lab']['lcp'] for r in rows if r.get('lab') and r['phase']==phase),'maxCls':max(r['lab']['cls'] for r in rows if r.get('lab') and r['phase']==phase)} for phase in ['before','after']}
(OUT/'mobile-services-comparison.json').write_text(json.dumps({'baseline':BASELINE,'environment':'Chromium local assets; both HTML variants fulfilled identically, simulated mobile 4x CPU and 1.6 Mbps/150 ms, 3 cold contexts per phase; not PSI or field CWV. External hosts blocked.','summary':summary,'samples':rows},ensure_ascii=False,indent=2))
print('PASS: identical main-page geometry at 390/768/1200 px and DPR 1/2; responsive images decoded; service links/overflow; no assistant requests. LAB:',json.dumps(summary))
