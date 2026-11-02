import {session} from './_session.js';
export default function handler(req,res){res.setHeader('Cache-Control','no-store');const data=session(req);return res.status(200).json(data?{connected:true,email:data.email,services:{calendar:data.scope.includes('calendar.readonly'),drive:data.scope.includes('drive.metadata.readonly'),gmail:data.scope.includes('gmail.readonly')}}:{connected:false})}
