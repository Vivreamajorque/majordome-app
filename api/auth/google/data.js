import {session} from './_session.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 const auth=session(req);
 if(!auth)return res.status(401).json({error:'google_reconnect'});
 const service=String(req.query.service||'');
 const allowed={calendar:'calendar.readonly',drive:'drive.metadata.readonly',gmail:'gmail.readonly'};
 if(!allowed[service])return res.status(400).json({error:'unknown_service'});
 if(!auth.scope.includes(allowed[service]))return res.status(403).json({error:'permission_missing'});
 let url='';
 if(service==='calendar')url='https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=12&singleEvents=true&orderBy=startTime&timeMin='+encodeURIComponent(new Date().toISOString());
 if(service==='drive')url='https://www.googleapis.com/drive/v3/files?pageSize=12&orderBy=modifiedTime%20desc&fields=files(id,name,mimeType,modifiedTime,webViewLink)';
 if(service==='gmail')url='https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=12';
 try{
  const response=await fetch(url,{headers:{Authorization:'Bearer '+auth.access_token}});
  if(!response.ok)return res.status(502).json({error:'google_api'});
  const data=await response.json();
  if(service==='calendar')return res.status(200).json({items:(data.items||[]).map(x=>({id:x.id,title:x.summary||'Sans titre',detail:x.start?.dateTime||x.start?.date||''}))});
  if(service==='drive')return res.status(200).json({items:(data.files||[]).map(x=>({id:x.id,title:x.name,detail:x.modifiedTime||'',url:x.webViewLink||''}))});
  const items=[];
  for(const msg of (data.messages||[]).slice(0,12)){
   const detail=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/'+encodeURIComponent(msg.id)+'?format=metadata&metadataHeaders=Subject&metadataHeaders=From',{headers:{Authorization:'Bearer '+auth.access_token}});
   if(!detail.ok)continue;
   const mail=await detail.json(),headers=mail.payload?.headers||[];
   items.push({id:msg.id,title:headers.find(h=>h.name==='Subject')?.value||'Sans objet',detail:headers.find(h=>h.name==='From')?.value||''});
  }
  return res.status(200).json({items});
 }catch{return res.status(502).json({error:'google_api'})}
}