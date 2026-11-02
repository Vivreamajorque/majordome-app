import crypto from 'node:crypto';
export default function handler(req,res){
 if(req.method!=='GET')return res.status(405).end();
 const id=process.env.GOOGLE_CLIENT_ID,secret=process.env.GOOGLE_CLIENT_SECRET;
 if(!id||!secret)return res.status(503).send('Connexion Google non configurée.');
 const origin='https://alfred-majordome.vercel.app';
 const state=crypto.randomBytes(24).toString('base64url');
 const verifier=crypto.randomBytes(32).toString('base64url');
 const challenge=crypto.createHash('sha256').update(verifier).digest('base64url');
 const value=state+'.'+verifier;
 const signature=crypto.createHmac('sha256',secret).update(value).digest('base64url');
 res.setHeader('Cache-Control','no-store');
 res.setHeader('Set-Cookie','alfred_oauth='+encodeURIComponent(value+'.'+signature)+'; Path=/api/auth/google; HttpOnly; Secure; SameSite=Lax; Max-Age=600');
 const q=new URLSearchParams({client_id:id,redirect_uri:origin+'/api/auth/google/callback',response_type:'code',scope:'openid email profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/drive.metadata.readonly https://www.googleapis.com/auth/gmail.readonly',state,code_challenge:challenge,code_challenge_method:'S256',prompt:'consent select_account'});
 return res.redirect(302,'https://accounts.google.com/o/oauth2/v2/auth?'+q);
}