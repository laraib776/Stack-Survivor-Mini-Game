// ── Setup ──
const C=document.getElementById('c'), ctx=C.getContext('2d',{alpha:false});
let GW=800, GH=450, GND=355, GRAV=0.55;
let isMobile=false,isLandscape=true;

function resizeCanvas(){
  const wrap=document.getElementById('wrap');
  const rect=wrap.getBoundingClientRect();
  const dpr=window.devicePixelRatio||1;
  
  C.width=rect.width*dpr;
  C.height=rect.height*dpr;
  ctx.scale(dpr,dpr);
  
  GW=rect.width;
  GH=rect.height;
  GND=GH*0.78;
  
  isMobile=window.innerWidth<768;
  isLandscape=window.innerWidth>window.innerHeight;
  
  // Show mobile controls if playing on mobile
  const mobileCtrl=document.getElementById('mobileControls');
  if(isMobile&&gs.state==='play'){
    mobileCtrl.classList.add('show');
  }else{
    mobileCtrl.classList.remove('show');
  }
}

window.addEventListener('resize',resizeCanvas);
window.addEventListener('orientationchange',()=>{setTimeout(resizeCanvas,100);});

const P={
  cream:'#FAF8F4',cD:'#EDE8DF',cDD:'#DDD8CE',
  olive:'#3D5233',oliveM:'#5C7A4A',oliveL:'#8FAF78',
  ink:'#1A1A18',inkM:'#4A4A42',inkL:'#9A9A88',
  red:'#C84B3C',amber:'#C8883C',blue:'#3C5C88',
  skin:'#D4916A',skinL:'#E8C89A',
};

const keys={},jp={};
function isTypingField(target){
  return target?.matches?.('input, textarea, select, [contenteditable="true"]');
}

document.addEventListener('keydown',e=>{
  if(isTypingField(e.target))return;
  if(!keys[e.code])jp[e.code]=true;
  keys[e.code]=true;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyZ','KeyX','KeyW','KeyA','KeyD','KeyS'].includes(e.code))e.preventDefault();
});
document.addEventListener('keyup',e=>{
  if(isTypingField(e.target))return;
  keys[e.code]=false;
});

let player,enemies,projs,parts,floats,gs,lastFrameTime=0,frameCount=0;
const PLAYER_NAME_KEY='user_vs_dev_player_name';
const HIGH_SCORE_KEY='user_vs_dev_hs';
let playerName=localStorage.getItem(PLAYER_NAME_KEY)||'User';

function cleanPlayerName(value){
  const name=(value||'').trim().replace(/\s+/g,' ');
  return name.length>0?name.slice(0,18):'User';
}

function playerInitials(){
  return cleanPlayerName(playerName)
    .split(' ')
    .map(part=>part[0])
    .join('')
    .slice(0,2)
    .toUpperCase()||'U';
}

function syncPlayerNameUI(){
  const name=cleanPlayerName(playerName);
  playerName=name;
  ['brandPlayerName','titlePlayerName','cardPlayerName'].forEach(id=>{
    const el=document.getElementById(id);
    if(el)el.textContent=name;
  });
  const input=document.getElementById('playerNameInput');
  if(input)input.value=name==='User'?'':name;
}

// ── Mobile Button Setup ──
function setupMobileControls(){
  const leftBtn=document.getElementById('leftBtn');
  const rightBtn=document.getElementById('rightBtn');
  const jumpBtn=document.getElementById('jumpBtn');
  const attackBtn=document.getElementById('attackBtn');
  const specialBtn=document.getElementById('specialBtn');
  
  let leftActive=false,rightActive=false;
  
  leftBtn.addEventListener('touchstart',(e)=>{e.preventDefault();leftActive=true;keys.ArrowLeft=true;});
  leftBtn.addEventListener('touchend',(e)=>{e.preventDefault();leftActive=false;keys.ArrowLeft=false;});
  
  rightBtn.addEventListener('touchstart',(e)=>{e.preventDefault();rightActive=true;keys.ArrowRight=true;});
  rightBtn.addEventListener('touchend',(e)=>{e.preventDefault();rightActive=false;keys.ArrowRight=false;});
  
  jumpBtn.addEventListener('touchstart',(e)=>{e.preventDefault();jp.ArrowUp=true;keys.ArrowUp=true;});
  jumpBtn.addEventListener('touchend',(e)=>{e.preventDefault();keys.ArrowUp=false;});
  
  attackBtn.addEventListener('touchstart',(e)=>{e.preventDefault();jp.KeyZ=true;});
  attackBtn.addEventListener('touchend',(e)=>{e.preventDefault();});
  
  specialBtn.addEventListener('touchstart',(e)=>{e.preventDefault();jp.KeyX=true;});
  specialBtn.addEventListener('touchend',(e)=>{e.preventDefault();});
}

// ── Helpers ──
function rr(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();}
function ov(ax,ay,aw,ah,bx,by,bw,bh){return ax<bx+bw&&ax+aw>bx&&ay<by+bh&&ay+ah>by;}
function hpBar(x,y,w,h,hp,mhp,col){ctx.fillStyle=P.cDD;ctx.fillRect(x,y,w,h);ctx.fillStyle=col;ctx.fillRect(x,y,w*Math.max(0,hp/mhp),h);}

