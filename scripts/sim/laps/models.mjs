// Car-model identity from the free-text model field of a timing feed. Rule: the base model and its Evo kit are two
// different cars for fitting (owner instruction 2026-11-11); the website shows the base model plus an "Evo" tick box.
// Only the text of the feed is used. Nothing is guessed: a row with no model text stays unidentified.
const clean = s => String(s || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9. ]+/g, ' ').replace(/\s+/g, ' ').trim();
export function modelIdentity(text) {
  const t = clean(text); if (!t) return null;
  const gen = (t.match(/\b(99[12](?: ?II| ?\.2| ?I)?|G82|F8[12]|GEN ?\d)\b/) || [])[1] || null;
  const cat = (t.match(/\b(LMGT3|GT3|GT4|GT2|GTE|CUP|SUPER TROFEO|CHALLENGE|LMP2|LMP3|TCR)\b/) || [])[1] || null;
  // "Evo" is a kit only on a customer racing car (a category word is present). "Lancer Evolution X" is a model name.
  const EVO = /\bEVO(?:LUTION)? ?(II|2)?\b/, evoM = cat ? t.match(EVO) : null, evo = evoM ? (evoM[1] ? 'evo2' : 'evo') : null;
  // base = text without the Evo word, the category spelling differences and brackets
  const base = (evo ? t.replace(EVO, '') : t).replace(/\bLMGT3\b/, 'GT3').replace(/\bTYPE\b/g, '').replace(/\s+/g, ' ').trim();
  return {base, evo, generation: gen, category: cat === 'LMGT3' ? 'GT3' : cat, key: base + (evo ? ' +' + evo.toUpperCase() : '')};
}
