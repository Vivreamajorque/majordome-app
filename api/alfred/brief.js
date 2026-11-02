import {session} from '../auth/google/_session.js';

const google=async(url,token)=>{
  const r=await fetch(url,{headers:{Authorization:'Bearer '+token}});
  if(!r.ok)throw new Error('google_api');
  return r.json();
};
const mailClass=(mail)=>{
  const text=((mail.title||'')+' '+(mail.snippet||'')+' '+(mail.from||'')).toLowerCase();
  const urgent=['urgent','important','action requise','action required','deadline','échéance','rappel','reminder','payment due','paiement','facture','invoice','contrat','signature','devis','validation','approuver','approve','réponse attendue','response required','avant vendredi','avant lundi'];
  const auto=['newsletter','unsubscribe','désabonner','promotion','offre','soldes','marketing','digest','no-reply','noreply','notification','automatique','weekly','hebdo'];
  const meeting=['meeting','réunion','rdv','rendez-vous','calendar','agenda','invitation'];
  let score=10,key='read',label='À lire';
  if(auto.some(k=>text.includes(k))){score=2;key='auto';label='Automatique'}
  if(meeting.some(k=>text.includes(k))){score=Math.max(score,55);key='important';label='Important'}
  if(urgent.some(k=>text.includes(k))){score=Math.max(score,80);key='urgent';label='Urgent'}
  return {...mail,score,key,label}
};
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  const auth=session(req);
  if(!auth?.access_token)return res.status(401).json({error:'google_reconnect'});
  try{
    const [cal,glist,drive]=await Promise.all([
      google('https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=12&singleEvents=true&orderBy=startTime&timeMin='+encodeURIComponent(new Date().toISOString()),auth.access_token),
      google('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=40',auth.access_token),
      google('https://www.googleapis.com/drive/v3/files?pageSize=8&orderBy=modifiedTime%20desc&fields=files(id,name,mimeType,modifiedTime,webViewLink)',auth.access_token)
    ]);
    // Fetch message metadata in bounded parallel batches instead of 40 sequential requests.
    const ids=(glist.messages||[]).slice(0,40);
    const mails=[];
    for(let i=0;i<ids.length;i+=8){
      const batch=await Promise.allSettled(ids.slice(i,i+8).map(async msg=>{
        const m=await google('https://gmail.googleapis.com/gmail/v1/users/me/messages/'+encodeURIComponent(msg.id)+'?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date',auth.access_token);
        const h=m.payload?.headers||[];
        return mailClass({
          id:msg.id,
          title:h.find(x=>x.name==='Subject')?.value||'Sans objet',
          from:h.find(x=>x.name==='From')?.value||'',
          date:h.find(x=>x.name==='Date')?.value||'',
          snippet:m.snippet||''
        });
      }));
      for(const result of batch)if(result.status==='fulfilled')mails.push(result.value);
    }
    mails.sort((a,b)=>b.score-a.score);
    const counts={
      total:mails.length,
      urgent:mails.filter(m=>m.key==='urgent').length,
      important:mails.filter(m=>m.key==='important').length,
      read:mails.filter(m=>m.key==='read').length,
      automatic:mails.filter(m=>m.key==='auto').length
    };
    const events=(cal.items||[]).map(x=>({id:x.id,title:x.summary||'Sans titre',start:x.start?.dateTime||x.start?.date||''}));
    const today=new Date().toISOString().slice(0,10);
    const todayEvents=events.filter(e=>String(e.start).slice(0,10)===today);
    const importantDocs=(drive.files||[]).slice(0,4).map(x=>({id:x.id,title:x.name,url:x.webViewLink||'',modifiedTime:x.modifiedTime||''}));
    const attention=mails.filter(m=>m.score>=55).slice(0,3).map(m=>({type:'mail',title:m.title,detail:m.from,label:m.label}));
    if(todayEvents[0])attention.push({type:'agenda',title:todayEvents[0].title,detail:todayEvents[0].start,label:'Rendez-vous'});
    return res.status(200).json({
      mailCounts:counts,
      attention:attention.slice(0,3),
      todayEvents:todayEvents.slice(0,3),
      documents:importantDocs.slice(0,3),
      prepared:{
        mailsClassified:counts.automatic+counts.read,
        repliesToPrepare:counts.urgent+counts.important,
        documentsReady:importantDocs.length
      }
    });
  }catch{return res.status(502).json({error:'brief_unavailable'})}
}