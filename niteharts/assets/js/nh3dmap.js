/* ============================================================
   NH3D — Three.js 3D festival map for Niteharts '26
   Replaces the CSS-3D "our map" view with a real 3D scene.
   World units = image pixels, 1:1 with NH26_FMAP_DATA (1920x1200).
   world: wx = x-960, wz = y-600, y = up. North = -z.
   Exposes window.NH3D.create(canvas, opts) -> api.
   ============================================================ */
import * as THREE from 'three';

var IMG_W = 1920, IMG_H = 1200;
var BLUE = 0x488ad9, ICE = 0x9fc9ef;
function wx(x){ return x - IMG_W/2; }
function wz(y){ return y - IMG_H/2; }
var reduceMotion = (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

/* ---------- canvas texture helpers ---------- */
function glowTexture(){
  var c = document.createElement('canvas'); c.width = c.height = 128;
  var g = c.getContext('2d');
  var gr = g.createRadialGradient(64,64,0,64,64,64);
  gr.addColorStop(0,'rgba(255,255,255,1)');
  gr.addColorStop(0.35,'rgba(255,255,255,.55)');
  gr.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0,0,128,128);
  var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
var GLOW_TEX = null;
function labelTexture(text, opts){
  opts = opts || {};
  var size = opts.size || 40, padX = 34, padY = 18;
  var c = document.createElement('canvas');
  var g = c.getContext('2d');
  var font = '700 ' + size + 'px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  g.font = font;
  var tw = Math.ceil(g.measureText(text).width);
  c.width = tw + padX*2; c.height = size + padY*2;
  var g2 = c.getContext('2d');
  var r = c.height/2 - 4;
  g2.fillStyle = opts.bg || 'rgba(8,9,11,0.86)';
  g2.strokeStyle = opts.border || 'rgba(72,138,217,0.9)';
  g2.lineWidth = 3;
  g2.beginPath();
  if(g2.roundRect) g2.roundRect(3,3,c.width-6,c.height-6,r); else g2.rect(3,3,c.width-6,c.height-6);
  g2.fill(); g2.stroke();
  g2.font = font; g2.fillStyle = opts.fg || '#ffffff';
  g2.textAlign = 'center'; g2.textBaseline = 'middle';
  g2.fillText(text, c.width/2, c.height/2 + 2);
  var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4; return t;
}
function badgeTexture(n){
  var c = document.createElement('canvas'); c.width = c.height = 128;
  var g = c.getContext('2d');
  g.fillStyle = '#488ad9';
  g.beginPath(); g.arc(64,64,56,0,Math.PI*2); g.fill();
  g.strokeStyle = '#ffffff'; g.lineWidth = 6; g.stroke();
  g.fillStyle = '#ffffff'; g.font = '800 64px ui-monospace, Menlo, monospace';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(String(n), 64, 68);
  var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/* ---------- tiny tween manager ---------- */
function Tweens(){ this.list = []; }
Tweens.prototype.add = function(dur, onU, onD){
  if(reduceMotion){ onU(1); if(onD)onD(); return; }
  this.list.push({t0:performance.now(), dur:dur, onU:onU, onD:onD});
};
Tweens.prototype.step = function(now){
  var keep = [];
  for(var i=0;i<this.list.length;i++){
    var t = this.list[i], p = Math.min(1,(now-t.t0)/t.dur);
    var e = p<.5 ? 4*p*p*p : 1-Math.pow(-2*p+2,3)/2;
    t.onU(e);
    if(p<1) keep.push(t); else if(t.onD) t.onD();
  }
  this.list = keep;
};
Tweens.prototype.clear = function(){ this.list = []; };

/* ============================================================
   createScene
   ============================================================ */
function createScene(canvas, opts){
  opts = opts || {};
  var data = opts.data;               // NH26_FMAP_DATA
  var texUrl = opts.textureUrl || 'assets/map/nh26-sitemap.webp';
  var onPinTap = opts.onPinTap || function(){};

  var renderer;
  try{
    renderer = new THREE.WebGLRenderer({canvas:canvas, antialias:true, powerPreference:'high-performance'});
  }catch(e){ return null; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0c);
  scene.fog = new THREE.Fog(0x0a0a0c, 3400, 7800);

  var camera = new THREE.PerspectiveCamera(42, 1, 1, 20000);

  /* ----- lights ----- */
  scene.add(new THREE.HemisphereLight(0x4a5a78, 0x0a0a0c, 0.55));
  scene.add(new THREE.AmbientLight(0xffffff, 0.18));
  var sun = new THREE.DirectionalLight(0xffffff, 1.55);
  sun.position.set(900, 1500, 700);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -1300; sun.shadow.camera.right = 1300;
  sun.shadow.camera.top = 900; sun.shadow.camera.bottom = -900;
  sun.shadow.camera.near = 100; sun.shadow.camera.far = 4500;
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  var rim = new THREE.DirectionalLight(0x488ad9, 0.5);
  rim.position.set(-900, 500, -800);
  scene.add(rim);

  /* ----- ground ----- */
  var groundMat = new THREE.MeshStandardMaterial({color:0xffffff, roughness:0.95, metalness:0});
  var ground = new THREE.Mesh(new THREE.PlaneGeometry(IMG_W, IMG_H), groundMat);
  ground.rotation.x = -Math.PI/2; ground.receiveShadow = true;
  scene.add(ground);
  new THREE.TextureLoader().load(texUrl, function(t){
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    groundMat.map = t; groundMat.needsUpdate = true;
  });

  var edgeMat = new THREE.LineBasicMaterial({color:BLUE, transparent:true, opacity:0.85});
  function addEdges(mesh, opacity){
    var e = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 24), edgeMat.clone());
    e.material.opacity = (opacity==null?0.85:opacity);
    e.position.copy(mesh.position); e.rotation.copy(mesh.rotation); e.scale.copy(mesh.scale);
    mesh.parent.add(e); return e;
  }

  /* ----- extruded structures ----- */
  var structMat = new THREE.MeshStandardMaterial({color:0x15171c, roughness:0.55, metalness:0.25});
  function roundedRect(w,h,r){
    var s = new THREE.Shape(), x=-w/2, y=-h/2;
    s.moveTo(x+r,y); s.lineTo(x+w-r,y); s.quadraticCurveTo(x+w,y,x+w,y+r);
    s.lineTo(x+w,y+h-r); s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    s.lineTo(x+r,y+h); s.quadraticCurveTo(x,y+h,x,y+h-r);
    s.lineTo(x,y+r); s.quadraticCurveTo(x,y,x+r,y);
    return s;
  }
  function extrudeAt(shape, depth, ix, iy, mat){
    var geo = new THREE.ExtrudeGeometry(shape, {depth:depth, bevelEnabled:true, bevelThickness:5, bevelSize:5, bevelSegments:2, curveSegments:20});
    geo.rotateX(Math.PI/2); // shape (x,y) -> world (x, z=y), extrusion rises +y
    var m = new THREE.Mesh(geo, mat || structMat);
    m.position.set(wx(ix), depth, wz(iy));
    m.castShadow = true; m.receiveShadow = true;
    scene.add(m); addEdges(m, 0.7);
    return m;
  }
  // Snapdragon Stadium — raised bowl ring around (635,420)
  (function(){
    var outer = roundedRect(440, 360, 110);
    outer.holes.push((function(){ var h = roundedRect(310, 235, 70); return new THREE.Path(h.getPoints(24)); })());
    extrudeAt(outer, 84, 635, 420);
  })();
  // stages — raised glowing platforms
  var STAGE_NODES = [
    {id:'main_stage', r:64, h:64, big:true},
    {id:'the_mirror', r:40, h:40},
    {id:'the_crescent', r:40, h:40},
    {id:'the_terminal', r:40, h:40},
    {id:'half_court', r:40, h:40},
    {id:'valorant_stage', r:34, h:32, dim:true}
  ];
  STAGE_NODES.forEach(function(st){
    var n = data.nodes[st.id]; if(!n) return;
    var g = new THREE.CylinderGeometry(st.r, st.r+6, st.h, 28);
    var m = new THREE.Mesh(g, structMat);
    m.position.set(wx(n.x), st.h/2, wz(n.y));
    m.castShadow = true; m.receiveShadow = true;
    scene.add(m);
    var ring = new THREE.Mesh(
      new THREE.TorusGeometry(st.r-2, 3.2, 8, 44),
      new THREE.MeshBasicMaterial({color: st.dim?0x3a5a78:BLUE, transparent:true, opacity: st.dim?0.5:0.95})
    );
    ring.rotation.x = Math.PI/2; ring.position.set(wx(n.x), st.h+3, wz(n.y));
    scene.add(ring);
    addEdges(m, 0.55);
  });
  // VIP block — low red-tinted slab near (800,1050)
  (function(){
    var g = new THREE.BoxGeometry(280, 30, 130);
    var m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({color:0x2a1214, roughness:0.7, emissive:0xff2233, emissiveIntensity:0.22}));
    m.position.set(wx(800), 15, wz(1050));
    m.castShadow = true; m.receiveShadow = true; scene.add(m);
    var e = new THREE.LineSegments(new THREE.EdgesGeometry(g), new THREE.LineBasicMaterial({color:0xff5566, transparent:true, opacity:0.5}));
    e.position.copy(m.position); scene.add(e);
  })();
  // entrance gate pillars
  ['ga_entrance','vip_entrance','gate2','gate3','entrance_tunnel'].forEach(function(id){
    var n = data.nodes[id]; if(!n) return;
    var g = new THREE.BoxGeometry(16, 80, 16);
    var m = new THREE.Mesh(g, structMat);
    m.position.set(wx(n.x), 40, wz(n.y));
    m.castShadow = true; scene.add(m);
    var e = new THREE.LineSegments(new THREE.EdgesGeometry(g), new THREE.LineBasicMaterial({color:0x9fc9ef, transparent:true, opacity:0.55}));
    e.position.copy(m.position); scene.add(e);
  });

  /* ----- pins ----- */
  if(!GLOW_TEX) GLOW_TEX = glowTexture();
  var PIN_IDS = ['main_stage','the_mirror','the_crescent','the_terminal','half_court','valorant_stage',
                 'ga_entrance','vip_entrance','trolley','merch','lockers','rideshare','ga_parking'];
  var hitMeshes = [], pinGroups = {};
  PIN_IDS.forEach(function(id){
    var n = data.nodes[id]; if(!n) return;
    var col = new THREE.Color(data.catColors[n.cat] || '#9fc9ef');
    var grp = new THREE.Group();
    grp.position.set(wx(n.x), 0, wz(n.y));
    // shadow-casting base
    var base = new THREE.Mesh(new THREE.CylinderGeometry(9, 11, 8, 12),
      new THREE.MeshStandardMaterial({color:0x0c0d10, roughness:0.8}));
    base.position.y = 4; base.castShadow = true; grp.add(base);
    // ground ring
    var ring = new THREE.Mesh(new THREE.RingGeometry(11, 17, 32),
      new THREE.MeshBasicMaterial({color:col, transparent:true, opacity:0.8, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide}));
    ring.rotation.x = -Math.PI/2; ring.position.y = 2.5; grp.add(ring);
    // beam
    var beam = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 5.5, 150, 8, 1, true),
      new THREE.MeshBasicMaterial({color:col, transparent:true, opacity:n.approx?0.28:0.5, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide}));
    beam.position.y = 82; grp.add(beam);
    // halo
    var halo = new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW_TEX, color:col, transparent:true, opacity:0.85, blending:THREE.AdditiveBlending, depthWrite:false}));
    halo.scale.set(64,64,1); halo.position.y = 162; grp.add(halo);
    // label
    var lab = new THREE.Sprite(new THREE.SpriteMaterial({map:labelTexture(n.label.toUpperCase(), n.approx?{border:'rgba(150,150,150,.6)'}:{}), transparent:true, depthWrite:false}));
    var lt = lab.material.map.image;
    lab.scale.set(lt.width*0.42, lt.height*0.42, 1);
    lab.position.y = 205; grp.add(lab);
    // invisible fat hit cylinder (raycast needs a "visible" material: colorWrite off)
    var hit = new THREE.Mesh(new THREE.CylinderGeometry(34,34,230,8),
      new THREE.MeshBasicMaterial({transparent:true, opacity:0, depthWrite:false, colorWrite:false, depthTest:false}));
    hit.position.y = 115; hit.userData.nodeId = id; grp.add(hit);
    hitMeshes.push(hit);
    scene.add(grp); pinGroups[id] = grp;
  });

  /* ----- route + tour layers ----- */
  var routeGroup = new THREE.Group(); scene.add(routeGroup);
  var tourGroup = new THREE.Group(); scene.add(tourGroup);
  var flowSprites = [];
  function disposeGroup(gr){
    gr.traverse(function(o){
      if(o.geometry) o.geometry.dispose();
      if(o.material){ (Array.isArray(o.material)?o.material:[o.material]).forEach(function(m){ if(m.map && m.map!==GLOW_TEX) m.map.dispose(); m.dispose(); }); }
    });
    gr.clear(); flowSprites = flowSprites.filter(function(f){ return f.grp !== gr; });
  }
  function worldPts(nodeIds){
    return nodeIds.map(function(id){ var n=data.nodes[id]; return new THREE.Vector3(wx(n.x), 10, wz(n.y)); });
  }
  function drawRouteOn(gr, nodeIds, labelText, legColor){
    var pts = worldPts(nodeIds);
    if(pts.length < 2) return null;
    var curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.08);
    var tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 72, 9, 8, false),
      new THREE.MeshBasicMaterial({color: legColor || ICE, transparent:true, opacity:0.7, blending:THREE.AdditiveBlending, depthWrite:false})
    );
    gr.add(tube);
    if(!reduceMotion){
      for(var i=0;i<5;i++){
        var s = new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW_TEX, color:0xffffff, transparent:true, opacity:0.9, blending:THREE.AdditiveBlending, depthWrite:false}));
        s.scale.set(30,30,1); gr.add(s);
        flowSprites.push({spr:s, curve:curve, off:i/5, grp:gr});
      }
    }
    var label = null;
    if(labelText){
      var mid = curve.getPointAt(0.5);
      label = new THREE.Sprite(new THREE.SpriteMaterial({map:labelTexture(labelText, {size:36}), transparent:true, depthWrite:false}));
      var li = label.material.map.image;
      label.scale.set(li.width*0.4, li.height*0.4, 1);
      label.position.set(mid.x, 120, mid.z);
      gr.add(label);
    }
    return curve;
  }
  function drawStopBadge(gr, nodeId, n, slot){
    var node = data.nodes[nodeId];
    var b = new THREE.Sprite(new THREE.SpriteMaterial({map:badgeTexture(n), transparent:true, depthWrite:false}));
    b.scale.set(72,72,1);
    // stack badges side-by-side when several stops share one stage
    var off = (slot||0) * 84;
    b.position.set(wx(node.x) + off, 250, wz(node.y));
    gr.add(b);
  }

  /* ----- GPS blue dot ----- */
  var gpsGroup = new THREE.Group(); gpsGroup.visible = false; scene.add(gpsGroup);
  var gpsDot = new THREE.Mesh(new THREE.SphereGeometry(11, 20, 14),
    new THREE.MeshBasicMaterial({color:0x2f9dff}));
  gpsDot.position.y = 12; gpsGroup.add(gpsDot);
  var gpsRing = new THREE.Mesh(new THREE.RingGeometry(14, 19, 40),
    new THREE.MeshBasicMaterial({color:0x2f9dff, transparent:true, opacity:0.7, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide}));
  gpsRing.rotation.x = -Math.PI/2; gpsRing.position.y = 3; gpsGroup.add(gpsRing);
  var gpsAcc = new THREE.Mesh(new THREE.RingGeometry(20, 22, 48),
    new THREE.MeshBasicMaterial({color:0x2f9dff, transparent:true, opacity:0.35, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide}));
  gpsAcc.rotation.x = -Math.PI/2; gpsAcc.position.y = 3; gpsGroup.add(gpsAcc);
  var gpsPulseT = 0;

  /* ----- camera rig + custom map controls ----- */
  var rig = {tx:0, tz:0, dist:2500, az:0, pol:0}; // pol: radians from vertical
  var MAX_POL = 65*Math.PI/180, MIN_D = 380, MAX_D = 4600;
  function updateCam(){
    var sp = Math.sin(rig.pol), cp = Math.cos(rig.pol);
    camera.position.set(
      rig.tx + rig.dist*sp*Math.sin(rig.az),
      rig.dist*cp,
      rig.tz + rig.dist*sp*Math.cos(rig.az)
    );
    camera.lookAt(rig.tx, 0, rig.tz);
  }
  function clampTarget(){
    rig.tx = Math.max(-1150, Math.min(1150, rig.tx));
    rig.tz = Math.max(-800, Math.min(800, rig.tz));
    rig.dist = Math.max(MIN_D, Math.min(MAX_D, rig.dist));
    rig.pol = Math.max(0, Math.min(MAX_POL, rig.pol));
  }
  var tweens = new Tweens();
  function tweenTo(to, dur){
    dur = dur || 650;
    var f = {tx:rig.tx, tz:rig.tz, dist:rig.dist, az:rig.az, pol:rig.pol};
    var dAz = ((to.az!=null?to.az:f.az) - f.az);
    dAz = ((dAz% (Math.PI*2)) + Math.PI*3) % (Math.PI*2) - Math.PI;
    tweens.add(dur, function(e){
      if(to.tx!=null) rig.tx = f.tx + (to.tx-f.tx)*e;
      if(to.tz!=null) rig.tz = f.tz + (to.tz-f.tz)*e;
      if(to.dist!=null) rig.dist = f.dist + (to.dist-f.dist)*e;
      if(to.az!=null) rig.az = f.az + dAz*e;
      if(to.pol!=null) rig.pol = f.pol + (to.pol-f.pol)*e;
      clampTarget(); updateCam(); syncTiltUI();
    });
  }

  /* tilt slider sync (classic side owns the input) */
  var tiltInput = null;
  function syncTiltUI(){
    if(tiltInput) tiltInput.value = String(Math.round(rig.pol*180/Math.PI));
  }

  /* ----- gestures ----- */
  var ray = new THREE.Raycaster();
  var ndc = new THREE.Vector2();
  var groundPlane = new THREE.Plane(new THREE.Vector3(0,1,0), 0);
  var pointers = new Map(), gesture = null, downInfo = null, lastTap = 0;
  var velX = 0, velZ = 0, inertiaOn = false;

  function ptr(e){ var r = canvas.getBoundingClientRect(); return {x:e.clientX-r.left, y:e.clientY-r.top}; }
  function castGround(px, py){
    var r = canvas.getBoundingClientRect();
    ndc.set((px/r.width)*2-1, -(py/r.height)*2+1);
    ray.setFromCamera(ndc, camera);
    var hit = new THREE.Vector3();
    return ray.ray.intersectPlane(groundPlane, hit) ? hit : null;
  }
  function snapTwo(){
    var a = Array.from(pointers.values());
    if(a.length < 2) return null;
    var p0 = a[0], p1 = a[1];
    return {
      d: Math.hypot(p1.x-p0.x, p1.y-p0.y),
      ang: Math.atan2(p1.y-p0.y, p1.x-p0.x),
      mx:(p0.x+p1.x)/2, my:(p0.y+p1.y)/2
    };
  }
  canvas.addEventListener('contextmenu', function(e){ e.preventDefault(); });
  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', function(e){
    tweens.clear(); inertiaOn = false;
    try{ canvas.setPointerCapture(e.pointerId); }catch(err){}
    var p = ptr(e);
    pointers.set(e.pointerId, {x:p.x, y:p.y, button:e.button, shift:!!e.shiftKey, moved:0,
      gx:null, gz:null});
    var rec = pointers.get(e.pointerId);
    var g = castGround(p.x, p.y); if(g){ rec.gx = g.x; rec.gz = g.z; }
    downInfo = {x:p.x, y:p.y, t:performance.now(), id:e.pointerId};
    if(pointers.size >= 2){ var s = snapTwo(); gesture = {d:s.d, ang:s.ang, pol:rig.pol, az:rig.az, dist:rig.dist, my:s.my}; }
  });
  canvas.addEventListener('pointermove', function(e){
    var rec = pointers.get(e.pointerId); if(!rec) return;
    var p = ptr(e);
    var dx = p.x - rec.x, dy = p.y - rec.y;
    rec.moved += Math.hypot(dx,dy);
    rec.x = p.x; rec.y = p.y;
    var n = pointers.size;
    if(n >= 2){
      var s = snapTwo(); if(!s || !gesture) return;
      // pinch zoom
      var f = s.d / Math.max(24, gesture.d);
      if(f > 0.25 && f < 4) rig.dist = Math.max(MIN_D, Math.min(MAX_D, gesture.dist / f));
      // twist rotate
      var dA = s.ang - gesture.ang;
      if(dA > Math.PI) dA -= Math.PI*2; if(dA < -Math.PI) dA += Math.PI*2;
      rig.az = gesture.az - dA;
      // vertical drag tilt
      var dmy = s.my - gesture.my;
      if(Math.abs(dmy) > 3) rig.pol = Math.max(0, Math.min(MAX_POL, gesture.pol + dmy*0.006));
      clampTarget(); updateCam(); syncTiltUI();
      velX = 0; velZ = 0;
    } else if(n === 1){
      if(rec.button === 2){ rig.az += dx*0.005; }
      else if(rec.shift){ rig.pol = Math.max(0, Math.min(MAX_POL, rig.pol + dy*0.006)); }
      else {
        var g = castGround(p.x, p.y);
        if(g && rec.gx != null){
          var ddx = g.x - rec.gx, ddz = g.z - rec.gz;
          rig.tx -= ddx; rig.tz -= ddz; clampTarget();
          velX = -ddx; velZ = -ddz;
        }
      }
      clampTarget(); updateCam(); syncTiltUI();
    }
  });
  function endPointer(e){
    var rec = pointers.get(e.pointerId);
    pointers.delete(e.pointerId);
    if(pointers.size < 2) gesture = null;
    if(pointers.size === 0 && rec){
      var p = ptr(e);
      var moved = rec.moved, dt = performance.now() - (downInfo?downInfo.t:0);
      if(moved < 10 && dt < 600){
        // tap → raycast pins
        var r = canvas.getBoundingClientRect();
        ndc.set((p.x/r.width)*2-1, -(p.y/r.height)*2+1);
        ray.setFromCamera(ndc, camera);
        var hits = ray.intersectObjects(hitMeshes, false);
        if(hits.length){ onPinTap(hits[0].object.userData.nodeId); }
        else {
          // double-tap zoom
          var now = performance.now();
          if(now - lastTap < 340){ zoomAt(p.x, p.y, 1.7); lastTap = 0; }
          else { lastTap = now; onPinTap(null); }
        }
      } else if(moved > 40 && Math.hypot(velX, velZ) > 0.6){
        inertiaOn = true;
      }
    }
  }
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('wheel', function(e){
    e.preventDefault();
    tweens.clear();
    if(e.shiftKey){ rig.pol = Math.max(0, Math.min(MAX_POL, rig.pol + (e.deltaY>0?0.07:-0.07))); }
    else {
      var p = ptr(e);
      zoomAt(p.x, p.y, Math.pow(1.0016, -e.deltaY));
    }
    clampTarget(); updateCam(); syncTiltUI();
  }, {passive:false});
  function zoomAt(px, py, f){
    var before = castGround(px, py);
    rig.dist = Math.max(MIN_D, Math.min(MAX_D, rig.dist / f));
    updateCam();
    var after = castGround(px, py);
    if(before && after){ rig.tx += before.x - after.x; rig.tz += before.z - after.z; clampTarget(); updateCam(); }
  }

  /* ----- main loop ----- */
  var clock = new THREE.Clock();
  var running = true;
  function loop(){
    if(!running) return;
    requestAnimationFrame(loop);
    if(document.hidden) return;
    var dt = Math.min(0.05, clock.getDelta());
    var now = performance.now();
    tweens.step(now);
    if(inertiaOn){
      rig.tx += velX; rig.tz += velZ; velX *= 0.93; velZ *= 0.93;
      if(Math.hypot(velX, velZ) < 0.4) inertiaOn = false;
      clampTarget(); updateCam();
    }
    // route flow pulses
    if(!reduceMotion){
      var t = (now/1000)*0.14;
      for(var i=0;i<flowSprites.length;i++){
        var fs = flowSprites[i];
        var pt = fs.curve.getPointAt((t + fs.off) % 1);
        fs.spr.position.copy(pt);
      }
      gpsPulseT += dt;
      var s = 1 + (gpsPulseT % 1.6)/1.6*1.4;
      gpsRing.scale.set(s, s, 1);
      gpsRing.material.opacity = 0.7*(1-(gpsPulseT%1.6)/1.6);
    }
    renderer.render(scene, camera);
  }

  function resize(){
    var w = canvas.clientWidth || canvas.parentElement.clientWidth || 800;
    var h = canvas.clientHeight || canvas.parentElement.clientHeight || 520;
    renderer.setSize(w, h, false);
    camera.aspect = w/h; camera.updateProjectionMatrix();
  }

  /* ----- public api ----- */
  function homeDist(){ return canvas.clientWidth > canvas.clientHeight ? 1500 : 2100; }
  function fullDist(){ return canvas.clientWidth > canvas.clientHeight ? 1750 : 2300; }
  var api = {
    setTilt: function(deg){ tweens.clear(); rig.pol = Math.max(0, Math.min(MAX_POL, deg*Math.PI/180)); clampTarget(); updateCam(); syncTiltUI(); },
    getTilt: function(){ return rig.pol*180/Math.PI; },
    setAzimuth: function(deg){ tweens.clear(); rig.az = deg*Math.PI/180; updateCam(); },
    resetNorth: function(){ tweenTo({az:0}, 500); },
    zoomBy: function(f){ tweens.clear(); var r = {left:0,top:0,width:canvas.clientWidth,height:canvas.clientHeight}; zoomAt(r.width/2, r.height/2, f); },
    resetView: function(){ tweenTo({tx:0, tz:0, dist:fullDist(), az:0, pol:0}, 650); },
    cinematic: function(){ tweenTo({pol:45*Math.PI/180, dist:homeDist(), tx:wx(760), tz:wz(620)}, 900); },
    flatten: function(){ tweenTo({pol:0, az:0}, 650); },
    focusNode: function(id){
      var n = data.nodes[id]; if(!n) return;
      tweenTo({tx:wx(n.x), tz:wz(n.y), dist:Math.min(rig.dist, 1100)}, 650);
    },
    bindTiltInput: function(input){ tiltInput = input; syncTiltUI(); },
    project: function(id){
      var n = data.nodes[id]; if(!n) return null;
      var v = new THREE.Vector3(wx(n.x), 150, wz(n.y)).project(camera);
      var r = canvas.getBoundingClientRect();
      return {x:(v.x*0.5+0.5)*r.width, y:(-v.y*0.5+0.5)*r.height};
    },
    drawRoute: function(nodeIds, labelText){
      disposeGroup(routeGroup);
      if(!nodeIds || nodeIds.length < 2) return false;
      drawRouteOn(routeGroup, nodeIds, labelText || '');
      return true;
    },
    clearRoute: function(){ disposeGroup(routeGroup); },
    drawTour: function(tour){
      disposeGroup(tourGroup);
      if(!tour || !tour.legs || !tour.legs.length) return false;
      tour.legs.forEach(function(leg, i){
        if(leg.route && leg.route.nodes && leg.route.nodes.length >= 2)
          drawRouteOn(tourGroup, leg.route.nodes, '~' + leg.route.mins + ' min walk', i%2 ? 0x7fb3e8 : ICE);
      });
      var perNode = {};
      tour.stops.forEach(function(st, i){
        var k = perNode[st.nodeId] || 0; perNode[st.nodeId] = k+1;
        drawStopBadge(tourGroup, st.nodeId, i+1, k);
      });
      return true;
    },
    clearTour: function(){ disposeGroup(tourGroup); },
    setGps: function(x, y, accM){
      gpsGroup.visible = true;
      gpsGroup.position.set(wx(x), 0, wz(y));
      var r = Math.min(320, Math.max(24, accM / (data.meta.metersPerUnit||0.6)));
      gpsAcc.scale.set(r/21, r/21, 1);
    },
    clearGps: function(){ gpsGroup.visible = false; },
    resize: resize,
    state: function(){
      return {tilt:Math.round(rig.pol*180/Math.PI), az:Math.round(rig.az*180/Math.PI),
              dist:Math.round(rig.dist), pins:hitMeshes.length,
              routeOn:routeGroup.children.length>0, tourOn:tourGroup.children.length>0};
    },
    dispose: function(){ running = false; renderer.dispose(); }
  };

  resize();
  updateCam();
  loop();
  return api;
}

window.NH3D = { create: createScene };
