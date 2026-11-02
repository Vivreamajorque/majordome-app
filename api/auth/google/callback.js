import crypto from 'node:crypto';
import {seal} from './_session.js';
const origin='https://alfred-majordome.vercel.app';
function valid(a,b){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&crypto.timingSafeEqual(x,y)}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 res.setHeader('Set-Cookie','alfred_oauth=; Path=/api/auth/google; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
 if(req.method!=='GET')return res.status(405).end();
 const secret=process.env.GOOGLE_CLIENT_SECRET,id=process.env.GOOGLE_CLIENT_ID;
 const raw=req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith('alfred_oauth='))?.slice(13);
 const parts=raw?decodeURIComponent(raw).split('.'):[];
 if(!secret||!id||parts.length!==3||!req.query.code||!req.query.state)return res.redirect(302,'/?google=error');
 const [state,verifier,sig]=parts;
 const expected=crypto.createHmac('sha256',secret).update(state+'.'+verifier).digest('base64url');
 if(!valid(sig,expected)||!valid(String(req.query.state),state))return res.redirect(302,'/?google=error');
 try{
  const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({code:String(req.query.code),client_id:id,client_secret:secret,redirect_uri:origin+'/api/auth/google/callback',grant_type:'authorization_code',code_verifier:verifier})});
  if(!response.ok)throw new Error('Token exchange failed');
  const tokens=await response.json();
  const infoResponse=await fetch('https://oauth2.googleapis.com/tokeninfo?id_token='+encodeURIComponent(tokens.id_token||''));
  if(!infoResponse.ok)throw new Error('Invalid identity token');
  const info=await infoResponse.json();
  if(info.aud!==id||!['accounts.google.com','https://accounts.google.com'].includes(info.iss)||info.email_verified!=='true')throw new Error('Invalid identity');
  const cookie=seal({email:info.email,exp:Math.floor(Date.now()/1000)+Math.min(Number(tokens.expires_in)||3600,3600),access_token:tokens.access_token,scope:tokens.scope||''},secret);
  res.setHeader('Set-Cookie',['alfred_oauth=; Path=/api/auth/google; HttpOnly; Secure; SameSite=Lax; Max-Age=0','alfred_session='+cookie+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600']);
  return res.redirect(302,'/?google=connected');
 }catch(e){return res.redirect(302,'/?google=error')}
}