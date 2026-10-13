/**
 * "What is this medicine used for?" - a short, general, one-line answer for common medicines.
 *
 * This is a fixed, hand-written list on purpose (not an AI guess): a wrong medical
 * sentence is worse than no sentence. If a medicine is not in the list we return ''
 * and the patient can type their own line. It is general information, not advice.
 *
 * Each group: [one-line use, "space separated generic names and well-known Indian brand names"]
 */
const GROUPS = [
  ['Lowers blood sugar (diabetes)', 'metformin glycomet glimepiride amaryl gliclazide glipizide sitagliptin vildagliptin teneligliptin linagliptin pioglitazone dapagliflozin empagliflozin canagliflozin voglibose acarbose'],
  ['Lowers blood pressure', 'amlodipine amlong telmisartan telma losartan olmesartan valsartan candesartan irbesartan enalapril ramipril lisinopril nifedipine cilnidipine hydrochlorothiazide chlorthalidone indapamide'],
  ['Lowers blood pressure and heart rate', 'atenolol metoprolol bisoprolol propranolol carvedilol nebivolol'],
  ['Water tablet: removes extra fluid', 'furosemide lasix torsemide spironolactone'],
  ['Lowers cholesterol', 'atorvastatin storvas rosuvastatin simvastatin pravastatin ezetimibe'],
  ['Lowers blood fats (triglycerides)', 'fenofibrate'],
  ['Prevents blood clots (heart attack and stroke)', 'aspirin ecosprin clopidogrel ticagrelor prasugrel'],
  ['Blood thinner: prevents clots', 'warfarin acenocoumarol rivaroxaban apixaban dabigatran'],
  ['Prevents chest pain (angina)', 'isosorbide nitroglycerin ranolazine trimetazidine'],
  ['Helps the heart beat strongly and regularly', 'digoxin amiodarone'],
  ['Pain relief and fever', 'paracetamol acetaminophen dolo crocin calpol'],
  ['Pain, swelling and fever', 'ibuprofen brufen combiflam'],
  ['Pain and swelling (anti-inflammatory)', 'diclofenac voveran aceclofenac naproxen etoricoxib nimesulide piroxicam'],
  ['Moderate to severe pain', 'tramadol'],
  ['Reduces stomach acid (acidity, reflux, ulcers)', 'pantoprazole omeprazole omez esomeprazole rabeprazole lansoprazole famotidine ranitidine'],
  ['Relieves acidity (antacid)', 'gelusil digene'],
  ['Relieves nausea and vomiting', 'domperidone ondansetron metoclopramide'],
  ['Stops loose motions (diarrhoea)', 'loperamide racecadotril'],
  ['Relieves constipation', 'lactulose bisacodyl isabgol'],
  ['Allergy relief (sneezing, itching, runny nose)', 'cetirizine cetzine levocetirizine fexofenadine allegra loratadine chlorpheniramine'],
  ['Prevents asthma and allergy symptoms', 'montelukast montair'],
  ['Relieves wheezing and breathing difficulty', 'salbutamol albuterol theophylline deriphyllin'],
  ['Loosens mucus and eases cough', 'ambroxol bromhexine guaifenesin'],
  ['Cough relief', 'dextromethorphan'],
  ['Antibiotic for bacterial infections', 'amoxicillin augmentin azithromycin azithral ciprofloxacin cefixime cefuroxime cefpodoxime doxycycline levofloxacin ofloxacin norfloxacin cephalexin clindamycin linezolid'],
  ['Antibiotic for infections', 'metronidazole tinidazole ornidazole'],
  ['Antifungal: treats fungal infections', 'fluconazole itraconazole terbinafine clotrimazole'],
  ['Antiviral: treats viral infections', 'acyclovir valacyclovir oseltamivir'],
  ['Treats worm infections', 'albendazole mebendazole ivermectin'],
  ['Treats tuberculosis (TB)', 'rifampicin isoniazid ethambutol pyrazinamide'],
  ['Treats malaria', 'chloroquine artemether primaquine'],
  ['Malaria, arthritis and lupus', 'hydroxychloroquine'],
  ['Replaces thyroid hormone (underactive thyroid)', 'levothyroxine thyroxine thyronorm eltroxin'],
  ['Treats overactive thyroid', 'carbimazole methimazole propylthiouracil'],
  ['Vitamin D supplement for strong bones', 'cholecalciferol | vitamin d | vitamin d3'],
  ['Calcium supplement for strong bones', 'calcium shelcal'],
  ['Vitamin B12 for nerves and blood', 'methylcobalamin cyanocobalamin mecobalamin | vitamin b12'],
  ['B-complex vitamins for nerves and energy', 'becosules neurobion'],
  ['Folic acid: vitamin for blood health', 'folic | folic acid'],
  ['Iron supplement for anaemia (low blood)', 'ferrous iron'],
  ['Vitamin C supplement', 'ascorbic | vitamin c'],
  ['Multivitamin supplement', 'multivitamin'],
  ['Zinc supplement', 'zinc'],
  ['Nerve pain and seizures', 'gabapentin'],
  ['Nerve pain', 'pregabalin'],
  ['Depression, anxiety and nerve pain', 'duloxetine'],
  ['Prevents seizures (epilepsy)', 'levetiracetam phenytoin carbamazepine valproate lamotrigine topiramate oxcarbazepine | sodium valproate | valproic acid'],
  ['Depression and anxiety', 'sertraline escitalopram fluoxetine paroxetine citalopram'],
  ['Depression and nerve pain', 'amitriptyline'],
  ['Anxiety and sleep problems', 'alprazolam lorazepam diazepam zolpidem'],
  ['Seizures and anxiety', 'clonazepam'],
  ["Memory problems (dementia, Alzheimer's)", 'donepezil memantine rivastigmine'],
  ["Parkinson's disease", 'levodopa carbidopa ropinirole pramipexole'],
  ['Reduces inflammation (steroid)', 'prednisolone prednisone dexamethasone methylprednisolone hydrocortisone deflazacort'],
  ['Lowers uric acid (gout)', 'allopurinol febuxostat'],
  ['Relieves gout attacks', 'colchicine'],
  ['Strengthens bones (osteoporosis)', 'alendronate risedronate raloxifene'],
  ['Eases urination (enlarged prostate)', 'tamsulosin silodosin finasteride dutasteride'],
  ['Controls overactive bladder', 'oxybutynin solifenacin tolterodine'],
  ['Treats arthritis and psoriasis (also used in some cancers)', 'methotrexate'],
  ['Treats vertigo (dizziness)', 'betahistine'],
];

