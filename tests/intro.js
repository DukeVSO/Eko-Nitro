// Tests the LASGIDI RUSH cinematic intro. Run: node intro.js ../public/index.html
const {JSDOM}=require('jsdom'),fs=require('fs'),vm=require('vm'),THREE=require('three');
const file=process.argv[2]||'../public/index.html';const src=fs.readFileSync(file,'utf8');
const res=[];const ok=(n,c)=>{res.push(!!c);console.log((c?'PASS ':'FAIL ')+n)};const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function boot(seed){let html=src.replace(/<script src="https:\/\/cdnjs[^>]*><\/script>/,'');const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);html=html.replace(/<script>[\s\S]*?<\/script>/g,'');
 const dom=new JSDOM(html,{runScripts:'outside-only',pretendToBeVisual:true,url:'https://example.com/'}),w=dom.window,ctx=dom.getInternalVMContext();global.document=w.document;
 if(seed)seed(w);const errs=[];w.addEventListener('error',e=>errs.push(e.message));w.console.error=(...a)=>errs.push('console.error '+a.join(' '));
 class R{constructor(o){this.domElement=o.canvas;this.shadowMap={};this.info={render:{calls:0,triangles:0}}}setSize(){}setPixelRatio(){}render(){}dispose(){}}
 THREE.WebGLRenderer=R;THREE.PMREMGenerator=class{fromCubemap(){return{texture:{},dispose(){}}}};w.THREE=THREE;
 const stub=new Proxy(function(){},{get:(t,k)=>(k=='createRadialGradient'||k=='createLinearGradient')?()=>({addColorStop(){}}):()=>stub,set:()=>true});w.HTMLCanvasElement.prototype.getContext=()=>stub;w.matchMedia=()=>({matches:false});w.ResizeObserver=class{observe(){}};
 const fn=()=>{const o={gain:{value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},cancelScheduledValues(){},setTargetAtTime(){}},frequency:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},type:'',connect(){return o},disconnect(){},start(){},stop(){}};return o};
 w.AudioContext=class{constructor(){this.state='running';this.currentTime=0;this.sampleRate=8000;this.destination=fn()}createGain(){return fn()}createOscillator(){return fn()}createBiquadFilter(){return fn()}createBufferSource(){return fn()}createBuffer(){return{getChannelData:()=>new Float32Array(8)}}createMediaElementSource(){return fn()}resume(){return Promise.resolve()}suspend(){return Promise.resolve()}};
 w.HTMLMediaElement.prototype.play=function(){this._p=true;return Promise.resolve()};w.HTMLMediaElement.prototype.pause=function(){this._p=false};
 for(const s of scripts){try{new vm.Script(s).runInContext(ctx)}catch(e){errs.push('load: '+e.message)}}
 const run=c=>{try{return vm.runInContext(c,ctx)}catch(e){errs.push('run['+c.slice(0,40)+']: '+e.message)}};let T=0;const frames=n=>{for(let i=0;i<n;i++){T+=16;run('loop('+T+')')}};
 return{w,run,frames,errs}}
