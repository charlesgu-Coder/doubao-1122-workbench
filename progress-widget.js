(function () {
  "use strict";
  var REFRESH_MS = 20000;
  var timer = null;

  var css = ""
    + "#dbw{position:fixed;top:calc(8px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);"
    + "z-index:2147483647;width:calc(100vw - 20px);max-width:460px;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;"
    + "background:rgba(255,255,255,.97);border:1px solid #07a35a;border-radius:14px;box-shadow:0 6px 24px rgba(0,0,0,.18);overflow:hidden;color:#1c2b22;touch-action:none;user-select:none;}"
    + "#dbw.drag{opacity:.92}"
    + "#dbw .hd{display:flex;align-items:center;gap:8px;padding:9px 12px;cursor:pointer;background:linear-gradient(90deg,#07a35a,#0bbf6b);color:#fff}"
    + "#dbw .dot{width:10px;height:10px;border-radius:50%;background:#fff;flex:0 0 auto}"
    + "#dbw.running .dot{animation:dbwPulse 1.1s infinite}"
    + "@keyframes dbwPulse{0%{box-shadow:0 0 0 0 rgba(255,255,255,.7)}70%{box-shadow:0 0 0 9px rgba(255,255,255,0)}100%{box-shadow:0 0 0 0 rgba(255,255,255,0)}}"
    + "#dbw .ttl{font-size:13px;font-weight:700;flex:1 1 auto;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}"
    + "#dbw .pct{font-size:15px;font-weight:800;flex:0 0 auto}"
    + "#dbw .arrow{font-size:11px;flex:0 0 auto;transition:transform .2s}"
    + "#dbw.open .arrow{transform:rotate(180deg)}"
    + "#dbw .bar{height:5px;background:#d7f3e5}"
    + "#dbw .bar i{display:block;height:100%;background:linear-gradient(90deg,#07a35a,#38d98b);transition:width .5s}"
    + "#dbw .bd{display:none;max-height:52vh;overflow-y:auto;padding:10px 12px;font-size:12px;line-height:1.5;touch-action:pan-y;user-select:text}"
    + "#dbw.open .bd{display:block}"
    + "#dbw .sec-t{font-weight:800;color:#07a35a;margin:8px 0 4px;font-size:12px}"
    + "#dbw .sec-t:first-child{margin-top:0}"
    + "#dbw .row{display:flex;justify-content:space-between;gap:8px;padding:3px 0;border-bottom:1px dashed #e6efe9}"
    + "#dbw .row span:last-child{font-weight:700;flex:0 0 auto}"
    + "#dbw .role{padding:5px 0;border-bottom:1 dashed #e6efe9}"
    + "#dbw .role b{font-size:12px}"
    + "#dbw .role small{display:block;color:#5a6b60;margin-top:1px}"
    + "#dbw .lv{display:inline-block;min-width:20px;text-align:center;border-radius:6px;padding:0 5px;margin-right:6px;color:#fff;font-weight:700}"
    + "#dbw .lv.高{background:#e5484d}#dbw .lv.中{background:#f5a623}#dbw .lv.低{background:#8a978f}"
    + "#dbw .finding{padding:4px 0;border-bottom:1px dashed #e6efe9}"
    + "#dbw .finding small{color:#5a6b60}"
    + "#dbw .upd{color:#5a6b60;font-size:11px;text-align:right;padding:6px 0 0}"
    + "#dbw .tl{padding-left:14px;position:relative}#dbw .tl li{margin:3px 0;list-style:none;position:relative}"
    + "#dbw .tl li:before{content:'';position:absolute;left:-12px;top:6px;width:7px;height:7px;border-radius:50%;background:#0bbf6b}";
  var st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  var el = document.createElement("div");
  el.id = "dbw";
  el.className = "running";
  el.innerHTML = ""
    + "<div class='hd' id='dbwHd'>"
    + "<span class='dot'></span><span class='ttl'>实时进度·正在连接</span><span class='pct'>--</span><span class='arrow'>▼</span></div>"
    + "<div class='bar'><i style='width:0%' id='dbwBar'></i></div>"
    + "<div class='bd' id='dbwBd'></div>";
  function mount(){ document.body.appendChild(el); }
  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount);

  function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];}); }
  function lvClass(l){ return (l==="高"||l==="中"||l==="低")?l:"低"; }

  function render(d){
    el.className = d.status === "running" ? "running open" : "open";
    var pct = Math.max(0, Math.min(100, Number(d.overall)||0));
    el.querySelector(".ttl").textContent = "实时进度·" + (d.status==="running"?"工作中":"已完成") + "｜" + (d.period||"");
    el.querySelector(".pct").textContent = pct + "%";
    document.getElementById("dbwBar").style.width = pct + "%";
    var h = "";
    if (d.todo && d.todo.length){
      h += "<div class='sec-t'>📌 主控记事本（按顺序，防止忘事）</div>";
      d.todo.forEach(function(t, i){
        h += "<div class='finding'><b>"+(i+1)+".</b> "+esc(t.item)
          + (t.note?"<small>　"+esc(t.note)+"</small>":"") + "</div>";
      });
    }
    if (d.roles && d.roles.length){
      h += "<div class='sec-t'>专业角色（"+d.roles.length+"路）</div>";
      d.roles.forEach(function(r){
        h += "<div class='role'><b>"+esc(r.name)+"</b> · "+esc(r.state)
          +"<small>在做："+esc(r.doing)+"</small>"
          + (r.done?"<small>已产出："+esc(r.done)+"</small>":"") + "</div>";
      });
    }
    if (d.verified && d.verified.length){
      h += "<div class='sec-t'>已对平数字</div>";
      d.verified.forEach(function(v){ h += "<div class='row'><span>"+esc(v.k)+"</span><span>"+esc(v.v)+"</span></div>"; });
    }
    if (d.findings && d.findings.length){
      h += "<div class='sec-t'>疑点清单（"+d.findings.length+"项）</div>";
      d.findings.forEach(function(f){
        h += "<div class='finding'><span class='lv "+lvClass(f.level)+"'>"+esc(f.level)+"</span>"+esc(f.item)
          +"<small>　负责："+esc(f.owner)+"｜"+esc(f.state)+"</small></div>";
      });
    }
    if (d.timeline && d.timeline.length){
      h += "<div class='sec-t'>节点时间线</div><ul class='tl'>";
      d.timeline.forEach(function(z){ h += "<li><b>"+esc(z.t)+"</b> "+esc(z.e)+"</li>"; });
      h += "</ul>";
    }
    h += "<div class='upd'>数据最后更新："+esc(d.updatedAt||"")+"　每20秒自动刷新</div>";
    document.getElementById("dbwBd").innerHTML = h;
  }

  function load(){
    var u = "progress.json?t=" + Date.now();
    fetch(u, {cache:"no-store"}).then(function(r){ if(!r.ok) throw new Error("http "+r.status); return r.json(); })
      .then(render)
      .catch(function(){
        el.querySelector(".ttl").textContent = "实时进度·等待数据（后台运行中）";
      });
  }
  load();
  timer = setInterval(load, REFRESH_MS);

  // 折叠/展开
  el.querySelector("#dbwHd").addEventListener("click", function(e){
    if (el.dataset.moved === "1"){ el.dataset.moved="0"; return; }
    el.classList.toggle("open");
  });

  // 拖动（鼠标+触摸）
  var drag=null;
  function start(x,y){ drag={x:x,y:y,left:el.offsetLeft,top:el.offsetTop,moved:false}; el.classList.add("drag"); }
  function move(x,y){
    if(!drag) return;
    var dx=x-drag.x, dy=y-drag.y;
    if(Math.abs(dx)>4||Math.abs(dy)>4) drag.moved=true;
    var nl=Math.max(2,Math.min(window.innerWidth-el.offsetWidth-2,drag.left+dx));
    var nt=Math.max(2,Math.min(window.innerHeight-60,drag.top+dy));
    el.style.left=nl+"px"; el.style.top=nt+"px"; el.style.transform="none";
  }
  function end(){ if(drag){ if(drag.moved) el.dataset.moved="1"; el.classList.remove("drag"); drag=null; } }
  el.addEventListener("mousedown",function(e){ if(e.target.closest(".hd")) start(e.clientX,e.clientY); });
  window.addEventListener("mousemove",function(e){ move(e.clientX,e.clientY); });
  window.addEventListener("mouseup",end);
  el.addEventListener("touchstart",function(e){ if(e.target.closest(".hd")){var t=e.touches[0];start(t.clientX,t.clientY);} },{passive:true});
  el.addEventListener("touchmove",function(e){ if(drag){var t=e.touches[0];move(t.clientX,t.clientY);} },{passive:true});
  el.addEventListener("touchend",end);
})();
