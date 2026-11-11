// Nova — RideLine's riding assistant. Reads the live map (route, turns, traffic, hazards, speed, weather,
// nearby help, group) and answers in English or Hindi, by voice or text. Unknown questions (or all, if chosen)
// go to the rider's own Nova AI API together with the map context.
const NOVA={lang:SET.get('novaLang','auto'),url:SET.get('novaUrl',''),tok:SET.get('novaTok',''),all:SET.get('novaAll',false),upd:SET.get('novaUpd',true),lastKm:0,busy:false};
const HINGLISH=/\b(kya|kitna|kitni|kitne|kahan|kaha|kidhar|aage|peeche|batao|bata|bolo|chalo|mujhe|mera|meri|mere|hai|hain|kaise|kab|pahunch\w*|raasta|rasta|paas|nazdeek|mausam|barish|baarish|ruko|shuru|band|madad|bachao|mod|mudna|dikhao|wala|wali|kaisa|kaisi|tez|dheere|dost|thana|aspatal)\b/i;
function langOf(q){if(NOVA.lang!=='auto')return NOVA.lang;return /[ऀ-ॿ]/.test(q)||HINGLISH.test(q)?'hi':'en'}
const dHi=m=>m<1000?`${Math.max(10,Math.round(m/10)*10)} मीटर`:`${(m/1000).toFixed(m<10000?1:0)} किलोमीटर`;
const tHi=s=>{s=Math.round(s);const h=Math.floor(s/3600),m=Math.max(1,Math.floor(s%3600/60));return h?`${h} घंटे ${m} मिनट`:`${m} मिनट`};
const TURN_HI={left:'बाएं मुड़ें',right:'दाएं मुड़ें','slight left':'हल्का बाएं रहें','slight right':'हल्का दाएं रहें','sharp left':'तेज़ बाएं मुड़ें','sharp right':'तेज़ दाएं मुड़ें',uturn:'यू-टर्न लें',straight:'सीधे चलते रहें'};
function turnHi(s){if(s.type==='arrive')return 'आप अपनी मंज़िल पर पहुंच जाएंगे';const road=(s.text.match(/onto (.+)$/i)||[])[1];
 if(s.type==='roundabout'){const mm=s.text.match(/(\d+)(?:st|nd|rd|th)?\s+exit|exit\s+(\d+)/i),ex=mm&&(mm[1]||mm[2]);return `गोल चक्कर से ${ex?ex+' नंबर ':''}निकास लें`+(road?`, ${road} पर`:'')}return (TURN_HI[s.mod]||'सीधे चलें')+(road?`, ${road} पर`:'')}
const HZ_HI={bump:'स्पीड ब्रेकर',school:'स्कूल ज़ोन',camera:'स्पीड कैमरा',signal:'ट्रैफिक सिग्नल',curve:'तेज़ मोड़',crossing:'ज़ेबरा क्रॉसिंग',jam:'ट्रैफिक जाम',closure:'सड़क बंद',works:'सड़क का काम'};
const HZ_EN={bump:'speed breaker',school:'school zone',camera:'speed camera',signal:'traffic signal',curve:'sharp curve',crossing:'zebra crossing',jam:'traffic jam',closure:'road closure',works:'road works'};
const along=()=>route?(route.along||0):0;
const nextStep=()=>route?route.steps.find((s,i)=>i>0&&s.cum>along()+3)||route.steps[route.steps.length-1]:null;

