const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const source=html.slice(html.indexOf('    const normalize ='),html.indexOf('    container.textContent = "";',html.indexOf('    const normalize =')));
function run(products,budget='Under $25',extra={}){return vm.runInNewContext('(function(){'+source+';return {matches,showingAboveBudget};})()', {products,answers:{animal:'Cat',occasion:'Birthday',recipient:'Partner',budget,...extra},URL});}
function p(price,slug=String(price),extra={}){return {name:slug,url:'https://pet-printed.com/products/'+slug,price,animal:'Cat',occasion:'Any Occasion',recipient:'Pet Lover',...extra};}
const prices=r=>Array.from(r.matches,x=>Number(x.price));
assert.deepEqual(prices(run([p(25),p(24.99)])),[24.99]);
assert.deepEqual(prices(run([p(25),p(50),p(24.99),p(50.01)],'$25–$50')),[25,50,24.99]);
assert.deepEqual(prices(run([p(49.99),p(50),p(80)],'$50+')),[50,80,49.99]);
assert.deepEqual(prices(run([p(27),p(26)])),[26,27]);
assert.equal(run([p(26)]).showingAboveBudget,true);
for(const value of ['',null,undefined,false,[],{},0,-1,'not a price']) assert.equal(run([p(value)]).matches.length,0);
assert.equal(run([p(10,'a',{eligible:false}),p(11,'b',{available:'FALSE'})]).matches.length,0);
assert.equal(run([p(10,'a',{url:'javascript:alert(1)'}),p(11,'b',{url:'https://example.com/products/x'})]).matches.length,0);
assert.equal(run([p(10,'a'),p(10,'a',{url:'https://pet-printed.com/products/a?variant=2'})]).matches.length,1);
assert.equal(run([p(10,'a',{animal:'Dog'}),p(11,'b',{occasion:'Christmas'})]).matches.length,0);
assert.equal(run([p(10,'a',{occasion:'Memorial'})],'Surprise me',{occasion:'Remembering a pet'}).matches.length,1);
assert.equal(run(Array.from({length:12},(_,i)=>p(i+1))).matches.length,6);
assert.deepEqual(prices(run([p(100),p(1)],'Surprise me')),[1,100]);
console.log('PASS: 13 recommendation scenarios, including invalid-price cases');
assert.equal(run([p(10,'multi',{animal:'Dog, Cat'})]).matches.length,1);
assert.equal(run([p(10,'multi',{animal:'Dog, Cat'})],'Surprise me',{animal:'Horse'}).matches.length,0);
assert.equal(run([p(10,'multi',{animal:'Dog, Cat, Horse, Rabbit'})],'Surprise me',{animal:'Rabbit'}).matches.length,1);
assert.equal(run([p(10,'multi',{animal:'Dog, Cat, Horse, Rabbit'})],'Surprise me',{animal:'Other / Not sure'}).matches.length,0);
assert.equal(run([p(10,'multi',{animal:'Bunny'})],'Surprise me',{animal:'Rabbit'}).matches.length,1);
console.log('PASS: 5 additional multi-species scenarios');