// ── Player ──
class Player{
  constructor(){
    this.x=100;this.y=GND-64;this.w=32;this.h=64;
    this.vx=0;this.vy=0;this.onG=false;
    this.hp=100;this.maxHp=100;this.dir=1;
    this.atkT=0;this.atkCD=0;this.spCD=0;this.inv=0;
    this.hFlash=0;this.frame=0;this.wT=0;this.combo=0;this.comboCD=0;
  }
  update(){
    if(jp.ArrowLeft||jp.KeyA){this.vx=-4.8;this.dir=-1;}
    else if(jp.ArrowRight||jp.KeyD){this.vx=4.8;this.dir=1;}
    if(keys.ArrowLeft||keys.KeyA){this.vx=-4.8;this.dir=-1;}
    else if(keys.ArrowRight||keys.KeyD){this.vx=4.8;this.dir=1;}
    else this.vx*=0.72;

    if((jp.ArrowUp||jp.KeyW||jp.Space)&&this.onG){
      this.vy=-13;this.onG=false;
      burst(this.x+this.w/2,this.y+this.h,P.cD,4);
    }
    if((jp.KeyZ)&&this.atkCD<=0){
      this.atkT=20;this.atkCD=26;
      this.combo++;this.comboCD=50;
      const dmg=14+(this.combo>2?9:0);
      const rx=this.x+(this.dir>0?this.w:-70),ry=this.y+8,rw=70,rh=this.h-16;
      enemies.forEach(e=>{
        if(!e.dead&&ov(rx,ry,rw,rh,e.x,e.y,e.w,e.h)){
          e.hit(dmg,this.dir);gs.shake=this.combo>2?7:3;
          hitBurst(e.x+e.w/2,e.y+e.h/2);
          floater(e.x+e.w/2,e.y-8,dmg,this.combo>2?P.oliveL:P.olive);
        }
      });
    }
    if(jp.KeyX&&this.spCD<=0){
      this.spCD=120;
      projs.push(new Proj(this.x+(this.dir>0?this.w+2:-14),this.y+this.h*.38,this.dir*9,-0.5,'blast',28,'p'));
      burst(this.x+this.w/2,this.y+this.h/2,P.oliveL,7);
    }
    this.vy+=GRAV;this.x+=this.vx;this.y+=this.vy;
    if(this.y>=GND-this.h){this.y=GND-this.h;this.vy=0;this.onG=true;}
    this.x=Math.max(0,Math.min(GW-this.w,this.x));
    ['atkT','atkCD','spCD','inv','hFlash','comboCD'].forEach(k=>this[k]=Math.max(0,this[k]-1));
    if(this.comboCD<=0)this.combo=0;
    if(Math.abs(this.vx)>0.5&&this.onG){this.wT++;if(this.wT%12===0)this.frame^=1;}else this.wT=0;
  }
  damage(d){
    if(this.inv>0)return;
    this.hp-=d;this.inv=50;this.hFlash=12;gs.shake=5;gs.flash=7;
    if(this.hp<=0){this.hp=0;die();}
  }
  draw(){
    ctx.save();
    if(this.inv>0&&Math.floor(this.inv/4)%2===0)ctx.globalAlpha=.35;
    shadow(this.x+this.w/2,this.w*.5);
    drawPlayer(this.x,this.y,this.w,this.h,this.dir,this.atkT>0,this.frame,this.hFlash>0);
    ctx.restore();
    hpBar(this.x-4,this.y-14,this.w+8,5,this.hp,this.maxHp,P.olive);
    if(this.spCD>0){ctx.fillStyle='rgba(61,82,51,.25)';ctx.fillRect(this.x,this.y-21,this.w*(1-this.spCD/120),3);}
  }
}

