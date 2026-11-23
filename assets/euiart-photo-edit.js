/* euiart 사진 손질 (단독 버전) — 회전·수평 맞추기·자르기·밝기
   홈페이지 편집기 v23 의 '사진 손질' 창을 다른 곳(온라인 갤러리 등)에서 쓰도록 떼어 낸 파일. 다른 파일이 필요 없음.

   쓰는 법
     euiartPhotoEdit(파일 또는 사진 주소, {title:'사진 손질'})
       .then(function(blob){ if(!blob) return;  // 취소하면 null
         // blob = 손질한 사진 (JPEG, 원본 해상도 — 최대 4000px). 여기서 원래 쓰던 '줄여서 올리기'에 넘기면 됨
       });

   옵션 (모두 선택)
     title    창 제목 (기본 '사진 손질')
     ratios   자르기 비율 목록 [['','자르지 않음'],['free','자유'],['1','1:1'], …] — 바꾸고 싶을 때만
     ratio    처음에 골라 둘 비율 값 (예: '1' — 작품 크기에 맞춰 열 때)
     maxSide  손질 중 다룰 최대 크기 (기본 4000px, 휴대폰 메모리 보호)
     type     결과 형식 (기본 'image/jpeg'), quality (기본 0.95)
     okText   확인 버튼 글 (기본 '이대로 쓰기')

   다른 주소의 사진을 열 때는 그 서버가 CORS(Access-Control-Allow-Origin)를 허용해야 함
   (GitHub Pages·Supabase 저장소 공개 주소는 허용됨). 안 되면 '사진을 열지 못했어요' 안내. */