// word or "two word" key -> use
const INDEX = new Map();
GROUPS.forEach(([use, spec]) => {
  const [words, ...phrases] = spec.split('|').map((s) => s.trim());
  words.split(/\s+/).filter(Boolean).forEach((w) => INDEX.set(w, use));
  phrases.forEach((p) => INDEX.set(p, use));
});

// Words that describe the form or release type, not the medicine.
const NOISE = new Set([
  'tab', 'tabs', 'tablet', 'tablets', 'cap', 'caps', 'capsule', 'capsules', 'syp', 'syrup', 'inj',
  'injection', 'drops', 'drop', 'gel', 'cream', 'oint', 'ointment', 'susp', 'suspension', 'sr', 'xr',
  'er', 'cr', 'mr', 'od', 'plus', 'forte', 'dt', 'ds', 'and', 'with', 'the',
]);
const NUMBER_LIKE = /^\d+(\.\d+)?([a-z]{1,4}|%)?$/; // 500mg, 60000iu, 10ml, 5

function tokenize(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9.%]+/g, ' ')
    .split(' ')
    .filter((t) => t && !NOISE.has(t) && !NUMBER_LIKE.test(t));
}

/** One-line use for a medicine name, or '' when we do not know it. */
function lookupPurpose(name) {
  const tokens = tokenize(name);
  for (let i = 0; i < tokens.length; i++) {
    if (i + 1 < tokens.length) {
      const phrase = `${tokens[i]} ${tokens[i + 1]}`;
      if (INDEX.has(phrase)) return INDEX.get(phrase);
    }
    if (INDEX.has(tokens[i])) return INDEX.get(tokens[i]);
  }
  return '';
}

const MAX_PURPOSE_LENGTH = 100;

/** Cleans a user-typed purpose: returns '' (blank), a string, or null when invalid. */
function cleanPurpose(value) {
  if (value === undefined || value === null) return undefined;
  const text = String(value).replace(/[\u0000-\u001F]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return undefined;
  return text.length > MAX_PURPOSE_LENGTH ? null : text;
}

module.exports = { lookupPurpose, cleanPurpose, MAX_PURPOSE_LENGTH, GROUPS };
