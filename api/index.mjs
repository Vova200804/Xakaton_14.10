import { api } from '../scripts/api.mjs';

export default async function handler(req,res){
 const url=new URL(req.url,'http://localhost');
 const route=req.query?.route??url.searchParams.get('route');
 if(typeof route==='string')url.pathname='/api/'+route;
 url.searchParams.delete('route');
 return api(req,res,url);
}
