const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const products=JSON.parse(fs.readFileSync(__dirname+'/visual-relevance-audit-2026-10-20.json')).products;
const evidence=JSON.parse(fs.readFileSync(__dirname+'/image-animal-evidence.json')).products;
function parse(h){return {code:h.slice(h.indexOf('    const normalize ='),h.indexOf('    container.textContent = "";',h.indexOf('    const normalize ='))),metadata:JSON.parse(h.match(/const imageAnimalEvidence = (.*);/)[1])};}
const fixture=JSON.parse(fs.readFileSync(__dirname+'/classification-accuracy-audit-2026-10-20.json'));
const before={code:fixture.baselineEngine,metadata:fixture.baselineMetadata},after=parse(fs.readFileSync(__dirname+'/index.html','utf8'));
function run(src,answers){return vm.runInNewContext('(()=>{'+src.code+';return {matches,pool,eligible,uniqueProducts,selectPicks};})()',{imageAnimalEvidence:src.metadata,answers,products,URL});}
function pages(r){let result=[Array.from(r.matches)],remaining=r.uniqueProducts(r.pool).filter(p=>!r.matches.includes(p));while(remaining.length){const next=r.selectPicks(remaining);assert(next.length>0&&next.length<=6);result.push(Array.from(next));remaining=remaining.filter(p=>!next.includes(p));}return result;}
const ids=x=>Array.from(x,p=>p.id).sort();const count=(items,animal)=>items.reduce((s,p)=>{const e=evidence[p.id],key=animal==='Other / Not sure'?'unspecified':e.classification==='Neutral'?'neutral':e.classification==='Uncertain'?'uncertain':e.animals.includes(animal)?'matching':'mismatch';s[key]++;return s;},{matching:0,mismatch:0,neutral:0,uncertain:0,unspecified:0});
const falseClaims=(items,animal,metadata)=>animal==='Other / Not sure'?0:items.filter(p=>metadata[p.id]?.image===p.image&&metadata[p.id]?.animals.includes(animal)&&!evidence[p.id].animals.includes(animal)).length;
let rows=[],summary={},falseBefore=0,falseAfter=0,initialFalseBefore=0;
for(const animal of ['Cat','Dog','Horse','Rabbit','Other / Not sure']){
 summary[animal]={scenarios:0,initial:{matching:0,mismatch:0,neutral:0,uncertain:0,unspecified:0},all:{matching:0,mismatch:0,neutral:0,uncertain:0,unspecified:0},falseClaimsBefore:0,falseClaimsAfter:0};
 for(const recipient of ['Partner','Mom or Dad','Friend','Someone else'])for(const occasion of ['Birthday','Christmas','Just because','Remembering a pet'])for(const budget of ['Under $25','$25–$50','$50+','Surprise me']){
  const answers={animal,recipient,occasion,budget},b=run(before,answers),a=run(after,answers),bp=pages(b),ap=pages(a),all=ap.flat();assert.deepEqual(ids(a.eligible),ids(b.eligible));assert.deepEqual(ids(all),ids(bp.flat()));assert.equal(new Set(all.map(p=>p.url)).size,all.length);
  for(const p of all){assert(!p.url.includes('personalized-mug-not-from-your-sack'));if(budget==='Under $25')assert(Number(p.price)<25);if(budget==='$25–$50')assert(Number(p.price)<=50);}
  const row={...answers,initial:count(ap[0],animal),all:count(all,animal),falseClaimsBefore:falseClaims(bp.flat(),animal,before.metadata),falseClaimsAfter:falseClaims(all,animal,after.metadata),initialFalseBefore:falseClaims(bp[0],animal,before.metadata),initialIds:ap[0].map(p=>p.id)};rows.push(row);const s=summary[animal];s.scenarios++;for(const k of ['initial','all'])for(const key in s[k])s[k][key]+=row[k][key];s.falseClaimsBefore+=row.falseClaimsBefore;s.falseClaimsAfter+=row.falseClaimsAfter;falseBefore+=row.falseClaimsBefore;falseAfter+=row.falseClaimsAfter;initialFalseBefore+=row.initialFalseBefore;
 }
}
assert.equal(falseAfter,0);assert.equal(Object.keys(evidence).length,145);
assert.deepEqual(evidence['15343366996355'].animals,['Dog']);assert.deepEqual(evidence['15317299265923'].animals,['Dog']);assert.deepEqual(evidence['15296193593731'].animals,['Dog']);assert.deepEqual(evidence['8833882489167'].animals,['Cat']);assert(evidence['8717979713871'].animals.includes('Rabbit'));
// Price tier and product eligibility implementation must remain byte-identical.
for(const [start,end] of [['    const minPrice =','    const animalTags ='],['    const animalTags =','    const score =']])assert.equal(after.code.slice(after.code.indexOf(start),after.code.indexOf(end)),before.code.slice(before.code.indexOf(start),before.code.indexOf(end)));
const result={scenarios:320,falseSpeciesClaimsBefore:falseBefore,falseSpeciesClaimsAfter:falseAfter,initialFalseSpeciesClaimsBefore:initialFalseBefore,summary,rows};if(process.env.WRITE_VISUAL_AUDIT)fs.writeFileSync(__dirname+'/classification-results.json',JSON.stringify(result));console.log(JSON.stringify({...result,rows:undefined},null,2));
