import {admin,cors,fail,json,options,requireUser} from '../_shared/core.ts';
const clean=(v:unknown,n=200)=>String(v??'').trim().slice(0,n);
async function paystack(body:unknown){
 const secret=clean(Deno.env.get('PAYSTACK_SECRET_KEY'),300);if(!secret)throw Object.assign(Error('Paystack is not configured.'),{status:503});
 const r=await fetch('https://api.paystack.co/transaction/initialize',{method:'POST',headers:{Authorization:`Bearer ${secret}`,'Content-Type':'application/json'},body:JSON.stringify(body)}),d=await r.json().catch(()=>({}));
 if(!r.ok||d.status!==true)throw Object.assign(Error(d.message||'Paystack could not start payment.'),{status:502});return d.data;
}
Deno.serve(async req=>{if(options(req))return new Response('ok',{headers:cors});if(req.method!=='POST')return json({error:'Method not allowed.'},405);try{
 const user=await requireUser(req),body=await req.json().catch(()=>({})),bookingId=clean(body.bookingId,80),db=admin();
 const {data:b,error}=await db.from('bookings').select('*,booking_services(*)').eq('id',bookingId).eq('user_id',user.id).single();if(error||!b)throw Object.assign(Error('Booking was not found.'),{status:404});
 if(b.status!=='pending_payment'||b.payment_status!=='pending')throw Object.assign(Error('This booking is not awaiting payment.'),{status:409});
 const s=b.booking_services;if(!s||Number(s.price_minor)<=0)throw Object.assign(Error('This service does not require payment.'),{status:409});
 const app=clean(Deno.env.get('APP_URL'),500).replace(/\/$/,'');if(!app)throw Object.assign(Error('APP_URL is not configured.'),{status:503});
 const reference=`btv-booking-${Date.now()}-${crypto.randomUUID().replaceAll('-','').slice(0,12)}`;
 await db.from('booking_payments').insert({booking_id:b.id,paystack_reference:reference,amount_minor:s.price_minor,currency:s.currency,status:'pending'});
 const p=await paystack({email:b.customer_email,amount:String(s.price_minor),currency:s.currency,reference,callback_url:`${app}/index.html?booking=return`,metadata:{booking_id:b.id,user_id:user.id,payment_type:'booking'}});
 if(!p?.authorization_url)throw Error('Paystack did not return a payment link.');return json({authorization_url:p.authorization_url,reference});
 }catch(e){return fail(e)}});

