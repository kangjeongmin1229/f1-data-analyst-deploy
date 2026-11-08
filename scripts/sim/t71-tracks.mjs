// Timing71 replay description (+ series) → track id. Ids of the 26 simulator tracks match
// worker/lapsim/tracks-data.js; other venues get their own id so the geometry gap list can name them.
const T = [
  // simulator tracks
  ['sakhir', /bahrain|sakhir/], ['jeddah', /jeddah|saudi/], ['imola', /imola|emilia/], ['interlagos', /interlagos|s(ã|a)o paulo|brazil/],
  ['las-vegas', /las vegas/], ['lusail', /lusail|qatar|losail/], ['yas-marina-circuit', /abu dhabi|yas marina/], ['melbourne', /australian|melbourne|albert park/],
  ['shanghai', /chinese|shanghai/], ['suzuka', /japanese|suzuka/], ['miami', /miami/], ['mosport', /mosport|canadian tire|ctmp/], ['montreal', /canad|montr(e|é)al|gilles/],
  ['monte-carlo', /monaco|monte.?carlo/], ['catalunya', /catalunya|barcelona/], ['spielberg', /austria|red bull ring|spielberg/],
  ['silverstone', /silverstone|british/], ['spa-francorchamps', /spa\b|francorchamps|belgi/], ['hungaroring', /hungar/],
  ['zandvoort', /zandvoort|dutch/], ['monza', /monza|italian grand|d.italia/], ['madring', /madring|madrid/], ['baku', /baku|azerbaijan/],
  ['kuala-lumpur', /sepang|malaysia/], ['singapore', /singapore/], ['austin', /circuit of the americas|\bcota\b|united states grand|lone star|austin/],
  ['mexico-city', /mexico|hermanos rodr/],
  // other venues (need geometry)
  ['le-mans', /(?<!petit )le mans(?! cup)|sarthe/], ['fuji', /fuji/], ['portimao', /portim(a|ã)o|algarve/], ['paul-ricard', /paul ricard|castellet|le castellet/],
  ['daytona', /daytona|rolex 24/], ['sebring', /sebring/], ['long-beach', /long beach/], ['laguna-seca', /laguna seca|monterey/],
  ['watkins-glen', /watkins glen|the glen|sahlen/], ['lime-rock', /lime rock/],
  ['road-america', /road america|elkhart/], ['vir', /virginia|\bvir\b/], ['road-atlanta', /road atlanta|petit le mans/],
  ['indianapolis', /indianapolis|\bindy\b|bricks/], ['detroit', /detroit|belle isle/], ['mid-ohio', /mid-?ohio/], ['barber', /barber/],
  ['sonoma', /sonoma|sears point/], ['nola', /nola|new orleans/], ['utah', /utah/], ['st-petersburg', /st\.? ?pete/],
  ['hockenheim', /hockenheim/], ['norisring', /norisring|n(u|ü)rnberg/], ['nordschleife', /24h|nordschleife|\bnls\b|\bvln\b|qualifiers/],
  ['nurburgring-gp', /n(u|ü)rburgring/], ['lausitz', /lausitz|eurospeedway/], ['oschersleben', /oschersleben/], ['sachsenring', /sachsenring/],
  ['zolder', /zolder/], ['assen', /assen/], ['brands-hatch', /brands hatch/], ['donington', /donington/], ['misano', /misano/],
  ['valencia', /valencia|ricardo tormo/], ['magny-cours', /magny/], ['hungaroring', /mogyor/], ['kyalami', /kyalami/],
  ['bathurst', /bathurst|mount panorama/], ['dubai', /dubai/], ['macau', /macau|guia/], ['mugello', /mugello/],
  ['vallelunga', /vallelunga/], ['estoril', /estoril/], ['aragon', /arag(o|ó)n|motorland/], ['jarama', /jarama/],
  ['moscow', /moscow/], ['buriram', /buriram|chang/], ['ningbo', /ningbo/],
  // Formula E street circuits (by city)
  ...['diriyah', 'ad-diriyah', 'tokyo', 'london', 'berlin', 'rome', 'paris', 'new york', 'hong kong', 'sanya', 'santiago', 'marrakesh|marrakech',
    'cape town', 'hyderabad', 'jakarta', 'seoul', 'portland', 'vancouver', 'puebla', 'zurich', 'bern', 'sao paulo', 'shanghai', 'misano', 'monaco', 'mexico city', 'tempelhof']
    .map(c => [`fe-${c.split('|')[0].replace(/\s+/g, '-')}`, new RegExp(c)]),
];
// Series whose venues share names with FE cities are matched to the circuit list first.
export function trackOf(series, description) {
  const d = `${description}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const fe = /formula e/i.test(series);
  for (const [id, re] of T) {
    if (id.startsWith('fe-') !== fe) continue;
    if (re.test(d)) return id;
  }
  if (fe) for (const [id, re] of T) if (!id.startsWith('fe-') && re.test(d)) return id; // e.g. FE at Monaco/Misano circuits
  return null;
}
