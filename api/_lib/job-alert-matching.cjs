"use strict";

const clean=value=>String(value??"").replace(/[\u0000-\u001f<>]/g," ").replace(/\s+/g," ").trim();
const COUNTRY_ALIASES={gb:"GB",uk:"GB","united kingdom":"GB",us:"US",usa:"US","united states":"US","united states of america":"US",ca:"CA",canada:"CA",au:"AU",australia:"AU",nz:"NZ","new zealand":"NZ",ie:"IE",ireland:"IE",ae:"AE",uae:"AE","united arab emirates":"AE",sa:"SA","saudi arabia":"SA"};
const SPECIALTY_GROUPS={
  critical_care:["critical care","intensive care","icu"],mental_health:["mental health","psychiatric","behavioral health"],
  theatre:["theatre","operating room","perioperative","pacu","recovery nurse","anaesthetic"],emergency:["emergency","emergency department","a&e","trauma"],
  public_health:["public health","community health","community nurse"],education:["nurse educator","clinical educator","practice educator"],
  neonatal:["neonatal","nicu"],paediatric:["paediatric","pediatric","children's nurse","child health"],oncology:["oncology","cancer"],
  advanced_practice:["nurse practitioner","advanced practice","nurse anesthetist","nurse anaesthetist","crna"]
};
const countryCode=value=>COUNTRY_ALIASES[clean(value).toLowerCase()]||clean(value).slice(0,2).toUpperCase();
const text=value=>clean(Array.isArray(value)?value.join(" "):value).slice(0,1000).toLowerCase();
const professionKey=value=>{const v=text(value);if(/midwi/.test(v))return"midwife";if(/assistant|support worker|healthcare support/.test(v))return"support";if(/practical nurse|vocational nurse|enrolled nurse|\blpn\b|\blvn\b/.test(v))return"enrolled_nurse";if(/nurse|nursing/.test(v))return"nurse";return v.replace(/[^a-z0-9]+/g,"_")};
const specialtyGroups=value=>new Set(Object.entries(SPECIALTY_GROUPS).filter(([,terms])=>terms.some(term=>text(value).includes(term))).map(([group])=>group));
const experienceYears=value=>{const v=text(value);if(/student|newly qualified|entry/.test(v))return 0;if(/under 2/.test(v))return 1;if(/2[^0-9]+5/.test(v))return 2;if(/6[^0-9]+10/.test(v))return 6;if(/more than 10|10\+/.test(v))return 10;const number=Number(v.match(/\d+/)?.[0]);return Number.isFinite(number)?number:null};

function alertFilterMatches(alert,job){
  if(!alert)return true;
  if(alert.country_code&&countryCode(alert.country_code)!==countryCode(job.country_code||job.country))return false;
  if(alert.profession&&professionKey(alert.profession)!==professionKey(job.profession||job.title))return false;
  if(alert.specialties?.length&&!alert.specialties.some(value=>text(`${job.title} ${job.specialty}`).includes(text(value))))return false;
  if(alert.locations?.length&&!alert.locations.some(value=>text(`${job.location} ${job.city} ${job.region_or_state}`).includes(text(value))))return false;
  if(alert.sponsorship_preference==="confirmed"&&job.sponsorship_status!=="confirmed"&&job.visa_sponsorship!==true)return false;
  if(alert.employment_types?.length&&!alert.employment_types.some(value=>text(job.employment_type||job.contract_type).includes(text(value))))return false;
  return true;
}

function qualifiesForJob(profile,job,{professional,registrations=[],practice=[],alerts=[]}={}){
  if(countryCode(profile.destination_country||profile.destination)!==countryCode(job.country_code||job.country))return false;
  const profileProfession=professionKey(professional?.profession||profile.profession),jobProfession=professionKey(job.profession||job.title);
  if(!profileProfession)return false;
  if(jobProfession&&profileProfession!==jobProfession&&!(profileProfession==="nurse"&&["enrolled_nurse","support"].includes(jobProfession))&&!(profileProfession==="enrolled_nurse"&&jobProfession==="support"))return false;
  if(alerts.length&&!alerts.some(alert=>alertFilterMatches(alert,job)))return false;
  const requiredSpecialties=specialtyGroups(`${job.title} ${job.specialty}`);
  if(requiredSpecialties.size){
    const profileSpecialties=specialtyGroups(`${professional?.clinical_specialty||""} ${professional?.nursing_field||""} ${professional?.qualification_title||""} ${practice.map(row=>row.clinical_area||"").join(" ")}`);
    if(![...requiredSpecialties].some(group=>profileSpecialties.has(group)))return false;
  }
  const registrationRequired=text(`${job.registration_required||""} ${job.registration_status||""} ${job.registration_body||""}`);
  if(registrationRequired&&/(registr|licen[cs]e|nmc|ahpra|nursing council|college of nurses)/.test(registrationRequired)){
    const destination=countryCode(job.country_code||job.country),active=registrations.some(row=>row.status==="Active"&&countryCode(row.country)===destination),stage=text(profile.registration_stage);
    if(!active&&!/(registered|active|complete|pin issued)/.test(stage))return false;
  }
  const needed=experienceYears(job.experience_level),available=experienceYears(professional?.experience_level);
  if(needed!==null&&(available===null||available<needed))return false;
  return true;
}

module.exports={countryCode,qualifiesForJob,alertFilterMatches};
