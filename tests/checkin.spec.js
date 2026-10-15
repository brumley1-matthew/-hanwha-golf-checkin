import {test,expect} from '@playwright/test';
const url='https://wlrosvxhnlkbeitdwunm.supabase.co';
test('team attendance, search, purchases, PIN and realtime preserve roster',async({page})=>{
 const teams=Array.from({length:24},(_,i)=>({id:i+1,name:`Team ${String(i+1).padStart(2,'0')}`,supreme_purchased:i===1,supreme_purchased_at:i===1?'2026-10-01T00:00:00Z':null}));
 const players=Array.from({length:96},(_,i)=>({id:i+1,name:`Golfer ${String(i+1).padStart(2,'0')}`,team_id:Math.floor(i/4)+1,checked_in:i===0,checked_in_at:i===0?'2026-10-01T00:00:00Z':null,mulligan_purchased:i===2,mulligan_purchased_at:null,putting_purchased:false,putting_purchased_at:null,solo_purchased:i===3,solo_purchased_at:null}));
 const before=structuredClone({teams,players});const writes=[];let failNext=false;
 await page.route(url+'/**',async route=>{
  const req=route.request(),u=new URL(req.url());
  if(u.pathname.includes('/auth/v1/user'))return route.fulfill({json:{id:'volunteer',email:'shared-volunteers@golf-checkin.invalid'}});
  if(u.pathname.includes('volunteer-pin-login')){
   expect(req.postDataJSON().pin).toBe('10172026');const payload=Buffer.from(JSON.stringify({sub:'volunteer',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url');
   return route.fulfill({json:{access_token:`e30.${payload}.c2ln`,refresh_token:'test-only',user:{id:'volunteer'},expires_in:3600}});
  }
  if(u.pathname.includes('/rest/v1/')){
   const rows=u.pathname.endsWith('golf_teams')?teams:players;
   if(req.method()==='GET')return route.fulfill({json:rows});
   expect(req.method()).toBe('PATCH');writes.push({table:u.pathname.split('/').at(-1),body:req.postDataJSON(),query:Object.fromEntries(u.searchParams)});
   if(failNext){failNext=false;return route.fulfill({status:403,json:{message:'Permission denied'}});}
   const matched=rows.filter(row=>[...u.searchParams].every(([k,v])=>k==='select'|| String(row[k])===v.slice(3)));
   matched.forEach(row=>Object.assign(row,req.postDataJSON()));return route.fulfill({json:matched.map(({id})=>({id}))});
  }
  return route.fulfill({json:{}});
 });
 await page.routeWebSocket(/realtime/,ws=>{
  ws.onMessage(raw=>{const [joinRef,ref,topic,event,payload]=JSON.parse(raw);
   if(event==='phx_join'){
    ws.send(JSON.stringify([joinRef,ref,topic,'phx_reply',{status:'ok',response:{postgres_changes:[{id:1,event:'*',schema:'public',table:'golf_players'},{id:2,event:'*',schema:'public',table:'golf_teams'}]}}]));
    globalThis.sendChange=()=>ws.send(JSON.stringify([joinRef,null,topic,'postgres_changes',{ids:[1],data:{schema:'public',table:'golf_players',type:'UPDATE',columns:[],record:players[8],old_record:{}}}]));
   }else if(event==='heartbeat')ws.send(JSON.stringify([null,ref,'phoenix','phx_reply',{status:'ok',response:{}}]));
  });
 });
 await page.goto('/');await page.locator('#pin').fill('10172026');await page.locator('#loginForm button').click();
 await expect(page.locator('#total')).toHaveText('96');await expect(page.locator('#teamList details')).toHaveCount(24);
 await expect(page.locator('#status')).toContainText('Live attendance');
 expect(await page.locator('img').evaluateAll(imgs=>imgs.every(img=>img.complete&&img.naturalWidth>0))).toBeTruthy();
 await page.locator('#search').fill('team 01');await expect(page.locator('#list .person')).toHaveCount(4);
 await page.locator('#filter').selectOption('missing');await expect(page.locator('#list .person')).toHaveCount(3);
 await page.locator('#list [data-check-team="1"]').click();await expect(page.locator('#arrived')).toHaveText('4');
 expect(writes[0]).toEqual({table:'golf_players',body:{checked_in:true,checked_in_at:expect.any(String)},query:{team_id:'eq.1',checked_in:'eq.false',select:'id'}});
 expect(players[0].checked_in_at).toBe(before.players[0].checked_in_at);
 expect(players.map(({checked_in,checked_in_at,...rest})=>rest)).toEqual(before.players.map(({checked_in,checked_in_at,...rest})=>rest));expect(teams).toEqual(before.teams);
 await page.locator('#filter').selectOption('all');await page.locator('#search').fill('golfer 02');await expect(page.locator('#list .person')).toHaveCount(1);
 await page.locator('#list [data-check="2"]').click();await expect(page.locator('#arrived')).toHaveText('3');
 failNext=true;await page.locator('#list [data-check-team="1"]').click();await expect(page.locator('#status')).toContainText('Permission denied');await expect(page.locator('#list [data-check-team="1"]')).toBeEnabled();
 await page.locator('#search').fill('team 02');await expect(page.locator('#list [data-mulligan]:checked')).toHaveCount(4);await expect(page.locator('#list [data-putting]:checked')).toHaveCount(4);await expect(page.locator('#list [data-supreme]:checked')).toHaveCount(4);
 await page.locator('#list [data-supreme]').first().uncheck();await expect(page.locator('#list [data-mulligan]:checked')).toHaveCount(0);
 await page.locator('#list [data-supreme]').first().check();await expect(page.locator('#list [data-mulligan]:checked')).toHaveCount(4);
 await page.locator('#search').fill('golfer 03');await page.locator('#list [data-putting]').check();await expect(page.locator('#status')).toContainText('Saved putting');
 await page.locator('#search').fill('golfer 04');await expect(page.locator('#list [data-mulligan]')).toBeChecked();await expect(page.locator('#list [data-putting]')).toBeChecked();await page.locator('#list [data-solo]').uncheck();await expect(page.locator('#list [data-mulligan]')).not.toBeChecked();
 players[8].checked_in=true;globalThis.sendChange();await expect(page.locator('#arrived')).toHaveText('4');
 await page.locator('[data-tab="report"]').click();const downloadPromise=page.waitForEvent('download');await page.locator('#export').click();const download=await downloadPromise;expect(download.suggestedFilename()).toBe('hanwha-golf-attendance-purchases.csv');
 await page.locator('#logout').click();await expect(page.locator('#login')).toBeVisible();
});