// ── Enemy ──
const ETYPES={
  bot:{w:30,h:56,hp:35,spd:1.9,acd:65,dmg:10,score:10,col:P.olive},
  stackdev:{w:28,h:60,hp:55,spd:1.4,acd:85,dmg:12,score:20,col:P.amber},
  senior:{w:38,h:68,hp:88,spd:1.1,acd:80,dmg:22,score:35,col:P.blue},
  mlboss:{w:46,h:76,hp:180,spd:1.1,acd:95,dmg:16,score:100,col:P.oliveM},
};
class Enemy{
  constructor(type,x){
    this.t=type;const d=ETYPES[type];
    this.x=x;this.w=d.w;this.h=d.h;this.y=GND-d.h;
    this.vx=0;this.vy=0;this.onG=true;
    this.hp=d.hp;this.maxHp=d.hp;
    this.dir=x>GW/2?-1:1;this.dead=false;this.dT=0;
    this.hFlash=0;this.atkCD=d.acd;this.kb=0;
    this.state='walk';this.sT=0;this.frame=0;this.wT=0;
  }
  hit(d,kd){
    if(this.dead)return;
    this.hp-=d;this.hFlash=8;this.kb=(kd||1)*7;
    if(this.hp<=0){
      this.dead=true;this.dT=28;
      gs.score+=ETYPES[this.t].score;gs.kills++;
      deathBurst(this.x+this.w/2,this.y+this.h/2,ETYPES[this.t].col);
      floater(this.x+this.w/2,this.y,'+'+ETYPES[this.t].score,P.amber);
    }else{this.state='hurt';this.sT=10;}
  }
  update(){
    if(this.dead){this.dT--;return;}
    if(Math.abs(this.kb)>.1){this.x+=this.kb;this.kb*=.65;}
    if(this.state==='hurt'){this.sT--;if(this.sT<=0)this.state='walk';return;}
    const dx=player.x-this.x,adx=Math.abs(dx);
    this.dir=dx>0?1:-1;
    switch(this.t){
      case'bot': this.aiBot(dx,adx);break;
      case'stackdev': this.aiSDev(dx,adx);break;
      case'senior': this.aiSenior(dx,adx);break;
      case'mlboss': this.aiMLBoss(dx,adx);break;
    }
    this.vy+=GRAV;this.x+=this.vx;this.y+=this.vy;
    if(this.y>=GND-this.h){this.y=GND-this.h;this.vy=0;this.onG=true;}
    this.x=Math.max(0,Math.min(GW-this.w,this.x));
    this.atkCD=Math.max(0,this.atkCD-1);
    this.hFlash=Math.max(0,this.hFlash-1);
    if(Math.abs(this.vx)>.3){this.wT++;if(this.wT%14===0)this.frame^=1;}
  }
  aiBot(dx,adx){
    if(adx>this.w+8)this.vx=this.dir*ETYPES.bot.spd;
    else{this.vx=0;if(this.atkCD<=0){this.atkCD=ETYPES.bot.acd;player.damage(ETYPES.bot.dmg);hitBurst(player.x+player.w/2,player.y+player.h/2);}}
  }
  aiSDev(dx,adx){
    if(adx>230)this.vx=this.dir*ETYPES.stackdev.spd;
    else if(adx>90){this.vx*=.8;if(this.atkCD<=0){this.atkCD=ETYPES.stackdev.acd;projs.push(new Proj(this.x+(this.dir>0?this.w:-12),this.y+this.h*.3,this.dir*5.5,-1.4,'coffee',ETYPES.stackdev.dmg,'e'));}}
    else this.vx=-this.dir*ETYPES.stackdev.spd;
  }
  aiSenior(dx,adx){
    if(adx>210)this.vx=this.dir*ETYPES.senior.spd;
    else if(adx>55)this.vx=this.dir*5.5;
    else{this.vx=0;if(this.atkCD<=0){this.atkCD=ETYPES.senior.acd;player.damage(ETYPES.senior.dmg);gs.shake=8;hitBurst(player.x+player.w/2,player.y+player.h/2);}}
  }
  aiMLBoss(dx,adx){
    if(adx>110)this.vx=this.dir*ETYPES.mlboss.spd*.85;
    else this.vx*=.8;
    if(this.atkCD<=0){
      this.atkCD=ETYPES.mlboss.acd;
      [-1,0,1].forEach(s=>projs.push(new Proj(this.x+this.w/2,this.y+this.h*.38,this.dir*6+s*1.5,s*.5,'data',ETYPES.mlboss.dmg,'e')));
      if(this.hp<this.maxHp*.5&&enemies.filter(e=>!e.dead&&e.t==='bot').length<4){
        setTimeout(()=>enemies.push(new Enemy('bot',this.dir>0?GW-40:40)),200);
      }
    }
  }
  draw(){
    if(this.dead&&this.dT<=0)return;
    ctx.save();
    if(this.dead)ctx.globalAlpha=this.dT/28;
    shadow(this.x+this.w/2,this.w*.5);
    const b=this.hFlash>0;
    switch(this.t){
      case'bot':drawBot(this.x,this.y,this.w,this.h,this.dir,b,this.frame);break;
      case'stackdev':drawStackDev(this.x,this.y,this.w,this.h,this.dir,b,this.frame);break;
      case'senior':drawSenior(this.x,this.y,this.w,this.h,this.dir,b,this.frame);break;
      case'mlboss':drawMLBoss(this.x,this.y,this.w,this.h,this.dir,b,this.frame);break;
    }
    ctx.restore();
    if(!this.dead){
      const bc=this.t==='mlboss'?P.red:ETYPES[this.t].col;
      hpBar(this.x,this.y-10,this.w,4,this.hp,this.maxHp,bc);
    }
  }
}

// ── Projectile ──
class Proj{
  constructor(x,y,vx,vy,type,dmg,owner){
    this.x=x;this.y=y;this.vx=vx;this.vy=vy;
    this.t=type;this.dmg=dmg;this.own=owner;this.dead=false;this.age=0;
    this.w=type==='blast'?26:12;this.h=type==='blast'?10:12;
  }
  update(){
    if(this.dead)return;
    this.x+=this.vx;this.vy+=GRAV*.28;this.y+=this.vy;this.age++;
    if(this.x<-30||this.x>GW+30||this.y>GND+20){this.dead=true;return;}
    if(this.own==='p'){
      enemies.forEach(e=>{if(!e.dead&&!this.dead&&ov(this.x,this.y,this.w,this.h,e.x,e.y,e.w,e.h)){e.hit(this.dmg,this.vx>0?1:-1);hitBurst(this.x,this.y);this.dead=true;}});
    }else{
      if(!this.dead&&ov(this.x,this.y,this.w,this.h,player.x,player.y,player.w,player.h)){player.damage(this.dmg);this.dead=true;}
    }
  }
  draw(){
    if(this.dead)return;
    ctx.save();
    if(this.t==='blast'){
      ctx.fillStyle=P.olive;ctx.fillRect(this.x,this.y,this.w,this.h);
      ctx.fillStyle=P.oliveL;ctx.fillRect(this.x+3,this.y+2,this.w-6,this.h-4);
      for(let i=1;i<=3;i++){ctx.globalAlpha=.12/i;ctx.fillStyle=P.olive;ctx.fillRect(this.x-this.vx*i*1.4,this.y,this.w,this.h);}
      ctx.globalAlpha=1;
    }else if(this.t==='coffee'){
      ctx.fillStyle='#8B5E3C';ctx.fillRect(this.x,this.y,11,13);
      ctx.fillStyle='#4A2C1A';ctx.fillRect(this.x,this.y,11,3);
      ctx.fillStyle='#8B5E3C';ctx.fillRect(this.x+9,this.y+3,4,7);
    }else{
      ctx.fillStyle=P.oliveM;ctx.fillRect(this.x,this.y,10,10);
      ctx.fillStyle=P.oliveL;ctx.fillRect(this.x+2,this.y+2,6,6);
    }
    ctx.restore();
  }
}

