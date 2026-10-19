const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const audit=JSON.parse(fs.readFileSync(__dirname+'/visual-relevance-audit-2026-10-20.json'));
const products=audit.products;
const evidence=JSON.parse(fs.readFileSync(__dirname+'/image-animal-evidence.json')).products;
function source(file){const html=fs.readFileSync(__dirname+'/'+file,'utf8');return html.slice(html.indexOf('    const normalize ='),html.indexOf('    container.textContent = "";',html.indexOf('    const normalize =')));}
const before=audit.baselineEngine,after=source('index.html');const compact=Object.fromEntries(Object.entries(evidence).map(([id,r])=>[id,{image:r.image,animals:r.animals}]));
function run(code,answers,ps=products){return vm.runInNewContext('(()=>{'+code+';return {matches,eligible,pool,uniqueProducts,diversePicks};})()',{answers,products:ps,URL,imageAnimalEvidence:compact});}
const visual=p=>{const r=evidence[p.id];return r?.image===p.image?(r.animals.includes('Cat')?'cat':r.animals.length?'other':'unknown'):'unknown'};
const describe=p=>({id:p.id,name:p.name,price:p.price,image:p.image,visual:visual(p)});
let rows=[];for(const recipient of ['Partner','Mom or Dad','Friend','Someone else'])for(const occasion of ['Birthday','Christmas','Just because','Remembering a pet'])for(const budget of ['Under $25','$25–$50','$50+','Surprise me']){
 const answers={recipient,animal:'Cat',occasion,budget};const b=run(before,answers),a=run(after,answers);assert.deepEqual(Array.from(a.eligible,p=>p.id).sort(),Array.from(b.eligible,p=>p.id).sort());
 let remaining=a.uniqueProducts(a.pool),all=[];while(remaining.length){const page=a.diversePicks(remaining);assert(page.length>0);all.push(...page);remaining=remaining.filter(p=>!page.includes(p));}assert.equal(new Set(all.map(p=>p.url)).size,all.length);assert.equal(all.length,a.uniqueProducts(a.pool).length);
 // Within each occasion partition, no nonmatching preview can displace a reviewed matching preview.
 const exact=occasion==='Remembering a pet'?'memorial':occasion.toLowerCase();for(const specific of [true,false]){const pool=Array.from(a.pool).filter(p=>(p.occasion.toLowerCase()===exact)===specific);const shown=Array.from(a.matches).filter(p=>(p.occasion.toLowerCase()===exact)===specific);const matching=pool.filter(p=>visual(p)==='cat');if(shown.some(p=>visual(p)!=='cat'))assert(matching.every(p=>shown.includes(p)));}
 rows.push({...answers,before:Array.from(b.matches,describe),after:Array.from(a.matches,describe),remainingPoolOther:Array.from(a.pool).filter(p=>visual(p)==='other').length});
}
const target=rows.find(r=>r.recipient==='Partner'&&r.occasion==='Birthday'&&r.budget==='$25–$50');assert(target.after.every(p=>p.visual==='cat'));assert(!target.after.some(p=>p.id==='14877111452035'));assert(run(after,{recipient:'Partner',animal:'Cat',occasion:'Birthday',budget:'Surprise me'}).eligible.some(p=>p.id==='14877111452035'));
// Unknown/missing/changed-image metadata cannot claim a visual match or change compatibility.
const changed=products.map(p=>({...p,image:p.image+'#changed'}));const a=run(after,{recipient:'Partner',animal:'Cat',occasion:'Birthday',budget:'Surprise me'},changed);const b=run(before,{recipient:'Partner',animal:'Cat',occasion:'Birthday',budget:'Surprise me'},changed);assert.deepEqual(Array.from(a.matches,p=>p.id),Array.from(b.matches,p=>p.id));
const count=(key,type)=>rows.reduce((n,r)=>n+r[key].filter(p=>p.visual===type).length,0);const summary={catScenarios:rows.length,before:{catCards:count('before','cat'),otherCards:count('before','other'),unknownCards:count('before','unknown')},after:{catCards:count('after','cat'),otherCards:count('after','other'),unknownCards:count('after','unknown')},scenariosWithOtherBefore:rows.filter(r=>r.before.some(p=>p.visual==='other')).length,scenariosWithOtherAfter:rows.filter(r=>r.after.some(p=>p.visual==='other')).length,catImagesReviewed:Object.keys(evidence).length,target};
if(process.env.WRITE_IMAGE_AUDIT)fs.writeFileSync(__dirname+'/image-relevance-results.json',JSON.stringify({summary,rows},null,2));console.log(JSON.stringify(summary,null,2));
