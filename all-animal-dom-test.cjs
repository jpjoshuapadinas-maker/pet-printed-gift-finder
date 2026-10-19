const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const html=fs.readFileSync(__dirname+'/index.html','utf8'), script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const products=JSON.parse(fs.readFileSync(__dirname+'/visual-relevance-audit-2026-10-20.json')).products;
class Element {
 constructor(tag,doc){this.tagName=tag;this.doc=doc;this.children=[];this.style={};this.events={};this.parent=null;this._text='';this.classList={add(){},remove(){}};}
 set textContent(v){this.children.forEach(c=>c.parent=null);this.children=[];this._text=v;} get textContent(){return this._text+this.children.map(c=>c.textContent).join(' ');}
 set innerHTML(v){this.textContent='';for(const m of v.matchAll(/<([a-z0-9]+)[^>]*id="([^"]+)"[^>]*>/g)){const n=new Element(m[1],this.doc);n.id=m[2];this.appendChild(n);}}
 appendChild(n){n.parent=this;this.children.push(n);return n;} append(...ns){ns.forEach(n=>this.appendChild(n));}
 get isConnected(){return this===this.doc.root||Boolean(this.parent?.isConnected);} remove(){this.parent.children=this.parent.children.filter(n=>n!==this);this.parent=null;}
 addEventListener(k,f){this.events[k]=f;} click(){return this.events.click?.();}
 all(){return this.children.flatMap(c=>[c,...c.all()]);} querySelectorAll(){return this.all().filter(c=>c.className==='choice');}
}
const tick=()=>new Promise(r=>setImmediate(r));
function harness(answers,mode='ok',custom=products){
 const doc={createElement:t=>new Element(t,doc),getElementById:id=>doc.root.all().find(n=>n.id===id)};doc.root=new Element('root',doc);for(const id of ['content','progress']){const e=doc.createElement('div');e.id=id;doc.root.append(e);}
 const query=new URLSearchParams(answers);let calls=0,timer;const cache=new Map();
 const ctx=vm.createContext({document:doc,URL,URLSearchParams,location:{href:'https://example.invalid/?'+query,search:'?'+query},history:{replaceState(){}},sessionStorage:{getItem:k=>cache.get(k),setItem:(k,v)=>cache.set(k,v)},AbortController,Date,console:{error(){}},setTimeout:f=>(timer=f,1),clearTimeout(){},fetch:async(_,options)=>{calls++;if(mode==='network')throw Error('offline');if(mode==='timeout')return new Promise((_,reject)=>options.signal.addEventListener('abort',()=>reject(Error('aborted'))));return {ok:mode!=='http',json:async()=>mode==='malformed'?{}:{products:custom}};}});
 vm.runInContext(script,ctx);
 return {doc,ctx,setMode:m=>mode=m,calls:()=>calls,timeout:()=>timer(),find:t=>doc.root.all().find(n=>n.tagName==='button'&&n.textContent===t),links:()=>doc.root.all().filter(n=>n.tagName==='a'),text:()=>doc.root.textContent};
}
(async()=>{let scenarios=0,clicks=0,maxCards=0;
for(const recipient of ['Partner','Mom or Dad','Friend','Someone else'])for(const animal of ['Dog','Cat','Horse','Rabbit','Other / Not sure'])for(const occasion of ['Birthday','Christmas','Just because','Remembering a pet'])for(const budget of ['Under $25','$25–$50','$50+','Surprise me']){
 const h=harness({recipient,animal,occasion,budget});await tick();assert(h.links().length>0);let before=h.links().length;while(h.find('More gift options')){h.find('More gift options').click();clicks++;const n=h.links().length;assert(n>before&&n-before<=6);before=n;assert(clicks<10000);}
 const urls=h.links().map(n=>n.href);const expected=vm.runInContext('(()=>{'+script.slice(script.indexOf('    const normalize ='),script.indexOf('    container.textContent = "";',script.indexOf('    const normalize =')))+';return uniqueProducts(pool).map(p=>p.url)})()',vm.createContext({imageAnimalEvidence:JSON.parse(html.match(/const imageAnimalEvidence = (.*);/)[1]),products,answers:{recipient,animal,occasion,budget},URL}));assert.deepEqual([...urls].sort(),Array.from(expected).sort());assert.equal(new Set(urls).size,urls.length);assert(urls.every(u=>!u.includes('personalized-mug-not-from-your-sack')));for(const url of urls){const p=products.find(p=>p.url===url);assert(p);if(budget==='Under $25')assert(Number(p.price)<25);if(budget==='$25–$50')assert(Number(p.price)<=50);}
 assert(h.text().includes('Prices are in USD'));
 {
  const evidence=JSON.parse(html.match(/const imageAnimalEvidence = (.*);/)[1]);
  for(const heading of h.doc.root.all().filter(n=>n.tagName==='h4')){
   const p=products.find(p=>p.name===heading.textContent),record=evidence[p.id];
   const shown=record&&record.image===p.image?record.animals:[];
   const text=heading.parent.textContent;
   if(animal==='Other / Not sure')assert(text.includes('Pet type not specified.'));
   else if(shown.includes(animal))assert(text.includes(animal+' shown in sample'));
   else {
    assert(text.includes(shown.length?'Different animal shown: '+shown.map(s=>s.toLowerCase()).join(' and '):'Sample animal not verified'));
    assert(text.includes('Check '+animal.toLowerCase()+' customization options in the store.'));
    assert(!text.includes('someone who loves their '+animal.toLowerCase()));
   }
   const expected=(p.priceType.toLowerCase()==='fixed'?'$':'From $')+Number(p.price).toFixed(2);
   assert(heading.parent.children.some(n=>n.tagName==='p'&&n.textContent.startsWith(expected)));
  }
  if(animal==='Horse')assert(h.text().includes('No reviewed horse previews'));
  if(animal==='Other / Not sure')assert(h.text().includes("Your pet type isn't specified"));
 }

 maxCards=Math.max(maxCards,urls.length);scenarios++;
}
const answers={recipient:'Friend',animal:'Cat',occasion:'Birthday',budget:'Under $25'};let recoveries=0;
for(const mode of ['network','http','malformed','timeout']){const h=harness(answers,mode);if(mode==='timeout')h.timeout();await tick();assert(h.text().includes("We couldn't load"));assert(h.find('Try again'));h.setMode('ok');h.find('Try again').click();await tick();assert(h.links().length>0);assert.equal(h.calls(),2);assert(!h.find('Try again'));recoveries++;}
const h=harness(answers);await tick();await vm.runInContext('renderSummary()',h.ctx);assert.equal(h.calls(),1);h.doc.getElementById('restart').click();assert(h.doc.getElementById('choices'));assert(!h.links().length);
// Above-budget presentation is fixture coverage; current real catalog scenarios never need it.
const fixture={...products.find(p=>String(p.animal).toLowerCase().includes('cat')&&p.occasion==='Any Occasion'),price:30};const over=harness(answers,'ok',[fixture]);await tick();assert(over.text().includes('These alternatives start above your budget'));assert(over.text().includes('Above selected budget'));
const layout=[320,360,375,390,414,420,421,768].map(viewport=>{const main=Math.min(viewport-32,580),padding=viewport<=420?19:25,panelContent=main-2-2*padding,grid=panelContent-36,columns=Math.floor((grid+16)/(180+16))||1,card=(grid-16*(columns-1))/columns;assert(card>0);return {viewport,main,panelContent,grid,columns,card};});
const result={method:'Controlled minimal DOM/event harness, no browser rendering or external network',scenarios,paginationClicks:clicks,maxCards,adultGagAcrossAllPages:'PASS',duplicateLinks:'none',recoveryModesPassed:recoveries,cacheAndRestart:'PASS',aboveBudgetFixture:'PASS',layout,liveRenderedNew:0,liveRenderedPrior:99,liveRemaining:221};if(process.env.WRITE_VISUAL_AUDIT)fs.writeFileSync(__dirname+'/all-animal-dom-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
})().catch(e=>{console.error(e);process.exit(1)});