(function(){
  "use strict";
  if(window.euiartPhotoEdit) return;
  var RATIOS=[['','자르지 않음'],['free','자유'],['1','1:1'],['1.3333','4:3'],['1.5','3:2'],['1.7778','16:9'],['0.75','3:4'],['0.8','4:5']];
  var FONT='-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Noto Sans KR",sans-serif';
  var CSS=[
    '.eph-ov{position:fixed;inset:0;z-index:2147483000;background:rgba(20,20,18,.55);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:4vh 12px;font:14px/1.5 '+FONT+';color:#1d1d1b}',
    '.eph-dlg{background:#fff;width:min(900px,100%);padding:22px 26px 20px;box-shadow:0 20px 60px rgba(0,0,0,.3);box-sizing:border-box}',
    '.eph-dlg *{box-sizing:border-box}.eph-dlg h2{font-size:18px;font-weight:600;margin:0 0 14px}',
    '.eph-pe{background:#2a2926;display:flex;justify-content:center;align-items:center;padding:10px;min-height:200px}.eph-pe canvas{max-width:100%;touch-action:none;display:block}.eph-pe canvas:focus{outline:2px solid #c9c4b8;outline-offset:2px}',
    '.eph-bar{display:flex;gap:10px 14px;align-items:center;flex-wrap:wrap;margin-top:10px}.eph-bar>span{display:inline-flex;gap:6px;flex-wrap:wrap}',
    '.eph-btn{border:1px solid #1d1d1b;background:#1d1d1b;color:#fff;padding:9px 16px;font:inherit;font-size:13.5px;cursor:pointer;border-radius:0}.eph-btn.ghost{background:#fff;color:#1d1d1b}.eph-btn.sm{padding:6px 11px;font-size:12.5px}.eph-btn:disabled{opacity:.4;cursor:default}',
    '.eph-seg{display:inline-flex;border:1px solid #d8d5ce;flex-wrap:wrap}.eph-seg button{border:0;background:#fff;padding:6px 11px;font:inherit;font-size:12.5px;cursor:pointer;color:#6b675f}.eph-seg button+button{border-left:1px solid #d8d5ce}.eph-seg button.on{background:#1d1d1b;color:#fff}',
    '.eph-l{display:inline-flex;gap:8px;align-items:center;margin:0;font-size:12.5px;color:#6b675f;flex:1;min-width:240px}.eph-l input[type=range]{flex:1;min-width:120px}.eph-l b{font-weight:600;color:#1d1d1b;min-width:44px;font-variant-numeric:tabular-nums}',
    '.eph-mini{width:26px;height:26px;border:1px solid #d8d5ce;background:#fff;cursor:pointer;font-size:13px;line-height:1;padding:0}.eph-mini:hover{border-color:#1d1d1b}',
    '.eph-info{font-size:12.5px;color:#8b877e;margin-top:10px}.eph-act{display:flex;gap:8px;justify-content:flex-end;margin-top:18px;flex-wrap:wrap}',
    '.eph-msg{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483001;background:#1d1d1b;color:#fff;padding:10px 18px;border-radius:999px;font:13px '+FONT+'}',
    '@media(max-width:600px){.eph-dlg{padding:16px 14px}.eph-l{min-width:0;flex-basis:100%}}'
  ].join('\n');
  function css(){ if(document.getElementById('eph-css')) return; var s=document.createElement('style'); s.id='eph-css'; s.textContent=CSS; document.head.appendChild(s); }
  function esc(t){ return String(t==null?'':t).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function note(t){ var d=document.createElement('div'); d.className='eph-msg'; d.textContent=t; document.body.appendChild(d); setTimeout(function(){ d.remove(); },3500); }
  function load(src){
    if(!src) return Promise.reject(new Error('사진이 없어요. 사진을 다시 골라 주세요.'));
    return new Promise(function(ok,no){
      var im=new Image(), url=null;
      if(typeof src!=='string'){ url=URL.createObjectURL(src); im.src=url; }
      else { im.crossOrigin='anonymous'; im.src=src+(src.indexOf('?')<0?'?':'&')+'eph='+Date.now(); }
      im.onload=function(){ ok(im); if(url) setTimeout(function(){ URL.revokeObjectURL(url); },2000); };
      im.onerror=function(){ no(new Error('사진을 열지 못했어요. (JPG·PNG·WEBP — 다른 사이트 사진이면 컴퓨터에 받아서 다시 골라 주세요)')); };
    });
  }
  /* 기울인 사진 안에 빈 곳 없이 들어가는 가장 큰 같은 비율 사각형의 배율 */
  function inner(w,h,deg){ var a=Math.abs(deg)*Math.PI/180, c=Math.cos(a), s=Math.sin(a); return Math.min(w/(w*c+h*s),h/(w*s+h*c)); }
  /* 밝기: 각 색을 같은 비율로 (색 구성은 그대로) */
  function bright(cv,b){
    if(!b) return; var f=1+b/100, x=cv.getContext('2d'), d=x.getImageData(0,0,cv.width,cv.height), p=d.data;
    for(var i=0;i<p.length;i+=4){ p[i]=Math.min(255,p[i]*f); p[i+1]=Math.min(255,p[i+1]*f); p[i+2]=Math.min(255,p[i+2]*f); }
    x.putImageData(d,0,0);
  }

  function photoEdit(src,o){
    o=o||{}; css();
    var R=o.ratios||RATIOS;
    return load(src).then(function(img){ return new Promise(function(res){
      var max=o.maxSide||4000, W0=img.naturalWidth, H0=img.naturalHeight, k=Math.min(1,max/Math.max(W0,H0)), base=document.createElement('canvas');
      base.width=Math.round(W0*k); base.height=Math.round(H0*k); base.getContext('2d').drawImage(img,0,0,base.width,base.height);
      var st, rc=null, drag=null, showOrig=false;
      function reset(){ st={rot:0,fine:0,ratio:'',crop:{x:0,y:0,w:1,h:1},bright:0}; }
      reset();
      var ov=document.createElement('div'); ov.className='eph-ov';
      ov.innerHTML='<div class="eph-dlg" role="dialog" aria-modal="true"><h2>'+esc(o.title||'사진 손질')+'</h2>'+
        '<div class="eph-pe"><canvas data-c tabindex="0" aria-label="사진 — 틀을 끌거나 화살표 키로 옮겨요"></canvas></div>'+
        '<div class="eph-bar"><span><button type="button" class="eph-btn ghost sm" data-r="-1" title="왼쪽으로 90도">↺ 90°</button><button type="button" class="eph-btn ghost sm" data-r="1" title="오른쪽으로 90도">↻ 90°</button></span>'+
          '<label class="eph-l">수평<input type="range" data-fine min="-150" max="150" step="1" value="0"><b data-finev>0.0°</b><button type="button" class="eph-mini" data-fn="-1" title="0.1° 왼쪽">−</button><button type="button" class="eph-mini" data-fn="1" title="0.1° 오른쪽">+</button><button type="button" class="eph-mini" data-fn="0" title="수평 0°로">0</button></label></div>'+
        '<div class="eph-bar"><span class="eph-seg" data-ratios>'+R.map(function(r){ return '<button type="button" data-ra="'+esc(r[0])+'">'+esc(r[1])+'</button>'; }).join('')+'</span></div>'+
        '<div class="eph-bar"><label class="eph-l">밝기<input type="range" data-br min="-50" max="50" step="1" value="0"><b data-brv>0</b></label>'+
          '<span><button type="button" class="eph-btn ghost sm" data-orig title="누르고 있는 동안 손질 전 사진">원본 보기</button><button type="button" class="eph-btn ghost sm" data-reset>처음으로</button></span></div>'+
        '<div class="eph-info" data-info></div>'+
        '<div class="eph-act"><button type="button" class="eph-btn ghost" data-x>취소</button><button type="button" class="eph-btn" data-ok>'+esc(o.okText||'이대로 쓰기')+'</button></div></div>';
      document.body.appendChild(ov);
      var q=function(s){ return ov.querySelector(s); }, qa=function(s){ return Array.prototype.slice.call(ov.querySelectorAll(s)); };
      var cv=q('[data-c]'), g=cv.getContext('2d'), fin=false;
      function done(v){ if(fin) return; fin=true; document.removeEventListener('keydown',onEsc); ov.remove(); res(v); }
      function onEsc(e){ if(e.key==='Escape') done(null); }
      document.addEventListener('keydown',onEsc);
      ov.addEventListener('mousedown',function(e){ ov._down=e.target===ov; });
      ov.addEventListener('click',function(e){ if(e.target===ov&&ov._down) done(null); });
      q('[data-x]').onclick=function(){ done(null); };
      function build(){
        var r=((st.rot%4)+4)%4, w=base.width, h=base.height, rw=r%2?h:w, rh=r%2?w:h, s=st.fine?inner(rw,rh,st.fine):1;
        var c=document.createElement('canvas'); c.width=Math.max(1,Math.round(rw*s)); c.height=Math.max(1,Math.round(rh*s));
        var x=c.getContext('2d'); x.translate(c.width/2,c.height/2); x.rotate(r*Math.PI/2+st.fine*Math.PI/180); x.drawImage(base,-w/2,-h/2);
        rc=c;
      }
      function ratioNum(){ return st.ratio&&st.ratio!=='free'?+st.ratio:0; }
      function fitCrop(){
        var Rn=ratioNum(); if(!st.ratio){ st.crop={x:0,y:0,w:1,h:1}; return; } if(!Rn){ st.crop={x:.05,y:.05,w:.9,h:.9}; return; }
        var W=rc.width, H=rc.height, w=W, h=W/Rn; if(h>H){ h=H; w=H*Rn; } st.crop={x:(1-w/W)/2,y:(1-h/H)/2,w:w/W,h:h/H};
      }
      function clamp(){ var c=st.crop; c.w=Math.min(Math.max(c.w,.05),1); c.h=Math.min(Math.max(c.h,.05),1); c.x=Math.min(Math.max(c.x,0),1-c.w); c.y=Math.min(Math.max(c.y,0),1-c.h); }
      function draw(){
        var box=q('.eph-pe'), maxW=Math.min(680,(box.clientWidth||680)-20), maxH=Math.min(440,window.innerHeight*.5), srcC=showOrig?base:rc, disp;
        disp=Math.min(maxW/srcC.width,maxH/srcC.height,1); cv.width=Math.round(srcC.width*disp); cv.height=Math.round(srcC.height*disp);
        g.drawImage(srcC,0,0,cv.width,cv.height);
        cv.style.filter=st.bright?'brightness('+(1+st.bright/100)+')':'';
        if(showOrig){ q('[data-info]').textContent='원본 (손질 전)'; return; }
        var c=st.crop, X=c.x*cv.width, Y=c.y*cv.height, Wd=c.w*cv.width, Hd=c.h*cv.height, i;
        if(st.fine){ g.strokeStyle='rgba(255,255,255,.35)'; g.lineWidth=1; g.beginPath(); for(i=1;i<8;i++){ g.moveTo(cv.width*i/8,0); g.lineTo(cv.width*i/8,cv.height); g.moveTo(0,cv.height*i/8); g.lineTo(cv.width,cv.height*i/8); } g.stroke(); }
        if(st.ratio){
          g.fillStyle='rgba(0,0,0,.52)'; g.beginPath(); g.rect(0,0,cv.width,cv.height); g.rect(X,Y,Wd,Hd); g.fill('evenodd');
          g.strokeStyle='#fff'; g.lineWidth=2; g.strokeRect(X+1,Y+1,Wd-2,Hd-2);
          g.strokeStyle='rgba(255,255,255,.5)'; g.lineWidth=1; g.beginPath(); for(i=1;i<3;i++){ g.moveTo(X+Wd*i/3,Y); g.lineTo(X+Wd*i/3,Y+Hd); g.moveTo(X,Y+Hd*i/3); g.lineTo(X+Wd,Y+Hd*i/3); } g.stroke();
          g.fillStyle='#fff'; [[X,Y],[X+Wd,Y],[X,Y+Hd],[X+Wd,Y+Hd]].forEach(function(p){ g.fillRect(p[0]-6,p[1]-6,12,12); });
        }
        var r4=((st.rot%4)+4)%4, ow=Math.round(rc.width*c.w/k), oh=Math.round(rc.height*c.h/k);
        q('[data-info]').textContent='결과: '+ow+' × '+oh+'px'+(r4?' · 90° 회전 '+r4*90+'°':'')+(st.fine?' · 수평 '+(st.fine>0?'+':'')+st.fine.toFixed(1)+'° (빈 모서리는 잘라냄)':'')+(st.ratio?' · 자름':'')+(st.bright?' · 밝기 '+(st.bright>0?'+':'')+st.bright:'');
      }
      function setFine(v){ st.fine=Math.max(-15,Math.min(15,Math.round(v*10)/10)); q('[data-fine]').value=Math.round(st.fine*10); q('[data-finev]').textContent=(st.fine>0?'+':'')+st.fine.toFixed(1)+'°'; build(); if(st.ratio) fitCrop(); clamp(); draw(); }
      function setRatio(v){ st.ratio=v; qa('[data-ra]').forEach(function(x){ x.classList.toggle('on',x.getAttribute('data-ra')===v); }); fitCrop(); clamp(); draw(); }
      qa('[data-r]').forEach(function(b){ b.onclick=function(){ st.rot+=+b.getAttribute('data-r'); build(); fitCrop(); clamp(); draw(); }; });
      q('[data-fine]').oninput=function(){ setFine(this.value/10); };
      qa('[data-fn]').forEach(function(b){ b.onclick=function(){ var d=+b.getAttribute('data-fn'); setFine(d?st.fine+d*0.1:0); }; });
      q('[data-ratios]').onclick=function(e){ var b=e.target.closest('[data-ra]'); if(b) setRatio(b.getAttribute('data-ra')); };
      q('[data-br]').oninput=function(){ st.bright=+this.value; q('[data-brv]').textContent=(st.bright>0?'+':'')+st.bright; draw(); };
      q('[data-reset]').onclick=function(){ reset(); q('[data-fine]').value=0; q('[data-finev]').textContent='0.0°'; q('[data-br]').value=0; q('[data-brv]').textContent='0'; build(); setRatio(''); };
      var ob=q('[data-orig]'), on=function(e){ e.preventDefault(); showOrig=true; draw(); }, off=function(){ if(showOrig){ showOrig=false; draw(); } };
      ob.addEventListener('pointerdown',on); ob.addEventListener('pointerup',off); ob.addEventListener('pointerleave',off); ob.addEventListener('pointercancel',off);
      function pos(e){ var r=cv.getBoundingClientRect(); return {mx:(e.clientX-r.left)*(cv.width/r.width),my:(e.clientY-r.top)*(cv.height/r.height)}; }
      function hit(e){ var p=pos(e), c=st.crop, X=c.x*cv.width, Y=c.y*cv.height, X2=X+c.w*cv.width, Y2=Y+c.h*cv.height, t=14;
        var cn=[['nw',X,Y],['ne',X2,Y],['sw',X,Y2],['se',X2,Y2]].filter(function(z){ return Math.abs(p.mx-z[1])<=t&&Math.abs(p.my-z[2])<=t; })[0];
        return {mx:p.mx,my:p.my,mode:cn?cn[0]:(p.mx>=X&&p.mx<=X2&&p.my>=Y&&p.my<=Y2?'move':null)}; }
      cv.addEventListener('pointermove',function(e){
        if(!drag){ if(st.ratio){ var h=hit(e); cv.style.cursor=h.mode==='move'?'move':h.mode==='nw'||h.mode==='se'?'nwse-resize':h.mode?'nesw-resize':'default'; } return; }
        var p=pos(e), dx=(p.mx-drag.mx)/cv.width, dy=(p.my-drag.my)/cv.height, o2=drag.c, c=st.crop;
        if(drag.mode==='move'){ c.x=o2.x+dx; c.y=o2.y+dy; }
        else {
          var Rn=ratioNum(), ar=Rn?Rn*cv.height/cv.width:0, west=drag.mode.indexOf('w')>=0, north=drag.mode.indexOf('n')>=0;
          var nw=Math.max(.05,o2.w+(west?-dx:dx)), nh=Math.max(.05,o2.h+(north?-dy:dy));
          if(ar){ nh=nw/ar; if(nh>1){ nh=1; nw=ar; } }
          nw=west?Math.min(nw,o2.x+o2.w):Math.min(nw,1-o2.x); nh=north?Math.min(nh,o2.y+o2.h):Math.min(nh,1-o2.y);
          if(ar){ if(nw/ar>nh) nw=nh*ar; else nh=nw/ar; }
          c.w=nw; c.h=nh; c.x=west?o2.x+o2.w-nw:o2.x; c.y=north?o2.y+o2.h-nh:o2.y;
        }
        clamp(); draw();
      });
      cv.addEventListener('pointerdown',function(e){ if(!st.ratio) return; var h=hit(e); if(!h.mode) return; drag={mode:h.mode,mx:h.mx,my:h.my,c:JSON.parse(JSON.stringify(st.crop))}; cv.setPointerCapture(e.pointerId); e.preventDefault(); });
      cv.addEventListener('pointerup',function(){ drag=null; }); cv.addEventListener('pointercancel',function(){ drag=null; });
      cv.addEventListener('keydown',function(e){ if(!st.ratio) return; var m={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key]; if(!m) return; e.preventDefault();
        var step=e.shiftKey?10:1; st.crop.x+=m[0]*step/cv.width; st.crop.y+=m[1]*step/cv.height; clamp(); draw(); });
      q('[data-ok]').onclick=function(){
        var c=st.crop, sx=c.x*rc.width, sy=c.y*rc.height, sw=c.w*rc.width, sh=c.h*rc.height, out=document.createElement('canvas');
        out.width=Math.max(1,Math.round(sw)); out.height=Math.max(1,Math.round(sh));
        var x=out.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,out.width,out.height); x.drawImage(rc,sx,sy,sw,sh,0,0,out.width,out.height);
        bright(out,st.bright);
        out.toBlob(function(bl){ if(!bl){ note('사진을 만들지 못했어요.'); return; } done(bl); },o.type||'image/jpeg',o.quality||0.95);
      };
      build(); setRatio(o.ratio&&R.some(function(r){ return r[0]===o.ratio; })?o.ratio:'');
      setTimeout(function(){ clamp(); draw(); cv.focus(); },30);
    }); }).catch(function(err){ note(err&&err.message||'사진을 열지 못했어요.'); throw err; });
  }
  photoEdit.ratios=RATIOS;
  photoEdit.version='v23';
  window.euiartPhotoEdit=photoEdit;
})();
