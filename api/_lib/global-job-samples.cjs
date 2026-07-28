const COUNTRIES = [
  ["GB","United Kingdom","GBP"],["US","United States","USD"],["AU","Australia","AUD"],["NZ","New Zealand","NZD"],
  ["CA","Canada","CAD"],["IE","Ireland","EUR"],["AE","United Arab Emirates","AED"],["SA","Saudi Arabia","SAR"],
];
function getDevelopmentSamples(runtime=process.env){
  if(runtime.NODE_ENV==="production"||runtime.BTV_JOB_SAMPLE_MODE!=="true")return[];
  return COUNTRIES.map(([country_code,country_name,salary_currency],index)=>({
    id:`00000000-0000-4000-8000-${String(index+1).padStart(12,"0")}`,external_id:`DEV-${country_code}-001`,source_name:"Development sample data",
    source_url:null,application_url:null,country_code,country_name,title:"[SAMPLE — NOT LIVE] Registered Nurse",employer_name:"Sample Healthcare Employer",
    city:"Sample city",region_or_state:"Sample region",profession:"nurse",specialty:"General nursing",summary:"Development-only sample vacancy. This is not a live job and cannot be applied for.",
    sponsorship_status:"not_stated",overseas_applicants_status:"not_stated",salary_currency,status:"active",opportunity_type:"job",published_at:new Date().toISOString(),
    last_verified_at:new Date().toISOString(),job_reference:`DEV-${country_code}-001`,raw_source_metadata:{development_sample:true},
  }));
}
module.exports={getDevelopmentSamples};
