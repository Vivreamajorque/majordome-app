import crypto from 'node:crypto';
export default function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 const secret=process.env.GOOGLE_CLIENT_SECRET;
 const cookie=req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith('alfred_session='))?.slice(15);
 if(!secret||!cookie)return res.status(200).json({connected:false});
 const [payload,sig]=cookie.split('.');
 if(!payload||!sig)return res.status(200).json({connected:false});
 const expected=crypto.createHmac('sha256',secret).update(payload).digest();
 const actual=Buffer.from(sig,'base64url');
 if(actual.length!==expected.length||!crypto.timingSafeEqual(actual,expected))return res.status(200).json({connected:false});
 try{const data=JSON.parse(Buffer.from(payload,'base64url').toString());if(data.exp<=Date.now()/1000)return res.status(200).json({connected:false});return res.status(200).json({connected:true,email:data.email})}catch{return res.status(200).json({connected:false})}
}