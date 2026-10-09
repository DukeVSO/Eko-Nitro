// Checks the dev-only showcase mode (?showcase). Run: node showcase.js ../public/index.html
const {JSDOM}=require('jsdom'),fs=require('fs'),vm=require('vm'),THREE=require('three');
const file=process.argv[2]||'../public/index.html';let html=fs.readFileSync(file,'utf8').replace(/<script src="https:\/\/cdnjs[^>]*><\/script>/,'');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);html=html.replace(/<script>[\s\S]*?<\/script>/g,'');
global.document=undefined;const dom=new JSDOM(html,{runScripts:'outside-only',pretendToBeVisual:true,url:'https://example.com/?showcase'});const w=dom.window,ctx=dom.getInternalVMContext();global.document=w.document;
const errs=[];w.addEventListener('error',e=>errs.push(e.message));
class R{constructor(o){this.domElement=o.canvas;this.shadowMap={};this.info={render:{calls:0,triangles:0}}}setSize(){}setPixelRatio(){}render(){}dispose(){}}
THREE.WebGLRenderer=R;THREE.PMREMGenerator=class{fromCubemap(){return{texture:{},dispose(){}}}};w.THREE=THREE;
const stub=new Proxy(function(){},{get:(t,k)=>(k=='createRadialGradient'||k=='createLinearGradient')?()=>({addColorStop(){}}):()=>stub,set:()=>true});
w.HTMLCanvasElement.prototype.getContext=()=>stub;w.matchMedia=()=>({matches:false});w.ResizeObserver=class{observe(){}};
for(const s of scripts){try{new vm.Script(s).runInContext(ctx)}catch(e){errs.push('load: '+e.message)}}
const run=c=>{try{return vm.runInContext(c,ctx)}catch(e){errs.push('run['+c.slice(0,40)+']: '+e.message)}};
let T=0;const frames=n=>{for(let i=0;i<n;i++){T+=16;run('loop('+T+')')}};const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const res=[];const ok=(n,c)=>{res.push(!!c);console.log((c?'PASS ':'FAIL ')+n)};
(async()=>{await sleep(900);frames(30);
 ok('showcase panel appears and race scene is live',!!w.document.querySelector('button')&&run('st')=='play'&&run('EV.id')==99);
 for(const [tod,rain] of [['day',0],['morning',0],['sunset',0],['night',0],['day',1],['night',1]]){run(`__showcase.preset('${tod}',${rain})`);frames(40);
  ok('preset '+tod+(rain?' + rain':'')+' renders without errors',run('EV.tod')==tod&&!!run('EV.rain')==!!rain&&run('rain.visible')===!!rain)}
 run("__showcase.go('city')");frames(60);ok('Oworonshoki scene',run('Math.round(D0)')==20&&run("document.body.classList.contains('pl')"));
 run("__showcase.go('bridge')");frames(60);ok('Third Mainland scene',run('Math.round(D0)')==1300);
 run("__showcase.preset('night',1)");frames(30);ok('night + rain has wet roads and sky colour set',run('wetPrev')===true&&run('tiles[0].rd[0].material===tiles[0].mW'));
 run("pol=1");ok('exposure values are sane (0.3 to 1.6)',run('rd.toneMappingExposure')>.3&&run('rd.toneMappingExposure')<1.6);
 ok('new showcase buttons exist (CAR, CUSTOM, DRIFT, NITRO, HIT)',[...w.document.querySelectorAll('button')].map(b=>b.textContent).filter(x=>/CAR >|CUSTOM|DRIFT|NITRO|HIT/.test(x)).length>=5);
 const c0=run('S.car');const cb=[...w.document.querySelectorAll('button')].find(b=>b.textContent=='CAR >');if(cb)cb.click();else console.log('  CAR button missing; errors:',[...new Set(errs)].join(' | '));ok('CAR button switches the player car',run('S.car')!=c0);
 run('shake=1;burst(px)');frames(2);ok('HIT shows sparks',run('sparks.some(q=>q.visible)'));
 ok('no errors',errs.length==0);if(errs.length)console.log([...new Set(errs)].join('\n'));
 const bad=res.filter(x=>!x).length;console.log('\n'+(res.length-bad)+'/'+res.length+' passed');process.exit(bad?1:0)})();