(async()=>{
 /* 1. first load: splash, then cinematic */
 let H=boot();ok('static loading splash exists before any script runs',/LOADING/.test(src.slice(src.indexOf('<body>'),src.indexOf('<body>')+1500)));
 await sleep(200);H.frames(4);
 ok('intro starts, hides the menu underneath and shows no EKO NITRO text',H.run('INTRO.on')==1&&H.run("U.style.visibility")=='hidden'&&!/EKO NITRO/i.test(src));
 ok('intro uses the existing scene (night, no player car, oncoming cars)',H.run("EV.id")==0&&H.run("EV.tod")=='night'&&H.run('pl.visible')===false&&H.run('iVeh.filter(Boolean).length')>=2);
 H.run('__introSeek(.4)');H.frames(2);ok('title is hidden at the start',+H.run("iLet[0].style.opacity")==0&&H.run("document.getElementById('iSkip').style.opacity")=='0');
 H.run('__introSeek(1.0)');H.frames(2);H.w.document.dispatchEvent(new H.w.KeyboardEvent('keydown',{code:'Space',bubbles:true}));H.frames(1);
 ok('skip is not allowed before 1.5 seconds',H.run('INTRO.out')==-1);
 H.run('__introSeek(1.9)');H.frames(2);ok('skip hint appears after 1.5 s and the title starts arriving displaced',H.run("document.getElementById('iSkip').style.opacity")=='1'&&+H.run("iLet[0].style.opacity")>0&&/translate\((?!0\.0px)/.test(H.run("iLet[0].style.transform")));
 H.run('__introSeek(2.55)');H.frames(2);const mid=parseFloat(H.run("iLet[5].style.transform").match(/translate\(([-\d.]+)px/)[1]);
 H.run('__introSeek(3.3)');H.frames(2);const late=parseFloat(H.run("iLet[5].style.transform").match(/translate\(([-\d.]+)px/)[1]);
 ok('cars pull the letters toward the centre (offset shrinks over time)',mid>late&&Math.abs(late)<8);
 H.run('__introSeek(3.9)');H.frames(2);ok('tagline LAGOS NO DEY WAIT. appears under the title',+H.run("iTg.style.opacity")>.5&&/LAGOS NO DEY WAIT\./.test(H.w.document.getElementById('iTag').textContent));
 /* 2. keyboard skip then fade into the menu */
 H.w.document.dispatchEvent(new H.w.KeyboardEvent('keydown',{code:'Enter',bubbles:true}));H.frames(1);ok('Enter skips (after 1.5 s)',H.run('INTRO.out')>0);
 const o=H.run('INTRO.out');H.run('INTRO.t0=performance.now()-('+o+'+.3)*1000');H.frames(2);ok('fades to black first',+H.run("iBk.style.opacity")>.3&&H.run('INTRO.swapped')==0);
 H.run('INTRO.t0=performance.now()-('+o+'+.7)*1000');H.frames(2);ok('menu is restored under the fade (scene reset, player car back, traffic back)',H.run('INTRO.swapped')==1&&H.run('EV')===null&&H.run('pl.visible')===true&&H.run('opp.every(v=>v.g.visible)')&&H.run("U.style.visibility")=='');
 H.run('INTRO.t0=performance.now()-('+o+'+1.2)*1000');H.frames(2);ok('overlay is gone after the fade and the intro is finished',H.run('INTRO.on')==0&&H.run('INTRO.done')==1&&H.w.document.getElementById('intro').style.display=='none');
 H.run("A('np')");H.run("A('so')");H.run("signin()");H.frames(3);ok('intro does not replay when navigating between menu pages',H.run('INTRO.on')==0&&H.w.document.getElementById('intro').style.display=='none');
 ok('no console errors (first load)',H.errs.length==0);if(H.errs.length)console.log([...new Set(H.errs)].join('\n'));
 /* 3. click skip + saved profile + natural finish */
 const seed=w=>{w.localStorage.setItem('lagosrun-profiles',JSON.stringify([{id:'p1',name:'SavedRacer',pin:''}]));w.localStorage.setItem('lagosrun-p-p1',JSON.stringify({name:'SavedRacer',cash:5000,xp:300}))};
 let G=boot(seed);await sleep(200);G.frames(3);G.run('__introSeek(2)');G.frames(2);G.w.document.getElementById('intro').dispatchEvent(new G.w.MouseEvent('click',{bubbles:true}));G.frames(1);ok('click skips',G.run('INTRO.out')>0);
 const o2=G.run('INTRO.out');G.run('INTRO.t0=performance.now()-('+o2+'+1.2)*1000');G.frames(3);let ut=G.run("document.getElementById('ui').textContent");if(/PLAY AS GUEST/.test(ut)){G.run("A('gst')");ut=G.run("document.getElementById('ui').textContent")}ok('saved profile still shows in the existing menu after the intro',G.run('INTRO.done')==1&&/SavedRacer/.test(ut));
 ok('no console errors (click skip)',G.errs.length==0);
 let N=boot();await sleep(150);N.frames(3);N.run('__introSeek(5.2)');N.frames(2);const o3=N.run('INTRO.out');ok('intro fades out by itself at about 5 seconds',o3>=4.9&&o3<6);N.run('INTRO.t0=performance.now()-('+o3+'+1.2)*1000');N.frames(3);ok('natural finish ends the intro (total under 6.5 s)',N.run('INTRO.done')==1&&o3+1.0<6.5);
 /* 4. starting a race while the intro is still running ends it safely */
 let Q=boot();await sleep(150);Q.frames(3);Q.run("A('np')");Q.run("document.getElementById('nn').value='Tester'");Q.run("A('mk')");Q.run("A('race',0)");const t1=Date.now();while(Q.run('st')!='play'&&Date.now()-t1<5000){Q.frames(2);await sleep(30)}Q.frames(6);
 ok('race start cancels the intro cleanly and gameplay runs',Q.run('st')=='play'&&Q.run('INTRO.on')==0&&Q.run('INTRO.done')==1&&Q.run('pl.visible')===true&&Q.run("document.getElementById('intro').style.display")=='none');
 ok('no console errors (race start)',Q.errs.length==0);if(Q.errs.length)console.log([...new Set(Q.errs)].join('\n'));
 /* 5. audio respects autoplay: no sound without a user gesture */
 let A2=boot();await sleep(150);A2.frames(3);ok('no audio context is created without a user gesture',A2.run('typeof ac')=='undefined'||A2.run('ac')===undefined);
 const bad=res.filter(x=>!x).length;console.log('\n'+(res.length-bad)+'/'+res.length+' passed');process.exit(bad?1:0)})();
