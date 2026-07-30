module.exports = function handler(req,res){
  res.setHeader("Cache-Control","public, max-age=300, stale-while-revalidate=3600");
  if(req.method!=="GET")return res.status(405).json({error:"Method not allowed"});
  return res.status(200).json({vapidPublicKey:process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY||"",enabled:Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY&&process.env.VAPID_PRIVATE_KEY&&process.env.VAPID_SUBJECT)});
};