// ---------- what Nova can answer from the map ----------
const INTENTS=[
 {k:'sos',re:/\b(help me|emergency|sos|bachao|madad)\b|मदद|बचाओ|इमरजेंसी/i,run:L=>{openSOS(false);return L('Opening emergency help. Tap Call 112 or send your location.','इमरजेंसी मदद खोल रही हूं। 112 पर कॉल करें या अपनी लोकेशन भेजें।')}},
 {k:'start',re:/\b(start (the )?ride|start navigation|ride shuru|shuru karo|chalo shuru)\b|शुरू करो|राइड शुरू/i,run:L=>{if(riding)return L('You are already riding.','राइड पहले से चल रही है।');rememberTrip();startRide();return L(route?`Ride started to ${to.name}. ${route.steps[0].text}.`:'Free ride started.',route?`${to.name} की राइड शुरू। ${turnHi(route.steps[1]||route.steps[0])}।`:'फ्री राइड शुरू।')}},
 {k:'stop',re:/\b(stop (the )?ride|end ride|ride (band|khatam)|band karo)\b|राइड बंद|रोको/i,run:L=>{if(!riding)return L('No ride is running.','अभी कोई राइड नहीं चल रही।');const d=stats.dist;stopRide();return L(`Ride stopped. You rode ${(d/1000).toFixed(1)} km.`,`राइड बंद। आपने ${(d/1000).toFixed(1)} किलोमीटर चलाया।`)}},
 {k:'place',re:/petrol|fuel|pump|hospital|aspatal|clinic|police|thana|पेट्रोल|पंप|अस्पताल|हॉस्पिटल|पुलिस|थाना/i,run:async(L,q)=>{
   const kind=/hospital|aspatal|clinic|अस्पताल|हॉस्पिटल/i.test(q)?'hospital':/police|thana|पुलिस|थाना/i.test(q)?'police':'fuel';
   if(!me)return L('I need your location first. Turn on GPS.','पहले आपकी लोकेशन चाहिए। GPS चालू करें।');
   if(!HZ.help.length){helpQ=0;await loadHelp()}
   const h=HZ.help.filter(x=>kind==='hospital'?(x.a==='hospital'||x.a==='clinic'):x.a===kind).map(x=>({...x,d:hav(me,x.ll)})).sort((a,b)=>a.d-b.d)[0];
   const nm={fuel:['petrol pump','पेट्रोल पंप'],hospital:['hospital','अस्पताल'],police:['police station','पुलिस स्टेशन']}[kind];
   if(!h)return L(`I couldn't find a ${nm[0]} within 6 km.`,`6 किलोमीटर में कोई ${nm[1]} नहीं मिला।`);
   const go=/take me|navigate|go to|route|le chalo|chalo|le jao|ले चलो|चलो|रास्ता/i.test(q);if(go)goTo(h);
   return L(`Nearest ${nm[0]}: ${h.name}, ${fmtD(h.d)} away.${go?' Route is ready.':' Say "take me there" to go.'}`,`सबसे पास ${nm[1]}: ${h.name}, ${dHi(h.d)} दूर।${go?' रास्ता तैयार है।':' जाने के लिए बोलें "ले चलो"।'}`)}},
 {k:'traffic',re:/traffic|jam\b|ट्रैफिक|जाम/i,run:(L,q)=>{
   if(/\b(on|chalu|off|band)\b|चालू|बंद/i.test(q)&&typeof TTL!=='undefined'){TTL.on=!/\b(off|band)\b|बंद/i.test(q);SET.set('traffic',TTL.on);trafficLayer();return L(`Live traffic ${TTL.on?'on':'off'}.`,`लाइव ट्रैफिक ${TTL.on?'चालू':'बंद'}।`)}
   if(!route)return L(ttKey()?'Plan a route and I will check traffic on it.':'Live traffic needs a TomTom key. Add it in the Safety tab.',ttKey()?'रास्ता चुनें, मैं उस पर ट्रैफिक बताऊंगी।':'लाइव ट्रैफिक के लिए Safety टैब में TomTom key डालें।');
   const jams=(route.traffic||[]).filter(t=>t.cum+t.len>along());
   if(route.src!=='tomtom')return L('Live traffic is not available for this route. Add a TomTom key in Safety to get it.','इस रास्ते पर लाइव ट्रैफिक नहीं है। Safety में TomTom key डालें।');
   if(!jams.length)return L(`Traffic looks clear all the way to ${to.name}.`,`${to.name} तक ट्रैफिक साफ़ है।`);
   const j=jams[0],d=Math.max(0,j.cum-along());
   return L(`${jams.length} traffic ${jams.length>1?'jams':'jam'} on your route. The next is in ${fmtD(d)}, about ${fmtD(j.len)} long${j.delay>=60?`, adding ${Math.round(j.delay/60)} minutes`:''}. Total delay ${Math.round((route.delay||0)/60)} minutes.`,
    `रास्ते में ${jams.length} जगह जाम है। अगला ${dHi(d)} बाद, लगभग ${dHi(j.len)} लंबा${j.delay>=60?`, ${Math.round(j.delay/60)} मिनट की देरी`:''}। कुल देरी ${Math.round((route.delay||0)/60)} मिनट।`)}},
 {k:'style',re:/\b(satellite|voyager|night|dark|street)\b.*\b(map|mode|dikhao|lagao)\b|\b(map|naksha)\b.*\b(satellite|voyager|night|dark|street)\b/i,run:(L,q)=>{const k=/satellite/i.test(q)?'sat':/voyager/i.test(q)?'voyager':/night|dark/i.test(q)?'dark':'street';setLayer(k);return L(`Switched to the ${LAYERS[k].name} map.`,`${LAYERS[k].name} मैप लगा दिया।`)}},
 {k:'hazard',re:/hazard|danger|khatra|breaker|camera|school|curve|गड्ढ|ब्रेकर|खतरा|कैमरा/i,run:L=>{if(!route)return L('Plan a route and I will check it for hazards.','रास्ता चुनें, मैं खतरे बताऊंगी।');
   const hz=HZ.items.filter(h=>h.cum>along()&&h.t!=='crossing'&&h.t!=='signal').slice(0,3);if(!hz.length)return L('No hazards found ahead on this route.','आगे रास्ते में कोई खतरा नहीं मिला।');
   return L('Ahead: '+hz.map(h=>`${HZ_EN[h.t]} in ${fmtD(h.cum-along())}`).join(', ')+'.','आगे: '+hz.map(h=>`${dHi(h.cum-along())} पर ${HZ_HI[h.t]}`).join(', ')+'।')}},
 {k:'speed',re:/speed(?!\s*(breaker|camera|bump))|limit|kitni tez|kitna tez|raftaar|how fast|रफ्तार|लिमिट|स्पीड(?!\s*ब्रेकर)/i,run:L=>{const v=Math.round(stats.speed*3.6),lim=SPD.limit||OPT.max,over=v>lim+3;
   return L(`You are doing ${v} km/h. ${SPD.limit?'The speed limit here is':'Your speed alert is'} ${lim}.${over?' Please slow down.':''}`,`आपकी स्पीड ${v} किलोमीटर प्रति घंटा है। ${SPD.limit?'यहां की स्पीड लिमिट':'आपका स्पीड अलर्ट'} ${lim} है।${over?' कृपया धीरे चलें।':''}`)}},
 {k:'eta',re:/\beta\b|kab pahunch|kitni der|kitna (door|baki|bacha)|how long|time left|how far|distance|remaining|doori|पहुंच|कितनी देर|कितना दूर|बाकी/i,run:L=>{
   if(!route)return L('No route yet. Tell me where to go or pick a destination.','अभी कोई रास्ता नहीं है। मंज़िल चुनें।');
   const rem=Math.max(0,route.dist-along()),v=route.dist/route.dur,secs=rem/v,eta=clock(new Date(Date.now()+secs*1000));
   return L(`You'll reach ${to.name} around ${eta}. ${fmtD(rem)} and ${fmtT(secs)} left.${route.delay>=60?` Traffic adds ${Math.round(route.delay/60)} minutes.`:''}`,`आप ${to.name} लगभग ${eta} तक पहुंचेंगे। ${dHi(rem)} और ${tHi(secs)} बाकी हैं।${route.delay>=60?` ट्रैफिक से ${Math.round(route.delay/60)} मिनट की देरी है।`:''}`)}},
 {k:'turn',re:/next turn|which way|agla mod|kahan mud|kidhar mud|kidhar jana|kahan jana|\bmod\b|\bturn\b|मोड़|मुड़|किधर/i,run:L=>{const s=nextStep();if(!s)return L('No route yet.','अभी कोई रास्ता नहीं है।');const d=Math.max(0,s.cum-along());
   const n=route.steps[route.steps.indexOf(s)+1];return L(`In ${fmtD(d)}, ${s.text}.${n&&n.cum-s.cum<400?` Then ${n.text.charAt(0).toLowerCase()+n.text.slice(1)}.`:''}`,`${dHi(d)} बाद ${turnHi(s)}।${n&&n.cum-s.cum<400?` फिर ${turnHi(n)}।`:''}`)}},
 {k:'weather',re:/weather|rain|wind|mausam|baarish|barish|garmi|thand|hawa|मौसम|बारिश|हवा|गर्मी|ठंड/i,run:L=>{const t=$('temp').textContent,r=$('rain').textContent,w=$('windSpd').textContent,wd=$('windChip').textContent;
   if(t==='—')return L('Weather is loading. Plan a route or turn on location.','मौसम लोड हो रहा है।');
   return L(`It's ${t}, ${r} chance of rain, wind ${w} km/h (${wd}). ${$('tipText').textContent}`,`तापमान ${t}, बारिश की संभावना ${r}, हवा ${w} किलोमीटर प्रति घंटा।${parseInt(r)>=50?' बारिश हो सकती है, रेन गियर साथ रखें।':''}`)}},
 {k:'where',re:/where am i|my location|main kahan|kahan hoon|kahan hu|मैं कहां|मेरी लोकेशन/i,run:async L=>{if(!me)return L('I need your location. Turn on GPS.','लोकेशन के लिए GPS चालू करें।');
   try{const j=await (await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&accept-language=en&lat=${me[0]}&lon=${me[1]}&zoom=17`)).json(),a=j.address||{},place=[a.road,a.suburb||a.neighbourhood,a.city||a.town||a.village].filter(Boolean).join(', ');
    return L(`You are on ${place||'an unnamed road'}. GPS accuracy ${Math.round(myAcc)} metres.`,`आप ${place||'एक अनाम सड़क'} पर हैं। GPS सटीकता ${Math.round(myAcc)} मीटर।`)}catch(_){return L(`You are at ${me[0].toFixed(5)}, ${me[1].toFixed(5)}.`,`आपकी लोकेशन ${me[0].toFixed(5)}, ${me[1].toFixed(5)} है।`)}}},
 {k:'group',re:/friend|dost|group|दोस्त|ग्रुप/i,run:L=>{if(!G.room)return L('You are not in a group ride. Open the Group tab to create or join one.','आप किसी ग्रुप राइड में नहीं हैं। Group टैब खोलें।');
   const o=Object.values(G.members).filter(m=>m.id!==G.id&&m.lat!=null);if(!o.length)return L('No friends are sharing their location yet.','अभी कोई दोस्त लोकेशन शेयर नहीं कर रहा।');
   return L(o.map(m=>`${m.name} is ${fmtD(hav(me||[m.lat,m.lng],[m.lat,m.lng]))} away${m.riding?`, riding at ${m.spd} km/h`:''}`).join('. ')+'.',o.map(m=>`${m.name} ${dHi(hav(me||[m.lat,m.lng],[m.lat,m.lng]))} दूर${m.riding?`, ${m.spd} की स्पीड पर`:''}`).join('। ')+'।')}},
 {k:'ahead',re:/what'?s ahead|aage kya|aage|update|summary|batao|status|आगे|बताओ/i,run:L=>novaBrief(L,true)},
 {k:'hello',re:/^\s*(hi|hello|hey|namaste|hey nova|hi nova)\b|नमस्ते|हेलो/i,run:L=>L(`Hi ${SET.get('rname','')||'rider'}! Ask me about the next turn, traffic, ETA, speed, weather or the nearest petrol pump.`,`नमस्ते ${SET.get('rname','')||'राइडर'}! अगला मोड़, ट्रैफिक, कब पहुंचेंगे, स्पीड, मौसम या पास का पेट्रोल पंप पूछिए।`)},
 {k:'help',re:/what can you do|help|kya kar sakti|क्या कर सकती/i,run:L=>L('I read the map for you: next turn, ETA, traffic, hazards, speed limit, weather, nearest petrol pump, hospital or police, where you are, and your friends in a group ride. I can also start or stop the ride and open SOS.','मैं आपके लिए मैप पढ़ती हूं: अगला मोड़, कब पहुंचेंगे, ट्रैफिक, खतरे, स्पीड लिमिट, मौसम, पास का पेट्रोल पंप, अस्पताल या पुलिस, आप कहां हैं, और ग्रुप में दोस्त। राइड शुरू/बंद और SOS भी कर सकती हूं।')},
];
function novaBrief(L,full){L=L||((e,h)=>NOVA.lang==='hi'?h:e);if(!route)return L(riding?`You have ridden ${(stats.dist/1000).toFixed(1)} km at ${Math.round(stats.speed*3.6)} km/h.`:'Pick a destination and I will brief you on the route.',riding?`आपने ${(stats.dist/1000).toFixed(1)} किलोमीटर चलाया, स्पीड ${Math.round(stats.speed*3.6)}।`:'मंज़िल चुनें, मैं रास्ते की जानकारी दूंगी।');
 const s=nextStep(),d=Math.max(0,s.cum-along()),rem=Math.max(0,route.dist-along()),secs=rem/(route.dist/route.dur),hz=HZ.items.find(h=>h.cum>along()&&!/crossing|signal|jam|closure|works/.test(h.t)),jam=(route.traffic||[]).find(t=>t.cum+t.len>along());
 return L(`${fmtD(rem)} to ${to.name}, about ${fmtT(secs)}. Next: in ${fmtD(d)}, ${s.text}.${hz?` Watch for a ${HZ_EN[hz.t]} in ${fmtD(hz.cum-along())}.`:''}${jam?` Traffic jam in ${fmtD(Math.max(0,jam.cum-along()))}.`:route.src==='tomtom'?' Traffic is clear.':''}`,
  `${to.name} तक ${dHi(rem)}, लगभग ${tHi(secs)}। ${dHi(d)} बाद ${turnHi(s)}।${hz?` ${dHi(hz.cum-along())} पर ${HZ_HI[hz.t]} है, ध्यान दें।`:''}${jam?` ${dHi(Math.max(0,jam.cum-along()))} बाद जाम है।`:route.src==='tomtom'?' ट्रैफिक साफ़ है।':''}`)}

// ---------- your own Nova AI ----------
function novaContext(){const a=along(),c={time:new Date().toISOString(),app:'RideLine',riding,vehicle:profile==='car'?'motorbike':'bicycle',
 position:me?{lat:+me[0].toFixed(6),lng:+me[1].toFixed(6),accuracy_m:Math.round(myAcc)}:null,speed_kmh:Math.round(stats.speed*3.6),heading_deg:Math.round(heading),speed_limit_kmh:SPD.limit||null,
 ride:{distance_m:Math.round(stats.dist),elapsed_s:riding?Math.round((Date.now()-stats.t0)/1000):0,max_speed_kmh:Math.round(stats.max*3.6)},destination:to?{name:to.name,lat:+to.lat,lng:+to.lng}:null,map_style:layerKey};
 if(route){c.route={source:route.src||'osrm',total_m:Math.round(route.dist),remaining_m:Math.round(Math.max(0,route.dist-a)),duration_s:Math.round(route.dur),traffic_delay_s:route.delay||0,
  next_turns:route.steps.filter(s=>s.cum>a).slice(0,5).map(s=>({in_m:Math.round(s.cum-a),instruction:s.text})),
  traffic:(route.traffic||[]).filter(t=>t.cum+t.len>a).map(t=>({in_m:Math.max(0,Math.round(t.cum-a)),length_m:Math.round(t.len),type:t.cat,delay_s:t.delay}))};
  c.hazards_ahead=HZ.items.filter(h=>h.cum>a).slice(0,10).map(h=>({type:HZ_EN[h.t]||h.t,in_m:Math.round(h.cum-a)}))}
 c.weather={temperature:$('temp').textContent,rain_chance:$('rain').textContent,wind_kmh:$('windSpd').textContent,wind:$('windChip').textContent};
 c.nearby=HZ.help.slice(0,8).map(h=>({type:h.kind,name:h.name,distance_m:Math.round(me?hav(me,h.ll):h.d)}));
 if(G.room)c.group=Object.values(G.members).filter(m=>m.id!==G.id).map(m=>({name:m.name,distance_m:me&&m.lat!=null?Math.round(hav(me,[m.lat,m.lng])):null,speed_kmh:m.spd,riding:!!m.riding}));
 return c}
function pickAnswer(body){if(body==null)return null;if(typeof body==='string'){try{return pickAnswer(JSON.parse(body))}catch(_){return body.trim()||null}}
 if(Array.isArray(body))return pickAnswer(body[0]);
 const v=body.answer||body.reply||body.response||body.text||body.message||body.output||body.result||body.content||(body.data&&pickAnswer(body.data))||(body.choices&&body.choices[0]&&((body.choices[0].message&&body.choices[0].message.content)||body.choices[0].text))||(body.candidates&&body.candidates[0]&&body.candidates[0].content&&body.candidates[0].content.parts&&body.candidates[0].content.parts.map(p=>p.text).join(' '));
 return typeof v==='string'?v.trim():v&&typeof v==='object'?pickAnswer(v):null}
const NHTTP={};let nhttpId=0;
function nativePost(url,body,auth){return new Promise(res=>{const id='h'+(++nhttpId);NHTTP[id]=res;NovaNative.http(id,url,body,auth||'');setTimeout(()=>{if(NHTTP[id]){delete NHTTP[id];res({code:0,text:'timeout'})}},80000)})}
async function askApi(q,lang){if(!NOVA.url)return null;
 const body=JSON.stringify({question:q,message:q,prompt:q,query:q,language:lang,context:novaContext()});
 try{let code,text;
  if(window.NovaNative&&NovaNative.http){const r=await nativePost(NOVA.url,body,NOVA.tok);code=r.code;text=r.text}
  else{const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),75000);
   try{const r=await fetch(NOVA.url,{method:'POST',signal:ctl.signal,headers:{'Content-Type':'application/json',...(NOVA.tok?{Authorization:'Bearer '+NOVA.tok}:{})},body});code=r.status;text=await r.text()}
   catch(e){return {error:e.name==='AbortError'?'no reply in 75 s':(/fetch|network/i.test(e.message)?'blocked or offline (check CORS on your server)':e.message)}}finally{clearTimeout(t)}}
  if(!code)return {error:text==='timeout'?'no reply in 75 s':text};
  if(code>=400)return {error:`HTTP ${code}${text?': '+String(text).slice(0,80):''}`};
  const ans=pickAnswer(text);return ans?ans:{error:'reply had no answer text'}}
 catch(e){return {error:e.message}}}

// ---------- Google Gemini ----------
const gemKey=()=>SET.get('gemKey','')||(window.RIDE_CONFIG&&RIDE_CONFIG.geminiKey)||'';
const gemModel=()=>SET.get('gemModel','')||(window.RIDE_CONFIG&&RIDE_CONFIG.geminiModel)||'gemini-2.5-flash';
NOVA.hist=[];
async function askGemini(q,lang){const k=gemKey();if(!k)return null;const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),20000);
 const sys=`You are Nova, a friendly riding assistant inside RideLine, a motorbike navigation app used in India. Reply in ${lang==='hi'?'simple Hindi written in Devanagari (English words like road names may stay in English)':'simple English'}, in 1 to 3 short sentences that sound natural when spoken aloud to someone riding. Use the live ride data you are given (route, turns, traffic, hazards, speed, weather, nearby places, friends) whenever it is relevant, and do not invent data that is not there. Put safety first: never encourage speeding or using the phone while riding, and suggest stopping safely for anything that needs attention. No markdown, no lists, no emojis.`;
 const contents=NOVA.hist.slice(-6).map(h=>({role:h.role,parts:[{text:h.text}]}));
 contents.push({role:'user',parts:[{text:`${q}\n\n[Live ride data, JSON]\n${JSON.stringify(novaContext())}`}]});
 try{const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(gemModel())}:generateContent?key=${encodeURIComponent(k)}`,{method:'POST',signal:ctl.signal,headers:{'Content-Type':'application/json'},
   body:JSON.stringify({systemInstruction:{parts:[{text:sys}]},contents,generationConfig:{temperature:.5,maxOutputTokens:300}})});
  const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error((j.error&&j.error.message)||('HTTP '+r.status));
  const txt=((j.candidates&&j.candidates[0]&&j.candidates[0].content&&j.candidates[0].content.parts)||[]).map(p=>p.text||'').join(' ').replace(/[*#_`]+/g,'').replace(/\s+/g,' ').trim();
  if(!txt)throw new Error(j.promptFeedback&&j.promptFeedback.blockReason?'blocked: '+j.promptFeedback.blockReason:'empty answer');
  NOVA.hist.push({role:'user',text:q},{role:'model',text:txt});NOVA.hist=NOVA.hist.slice(-12);return txt}
 catch(e){return {error:e.name==='AbortError'?'timeout':e.message}}finally{clearTimeout(t)}}

// ---------- conversation ----------
function bubble(cls,text,note){const d=document.createElement('div');d.className='nm '+cls;d.textContent=text;if(note){const s=document.createElement('small');s.textContent=note;d.append(s)}$('novaChat').append(d);$('novaChat').scrollTop=1e6;return d}
async function ask(q){q=String(q||'').trim();if(!q||NOVA.busy)return;NOVA.busy=true;openNova();bubble('me',q);const lang=langOf(q),L=(e,h)=>lang==='hi'?h:e;
 const wait=bubble('ai typing','');document.body.classList.add('novathink');let ans=null,src='';const wake=setTimeout(()=>{if(wait.isConnected)wait.textContent=L('Waking up your Nova AI… (free servers can take up to a minute)','आपका Nova AI जाग रहा है… (फ्री सर्वर में एक मिनट तक लग सकता है)')},5000);
 try{const ai=NOVA.url||gemKey(),advice=/\b(why|should|better|best|suggest|advice|recommend|plan|explain|compare|kyun|kyu|behtar|accha|kya karun|kya karu|sujhav|salah)\b|बेहतर|अच्छा|क्यों|सलाह|सुझाव|क्या करूं/i.test(q),
  it=(NOVA.all||advice)&&ai?null:INTENTS.find(i=>i.re.test(q));let err='';
  if(it){ans=await it.run(L,q);src='Nova · from the map'}
  else{if(NOVA.url){const r=await askApi(q,lang);if(typeof r==='string'){ans=r;src='Your Nova AI'}else if(r&&r.error)err='Nova AI: '+r.error}
   if(!ans&&gemKey()){const r=await askGemini(q,lang);if(typeof r==='string'){ans=r;src='Gemini AI · with live map data'}else if(r&&r.error)err=(err?err+' · ':'')+'Gemini: '+r.error}
   if(!ans&&err){const it2=INTENTS.find(i=>i.re.test(q));ans=it2?await it2.run(L,q):L(`I couldn't reach the AI (${err}).`,`AI से जुड़ नहीं पाई (${err})।`);src=it2?`⚠ ${err} — answered from the map`:''}}
  if(!ans){ans=L("I didn't catch that. Try: what's ahead, next turn, ETA, traffic, speed, weather, or nearest petrol pump.",'समझ नहीं पाई। पूछें: आगे क्या है, अगला मोड़, कब पहुंचूंगा, ट्रैफिक, स्पीड, मौसम या पास का पेट्रोल पंप।')}}
 catch(e){ans=L('Something went wrong. Please try again.','कुछ गड़बड़ हुई, फिर से पूछें।')}
 clearTimeout(wake);wait.remove();document.body.classList.remove('novathink');bubble('ai',ans,src);say(ans,lang==='hi'?'hi-IN':'en-IN',true);NOVA.busy=false}
function chips(){const hi=NOVA.lang==='hi';$('novaChips').innerHTML=(hi?['आगे क्या है?','अगला मोड़','कब पहुंचूंगा?','ट्रैफिक कैसा है?','मेरी स्पीड','मौसम','पास का पेट्रोल पंप','मैं कहां हूं?']:["What's ahead?",'Next turn','ETA','Traffic','My speed','Weather','Nearest petrol pump','Where am I?']).map(c=>`<button type="button">${c}</button>`).join('')}
function openNova(){if(!$('nova').hidden)return;$('nova').hidden=false;document.body.classList.add('novaon');if(!$('novaChat').children.length){const L=(e,h)=>NOVA.lang==='hi'?h:e;bubble('ai',L(`Hi ${SET.get('rname','')||'rider'}, I'm Nova. I read the map for you — ask me anything about your ride.`,`नमस्ते ${SET.get('rname','')||'राइडर'}, मैं Nova हूं। मैं आपके लिए मैप पढ़ती हूं — राइड के बारे में कुछ भी पूछें।`),'Tap the mic and speak, or type')}}
function closeNova(){$('nova').hidden=true;document.body.classList.remove('novaon')}
$('novaOrb').onclick=()=>{openNova();setTimeout(listen,200)};$('novaClose').onclick=closeNova;
$('novaChips').onclick=e=>{const b=e.target.closest('button');if(b)ask(b.textContent)};
$('novaForm').onsubmit=e=>{e.preventDefault();const q=$('novaQ').value;$('novaQ').value='';ask(q)};
$('novaLang').onclick=e=>{const b=e.target.closest('button');if(!b)return;NOVA.lang=b.dataset.l;SET.set('novaLang',NOVA.lang);document.querySelectorAll('#novaLang button').forEach(x=>x.classList.toggle('on',x===b));chips()};
document.querySelectorAll('#novaLang button').forEach(x=>x.classList.toggle('on',x.dataset.l===NOVA.lang));chips();
// settings
$('novaSet').onclick=()=>{$('novaSettings').hidden=!$('novaSettings').hidden};
$('novaUrl').value=NOVA.url;$('novaAll').checked=NOVA.all;$('novaUpd').checked=NOVA.upd;$('novaTok').placeholder=NOVA.tok?'Token saved ••••':'API token (optional)';
$('novaSave').onclick=()=>{const u=$('novaUrl').value.trim();if(u&&!/^https:\/\/|^http:\/\/(localhost|127\.0\.0\.1)/.test(u)){toast('Use an https:// address for your Nova AI');return}
 NOVA.url=u;SET.set('novaUrl',u);if($('novaTok').value){NOVA.tok=$('novaTok').value.trim();SET.set('novaTok',NOVA.tok);$('novaTok').value='';$('novaTok').placeholder='Token saved ••••'}
 NOVA.all=$('novaAll').checked;SET.set('novaAll',NOVA.all);if($('gemKey').value){SET.set('gemKey',$('gemKey').value.trim());$('gemKey').value=''}SET.set('gemModel',$('gemModel').value.trim());gemUI();NOVA.upd=$('novaUpd').checked;SET.set('novaUpd',NOVA.upd);toast('Nova settings saved');$('novaSettings').hidden=true};
$('novaTest').onclick=async()=>{toast('Testing… free servers may take up to a minute to wake');if(gemKey()&&!$('novaUrl').value.trim()){toast('Testing Gemini…');const g=await askGemini('Say hello to the rider in one short sentence.','en');toast(typeof g==='string'?'Gemini connected: '+g.slice(0,80):'Gemini error: '+(g&&g.error));return}const u=$('novaUrl').value.trim()||NOVA.url;if(!u){toast('Add your Nova AI address first');return}const old=NOVA.url;NOVA.url=u;const r=await askApi('Say hello in one short sentence.','en');NOVA.url=old;
 bubble('ai',r&&typeof r==='string'?'✅ Connected to your Nova AI: '+r.slice(0,160):'❌ Could not connect: '+(r&&r.error||'no answer'),'Connection test');openNova()};
// ---------- voice input ----------
const SRec=window.SpeechRecognition||window.webkitSpeechRecognition;
function listen(){const lang=NOVA.lang==='en'?'en-IN':'hi-IN';
 try{if(window.NovaNative&&NovaNative.listen){document.body.classList.add('novalisten');NovaNative.listen(lang);return}}catch(_){}
 if(!SRec){$('novaQ').focus();return}
 try{const r=new SRec();r.lang=lang;r.interimResults=false;r.maxAlternatives=1;r.onresult=e=>ask(e.results[0][0].transcript);
  r.onerror=e=>{if(e.error!=='no-speech'&&e.error!=='aborted')toast('Voice input: '+e.error)};r.onend=()=>document.body.classList.remove('novalisten');document.body.classList.add('novalisten');r.start()}catch(_){document.body.classList.remove('novalisten')}}
$('novaMic').onclick=listen;
window.__novaNative={onResult(t){document.body.classList.remove('novalisten');if(t)ask(t)},onError(m){document.body.classList.remove('novalisten');if(m)toast(m)},onListening(){document.body.classList.add('novalisten')}};
// ---------- proactive: brief at ride start, update every 5 km ----------
const _startRide=startRide;startRide=async function(){await _startRide();NOVA.lastKm=0;if(route)setTimeout(()=>{if(riding)say(novaBrief(),NOVA.lang==='hi'?'hi-IN':'en-IN')},4500)};
setInterval(()=>{if(!riding||!NOVA.upd)return;const km=Math.floor(stats.dist/5000)*5;if(km>NOVA.lastKm){NOVA.lastKm=km;const L=(e,h)=>NOVA.lang==='hi'?h:e;
 say(L(`${km} kilometres done. `,`${km} किलोमीटर पूरे। `)+novaBrief(),NOVA.lang==='hi'?'hi-IN':'en-IN')}},5000);

function gemUI(){const k=gemKey();$('gemKey').placeholder=k?'Gemini key saved ••••'+k.slice(-4):'Gemini API key';$('gemModel').value=SET.get('gemModel','');$('gemModel').placeholder='Model: '+gemModel();
 $('novaSub').textContent=k?'Riding assistant · Gemini AI + live map':'Your riding assistant · reads the map for you'}
gemUI();

// save Nova settings as soon as they change (no need to press Save)
['novaUrl','novaAll','novaUpd','gemModel'].forEach(id=>$(id).addEventListener('change',()=>{const u=$('novaUrl').value.trim();if(u&&!/^https:\/\//.test(u))return;NOVA.url=u;SET.set('novaUrl',u);NOVA.all=$('novaAll').checked;SET.set('novaAll',NOVA.all);NOVA.upd=$('novaUpd').checked;SET.set('novaUpd',NOVA.upd);SET.set('gemModel',$('gemModel').value.trim());toast('Saved')}));
window.__novaNative.onHttp=(id,code,text)=>{const r=NHTTP[id];if(r){delete NHTTP[id];r({code,text})}};