// ── Particles ──
class Part{
  constructor(x,y,vx,vy,col,life,sz){this.x=x;this.y=y;this.vx=vx;this.vy=vy;this.col=col;this.life=life;this.ml=life;this.sz=sz;this.dead=false;}
  update(){this.x+=this.vx;this.y+=this.vy;this.vy+=.3;this.vx*=.9;this.life--;if(this.life<=0)this.dead=true;}
  draw(){ctx.globalAlpha=this.life/this.ml;ctx.fillStyle=this.col;ctx.fillRect(this.x-this.sz/2,this.y-this.sz/2,this.sz,this.sz);ctx.globalAlpha=1;}
}
class Floater{
  constructor(x,y,txt,col){this.x=x;this.y=y;this.txt=String(txt);this.col=col;this.life=55;this.ml=55;this.dead=false;}
  update(){this.y-=.75;this.life--;if(this.life<=0)this.dead=true;}
  draw(){ctx.globalAlpha=this.life/this.ml;ctx.fillStyle=this.col;ctx.font=`bold 13px 'DM Sans',sans-serif`;ctx.textAlign='center';ctx.fillText(this.txt,this.x,this.y);ctx.textAlign='left';ctx.globalAlpha=1;}
}
function burst(x,y,col,n){
  const actualN=Math.min(n,isMobile?2:4);
  for(let i=0;i<actualN;i++){
    const a=Math.random()*Math.PI*2,s=1+Math.random()*3;
    parts.push(new Part(x,y,Math.cos(a)*s,Math.sin(a)*s-1,col,18+~~(Math.random()*12),2+Math.random()*2));
  }
}
function hitBurst(x,y){
  const n=isMobile?4:8;
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2,s=2+Math.random()*4;
    parts.push(new Part(x,y,Math.cos(a)*s,Math.sin(a)*s,Math.random()>.5?P.olive:P.cD,16+~~(Math.random()*10),2+Math.random()*3));
  }
}
function deathBurst(x,y,col){
  const n=isMobile?10:18;
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2,s=2+Math.random()*6;
    parts.push(new Part(x,y,Math.cos(a)*s,Math.sin(a)*s-2,col,28+~~(Math.random()*18),3+Math.random()*4));
  }
}
function floater(x,y,txt,col){floats.push(new Floater(x,y,txt,col));}
function shadow(cx,r){ctx.fillStyle='rgba(0,0,0,.07)';ctx.beginPath();ctx.ellipse(cx,GND,r,4,0,0,Math.PI*2);ctx.fill();}

// ── Character drawing ──
function drawPlayer(x,y,w,h,dir,atk,fr,blink){
  const sk=blink?'#E07070':P.skinL,bd=blink?'#8B1010':P.ink,ac=blink?'#CC2020':P.olive;
  const lo=fr===1?3:0;
  // legs
  ctx.fillStyle=blink?'#8B1010':'#2A2A25';
  ctx.fillRect(x+w*.1,y+h*.68,w*.32,h*.32+lo);
  ctx.fillRect(x+w*.55,y+h*.68,w*.32,h*.32-lo);
  ctx.fillStyle=P.ink;
  ctx.fillRect(x+w*.04,y+h*.98,w*.38,h*.06);
  ctx.fillRect(x+w*.5,y+h*.98,w*.38,h*.06);
  // body
  ctx.fillStyle=bd;ctx.fillRect(x+w*.05,y+h*.36,w*.9,h*.36);
  ctx.fillStyle=ac;ctx.font=`bold ${w*.27}px 'DM Sans',sans-serif`;ctx.textAlign='center';ctx.fillText(playerInitials(),x+w/2,y+h*.62);ctx.textAlign='left';
  // arms
  ctx.fillStyle=sk;
  if(atk){
    const ax=dir>0?x+w*.88:x-w*.55;
    ctx.fillRect(ax,y+h*.38,w*.55,w*.22);
    ctx.fillStyle=P.olive;ctx.fillRect(ax+(dir>0?w*.38:-w*.22),y+h*.34,w*.32,w*.26);
    ctx.fillStyle=P.oliveL;ctx.fillRect(ax+(dir>0?w*.41:-w*.19),y+h*.37,w*.25,w*.16);
  }else{
    ctx.fillRect(x-w*.12,y+h*.38,w*.22,h*.28);
    ctx.fillRect(x+w*.88,y+h*.38,w*.22,h*.28);
  }
  // head
  ctx.fillStyle=sk;rr(ctx,x+w*.09,y,w*.82,h*.36,w*.18);ctx.fill();
  // hair
  ctx.fillStyle=P.ink;ctx.fillRect(x+w*.09,y,w*.82,h*.12);rr(ctx,x+w*.09,y,w*.82,h*.08,w*.1);ctx.fill();
  // eyes
  const eo=dir<0?w*.06:0;
  ctx.fillStyle=P.ink;
  ctx.fillRect(x+w*.18+eo,y+h*.17,w*.17,w*.17);
  ctx.fillRect(x+w*.56+eo,y+h*.17,w*.17,w*.17);
  // mouth
  ctx.fillRect(x+w*.25,y+h*.27,w*.42,w*.06);
}

