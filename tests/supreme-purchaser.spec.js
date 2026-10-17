import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

test('Supreme payer selection, cancellation, persistence, edits, export and undo',async({page})=>{
 const teams=[{id:1,name:'Test Team',supreme_purchased:false,supreme_purchased_at:null,supreme_purchased_by:null}];
 const players=['Alice','Bob','Charlie','TBD'].map((name,i)=>({id:i+1,name,team_id:1,checked_in:false,checked_in_at:null,mulligan_purchased:false,putting_purchased:false,solo_purchased:i===2}));
 const before=structuredClone(players),writes=[];let failNext=false;
 await page.route('https://wlrosvxhnlkbeitdwunm.supabase.co/**',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.pathname.includes('/auth/v1/user'))return route.fulfill({json:{id:'volunteer',email:'shared-volunteers@golf-checkin.invalid'}});
  if(url.pathname.includes('volunteer-pin-login')){
   const payload=Buffer.from(JSON.stringify({sub:'volunteer',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url');
   return route.fulfill({json:{access_token:`e30.${payload}.c2ln`,refresh_token:'test-only',expires_in:3600}});
  }
  if(url.pathname.includes('/rest/v1/')){
   const rows=url.pathname.endsWith('golf_teams')?teams:players;
   if(req.method()==='GET')return route.fulfill({json:rows});
   expect(req.method()).toBe('PATCH');
   writes.push(req.postDataJSON());
   if(failNext){failNext=false;return route.fulfill({status:403,json:{message:'Permission denied'}});}
   const matched=rows.filter(row=>[...url.searchParams].every(([k,v])=>k==='select'||(v==='is.null'?row[k]==null:String(row[k])===v.slice(3))));
   matched.forEach(row=>Object.assign(row,req.postDataJSON()));
   return route.fulfill({json:matched.map(({id})=>({id}))});
  }
  return route.fulfill({json:{}});
 });
 await page.routeWebSocket(/realtime/,ws=>{
  ws.onMessage(raw=>{
   const [joinRef,ref,topic,event]=JSON.parse(raw);
   if(event==='phx_join')ws.send(JSON.stringify([joinRef,ref,topic,'phx_reply',{status:'ok',response:{postgres_changes:[]}}]));
  });
 });
 await page.goto('/');
 await page.locator('#pin').fill('10172026');await page.locator('#loginForm button').click();
 await expect(page.locator('#total')).toHaveText('3');
 const supreme=page.locator('#list [data-supreme-team="1"]');
 await supreme.click();
 const dialog=page.getByRole('dialog');
 await expect(dialog).toBeVisible();
 await expect(dialog.locator('option')).toHaveCount(4);
 await dialog.getByRole('button',{name:'Save purchase'}).click();
 await expect(dialog).toBeVisible();expect(writes).toHaveLength(0);
 await dialog.getByRole('button',{name:'Cancel'}).click();
 await expect(dialog).toHaveCount(0);expect(writes).toHaveLength(0);
 await supreme.click();await page.locator('#supremePurchaser').selectOption('2');
 await page.getByRole('button',{name:'Save purchase'}).click();
 await expect(page.locator('#list')).toContainText('Purchased by: Bob');
 expect(writes[0]).toMatchObject({supreme_purchased:true,supreme_purchased_by:2,supreme_purchased_at:expect.any(String)});
 const timestamp=teams[0].supreme_purchased_at;
 await expect(page.locator('#list [data-mulligan]:checked')).toHaveCount(4);
 await expect(page.locator('#list [data-putting]:checked')).toHaveCount(4);
 await expect(page.locator('#list [data-solo]:checked')).toHaveCount(4);
 expect(players).toEqual(before);
 await page.reload();await expect(page.locator('#list')).toContainText('Purchased by: Bob');
 await page.locator('#list [data-supreme-purchaser]').click();
 await page.locator('#supremePurchaser').selectOption('1');await page.getByRole('button',{name:'Save purchase'}).click();
 await expect(page.locator('#list')).toContainText('Purchased by: Alice');
 expect(teams[0].supreme_purchased_at).toBe(timestamp);
 await page.locator('[data-tab="report"]').click();
 const downloadPromise=page.waitForEvent('download');await page.locator('#export').click();
 const download=await downloadPromise;const csv=await readFile(await download.path(),'utf8');
 expect(csv).toContain('"Supreme purchased by"');expect(csv).toContain('"Alice"');
 await page.locator('[data-tab="check"]').click();
 failNext=true;await supreme.click();await expect(page.locator('#status')).toContainText('Permission denied');
 await expect(page.locator('#list')).toContainText('Purchased by: Alice');
 await supreme.click();await expect(page.locator('#status')).toContainText('purchase undone');
 expect(teams[0]).toMatchObject({supreme_purchased:false,supreme_purchased_by:null,supreme_purchased_at:null});
 expect(players).toEqual(before);
 await expect(page.locator('#list [data-solo]:checked')).toHaveCount(1);
 await page.locator('[data-tab="teams"]').click();await page.locator('#teamList summary').click();
 await page.locator('#teamList [data-supreme-team="1"]').click();
 await page.locator('#supremePurchaser').selectOption('3');await page.getByRole('button',{name:'Save purchase'}).click();
 await expect(page.locator('#teamList')).toContainText('Purchased by: Charlie');
 await page.setViewportSize({width:390,height:844});
 await page.locator('#teamList [data-supreme-purchaser]').click();
 const box=await dialog.boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(390);
 await page.screenshot({path:'/workspace/scratch/ba08f04b7e33/supreme-purchaser-mobile.png'});
 await dialog.getByRole('button',{name:'Cancel'}).click();
});
