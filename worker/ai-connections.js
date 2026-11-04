// Per-account AI connection status for the account page.
// The AI is identified only by the registered OAuth redirect host, which the
// authorization server enforces; a self-reported client_name is never trusted.
// A connection counts as active when the account's current OAuth grant produced
// a token or a tool call within the refresh-token lifetime. An AI that deletes the
// connector without calling /oauth/revoke cannot be detected immediately, so the
// page states the last confirmed activity instead of claiming a live link.
import {oauthAccountState} from './oauth-account-state.js';

export const AI_CLIENTS=[['claude','Claude',['claude.ai','claude.com']],['chatgpt','ChatGPT',['chatgpt.com','openai.com']]];
export const CONNECTION_ACTIVE_MS=30*24*60*60*1000;
const USE_WRITE_INTERVAL_MS=10*60*1000;
const recentUse=new Map();
const digest=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),n=>n.toString(16).padStart(2,'0')).join('');
const storageKey=async sub=>'website-auth/oauth/connections/'+await digest('google:'+sub)+'.json';

export function aiClientFamily(redirectUri){
 try{const host=new URL(redirectUri).hostname.toLowerCase();return AI_CLIENTS.find(([,,hosts])=>hosts.some(h=>host===h||host.endsWith('.'+h)))?.[0]||null;}catch{return null;}
}

// event: 'token' (authorization code or refresh exchange), 'use' (authenticated MCP call) or 'revoke'.
export async function recordAiConnection(env,record,event,now=Date.now()){
 const sub=record?.profile?.sub,family=aiClientFamily(record?.redirectUri);
 if(!env?.BUCKET||!sub||!family)return false;
 const memo=sub+'|'+family;
 if(event==='use'&&now-(recentUse.get(memo)||0)<USE_WRITE_INTERVAL_MS)return false;
 const key=await storageKey(sub),object=await env.BUCKET.get(key),stored=object?await object.json():{};
 const previous=stored?.[family]||{},generation=record.accountGeneration||'0';
 const fresh=previous.generation===generation?previous:{};
 const next={...fresh,generation};
 if(event==='token'){next.lastTokenAt=now;next.connectedAt=fresh.connectedAt&&!fresh.revokedAt?fresh.connectedAt:now;delete next.revokedAt;}
 else if(event==='use'){next.lastUsedAt=now;next.connectedAt??=now;delete next.revokedAt;}
 else if(event==='revoke')next.revokedAt=now;
 else return false;
 await env.BUCKET.put(key,JSON.stringify({...stored,[family]:next}));
 if(event==='use')recentUse.set(memo,now);else recentUse.delete(memo);
 return true;
}

// Connections made before status tracking existed (2026-11-04 16:41 KST) left no
// record. Once per account, rebuild it from that account's unexpired OAuth tokens.
const BACKFILL_SCAN_LIMIT=2000;
async function backfill(env,sub,stored,generation,now){
 if(stored?.backfilledAt||typeof env.BUCKET.list!=='function')return stored;
 const found={};let scanned=0;
 for(const type of ['refresh','access']){
  let cursor;
  do{
   const page=await env.BUCKET.list({prefix:'website-auth/oauth/'+type+'/',limit:200,...(cursor?{cursor}:{})});
   for(const item of page.objects||[]){
    if(++scanned>BACKFILL_SCAN_LIMIT)break;
    const object=await env.BUCKET.get(item.key),record=object?await object.json().catch(()=>null):null;
    if(record?.profile?.sub!==sub||!(record.expiresAt>now)||(record.accountGeneration||'0')!==generation)continue;
    const family=aiClientFamily(record.redirectUri);if(!family)continue;
    const at=Number(record.issuedAt)||now;
    found[family]={generation,connectedAt:Math.min(found[family]?.connectedAt??at,at),lastTokenAt:Math.max(found[family]?.lastTokenAt??0,at)};
   }
   cursor=page.truncated&&scanned<=BACKFILL_SCAN_LIMIT?page.cursor:undefined;
  }while(cursor);
 }
 const next={...stored,backfilledAt:now};
 for(const [family,item] of Object.entries(found)){
  const current=stored?.[family];
  if(current?.generation===generation&&Math.max(current.lastTokenAt||0,current.lastUsedAt||0)>=item.lastTokenAt)continue;
  next[family]={...(current?.generation===generation?current:{}),...item};
 }
 await env.BUCKET.put(await storageKey(sub),JSON.stringify(next));
 return next;
}

export async function aiConnectionStatus(env,sub,now=Date.now()){
 if(!env?.BUCKET||!sub)return null;
 const [object,account]=await Promise.all([env.BUCKET.get(await storageKey(sub)),oauthAccountState(env,sub)]);
 let stored=object?await object.json():{};
 if(account.active)stored=await backfill(env,sub,stored,account.generation,now).catch(()=>stored);
 return AI_CLIENTS.map(([id,label])=>{
  const item=stored?.[id];
  if(!item)return {id,label,state:'none'};
  const last=Math.max(item.lastTokenAt||0,item.lastUsedAt||0);
  if(!account.active||item.generation!==account.generation)return {id,label,state:'revoked',lastActiveAt:last||null};
  if(item.revokedAt&&item.revokedAt>=last)return {id,label,state:'revoked',lastActiveAt:last||null};
  if(now-last>CONNECTION_ACTIVE_MS)return {id,label,state:'expired',lastActiveAt:last||null};
  return {id,label,state:'connected',lastActiveAt:last,lastUsedAt:item.lastUsedAt||null};
 });
}
