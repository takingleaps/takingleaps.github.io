(function(){
  'use strict';
  var T=window.THREE;
  var els={
    experience:document.getElementById('experience'),gate:document.getElementById('ageGate'),enter:document.getElementById('ageEnter'),leave:document.getElementById('ageLeave'),ageNote:document.getElementById('ageNote'),ageLoad:document.getElementById('ageLoad'),viewport:document.getElementById('gameViewport'),canvas:document.getElementById('scene'),loading:document.getElementById('loading'),loadingFill:document.getElementById('loadingFill'),proximity:document.getElementById('proximity'),lookPrompt:document.getElementById('lookPrompt'),hotspotLayer:document.getElementById('hotspotLayer'),scrim:document.getElementById('scrim'),lineup:document.getElementById('lineupPanel'),brand:document.getElementById('brandPanel'),poster:document.getElementById('posterPanel'),joystick:document.getElementById('joystick'),stick:document.getElementById('stick'),phoneLaunch:document.getElementById('phoneLaunch'),phoneOverlay:document.getElementById('phoneOverlay'),phoneClose:document.getElementById('phoneClose'),phoneVibe:document.getElementById('phoneVibe'),vibeStatus:document.getElementById('vibeStatus'),layoutTag:document.getElementById('layoutTag'),bagLaunch:document.getElementById('bagLaunch'),bagCount:document.getElementById('bagCount'),bagPanel:document.getElementById('bagPanel'),bagContents:document.getElementById('bagContents')
  };
  els.experience.inert=true;
  var enteredAge=false,ready=false,lastTrigger=null,activePanel=null,activeHotspot=null,coarse=matchMedia('(pointer:coarse)').matches;
  var keys={},joy={x:0,y:0,pointer:null},vibeOn=false,dirtyFrames=12,bag={},bagTotal=0,touchLook={pointer:null,x:0,y:0,moved:false};
  var stats={steps:0,collisions:0,triggers:{lineup:0,poster:0,brand:0},loaded:0,total:11};

  function fail(message){els.ageLoad.textContent=message;els.loading.innerHTML='<div class="loading-box">'+message+'</div>';els.loading.classList.remove('ready');}
  if(!T||!T.GLTFLoader){fail('STORE VIEWER COULD NOT LOAD');return;}

  var renderer=new T.WebGLRenderer({canvas:els.canvas,antialias:true,alpha:false,powerPreference:'high-performance',precision:'highp'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,coarse?1.15:1.4));renderer.setSize(innerWidth,innerHeight,false);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.92;
  var scene=new T.Scene();scene.background=new T.Color(0x2b211d);scene.fog=new T.Fog(0x4a3429,13,30);
  var camera=new T.PerspectiveCamera(62,innerWidth/innerHeight,.055,48);
  var clock=new T.Clock();
  var hemi=new T.HemisphereLight(0xffd8aa,0x20140f,.52);scene.add(hemi);
  var ambient=new T.AmbientLight(0xffb978,.2);scene.add(ambient);
  var sun=new T.DirectionalLight(0xffb45f,1.48);sun.position.set(-4.5,8.5,-7);sun.target.position.set(0,0,2.2);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.near=.5;sun.shadow.camera.far=25;sun.shadow.camera.left=-9;sun.shadow.camera.right=9;sun.shadow.camera.top=9;sun.shadow.camera.bottom=-9;sun.shadow.bias=-.0008;sun.shadow.normalBias=.025;sun.shadow.radius=4;scene.add(sun,sun.target);
  var windowBounce=new T.PointLight(0xff8c43,1.28,13,2);windowBounce.position.set(0,2.35,-4.7);scene.add(windowBounce);
  var mintFill=new T.PointLight(0x78c991,.42,11,2);mintFill.position.set(-5.8,2.2,2.8);scene.add(mintFill);
  var pinkFill=new T.PointLight(0xff628e,.52,9,2);pinkFill.position.set(5.4,1.9,2.6);scene.add(pinkFill);

  var modelRoot=new T.Group();scene.add(modelRoot);
  var fxRoot=new T.Group();scene.add(fxRoot);
  var moodLights=[],lavaBlobs=[],lastMoodTick=0;
  var PLAYER_EYE_HEIGHT=1.63;
  var player={x:0,y:0,z:-3.15,r:.31,speed:3.15,velocityY:0,grounded:true,yaw:0,targetYaw:0};
  var jump={gravity:15.5,velocity:5.3,maxY:1.05};
  var cameraState={yaw:0,targetYaw:0,pitch:0,targetPitch:0,ready:false};
  var cameraDir=new T.Vector3(),cameraLook=new T.Vector3(),markerVector=new T.Vector3(),hotVector=new T.Vector3();

  var collisions=[
    {name:'back shelf left',x:-4.5,z:5.48,w:3.35,d:.55,r:0},{name:'back shelf right',x:4.5,z:5.48,w:3.35,d:.55,r:0},
    {name:'left shelf',x:-7.52,z:1.55,w:.55,d:3.35,r:0},{name:'display case left',x:-2.2,z:.25,w:2.55,d:.85,r:0},
    {name:'display case right',x:2.2,z:.25,w:2.55,d:.85,r:0},{name:'checkout',x:5.55,z:3.45,w:1.12,d:3.35,r:0},
    {name:'bench',x:0,z:2.3,w:2.0,d:.75,r:0},{name:'plant left',x:-6.9,z:-4.8,w:1.05,d:1.05,r:0},
    {name:'plant right',x:6.85,z:-4.8,w:1.05,d:1.05,r:0}
  ];
  var hotspots=[
    {id:'shelf-left',label:'PRODUCT SHELF',action:'lineup',x:-4.5,y:1.7,z:4.65,r:1.3},
    {id:'shelf-right',label:'PRODUCT SHELF',action:'lineup',x:4.5,y:1.7,z:4.65,r:1.3},
    {id:'shelf-side',label:'PRODUCT SHELF',action:'lineup',x:-6.65,y:1.7,z:1.55,r:1.2},
    {id:'case-left',label:'DISPLAY CASE',action:'lineup',x:-2.2,y:1.25,z:-.65,r:1.25},
    {id:'case-right',label:'DISPLAY CASE',action:'lineup',x:2.2,y:1.25,z:-.65,r:1.25},
    {id:'menu',label:'STRAIN MENU',action:'lineup',x:7.0,y:2.45,z:0,r:1.15},
    {id:'poster',label:'POSTERS',action:'poster',x:-7.0,y:2.45,z:-1.8,r:1.15},
    {id:'checkout',label:'FLWRPWR COUNTER',action:'brand',x:4.55,y:1.45,z:3.45,r:1.3}
  ];
  var hotState={};
  hotspots.forEach(function(h){var e=document.createElement('div');e.className='hotspot-marker';e.textContent=h.label;e.dataset.hotspotId=h.id;els.hotspotLayer.appendChild(e);h.el=e;hotState[h.id]=false;});

  function material(color,rough,metal){return new T.MeshStandardMaterial({color:color,roughness:rough==null?.72:rough,metalness:metal||0});}
  function mesh(geo,mat,cast,receive){var m=new T.Mesh(geo,mat);m.castShadow=cast!==false;m.receiveShadow=receive!==false;return m;}
  function createCharacter(){
    var root=new T.Group(),skin=material(0xc98c69,.76),hair=material(0x281d24,.82),pink=material(0xe84288,.64),pinkDark=material(0x982055,.7),teal=material(0x4fa7a0,.7),shoe=material(0x282128,.86),cream=material(0xfff2cc,.65),gold=material(0xe7b858,.6);
    var shadow=mesh(new T.CircleGeometry(.48,28),new T.MeshBasicMaterial({color:0x132219,transparent:true,opacity:.3,depthWrite:false}),false,false);shadow.rotation.x=-Math.PI/2;shadow.position.y=.012;root.add(shadow);
    var torso=mesh(new T.CylinderGeometry(.31,.39,.82,20),pink);torso.position.y=1.05;torso.scale.z=.75;root.add(torso);
    var collar=mesh(new T.TorusGeometry(.17,.035,10,24,Math.PI),cream);collar.rotation.x=Math.PI/2;collar.rotation.z=Math.PI;collar.position.set(0,1.44,.23);root.add(collar);
    var flowerCenter=mesh(new T.CircleGeometry(.07,16),gold,false,false);flowerCenter.position.set(0,1.12,.325);root.add(flowerCenter);
    for(var i=0;i<6;i++){var p=mesh(new T.CircleGeometry(.052,12),cream,false,false);var a=i*Math.PI/3;p.position.set(Math.cos(a)*.105,1.12+Math.sin(a)*.105,.327);root.add(p);}
    var head=mesh(new T.SphereGeometry(.32,24,16),skin);head.scale.set(.9,1.08,.9);head.position.y=1.75;root.add(head);
    var hairCap=mesh(new T.SphereGeometry(.335,24,12,0,Math.PI*2,0,Math.PI*.55),hair);hairCap.scale.set(.95,.85,.97);hairCap.position.y=1.86;root.add(hairCap);
    [-1,1].forEach(function(side){var bun=mesh(new T.SphereGeometry(.16,18,12),hair);bun.position.set(side*.27,1.94,-.02);root.add(bun);});
    [-1,1].forEach(function(side){var eye=mesh(new T.SphereGeometry(.027,12,8),hair,false,false);eye.position.set(side*.105,1.78,.282);root.add(eye);});
    var mouth=mesh(new T.BoxGeometry(.10,.018,.018),pinkDark,false,false);mouth.position.set(0,1.66,.304);root.add(mouth);
    root.userData.arms=[];root.userData.legs=[];
    [-1,1].forEach(function(side){var armPivot=new T.Group();armPivot.position.set(side*.38,1.36,0);var arm=mesh(new T.CylinderGeometry(.075,.085,.64,14),skin);arm.position.y=-.28;armPivot.add(arm);root.add(armPivot);root.userData.arms.push(armPivot);var legPivot=new T.Group();legPivot.position.set(side*.18,.7,0);var leg=mesh(new T.CylinderGeometry(.105,.12,.62,14),teal);leg.position.y=-.25;legPivot.add(leg);var foot=mesh(new T.BoxGeometry(.24,.14,.37),shoe);foot.position.set(0,-.55,.08);foot.rotation.x=-.08;legPivot.add(foot);root.add(legPivot);root.userData.legs.push(legPivot);});
    root.scale.setScalar(.93);root.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});return root;
  }

  function mergeStaticModel(root){
    root.updateMatrixWorld(true);var groups={};root.traverse(function(o){if(!o.isMesh||!o.geometry||!o.geometry.attributes.position)return;var mats=Array.isArray(o.material)?o.material:[o.material];if(mats.length!==1)return;var mat=mats[0],g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);if(!g.attributes.normal)g.computeVertexNormals();var key=mat.uuid,b=groups[key]||(groups[key]={material:mat,positions:[],normals:[],uvs:[],needsUv:false});var pa=g.attributes.position.array,na=g.attributes.normal.array,ua=g.attributes.uv&&g.attributes.uv.array;for(var i=0;i<pa.length;i++)b.positions.push(pa[i]);for(i=0;i<na.length;i++)b.normals.push(na[i]);if(ua){b.needsUv=true;for(i=0;i<ua.length;i++)b.uvs.push(ua[i]);}else{for(i=0;i<pa.length/3*2;i++)b.uvs.push(0);}g.dispose();});
    var merged=new T.Group();Object.keys(groups).forEach(function(key){var b=groups[key],g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(b.positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(b.normals,3));if(b.needsUv)g.setAttribute('uv',new T.Float32BufferAttribute(b.uvs,2));g.computeBoundingSphere();var m=new T.Mesh(g,b.material);m.castShadow=true;m.receiveShadow=true;m.frustumCulled=true;merged.add(m);});return merged;
  }
  function prepareModel(root){root.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material){var mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(function(m){var n=(m.name||'').toLowerCase();if(m.map){m.map.encoding=T.sRGBEncoding;m.map.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());}if(typeof m.roughness==='number')m.roughness=Math.max(.26,Math.min(.88,m.roughness));if(typeof m.metalness==='number')m.metalness=Math.max(0,Math.min(.38,m.metalness));if(m.color&&m.color.getHSL){var hsl={h:0,s:0,l:0};m.color.getHSL(hsl);m.color.setHSL(hsl.h,Math.min(1,hsl.s*1.18+.035),Math.max(.055,Math.min(.82,hsl.l*.88)));}
      if(/wood|floor|counter_front|cc_top|bench_seat/.test(n)){m.color.lerp(new T.Color(0x6e4028),.3);m.roughness=.58;m.metalness=.02;}
      if(/cushion|rug/.test(n)){m.roughness=.96;m.metalness=0;m.color.lerp(new T.Color(n.indexOf('rug')>-1?0x8d3c57:0xd89aaa),.18);}
      if(/glass/.test(n)){m.transparent=true;m.opacity=.3;m.roughness=.12;m.metalness=.06;m.depthWrite=false;m.side=T.DoubleSide;}
      if(/bulb|lightpanel/.test(n)){m.emissive=new T.Color(0xffa347);m.emissiveIntensity=n.indexOf('bulb')>-1?2.4:.72;m.color.lerp(new T.Color(0xffd195),.5);}
      if(/logo_sign/.test(n)){m.emissive=new T.Color(0xff4e91);m.emissiveIntensity=.55;}
      if(/pos_screen/.test(n)){m.emissive=new T.Color(0xf9b35d);m.emissiveIntensity=.35;}
      m.needsUpdate=true;});}}});return mergeStaticModel(root);}
  function addModel(template,pos,rotation,scale){var o=template.clone(true),s=scale||1;o.position.set(pos[0],pos[1],pos[2]);o.rotation.y=rotation||0;o.scale.set(-s,s,s);modelRoot.add(o);return o;}
  function makeSunbeams(){
    var beamPositions=[],beamIndices=[];
    [[-4.8,-5.55,-1.6,-.7],[2.3,-5.55,5.2,.05]].forEach(function(b,i){var n=i*4;beamPositions.push(b[0]-.9,3.7,b[1],b[0]+.9,3.7,b[1],b[2]+1.15,.02,b[3]+5.2,b[2]-1.15,.02,b[3]+5.2);beamIndices.push(n,n+1,n+2,n,n+2,n+3);});
    var beamGeo=new T.BufferGeometry();beamGeo.setAttribute('position',new T.Float32BufferAttribute(beamPositions,3));beamGeo.setIndex(beamIndices);fxRoot.add(new T.Mesh(beamGeo,new T.MeshBasicMaterial({color:0xffd38c,transparent:true,opacity:.14,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending})));
    var patch=mesh(new T.PlaneGeometry(7.4,4.2),new T.MeshBasicMaterial({color:0xffcc76,transparent:true,opacity:.13,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending}),false,false);patch.rotation.x=-Math.PI/2;patch.rotation.z=-.16;patch.position.set(0,.025,-.8);fxRoot.add(patch);
    var dustGeo=new T.BufferGeometry(),arr=[];for(var d=0;d<48;d++)arr.push((Math.random()-.5)*14,Math.random()*3.8,(Math.random()-.5)*10);dustGeo.setAttribute('position',new T.Float32BufferAttribute(arr,3));var dust=new T.Points(dustGeo,new T.PointsMaterial({color:0xffe7ad,size:.03,transparent:true,opacity:.32,depthWrite:false}));dust.name='dust';fxRoot.add(dust);
  }
  function makeStoreAccents(){
    var greenGlow=new T.MeshBasicMaterial({color:0x73e69d,transparent:true,opacity:.82,toneMapped:false});
    var pinkGlow=new T.MeshBasicMaterial({color:0xff4f9b,transparent:true,opacity:.78,toneMapped:false});
    [[-2.2,.83,-.18,greenGlow],[2.2,.83,-.18,pinkGlow]].forEach(function(a){var bar=mesh(new T.BoxGeometry(2.3,.035,.035),a[3],false,false);bar.position.set(a[0],a[1],a[2]);fxRoot.add(bar);});
    [[-4.5,2.65,5.13,greenGlow],[4.5,2.65,5.13,pinkGlow],[-7.15,2.5,1.55,greenGlow]].forEach(function(a){var bar=mesh(new T.BoxGeometry(2.35,.028,.028),a[3],false,false);bar.position.set(a[0],a[1],a[2]);if(a[0]<-7)bar.rotation.y=Math.PI/2;fxRoot.add(bar);});
  }

  function makeStreetScene(){
    var street=new T.Group();street.name='street-outside';
    function box(w,h,d,color,x,y,z,rough,metal){var o=mesh(new T.BoxGeometry(w,h,d),material(color,rough,metal),false,true);o.position.set(x,y,z);street.add(o);return o;}
    var sidewalk=box(18,.16,2.15,0xb9a08b,0,-.04,-6.75,.92,0);sidewalk.receiveShadow=true;
    box(18,.08,.17,0xd7c0a9,0,.055,-5.72,.9,0);
    var road=box(22,.12,4.1,0x343439,0,-.13,-9.85,.96,0);road.receiveShadow=true;
    [-3.7,3.7].forEach(function(x){box(2.3,.025,.09,0xe7c768,x,-.055,-9.83,.72,0);});
    var facadeColors=[0x614d47,0x465b55,0x76564d];
    [[-5.8,5.3,5.2,facadeColors[0]],[-.35,4.7,4.4,facadeColors[1]],[5.1,5.65,5,facadeColors[2]]].forEach(function(b,bi){
      box(5.1,b[1],1.15,b[3],b[0],b[1]/2-.05,-13.15,.86,0);
      var cols=bi===1?3:2,rows=2;
      for(var r=0;r<rows;r++){for(var c=0;c<cols;c++){var wx=b[0]+(c-(cols-1)/2)*1.34,wy=1.15+r*1.65;var win=box(.74,.86,.035,(r+c+bi)%3===0?0x7b705f:0xffd38b,wx,wy,-12.55,.28,0);win.material.emissive=new T.Color((r+c+bi)%3===0?0x372f2b:0xff9b48);win.material.emissiveIntensity=(r+c+bi)%3===0?.08:.92;}}
    });
    function lamp(x){box(.09,2.85,.09,0x30312d,x,1.36,-7.35,.45,.38);var cap=mesh(new T.ConeGeometry(.31,.25,10),material(0x38352e,.5,.28),false,false);cap.position.set(x,2.86,-7.35);cap.rotation.z=Math.PI;street.add(cap);var bulb=mesh(new T.SphereGeometry(.13,14,10),new T.MeshStandardMaterial({color:0xffd7a0,emissive:0xff8b3e,emissiveIntensity:2.7,roughness:.2,toneMapped:false}),false,false);bulb.position.set(x,2.69,-7.35);street.add(bulb);var light=new T.PointLight(0xff9d55,.85,5.2,2);light.position.copy(bulb.position);scene.add(light);}
    lamp(-5.2);lamp(5.25);
    function planter(x){box(.74,.52,.74,0x7b5641,x,.22,-6.38,.88,0);var crown=mesh(new T.DodecahedronGeometry(.52,0),material(0x477253,.9,0),false,false);crown.scale.set(.9,1.18,.9);crown.position.set(x,.88,-6.38);street.add(crown);}
    planter(-6.65);planter(6.55);
    var car=new T.Group();var body=box(2.85,.54,1.05,0x273946,2.2,.25,-9.05,.38,.28);body.position.y=.22;var cabin=mesh(new T.BoxGeometry(1.55,.48,.86),material(0x334a54,.28,.32),false,false);cabin.position.set(2.18,.68,-9.05);cabin.geometry.translate(0,0,0);street.add(cabin);[-1,1].forEach(function(side){[-.83,.83].forEach(function(dx){var wheel=mesh(new T.CylinderGeometry(.24,.24,.13,16),material(0x17181a,.78,.06),false,false);wheel.rotation.x=Math.PI/2;wheel.position.set(2.2+dx,.05,-9.05+side*.49);street.add(wheel);});});
    var sky=mesh(new T.PlaneGeometry(25,10),new T.MeshBasicMaterial({color:0xd98762,side:T.DoubleSide}),false,false);sky.position.set(0,4.5,-14);street.add(sky);sky.renderOrder=-1;
    scene.add(street);
  }

  function makeCozyLighting(){
    var wireMat=new T.LineBasicMaterial({color:0x3b241b,transparent:true,opacity:.9});
    var bulbMat=new T.MeshStandardMaterial({color:0xffd49a,emissive:0xff8b35,emissiveIntensity:3.2,roughness:.22,metalness:0,toneMapped:false});
    [-3.7,-.25,3.2].forEach(function(z,row){
      var points=[];
      for(var i=0;i<=12;i++){var x=-6.8+i*(13.6/12),y=3.7-.22*Math.sin(Math.PI*i/12);points.push(new T.Vector3(x,y,z));}
      fxRoot.add(new T.Line(new T.BufferGeometry().setFromPoints(points),wireMat));
      for(var b=0;b<=12;b+=2){var bp=points[b],bulb=mesh(new T.SphereGeometry(.065,12,8),bulbMat,false,false);bulb.position.copy(bp);fxRoot.add(bulb);}
      if(row===1){var stringLight=new T.PointLight(0xff9d50,1.12,8.5,2);stringLight.position.set(0,3.42,z);stringLight.userData.base=stringLight.intensity;stringLight.userData.phase=row*1.7;stringLight.userData.vibe=1;scene.add(stringLight);moodLights.push(stringLight);}
    });
    [[-2.2,.76,.1],[2.2,.76,.1]].forEach(function(p,i){
      var glow=mesh(new T.BoxGeometry(2.34,.055,.56),new T.MeshStandardMaterial({color:i?0xffa1b9:0xffcc8a,emissive:i?0xff4f86:0xff9c45,emissiveIntensity:1.8,transparent:true,opacity:.76,roughness:.25,toneMapped:false}),false,false);glow.position.set(p[0],p[1],p[2]);fxRoot.add(glow);
    });
    var shade=new T.MeshStandardMaterial({color:0x873f55,roughness:.42,metalness:.05,transparent:true,opacity:.82,emissive:0x7e263f,emissiveIntensity:.4});
    var lava=new T.Group();var base=mesh(new T.CylinderGeometry(.18,.23,.14,20),material(0x7a5534,.28,.34));base.position.y=.07;lava.add(base);var glass=mesh(new T.CylinderGeometry(.13,.19,.72,20),shade,false,false);glass.position.y=.5;lava.add(glass);var cap=mesh(new T.ConeGeometry(.14,.2,20),material(0xb9864f,.3,.28));cap.position.y=.95;lava.add(cap);
    [0,.23,.46].forEach(function(y,i){var blob=mesh(new T.SphereGeometry(.085+i*.014,14,10),new T.MeshBasicMaterial({color:i===1?0xffcb69:0xff7d72,transparent:true,opacity:.72}),false,false);blob.position.set((i-1)*.035,.3+y,0);blob.userData.baseY=blob.position.y;blob.userData.phase=i*2.1;lava.add(blob);lavaBlobs.push(blob);});
    lava.position.set(5.15,1.02,2.45);fxRoot.add(lava);var lavaLight=new T.PointLight(0xff713f,1.15,4.8,2);lavaLight.position.set(5.15,1.7,2.45);lavaLight.userData.base=1.15;lavaLight.userData.phase=4.2;lavaLight.userData.vibe=1;scene.add(lavaLight);moodLights.push(lavaLight);
    [[-2.2,.02,.15,0xffa04f],[2.2,.02,.15,0xff5f87],[5.15,.02,2.45,0xff6b3a]].forEach(function(p){var pool=mesh(new T.CircleGeometry(1.45,32),new T.MeshBasicMaterial({color:p[3],transparent:true,opacity:.075,depthWrite:false,blending:T.AdditiveBlending}),false,false);pool.rotation.x=-Math.PI/2;pool.position.set(p[0],p[1],p[2]);fxRoot.add(pool);});
  }
  function updateMoodLights(now){
    if(now-lastMoodTick<180)return;lastMoodTick=now;var t=now*.001;
    moodLights.forEach(function(l){l.intensity=l.userData.base*(l.userData.vibe||1)*(1+.025*Math.sin(t*1.7+l.userData.phase)+.012*Math.sin(t*5.1+l.userData.phase));});
    lavaBlobs.forEach(function(b,i){b.position.y=b.userData.baseY+Math.sin(t*(.55+i*.08)+b.userData.phase)*.075;});dirtyFrames=Math.max(dirtyFrames,1);
  }

  var manager=new T.LoadingManager();
  var modelPaths={
    room_shell:'assets/models/room_shell.glb',
    display_case:'assets/models/display_case.glb',
    wall_shelf:'assets/models/wall_shelf.glb',
    checkout_counter:'assets/models/checkout_counter.glb',
    logo_sign:'assets/models/logo_sign.glb',
    menu_board:'assets/models/menu_board.glb',
    plant_large:'assets/models/plant_large.glb',
    plant_hanging:'assets/models/plant_hanging.glb',
    pendant_light:'assets/models/pendant_light.glb',
    bench:'assets/models/bench.glb',
    poster_frame:'assets/models/poster_frame.glb'
  };
  var loader=new T.GLTFLoader(manager),files=Object.keys(modelPaths),promises={};
  function updateLoadProgress(){
    stats.loaded++;
    var pct=Math.round(stats.loaded/files.length*100);els.loadingFill.style.width=pct+'%';els.ageLoad.textContent='PREPARING STORE · '+pct+'%';
  }
  files.forEach(function(name){promises[name]=new Promise(function(resolve,reject){
    var filename=modelPaths[name].split('/').pop(),primary='./models/'+filename,fallback='assets/models/'+filename;
    function loaded(g){try{updateLoadProgress();resolve(prepareModel(g.scene));}catch(error){reject(error);}}
    loader.load(primary,loaded,undefined,function(){loader.load(fallback,loaded,undefined,function(){reject(new Error(name+': GLB load failed'));});});
  });});
  Promise.all(files.map(function(n){return promises[n];})).then(function(models){
    var m={};files.forEach(function(n,i){m[n]=models[i];});
    var shell=addModel(m.room_shell,[0,0,0],0);shell.userData.topHidden=[];shell.traverse(function(o){if(o.name==='ceiling'||o.name.indexOf('panel_')===0)shell.userData.topHidden.push(o);});modelRoot.userData.shell=shell;
    addModel(m.display_case,[-2.2,0,.25],0);addModel(m.display_case,[2.2,0,.25],0);
    addModel(m.wall_shelf,[-4.5,0,5.48],0);addModel(m.wall_shelf,[4.5,0,5.48],0);addModel(m.wall_shelf,[-7.52,0,1.55],-Math.PI/2);
    addModel(m.checkout_counter,[5.55,0,3.45],-Math.PI/2);
    addModel(m.logo_sign,[0,1.55,5.86],0);
    addModel(m.menu_board,[7.86,1.18,0],Math.PI/2);
    addModel(m.poster_frame,[-7.86,1.42,-1.8],-Math.PI/2);
    addModel(m.plant_large,[-6.9,0,-4.8],0);addModel(m.plant_large,[6.85,0,-4.8],0);
    addModel(m.plant_hanging,[-3.1,3.05,2.45],0);addModel(m.plant_hanging,[3.1,3.05,2.45],0);
    addModel(m.pendant_light,[-2.2,3.9,.25],0);addModel(m.pendant_light,[2.2,3.9,.25],0);addModel(m.pendant_light,[0,3.9,-3.05],0);
    addModel(m.bench,[0,0,2.35],Math.PI);
    makeSunbeams();makeStoreAccents();makeStreetScene();makeCozyLighting();
    stats.loaded=files.length;ready=true;els.ageLoad.textContent='STORE READY';els.loading.classList.add('ready');
    cameraState.ready=false;dirtyFrames=Math.max(dirtyFrames,60);
    if(enteredAge){updateCamera(.016,true);checkHotspots();updateMarkers();renderer.render(scene,camera);}
  }).catch(function(error){var detail=(error&&error.message)||'unknown store error';console.error('Store asset failed:',detail);fail('STORE COULD NOT LOAD');});

  function blocked(x,z){if(x<-7.45||x>7.45||z<-5.45||z>5.32)return true;for(var i=0;i<collisions.length;i++){var b=collisions[i],hw=b.w/2,hd=b.d/2;if(x+player.r>b.x-hw&&x-player.r<b.x+hw&&z+player.r>b.z-hd&&z-player.r<b.z+hd)return true;}return false;}
  function move(dx,dz){var moved=false;if(dx){var nx=player.x+dx;if(!blocked(nx,player.z)){player.x=nx;moved=true;}else stats.collisions++;}if(dz){var nz=player.z+dz;if(!blocked(player.x,nz)){player.z=nz;moved=true;}else stats.collisions++;}if(moved)stats.steps++;return moved;}
  function angleDelta(a,b){return Math.atan2(Math.sin(b-a),Math.cos(b-a));}
  function lerp(a,b,t){return a+(b-a)*t;}
  function updateCamera(dt,snap){
    var ease=snap?1:Math.min(1,dt*18);
    cameraState.yaw+=(cameraState.targetYaw-cameraState.yaw)*ease;
    cameraState.pitch=lerp(cameraState.pitch,cameraState.targetPitch,ease);
    camera.position.set(player.x,PLAYER_EYE_HEIGHT+player.y,player.z);
    var cp=Math.cos(cameraState.pitch);
    cameraDir.set(Math.sin(cameraState.yaw)*cp,Math.sin(cameraState.pitch),Math.cos(cameraState.yaw)*cp);
    cameraLook.copy(camera.position).addScaledVector(cameraDir,5);
    camera.lookAt(cameraLook);
  }
  function checkHotspots(){
    activeHotspot=null;var best=Infinity;
    hotspots.forEach(function(h){
      hotVector.set(h.x-player.x,h.y-(PLAYER_EYE_HEIGHT+player.y),h.z-player.z);var distance=hotVector.length(),facing=hotVector.normalize().dot(cameraDir);
      var usable=distance<3.5&&facing>.72;
      h.el.classList.toggle('near',usable);
      if(usable&&distance<best){activeHotspot=h;best=distance;}
    });
    if(activeHotspot){els.proximity.textContent=(coarse?'TAP':'E OR CLICK')+' · '+activeHotspot.label;els.proximity.classList.add('show');}
    else els.proximity.classList.remove('show');
  }
  function updateMarkers(){hotspots.forEach(function(h){markerVector.set(h.x,h.y,h.z).project(camera);var distance=Math.hypot(player.x-h.x,player.z-h.z),visible=markerVector.z>-1&&markerVector.z<1&&markerVector.x>-.98&&markerVector.x<.98&&markerVector.y>-.92&&markerVector.y<.92&&distance<5;h.el.classList.toggle('visible',visible);if(visible){h.el.style.left=((markerVector.x*.5+.5)*innerWidth).toFixed(1)+'px';h.el.style.top=((-markerVector.y*.5+.5)*innerHeight).toFixed(1)+'px';}});}
  function interact(){if(!activeHotspot)return false;activate(activeHotspot.action,activeHotspot.el,activeHotspot.label);return true;}
  function startJump(){
    if(!player.grounded)return false;player.grounded=false;player.velocityY=jump.velocity;dirtyFrames=Math.max(dirtyFrames,4);return true;
  }
  function updateJump(dt){
    if(player.grounded)return;
    player.velocityY-=jump.gravity*dt;
    player.y=Math.min(jump.maxY,player.y+player.velocityY*dt);
    if(player.y>=jump.maxY&&player.velocityY>0)player.velocityY=0;
    if(player.y<=0&&player.velocityY<=0){player.y=0;player.velocityY=0;player.grounded=true;}
    dirtyFrames=Math.max(dirtyFrames,2);
  }
  var frameMark=0,markerTick=0;
  function animate(now){
    requestAnimationFrame(animate);if(frameMark&&now-frameMark<16)return;frameMark=now||performance.now();if(!enteredAge)return;
    var interaction=keys.ArrowLeft||keys.ArrowRight||keys.ArrowUp||keys.ArrowDown||keys.w||keys.a||keys.s||keys.d||joy.pointer!==null||!player.grounded;
    if(!interaction&&dirtyFrames<=0)return;if(dirtyFrames>0)dirtyFrames--;
    var dt=Math.min(clock.getDelta(),.05),mx=0,mz=0;updateJump(dt);if(keys.ArrowLeft||keys.a)mx-=1;if(keys.ArrowRight||keys.d)mx+=1;if(keys.ArrowUp||keys.w)mz+=1;if(keys.ArrowDown||keys.s)mz-=1;mx+=joy.x;mz+=-joy.y;
    if(mx||mz){var len=Math.hypot(mx,mz);if(len>1){mx/=len;mz/=len;}var sinYaw=Math.sin(cameraState.yaw),cosYaw=Math.cos(cameraState.yaw);var dx=sinYaw*mz-cosYaw*mx,dz=cosYaw*mz+sinYaw*mx;move(dx*player.speed*dt,dz*player.speed*dt);}
    updateCamera(dt,!cameraState.ready);cameraState.ready=true;if(++markerTick%2===0){checkHotspots();updateMarkers();}renderer.render(scene,camera);
  }

  function setOpen(panel,open,trigger){
    [els.lineup,els.brand,els.poster,els.bagPanel].forEach(function(p){p.classList.remove('open');p.setAttribute('aria-hidden','true');});
    activePanel=open?panel:null;
    if(open){if(document.pointerLockElement===els.viewport)document.exitPointerLock();panel.classList.add('open');panel.setAttribute('aria-hidden','false');lastTrigger=trigger||lastTrigger;var close=panel.querySelector('[data-close]');if(close)close.focus();}
    els.scrim.classList.toggle('open',!!open);
  }
  function closePanels(){setOpen(els.lineup,false);closePhone();if(lastTrigger&&document.body.contains(lastTrigger))els.viewport.focus();dirtyFrames=4;}
  function activate(action,trigger,label){stats.triggers[action]=(stats.triggers[action]||0)+1;if(action==='lineup')setOpen(els.lineup,true,trigger);if(action==='poster')setOpen(els.poster,true,trigger);if(action==='brand')setOpen(els.brand,true,trigger);}
  function switchPhonePage(name){document.querySelectorAll('[data-phone-tab]').forEach(function(tab){var on=tab.dataset.phoneTab===name;tab.setAttribute('aria-selected',String(on));tab.tabIndex=on?0:-1;});document.querySelectorAll('.phone-page').forEach(function(page){var on=page.id==='phone-'+name;page.classList.toggle('active',on);page.hidden=!on;});var pages=document.querySelector('.phone-pages');if(pages)pages.scrollTop=0;}
  function openPhone(){setOpen(els.lineup,false);if(document.pointerLockElement===els.viewport)document.exitPointerLock();document.body.classList.add('phone-open');els.phoneOverlay.classList.add('open');els.phoneOverlay.setAttribute('aria-hidden','false');els.phoneClose.focus();}
  function closePhone(){if(!els.phoneOverlay.classList.contains('open'))return;els.phoneOverlay.classList.remove('open');els.phoneOverlay.setAttribute('aria-hidden','true');document.body.classList.remove('phone-open');dirtyFrames=4;}
  function setVibe(on){vibeOn=on;renderer.toneMappingExposure=on?1.03:.92;sun.intensity=on?1.7:1.48;hemi.intensity=on?.62:.52;windowBounce.intensity=on?1.58:1.28;pinkFill.intensity=on?.72:.52;scene.fog.color.setHex(on?0x55382b:0x4a3429);moodLights.forEach(function(l){l.userData.vibe=on?1.16:1;});els.vibeStatus.classList.toggle('show',on);els.phoneVibe.setAttribute('aria-pressed',String(on));els.phoneVibe.textContent=on?'TURN OFF':'TURN ON';dirtyFrames=12;}
  function renderBag(){
    els.bagCount.textContent=bagTotal;els.bagLaunch.setAttribute('aria-label','Open bag, '+bagTotal+' item'+(bagTotal===1?'':'s'));
    var names=['Thai Stick','Northern Lights','Maui Wowie'];
    if(!bagTotal){els.bagContents.innerHTML='<p class="bag-empty">Your bag is empty. Face a product display and interact.</p>';return;}
    var html='<ul class="bag-list">';names.forEach(function(name){if(bag[name])html+='<li><span>'+name+'<small>FLWRPWR 4g Smalls</small></span><span class="qty">× '+bag[name]+'</span></li>';});html+='</ul><p class="bag-summary">'+bagTotal+' item'+(bagTotal===1?'':'s')+' in bag · concept only</p>';els.bagContents.innerHTML=html;
  }
  function addToBag(name,source){
    bag[name]=(bag[name]||0)+1;bagTotal++;renderBag();
    var r=(source||els.lineup).getBoundingClientRect(),fly=document.createElement('div');fly.className='bag-fly';fly.textContent=name;fly.style.left=(r.left+r.width/2-48)+'px';fly.style.top=(r.top+r.height/2-27)+'px';document.body.appendChild(fly);setTimeout(function(){fly.remove();},680);
    els.bagLaunch.classList.remove('bump');void els.bagLaunch.offsetWidth;els.bagLaunch.classList.add('bump');setTimeout(function(){els.bagLaunch.classList.remove('bump');},460);
    els.proximity.textContent=name.toUpperCase()+' ADDED';els.proximity.classList.add('show');setTimeout(function(){if(!activeHotspot)els.proximity.classList.remove('show');},900);
  }

  els.enter.addEventListener('click',function(){enteredAge=true;els.gate.classList.add('dismissed');els.gate.setAttribute('aria-hidden','true');els.experience.setAttribute('aria-hidden','false');els.experience.inert=false;els.viewport.focus();if(!coarse){els.lookPrompt.classList.add('show');els.lookPrompt.setAttribute('aria-hidden','false');}if(ready)els.loading.classList.add('ready');cameraState.ready=false;dirtyFrames=10;});
  els.leave.addEventListener('click',function(){els.ageNote.textContent='You need to be 21 or older to enter.';els.enter.focus();});
  document.addEventListener('pointerlockchange',function(){var locked=document.pointerLockElement===els.viewport;els.viewport.classList.toggle('locked',locked);if(locked){els.lookPrompt.classList.add('hidden');els.lookPrompt.classList.remove('show');els.lookPrompt.setAttribute('aria-hidden','true');}dirtyFrames=8;});
  document.addEventListener('mousemove',function(e){if(document.pointerLockElement!==els.viewport||activePanel||els.phoneOverlay.classList.contains('open'))return;cameraState.targetYaw-=e.movementX*.00235;cameraState.targetPitch=Math.max(-1.08,Math.min(1.08,cameraState.targetPitch-e.movementY*.00205));dirtyFrames=8;});
  document.addEventListener('keydown',function(e){
    if(!enteredAge)return;var k=e.key.length===1?e.key.toLowerCase():e.key;
    if(els.phoneOverlay.classList.contains('open')){if(e.key==='Escape')closePhone();return;}
    if(activePanel){if(e.key==='Escape')closePanels();return;}
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','w','a','s','d'].indexOf(k)>-1){e.preventDefault();keys[k]=true;if(!e.repeat){var f=new T.Vector3(Math.sin(cameraState.yaw),0,Math.cos(cameraState.yaw)),r=new T.Vector3(-Math.cos(cameraState.yaw),0,Math.sin(cameraState.yaw)),dx=0,dz=0;if(k==='ArrowUp'||k==='w'){dx+=f.x;dz+=f.z;}if(k==='ArrowDown'||k==='s'){dx-=f.x;dz-=f.z;}if(k==='ArrowLeft'||k==='a'){dx-=r.x;dz-=r.z;}if(k==='ArrowRight'||k==='d'){dx+=r.x;dz+=r.z;}move(dx*.14,dz*.14);}}
    if(k===' '||e.code==='Space'){e.preventDefault();if(!e.repeat)startJump();}
    if(k==='e'){e.preventDefault();checkHotspots();interact();}if(k==='b'){e.preventDefault();setOpen(els.bagPanel,true,els.bagLaunch);}if(k==='v')setVibe(!vibeOn);
    if(e.key==='Escape'&&document.pointerLockElement!==els.viewport)closePanels();dirtyFrames=5;
  });
  document.addEventListener('keyup',function(e){var k=e.key.length===1?e.key.toLowerCase():e.key;keys[k]=false;});
  els.viewport.addEventListener('click',function(){if(!enteredAge||activePanel||els.phoneOverlay.classList.contains('open')||coarse)return;if(document.pointerLockElement===els.viewport){checkHotspots();interact();}else if(els.viewport.requestPointerLock)els.viewport.requestPointerLock();});
  els.viewport.addEventListener('pointerdown',function(e){if(!coarse||e.target!==els.viewport&&e.target!==els.canvas)return;touchLook.pointer=e.pointerId;touchLook.x=e.clientX;touchLook.y=e.clientY;touchLook.moved=false;els.viewport.setPointerCapture(e.pointerId);});
  els.viewport.addEventListener('pointermove',function(e){if(!coarse||touchLook.pointer!==e.pointerId||els.phoneOverlay.classList.contains('open'))return;var dx=e.clientX-touchLook.x,dy=e.clientY-touchLook.y;if(Math.abs(dx)+Math.abs(dy)>4)touchLook.moved=true;touchLook.x=e.clientX;touchLook.y=e.clientY;cameraState.targetYaw+=dx*.006;cameraState.targetPitch=Math.max(-1.02,Math.min(1.02,cameraState.targetPitch-dy*.005));dirtyFrames=8;});
  function endTouchLook(e){if(touchLook.pointer!==e.pointerId)return;var wasTap=!touchLook.moved;touchLook.pointer=null;if(wasTap)interact();}
  els.viewport.addEventListener('pointerup',endTouchLook);els.viewport.addEventListener('pointercancel',function(e){if(touchLook.pointer===e.pointerId)touchLook.pointer=null;});
  function moveStick(e){var r=els.joystick.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),dist=Math.hypot(dx,dy),max=36;if(dist>max){dx=dx/dist*max;dy=dy/dist*max;}joy.x=dx/max;joy.y=dy/max;els.stick.style.transform='translate3d('+dx+'px,'+dy+'px,0)';dirtyFrames=4;}
  els.joystick.addEventListener('pointerdown',function(e){e.preventDefault();e.stopPropagation();joy.pointer=e.pointerId;els.joystick.setPointerCapture(e.pointerId);moveStick(e);});els.joystick.addEventListener('pointermove',function(e){if(joy.pointer===e.pointerId)moveStick(e);});function releaseStick(e){if(joy.pointer!==e.pointerId)return;joy.pointer=null;joy.x=0;joy.y=0;els.stick.style.transform='translate3d(0,0,0)';}els.joystick.addEventListener('pointerup',releaseStick);els.joystick.addEventListener('pointercancel',releaseStick);
  els.phoneLaunch.addEventListener('click',openPhone);els.phoneClose.addEventListener('click',closePhone);els.phoneOverlay.addEventListener('click',function(e){if(e.target===els.phoneOverlay)closePhone();});els.phoneVibe.addEventListener('click',function(){setVibe(!vibeOn);});document.querySelectorAll('[data-phone-tab]').forEach(function(t){t.addEventListener('click',function(){switchPhonePage(t.dataset.phoneTab);});});
  els.bagLaunch.addEventListener('click',function(){setOpen(els.bagPanel,true,els.bagLaunch);});
  document.addEventListener('click',function(e){if(e.target.closest('[data-close]')||e.target===els.scrim)closePanels();var strain=e.target.closest('.strain[data-product]');if(strain)addToBag(strain.dataset.product,strain);});
  function resize(){renderer.setPixelRatio(Math.min(devicePixelRatio||1,coarse?1.25:1.75));renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();cameraState.ready=false;dirtyFrames=10;}addEventListener('resize',resize);
  function tickClock(){var d=new Date(),time=[d.getHours(),d.getMinutes(),d.getSeconds()].map(function(n){return String(n).padStart(2,'0');}).join(':');document.getElementById('timestamp').innerHTML='03:20:27<br><span>'+time+'</span>';var h=d.getHours()%12||12,m=String(d.getMinutes()).padStart(2,'0');document.getElementById('phoneClock').textContent=h+':'+m+' '+(d.getHours()>=12?'PM':'AM');}tickClock();setInterval(tickClock,1000);switchPhonePage('lineup');setVibe(false);

  window.__gameDebug={
    getState:function(){return{ready:ready,player:{x:player.x,y:player.y,z:player.z,grounded:player.grounded,velocityY:player.velocityY},camera:{mode:'first-person',yaw:cameraState.yaw,pitch:cameraState.pitch},pointerLocked:document.pointerLockElement===els.viewport,activeHotspot:activeHotspot&&activeHotspot.id,stats:JSON.parse(JSON.stringify(stats)),open:activePanel?activePanel.id:null,phone:els.phoneOverlay.classList.contains('open'),phonePage:(document.querySelector('.phone-page.active')||{}).id||null,vibe:vibeOn,bag:Object.assign({},bag),bagTotal:bagTotal,collisions:collisions.map(function(c){return Object.assign({},c);}),hotspots:hotspots.map(function(h){return{id:h.id,label:h.label,action:h.action,x:h.x,z:h.z,r:h.r};})};},
    jump:startJump,
    setPlayer:function(x,z){if(!blocked(x,z)){player.x=x;player.z=z;cameraState.ready=false;dirtyFrames=8;return true;}return false;},
    setCamera:function(yaw,pitch){cameraState.yaw=cameraState.targetYaw=yaw;cameraState.pitch=cameraState.targetPitch=Math.max(-1.08,Math.min(1.08,pitch));cameraState.ready=false;dirtyFrames=8;return true;},
    lookAtHotspot:function(id){var h=hotspots.filter(function(item){return item.id===id;})[0];if(!h)return false;cameraState.yaw=cameraState.targetYaw=Math.atan2(h.x-player.x,h.z-player.z);cameraState.pitch=cameraState.targetPitch=Math.atan2(h.y-(PLAYER_EYE_HEIGHT+player.y),Math.hypot(h.x-player.x,h.z-player.z));cameraState.ready=false;dirtyFrames=8;return true;},
    interact:interact,
    verifyLayout:function(){var overlaps=[];for(var i=0;i<collisions.length;i++){for(var j=i+1;j<collisions.length;j++){var a=collisions[i],b=collisions[j];if(Math.abs(a.x-b.x)<(a.w+b.w)/2&&Math.abs(a.z-b.z)<(a.d+b.d)/2)overlaps.push([a.name,b.name]);}}return{clear:overlaps.length===0,overlaps:overlaps,walkLaneMinimum:1.2,footprints:collisions.map(function(c){return{name:c.name,x:c.x,z:c.z,width:c.w,depth:c.d};})};},
    activate:function(action){activate(action,els.viewport,action==='lineup'?'PRODUCT DISPLAY':action==='poster'?'POSTERS':'FLWRPWR COUNTER');return true;},
    addToBag:function(name){if(['Thai Stick','Northern Lights','Maui Wowie'].indexOf(name)<0)return false;addToBag(name,els.lineup);return true;},
    openBag:function(){setOpen(els.bagPanel,true,els.bagLaunch);return true;},
    openPhone:openPhone,switchPhonePage:switchPhonePage,closePanels:closePanels
  };
  updateCamera(.016,true);requestAnimationFrame(animate);els.enter.focus();
})();
