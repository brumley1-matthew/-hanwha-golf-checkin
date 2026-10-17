import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
test('extra raffle quantities persist, export, handle errors and retain packages',async({page})=>{
 const teams=[{id:1,name:'Test Team',supreme_purchased:true,supreme_purchased_by:1}];
 const players=[{id:1,name:'Alice',team_id:1,checked_in:true,solo_purchased:true,extra_raffle_tickets:0},{id:2,name:'TBD',team_id:1,extra_raffle_tickets:0}];
 let fail=false,conflict=false;const writes=[];
 await page.route('https://wlrosvxhnlkbeitdwunm.supabase.co/**',async route=>{
 const req=route.request(),url=new URL(req.url());
 if(url.pathname.includes('/auth/v1/user'))return route.fulfill({json:{id:'volunteer',email:'shared-volunteers@golf-checkin.invalid'}});
 if(url.pathname.includes('volunteer-pin-login'))return route.fulfill({json:{access_token:`e30.${Buffer.from(JSON.stringify({sub:'volunteer',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')}.c2ln`,refresh_token:'test-only',expires_in:3600}});
 if(url.pathname.includes('/rest/v1/')){
 const rows=url.pathname.endsWith('golf_teams')?teams:players;
 if(req.method()==='GET')return route.fulfill({json:rows});
 writes.push(req.postDataJSON());
 if(fail){fail=false;return route.fulfill({status:403,json:{message:'Permission denied'}});}
 if(conflict){conflict=false;return route.fulfill({json:[]});}
 const matched=rows.filter(row=>[...url.searchParams].every(([k,v])=>k==='select'||String(row[k])===v.slice(3)));
 matched.forEach(row=>Object.assign(row,req.postDataJSON()));return route.fulfill({json:matched.map(({id})=>({id}))});
 }return route.fulfill({json:{}});
 });
 await page.goto('/');await page.locator('#pin').fill('10172026');await page.locator('#loginForm button').click();
 const button=page.locator('#list [data-extra-raffle="1"]');
 await expect(button).toContainText('0 tickets');await expect(page.locator('#list [data-extra-raffle="2"]')).toBeDisabled();
 await button.click();await page.locator('#extraRaffleCount').fill('3');await expect(page.locator('[data-raffle-total]')).toHaveText('Extra ticket total: $15');await page.getByRole('button',{name:'Save tickets'}).click();
 await expect(button).toContainText('3 tickets · $15');expect(writes[0]).toEqual({extra_raffle_tickets:3});expect(players[0].solo_purchased).toBe(true);expect(players[0].checked_in).toBe(true);
 await page.reload();await expect(button).toContainText('3 tickets');
 await button.click();await page.locator('#extraRaffleCount').fill('-1');await page.getByRole('button',{name:'Save tickets'}).click();expect(writes).toHaveLength(1);await page.getByRole('button',{name:'Cancel',exact:true}).click();
 await button.click();await page.locator('#extraRaffleCount').fill('4');fail=true;await page.getByRole('button',{name:'Save tickets'}).click();await expect(page.locator('[data-raffle-error]')).toContainText('Permission denied');expect(players[0].extra_raffle_tickets).toBe(3);
 conflict=true;await page.getByRole('button',{name:'Save tickets'}).click();await expect(page.locator('[data-raffle-error]')).toContainText('changed on another device');await page.getByRole('button',{name:'Cancel',exact:true}).click();
 await page.locator('[data-tab="report"]').click();const pending=page.waitForEvent('download');await page.locator('#export').click();const csv=await readFile(await (await pending).path(),'utf8');expect(csv).toContain('"Extra raffle tickets","Extra raffle amount $"');expect(csv).toContain('"3","15"');
 await page.locator('[data-tab="check"]').click();await button.click();await page.locator('#extraRaffleCount').fill('0');await page.getByRole('button',{name:'Save tickets'}).click();await expect(button).toContainText('0 tickets · $0');
});