function drawBot(x,y,w,h,dir,blink,fr){
  const c=blink?'#90A870':P.olive,gw=blink?'#E0E8D0':P.oliveL,dk=P.ink;
  const lo=fr===1?3:0;
  ctx.fillStyle=dk;ctx.fillRect(x+w*.1,y+h*.68,w*.28,h*.32+lo);ctx.fillRect(x+w*.58,y+h*.68,w*.28,h*.32-lo);
  ctx.fillRect(x+w*.04,y+h*.98,w*.36,h*.06);ctx.fillRect(x+w*.54,y+h*.98,w*.36,h*.06);
  ctx.fillStyle=c;ctx.fillRect(x+w*.07,y+h*.36,w*.86,h*.36);
  ctx.fillStyle=dk;for(let i=0;i<3;i++)ctx.fillRect(x+w*(.2+i*.24),y+h*.44,w*.12,w*.06);
  ctx.fillStyle=c;ctx.fillRect(x-w*.13,y+h*.38,w*.24,h*.26);ctx.fillRect(x+w*.89,y+h*.38,w*.24,h*.26);
  ctx.fillStyle=c;ctx.fillRect(x+w*.07,y,w*.86,h*.38);
  ctx.fillStyle=dk;ctx.fillRect(x+w*.44,y-h*.13,w*.12,h*.15);
  ctx.fillStyle=gw;ctx.beginPath();ctx.arc(x+w*.5,y-h*.12,w*.11,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=gw;ctx.fillRect(x+w*.16,y+h*.1,w*.23,h*.14);ctx.fillRect(x+w*.57,y+h*.1,w*.23,h*.14);
  ctx.fillStyle=dk;ctx.fillRect(x+w*.22,y+h*.13,w*.1,h*.08);ctx.fillRect(x+w*.63,y+h*.13,w*.1,h*.08);
  for(let i=0;i<4;i++)ctx.fillRect(x+w*(.2+i*.15),y+h*.3,w*.07,w*.07);
}

function drawStackDev(x,y,w,h,dir,blink,fr){
  const lo=fr===1?3:0;
  ctx.fillStyle='#3A3060';
  ctx.fillRect(x+w*.1,y+h*.68,w*.33,h*.32+lo);ctx.fillRect(x+w*.55,y+h*.68,w*.33,h*.32-lo);
  ctx.fillStyle=P.ink;ctx.fillRect(x+w*.04,y+h*.98,w*.4,h*.06);ctx.fillRect(x+w*.5,y+h*.98,w*.4,h*.06);
  ctx.fillStyle='#5A4A8A';ctx.fillRect(x+w*.05,y+h*.34,w*.9,h*.38);
  ctx.fillStyle=blink?'#D4A86A':'#F97316';ctx.fillRect(x+w*.28,y+h*.4,w*.44,w*.3);
  ctx.fillStyle='#FAF8F4';ctx.font=`bold ${w*.17}px monospace`;ctx.textAlign='center';ctx.fillText('S/O',x+w*.5,y+h*.52);ctx.textAlign='left';
  ctx.fillStyle=P.skin;ctx.fillRect(x-w*.1,y+h*.36,w*.2,h*.28);ctx.fillRect(x+w*.9,y+h*.36,w*.2,h*.28);
  const cx=dir>0?x+w*.9:x-w*.2;
  ctx.fillStyle='#F5F0E8';ctx.fillRect(cx,y+h*.36,w*.22,w*.28);
  ctx.fillStyle='#4A2C1A';ctx.fillRect(cx+w*.02,y+h*.36,w*.18,w*.08);
  ctx.fillStyle='#8B5E3C';ctx.fillRect(cx+w*.18,y+h*.4,w*.08,w*.15);
  ctx.fillStyle=P.skin;rr(ctx,x+w*.1,y,w*.8,h*.36,w*.14);ctx.fill();
  ctx.fillStyle='#5A4A8A';ctx.fillRect(x+w*.08,y,w*.84,h*.15);ctx.fillRect(x+w*.3,y-h*.07,w*.4,h*.1);
  const eo=dir<0?w*.06:0;
  ctx.fillStyle=P.ink;ctx.fillRect(x+w*.18+eo,y+h*.17,w*.17,w*.17);ctx.fillRect(x+w*.56+eo,y+h*.17,w*.17,w*.17);
  ctx.strokeStyle=P.ink;ctx.lineWidth=1.5;
  ctx.strokeRect(x+w*.13+eo,y+h*.14,w*.28,w*.23);ctx.strokeRect(x+w*.52+eo,y+h*.14,w*.28,w*.23);
  ctx.beginPath();ctx.moveTo(x+w*.41+eo,y+h*.22);ctx.lineTo(x+w*.52+eo,y+h*.22);ctx.stroke();
}

function drawSenior(x,y,w,h,dir,blink,fr){
  const lo=fr===1?2:0;
  ctx.fillStyle='#1A1A3A';
  ctx.fillRect(x+w*.08,y+h*.68,w*.35,h*.32+lo);ctx.fillRect(x+w*.55,y+h*.68,w*.35,h*.32-lo);
  ctx.fillStyle=P.ink;ctx.fillRect(x,y+h*.98,w*.44,h*.06);ctx.fillRect(x+w*.52,y+h*.98,w*.44,h*.06);
  ctx.fillStyle=blink?'#6677BB':P.blue;ctx.fillRect(x,y+h*.34,w,h*.37);
  ctx.fillStyle='#88AACC';ctx.fillRect(x+w*.42,y+h*.36,w*.16,h*.28);
  ctx.fillStyle=blink?'#6677BB':P.blue;ctx.fillRect(x+w*.18,y+h*.34,w*.27,h*.28);ctx.fillRect(x+w*.53,y+h*.34,w*.27,h*.28);
  ctx.fillStyle=P.cream;ctx.fillRect(x+w*.24,y+h*.38,w*.2,h*.22);ctx.fillRect(x+w*.54,y+h*.38,w*.2,h*.22);
  ctx.fillStyle=blink?'#6677BB':P.blue;ctx.fillRect(x-w*.13,y+h*.35,w*.24,h*.3);ctx.fillRect(x+w*.89,y+h*.35,w*.24,h*.3);
  ctx.fillStyle=P.skin;ctx.fillRect(x-w*.1,y+h*.6,w*.2,h*.08);ctx.fillRect(x+w*.9,y+h*.6,w*.2,h*.08);
  ctx.fillStyle=P.skin;rr(ctx,x+w*.1,y,w*.8,h*.3,w*.13);ctx.fill();
  ctx.fillStyle='#AAAAAA';ctx.fillRect(x+w*.1,y,w*.8,h*.1);ctx.fillRect(x+w*.1,y,w*.14,h*.18);ctx.fillRect(x+w*.76,y,w*.14,h*.18);
  const eo=dir<0?w*.06:0;
  ctx.fillStyle=P.ink;
  ctx.fillRect(x+w*.2+eo,y+h*.13,w*.18,w*.1);ctx.fillRect(x+w*.55+eo,y+h*.13,w*.18,w*.1);
  ctx.fillRect(x+w*.17+eo,y+h*.1,w*.24,w*.06);ctx.fillRect(x+w*.52+eo,y+h*.1,w*.24,w*.06);
  ctx.fillRect(x+w*.3,y+h*.22,w*.38,w*.05);
}

function drawMLBoss(x,y,w,h,dir,blink,fr){
  const pulse=(Math.sin(Date.now()*.005)+1)*.5;
  const lo=fr===1?2:0;
  ctx.fillStyle=`rgba(140,200,100,${.18+pulse*.2})`;ctx.beginPath();ctx.ellipse(x+w/2,y+h/2,w*.85,h*.65,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=blink?'#70904A':P.olive;
  ctx.fillRect(x+w*.08,y+h*.7,w*.3,h*.3+lo);ctx.fillRect(x+w*.6,y+h*.7,w*.3,h*.3-lo);
  ctx.fillRect(x,y+h*.97,w*.42,h*.06);ctx.fillRect(x+w*.54,y+h*.97,w*.42,h*.06);
  ctx.fillStyle=blink?'#6B8F4A':P.oliveM;ctx.fillRect(x+w*.03,y+h*.34,w*.94,h*.4);
  ctx.fillStyle=P.olive;
  const nodes=[[.2,.47],[.5,.47],[.8,.47],[.35,.6],[.65,.6]];
  nodes.forEach(([nx,ny])=>{ctx.beginPath();ctx.arc(x+w*nx,y+h*ny,w*.055,0,Math.PI*2);ctx.fill();});
  ctx.strokeStyle=P.olive;ctx.lineWidth=1.2;
  ctx.beginPath();ctx.moveTo(x+w*.2,y+h*.47);ctx.lineTo(x+w*.35,y+h*.6);
  ctx.moveTo(x+w*.5,y+h*.47);ctx.lineTo(x+w*.35,y+h*.6);
  ctx.moveTo(x+w*.5,y+h*.47);ctx.lineTo(x+w*.65,y+h*.6);
  ctx.moveTo(x+w*.8,y+h*.47);ctx.lineTo(x+w*.65,y+h*.6);
  ctx.stroke();
  ctx.fillStyle=blink?'#6B8F4A':P.oliveM;
  ctx.fillRect(x-w*.18,y+h*.36,w*.28,h*.28);ctx.fillRect(x+w*.9,y+h*.36,w*.28,h*.28);
  ctx.fillStyle=P.olive;
  ctx.fillRect(x-w*.22,y+h*.56,w*.1,h*.1);ctx.fillRect(x-w*.13,y+h*.58,w*.1,h*.1);
  ctx.fillRect(x+w*.98,y+h*.56,w*.1,h*.1);ctx.fillRect(x+w*1.08,y+h*.58,w*.1,h*.1);
  ctx.fillStyle=blink?'#6B8F4A':P.oliveM;
  ctx.beginPath();ctx.arc(x+w/2,y+h*.19,w*.46,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle=P.olive;ctx.lineWidth=1.4;
  ctx.beginPath();ctx.arc(x+w/2,y+h*.19,w*.3,-0.5,Math.PI+.5);ctx.stroke();
  ctx.beginPath();ctx.arc(x+w/2,y+h*.19,w*.18,-.8,Math.PI+.8);ctx.stroke();
  const eg=`rgba(144,215,96,${.55+pulse*.4})`;
  ctx.fillStyle=eg;ctx.beginPath();ctx.arc(x+w*.33,y+h*.16,w*.1,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(x+w*.67,y+h*.16,w*.1,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=P.olive;ctx.beginPath();ctx.arc(x+w*.33,y+h*.16,w*.05,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(x+w*.67,y+h*.16,w*.05,0,Math.PI*2);ctx.fill();
}

// ── Wave system ──
const WAVES=[
  [{t:'bot',n:3}],
  [{t:'bot',n:3},{t:'stackdev',n:1}],
  [{t:'bot',n:4},{t:'stackdev',n:2}],
  [{t:'stackdev',n:2},{t:'senior',n:1}],
  [{t:'bot',n:3},{t:'stackdev',n:2},{t:'senior',n:1}],
  [{t:'mlboss',n:1},{t:'bot',n:2}],
  [{t:'senior',n:2},{t:'stackdev',n:3}],
  [{t:'mlboss',n:1},{t:'senior',n:1},{t:'bot',n:3}],
];
const WAVE_NAMES=['','First Contact','Rising Stack','Overflow','Senior Review','Code Review','Model Collapse','Deployment Hell','Production Fire','Infinite Loop'];

function getWave(n){
  if(n<=WAVES.length)return WAVES[n-1];
  return WAVES[WAVES.length-1].map(g=>({...g,n:g.n+Math.floor((n-WAVES.length)*.6)+1}));
}

let waveAnn={on:false,t:0,n:0};
function spawnWave(n){
  const def=getWave(n);
  def.forEach((g,gi)=>{
    for(let i=0;i<g.n;i++){
      setTimeout(()=>{
        if(gs.state!=='play')return;
        const x=GW-60-i*50-gi*20;
        enemies.push(new Enemy(g.t,Math.max(GW-80,Math.min(GW-10,x))));
      },(i+gi*g.n)*380);
    }
  });
}

let waveIdleT=0;
function nextWave(){
  gs.wave++;
  waveAnn={on:true,t:140,n:gs.wave};
  document.getElementById('waveBadge').textContent='Wave '+gs.wave;
  setTimeout(()=>{if(gs.state==='play')spawnWave(gs.wave);},2000);
}

// ── Background ──
function drawBG(){
  ctx.fillStyle=P.cream;ctx.fillRect(0,0,GW,GH);
  ctx.fillStyle='rgba(61,82,51,.035)';
  for(let i=0;i<8;i++){const bx=i*105+15,bh=55+(i*37)%75;ctx.fillRect(bx,GND-110-bh,44+(i*23)%38,bh);}
  ctx.fillStyle='rgba(61,82,51,.055)';
  for(let i=0;i<5;i++){const bx=i*165-5,bh=40+(i*53)%55;ctx.fillRect(bx,GND-75-bh,75,bh);}
  ctx.fillStyle=P.olive;ctx.fillRect(0,GND,GW,GH-GND);
  ctx.fillStyle=P.oliveM;ctx.fillRect(0,GND,GW,4);
  ctx.fillStyle='rgba(0,0,0,.06)';
  for(let i=0;i<16;i++)ctx.fillRect(i*52,GND+9,25,2);
  ctx.strokeStyle='rgba(255,255,255,.07)';ctx.lineWidth=.5;
  for(let i=0;i<GW;i+=42){ctx.beginPath();ctx.moveTo(i,GND);ctx.lineTo(i,GH);ctx.stroke();}
}

// ── HUD ──
function drawHUD(){
  const hudScale=Math.min(1,GH/450);
  const fontSize=Math.max(8,9*hudScale);
  const panelH=Math.max(40,46*hudScale);
  
  // Player HP panel
  ctx.fillStyle='rgba(250,248,244,.92)';
  const hpPanelW=Math.max(140,188*hudScale);
  ctx.fillRect(12,GH-panelH-8,hpPanelW,panelH);
  ctx.strokeStyle='rgba(61,82,51,.2)';ctx.lineWidth=.5;
  ctx.strokeRect(12,GH-panelH-8,hpPanelW,panelH);
  ctx.fillStyle=P.inkL;ctx.font=`500 ${fontSize-1}px 'DM Sans',sans-serif`;
  ctx.fillText(playerName.toUpperCase(),18,GH-panelH+6);
  hpBar(18,GH-panelH+10,Math.max(100,160*hudScale),8,player.hp,player.maxHp,player.hp>50?P.olive:player.hp>25?P.amber:P.red);
  ctx.fillStyle=P.ink;ctx.font=`500 ${fontSize-1}px 'DM Sans',sans-serif`;
  ctx.fillText(player.hp+'/'+player.maxHp,18+Math.max(80,160*hudScale),GH-panelH+22);
  
  // Score panel
  ctx.fillStyle='rgba(250,248,244,.92)';
  const scorePanelW=Math.max(100,128*hudScale);
  ctx.fillRect(GW-scorePanelW-10,8,scorePanelW,panelH);
  ctx.strokeStyle='rgba(61,82,51,.2)';ctx.lineWidth=.5;
  ctx.strokeRect(GW-scorePanelW-10,8,scorePanelW,panelH);
  ctx.fillStyle=P.inkL;ctx.font=`500 ${fontSize-1}px 'DM Sans',sans-serif`;
  ctx.fillText('SCORE',GW-scorePanelW-4,24);
  ctx.fillStyle=P.ink;ctx.font=`700 ${Math.max(16,22*hudScale)}px 'Playfair Display',serif`;
  ctx.fillText(gs.score,GW-scorePanelW-4,panelH);
  
  // Wave panel
  ctx.fillStyle='rgba(250,248,244,.92)';
  const wavePanelW=Math.max(100,140*hudScale);
  ctx.fillRect(8,8,wavePanelW,panelH);
  ctx.strokeStyle='rgba(61,82,51,.2)';ctx.lineWidth=.5;
  ctx.strokeRect(8,8,wavePanelW,panelH);
  ctx.fillStyle=P.inkL;ctx.font=`500 ${fontSize-1}px 'DM Sans',sans-serif`;
  ctx.fillText('WAVE '+gs.wave,16,20);
  const alive=enemies.filter(e=>!e.dead).length;
  ctx.fillStyle=P.olive;ctx.font=`500 ${fontSize}px 'DM Sans',sans-serif`;
  ctx.fillText(alive+' enem'+(alive===1?'y':'ies'),16,panelH);
}

function drawWaveAnn(){
  if(!waveAnn.on)return;
  const fade=Math.min(1,waveAnn.t/25)*Math.min(1,(waveAnn.t>80?1:(waveAnn.t)/30));
  ctx.fillStyle=`rgba(250,248,244,${fade*.75})`;ctx.fillRect(0,GH/2-56,GW,112);
  ctx.fillStyle=`rgba(61,82,51,${fade})`;
  ctx.font=`300 11px 'DM Sans',serif`;ctx.textAlign='center';
  ctx.fillText('— WAVE '+waveAnn.n+' —',GW/2,GH/2-14);
  ctx.font=`700 34px 'Playfair Display',serif`;
  ctx.fillText(waveAnn.n<WAVE_NAMES.length?WAVE_NAMES[waveAnn.n]:'Infinite Loop',GW/2,GH/2+24);
  ctx.textAlign='left';
  waveAnn.t--;if(waveAnn.t<=0)waveAnn.on=false;
}

// ── Game state ──
function init(){
  player=new Player();enemies=[];projs=[];parts=[];floats=[];
  gs={state:'play',score:0,kills:0,wave:0,highScore:+localStorage.getItem(HIGH_SCORE_KEY)||0,shake:0,flash:0};
  waveIdleT=0;waveAnn={on:false,t:0,n:0};
  document.getElementById('waveBadge').textContent='Wave 1';
  nextWave();
}

function die(){
  gs.state='dying';
  if(gs.score>gs.highScore){gs.highScore=gs.score;localStorage.setItem(HIGH_SCORE_KEY,gs.highScore);}
  setTimeout(()=>{
    document.getElementById('finScore').textContent=gs.score;
    document.getElementById('finWave').textContent=gs.wave;
    document.getElementById('finKills').textContent=gs.kills;
    document.getElementById('finBest').textContent=gs.highScore;
    show('overScreen');
    document.getElementById('waveBadge').textContent='Game Over';
  },1400);
}

// ── Main loop with performance optimization ──
let lastTime=0,targetFPS=60;
function frame(currentTime){
  requestAnimationFrame(frame);
  
  // Optimize performance: cap at 60 FPS
  const deltaTime=currentTime-lastTime;
  if(deltaTime<1000/targetFPS)return;
  lastTime=currentTime;
  
  if(gs.state==='play'){
    player.update();
    enemies.forEach(e=>e.update());
    enemies=enemies.filter(e=>!e.dead||e.dT>0);
    projs.forEach(p=>p.update());projs=projs.filter(p=>!p.dead);
    
    // Optimize particles: limit max particles
    if(parts.length<200){
      parts.forEach(p=>p.update());
    }else{
      parts.forEach(p=>p.update());
    }
    parts=parts.filter(p=>!p.dead);
    
    floats.forEach(f=>f.update());floats=floats.filter(f=>!f.dead);
    if(!waveAnn.on&&enemies.length===0){
      waveIdleT++;if(waveIdleT>80){waveIdleT=0;nextWave();}
    }else waveIdleT=0;
    gs.shake=Math.max(0,gs.shake-.5);gs.flash=Math.max(0,gs.flash-1);
  }else if(gs.state==='dying'){
    parts.forEach(p=>p.update());parts=parts.filter(p=>!p.dead);
    floats.forEach(f=>f.update());floats=floats.filter(f=>!f.dead);
    gs.shake=Math.max(0,gs.shake-.3);
  }
  
  Object.keys(jp).forEach(k=>delete jp[k]);

  ctx.save();
  if(gs.shake>0)ctx.translate((Math.random()-.5)*gs.shake,(Math.random()-.5)*gs.shake);
  if(gs.flash>0){ctx.fillStyle=`rgba(200,80,60,${gs.flash*.035})`;ctx.fillRect(-5,-5,GW+10,GH+10);}
  drawBG();
  parts.forEach(p=>p.draw());
  if(gs.state!=='idle'){
    enemies.forEach(e=>e.draw());
    projs.forEach(p=>p.draw());
    if(gs.state!=='dying'||Math.floor(Date.now()/80)%2===0)player.draw();
    floats.forEach(f=>f.draw());
    drawHUD();drawWaveAnn();
  }
  ctx.restore();
}

function show(id){document.getElementById(id).classList.remove('hidden');}
function hide(id){document.getElementById(id).classList.add('hidden');}
function showExitButton(){document.getElementById('exitBtn').classList.remove('hidden');}
function hideExitButton(){document.getElementById('exitBtn').classList.add('hidden');}

function startGame(){
  const input=document.getElementById('playerNameInput');
  playerName=cleanPlayerName(input?.value||playerName);
  localStorage.setItem(PLAYER_NAME_KEY,playerName);
  syncPlayerNameUI();
  hide('startScreen');
  init();
  showExitButton();
  resizeCanvas();
}

function exitGame(){
  gs={state:'idle',score:0,kills:0,wave:0,highScore:+localStorage.getItem(HIGH_SCORE_KEY)||0,shake:0,flash:0};
  enemies=[];projs=[];parts=[];floats=[];
  hideExitButton();
  document.getElementById('mobileControls').classList.remove('show');
  document.getElementById('waveBadge').textContent='Ready';
  show('startScreen');
  syncPlayerNameUI();
  resizeCanvas();
}

document.getElementById('playerForm').addEventListener('submit',e=>{e.preventDefault();startGame();});
document.getElementById('retryBtn').addEventListener('click',()=>{hide('overScreen');init();showExitButton();resizeCanvas();});
document.getElementById('menuBtn').addEventListener('click',()=>{hide('overScreen');exitGame();});
document.getElementById('exitBtn').addEventListener('click',exitGame);

// Mobile touch buttons (legacy touch swipe controls)
let touchSt={};
document.addEventListener('touchstart',e=>{
  [...e.changedTouches].forEach(t=>{touchSt[t.identifier]={x:t.clientX,y:t.clientY};});
},{passive:true});
document.addEventListener('touchend',e=>{
  [...e.changedTouches].forEach(t=>{
    const st=touchSt[t.identifier];
    if(!st)return;
    const dx=t.clientX-st.x,dy=t.clientY-st.y;
    if(Math.abs(dx)<5&&Math.abs(dy)<5){jp.KeyZ=true;return;}
    if(Math.abs(dx)>Math.abs(dy)){
      if(dx>30){jp.ArrowRight=true;keys.ArrowRight=true;setTimeout(()=>keys.ArrowRight=false,160);}
      else if(dx<-30){jp.ArrowLeft=true;keys.ArrowLeft=true;setTimeout(()=>keys.ArrowLeft=false,160);}
    }else if(dy<-30){jp.ArrowUp=true;}
    delete touchSt[t.identifier];
  });
},{passive:true});

// Initialize
gs={state:'idle',score:0,kills:0,wave:0,highScore:+localStorage.getItem(HIGH_SCORE_KEY)||0,shake:0,flash:0};
syncPlayerNameUI();
resizeCanvas();
setupMobileControls();
requestAnimationFrame(frame);

// ── Landscape Prompt Logic ──
document.body.classList.add('game-loaded');

function checkOrientation(){
  const isMob = window.innerWidth < 900 || ('ontouchstart' in window);
  const isPortrait = window.innerHeight > window.innerWidth;
  const skipped = sessionStorage.getItem('lk_landscape_skip');
  const prompt = document.getElementById('landscape-prompt');
  if(isMob && isPortrait && !skipped){
    prompt.style.display = 'flex';
  } else {
    prompt.style.display = 'none';
    document.body.classList.add('landscape-ok');
  }
}

document.getElementById('lp-skip-btn').addEventListener('click',()=>{
  sessionStorage.setItem('lk_landscape_skip','1');
  document.getElementById('landscape-prompt').style.display='none';
  document.body.classList.add('landscape-ok');
});

window.addEventListener('orientationchange',()=>{
  setTimeout(()=>{
    checkOrientation();
    resizeCanvas();
  },200);
});
window.addEventListener('resize',()=>{ checkOrientation(); });

checkOrientation();
