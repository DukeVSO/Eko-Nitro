// Headless smoke test. Run:  cd tests && npm install && npm test
// It loads the game in jsdom with a fake renderer, then clicks through the main flows.
const {JSDOM}=require('jsdom'),fs=require('fs'),vm=require('vm'),THREE=require('three');
const file=process.argv[2]||'../public/index.html';let html=fs.readFileSync(file,'utf8');
html=html.replace(/<script src="https:\/\/cdnjs[^>]*><\/script>/,'');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);html=html.replace(/<script>[\s\S]*?<\/script>/g,'');
global.document=undefined;const dom=new JSDOM(html,{runScripts:'outside-only',pretendToBeVisual:true,url:'https://example.com/?nointro'});const w=dom.window,ctx=dom.getInternalVMContext();global.document=w.document;
const errs=[];w.addEventListener('error',e=>errs.push(e.message));const ce=w.console.error;w.console.error=(...a)=>errs.push('console.error '+a.join(' '));
class R{constructor(o){this.domElement=o.canvas;this.shadowMap={};this.info={render:{calls:0,triangles:0}}}setSize(){}setPixelRatio(){}render(){}dispose(){}}
THREE.WebGLRenderer=R;THREE.PMREMGenerator=class{fromCubemap(){return{texture:{},dispose(){}}}};w.THREE=THREE;
const stub=new Proxy(function(){},{get:(t,k)=>(k=='createRadialGradient'||k=='createLinearGradient')?()=>({addColorStop(){}}):()=>stub,set:()=>true});
w.HTMLCanvasElement.prototype.getContext=()=>stub;w.matchMedia=()=>({matches:false});w.ResizeObserver=class{observe(){}};
const fn=()=>{const o={gain:{value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},cancelScheduledValues(){},setTargetAtTime(){}},frequency:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},type:'',connect(){return o},disconnect(){},start(){},stop(){}};return o};
w.AudioContext=class{constructor(){this.state='running';this.currentTime=0;this.sampleRate=8000;this.destination=fn()}createGain(){return fn()}createOscillator(){return fn()}createBiquadFilter(){return fn()}createBufferSource(){return fn()}createBuffer(){return{getChannelData:()=>new Float32Array(8)}}createMediaElementSource(){return fn()}resume(){return Promise.resolve()}suspend(){return Promise.resolve()}};
w.HTMLMediaElement.prototype.play=function(){this._p=true;return Promise.resolve()};w.HTMLMediaElement.prototype.pause=function(){this._p=false};
for(const s of scripts){try{new vm.Script(s).runInContext(ctx)}catch(e){errs.push('load: '+e.message)}}
const run=c=>{try{return vm.runInContext(c,ctx)}catch(e){errs.push('run['+c.slice(0,50)+']: '+e.message)}};
const ui=()=>run("document.getElementById('ui').textContent")||'';const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let T=0;const frames=n=>{for(let i=0;i<n;i++){T+=16;run('loop('+T+')')}};
const res=[];const ok=(n,c)=>{res.push([n,!!c]);console.log((c?'PASS ':'FAIL ')+n)};
(async()=>{
 const net=/PLAY AS GUEST/.test(ui());
 ok('main menu / sign-in loads',/Choose your racer|PLAY AS GUEST|NEW PROFILE|Sign in/i.test(ui())||ui().length>20);
 if(net){run("A('gst')");ok('guest flow opens (Netlify)',/NAME|Racer name|PROFILE/i.test(ui()))}
 else run("A('np')");
 run("document.getElementById('nn').value='Tester'");run("A('mk')");
 ok('profile creation works and home opens',/CAREER/.test(ui())&&/GARAGE/.test(ui()));
 ok('home has Exit as last button',run("(()=>{const b=[...document.querySelectorAll('#ui button')];return /EXIT/.test(b[b.length-1].textContent)})()"));
 run("A('career')");ok('career opens with first event',/Oworonshoki/.test(ui())&&run("document.getElementById('ui').innerHTML.includes(\"A('race',0)\")"));
 run("A('race',0)");ok('first event starts (countdown)',run('st')=='pause'&&run('jl')==1&&!run("document.getElementById('ui').classList.contains('on')"));
 const t0=Date.now();while(run('st')!='play'&&Date.now()-t0<5000){frames(2);await sleep(30)}
 ok('countdown ends and race is live',run('st')=='play');
 run('shieldOn=true;nit=100');frames(180);
 ok('player accelerates and distance grows',run('ps')>25&&run('dist')>40);
 run("tp.R=1");const x0=run('px');frames(40);run("delete tp.R");ok('steering moves the car',Math.abs(run('px')-x0)>.2);
 run("shieldOn=false;hp=100");const dd0=run('dd');let dseen=false;run("drh=1");for(let i=0;i<25;i++){run("vx=4");frames(1);if(run('drf')===true)dseen=true}ok('drift works (drift state turns on while sliding)',dseen);run("drh=0;vx=0");
 const ps0=run('ps');run("nitOn=1;nit=100");frames(70);ok('nitro boosts the car and camera effect',run('nk')>.1&&run('ps')>=ps0);run("nitOn=0");
 run("(()=>{const v=trf.find(q=>q.t=='car'&&q.g.visible);v.x=px;v.z=-1;v.cd=0;v.hit=0;v.fall=0;return 1})()");const hp0=run('hp');frames(3);ok('collision with traffic hurts and shows effects',run('hp')<hp0&&run('sparks.some(q=>q.visible)'));run("hp=100;shieldOn=true");
 ok('traffic and rivals are present',run('trf.filter(v=>v.g.visible).length')>10&&run('rv.some(r=>r.rd>-1e5)'));
 run("hv=3");frames(60);ok('heat brings the police',run('po.g.visible')===true);run("hv=0");
 run("pause()");ok('pause menu has Settings, Restart, Exit',/SETTINGS/.test(ui())&&/RESTART/.test(ui())&&/EXIT/.test(ui()));
 run("A('setp')");ok('settings open from pause',/SETTINGS/.test(ui())&&/Steering/.test(ui()));run("A('pm')");run("A('resume')");ok('resume works',run('st')=='play');
 run("dist=FIN-4");const t1=Date.now();while(run('st')=='play'&&Date.now()-t1<6000){frames(3);await sleep(10)}
 const fin=ui();ok('race finishes and a result screen shows',run('st')=='over'&&/FINISHED|DUEL LOST|WRECKED|BUSTED|ARRESTED/.test(fin));
 run("A('career')");run("A('garage')");ok('garage opens',/BUY|SELECT|SELECTED/.test(ui())&&/SPEED/.test(ui()));
 run("A('czs')");ok('customise screen opens',/Rims/.test(ui()));run("A('gbk')");
 const tr=run('TRK.map(t=>t.title+" - "+t.artist).join("|")');ok('five songs with real titles',run('TRK.length')==5&&/Imposter is in chat/.test(tr)&&/One Heart for two/.test(tr)&&/If Love was enough/.test(tr)&&/PP - DukeVSO/.test(tr)&&/PP - Victor/.test(tr));
 run("au();radInit()");const start=[];let one=true;for(let i=0;i<3;i++){run("S.radioOff=false;ri="+i+";radSwitch()");await sleep(1150);const st=run("ra.map(a=>!!a._p)");start.push(run('curT'));one=one&&st.filter(Boolean).length==1&&st[run('curT')]===true}
 ok('only one song plays at a time on every channel',one);ok('the three channels start on different songs',new Set(start).size==3);
 run("ri=0;S.radioOff=false;radSwitch()");await sleep(1150);const trk0=run('curT');const el=run('ra[curT]');Object.defineProperty(el,'duration',{get:()=>60,configurable:true});Object.defineProperty(el,'currentTime',{get:()=>58,set(){},configurable:true});Object.defineProperty(el,'paused',{get:()=>false,configurable:true});run('radTick()');await sleep(3900);
 ok('songs crossfade into the next one (DJ mix)',run('curT')!=trk0&&run('rcur')==0&&run("ra.filter(a=>a._p).length")==1);
 const bt=run(`(()=>{let bad=[];for(const id of Object.keys(CARS)){const z=czf(id);z.rim=3;z.sp=1;z.tint=1;z.neon=2;z.str=2;z.ex=2;buildPlayer(id);pl.updateMatrixWorld(true);const sp=CSP[KM[id]],b=new THREE.Box3();pl.traverse(o=>{if(!o.isMesh||o.geometry.type=='PlaneGeometry'||o===fl1||o===fl2)return;o.geometry.computeBoundingBox();b.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld))});
  const ox=pl.position.x;if(b.max.z>sp.L/2+.5||b.min.z<-sp.L/2-.5||b.max.x-ox>sp.W/2+.4||b.min.x-ox<-sp.W/2-.4||b.max.y>2.6||b.min.y<-.1)bad.push(id+' '+b.min.toArray().map(x=>x.toFixed(2))+' '+b.max.toArray().map(x=>x.toFixed(2)));z.rim=z.sp=z.tint=z.neon=z.str=z.ex=0}return JSON.stringify(bad)})()`);
 ok('all customisation parts stay attached on all 9 cars',JSON.parse(bt).length==0);if(JSON.parse(bt).length)console.log('  '+bt);run("applyCar(S.car)");
 run("S.cash=9999999");run("A('garage')");let g=0;while(run("S.own.includes(Object.keys(CARS)[gi])")&&g++<12)run("A('gn',1)");const n0=run('S.own.length');run("A('buy')");ok('car purchase works',run('S.own.length')==n0+1);
 const u0=run("S.up[S.car]?S.up[S.car].e:0");run("A('sel')");const c0=run('S.cash');run("A('up','e')");ok('upgrade works and costs money',run('S.cash')<c0);run("A('home')");
 const q0=run('S.qual||"auto"');const seen=[];for(let i=0;i<5;i++){run("A('q')");seen.push(run('S.qual'))}ok('quality cycles AUTO/LOW/MEDIUM/HIGH/ULTRA',new Set(seen).size==5);
 for(let i=0;i<3;i++)run("A('cm')");const c1=run('S.ctl');ok('steering type cycles through three types',['buttons','tilt','stick'].includes(c1));
 run("A('sn')");ok('sound toggle',run('S.mute')===true);run("A('ro')");ok('radio toggle',typeof run('S.radioOff')=='boolean');
 ok('no major console errors',errs.length==0);if(errs.length)console.log([...new Set(errs)].join('\n'));
 const bad=res.filter(r=>!r[1]).length;console.log('\n'+(res.length-bad)+'/'+res.length+' passed');process.exit(bad?1:0)})();
