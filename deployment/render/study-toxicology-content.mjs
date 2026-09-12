/** Independently written reviews matched to five exact source recalls. No invented options. */
import {createHash} from 'node:crypto';
export const toxicologyReviewEntries = [
  [
    "part2-toxicology-q09",
    {
      "stem": "A child has recent upper respiratory symptoms, hepatomegaly, and elevated liver enzymes after a parent used an over-the-counter medication for the illness. Which substance is implicated in the source recall?",
      "options": [
        [
          "A",
          "Paracetamol"
        ],
        [
          "X",
          "Other recalled options were not preserved in the source"
        ]
      ],
      "sourceKey": "A",
      "reviewOnly": true,
      "sourcePage": 596,
      "sourceQuestion": "Toxicology Q9",
      "references": [
        {
          "sourceName": "Royal Children's Hospital: Paracetamol poisoning",
          "part": "Clinical review reference",
          "page": null,
          "questionNumber": null,
          "url": "https://www.rch.org.au/clinicalguide/guideline_index/paracetamol_poisoning/"
        }
      ],
      "note": "The source preserves A (paracetamol/acetaminophen) but no other substantive option, so this is a review item, not a complete MCQ. Excess acetaminophen can cause hepatic injury, including after repeated excessive doses during an intercurrent illness. Confirm the actual product, formulation and dosing history; an unspecified OTC medicine alone does not establish the diagnosis. Assess serum paracetamol and liver enzymes. The acute-ingestion nomogram must not be used for repeated supratherapeutic ingestion; acetylcysteine decisions require the appropriate pathway and toxicology advice."
    }
  ],
  [
    "part2-toxicology-q10",
    {
      "stem": "A child develops acute vomiting and diarrhea with heme-positive stool, and the mother is pregnant. Which household medication is the most likely exposure among the listed options?",
      "options": [
        [
          "A",
          "Iron"
        ],
        [
          "B",
          "Folic acid"
        ],
        [
          "C",
          "Paracetamol"
        ]
      ],
      "sourceKey": "A",
      "reviewOnly": false,
      "sourcePage": 597,
      "sourceQuestion": "Toxicology Q10",
      "references": [
        {
          "sourceName": "Royal Children's Hospital: Iron poisoning",
          "part": "Clinical review reference",
          "page": null,
          "questionNumber": null,
          "url": "https://www.rch.org.au/clinicalguide/guideline_index/iron_poisoning/"
        }
      ],
      "note": "A (iron) is the best fit among the listed options: iron can injure the gastrointestinal mucosa, causing vomiting, diarrhea and bleeding. Maternal pregnancy suggests possible access to iron supplements; it does not prove ingestion. Folic acid and paracetamol are less consistent with this acute gastrointestinal bleeding pattern. Assess the elemental iron exposure, timing, symptoms and serum iron; transient improvement does not exclude subsequent systemic toxicity."
    }
  ],
  [
    "part2-toxicology-q11",
    {
      "stem": "A child has acute gastrointestinal symptoms and an abdominal radiograph shows multiple radiopaque tablets consistent with iron ingestion. Which treatment is selected from the listed choices?",
      "options": [
        [
          "A",
          "Deferoxamine"
        ],
        [
          "B",
          "Naloxone"
        ],
        [
          "C",
          "Laxative"
        ]
      ],
      "sourceKey": "A",
      "reviewOnly": true,
      "sourcePage": 597,
      "sourceQuestion": "Toxicology Q11",
      "references": [
        {
          "sourceName": "Royal Children's Hospital: Iron poisoning",
          "part": "Clinical review reference",
          "page": null,
          "questionNumber": null,
          "url": "https://www.rch.org.au/clinicalguide/guideline_index/iron_poisoning/"
        }
      ],
      "note": "The source key is A (deferoxamine/desferrioxamine), an iron chelator. Visible tablets alone do not establish a need for chelation: severity and serum iron guide treatment with toxicology advice. Severe systemic toxicity requires prompt chelation without waiting for serum iron. Whole-bowel irrigation may be appropriate for selected substantial tablet ingestions, but does not replace indicated chelation. Activated charcoal does not bind iron. The recall omits dose, serum iron and adequate severity information; retain it for review without scoring rather than teach automatic chelation from an X-ray."
    }
  ],
  [
    "part2-toxicology-q12",
    {
      "stem": "An 11-year-old girl has rigidity, myoclonus, delirium, tachycardia, mydriasis, seizure, dry skin, mild hyperthermia, absent bowel sounds, and a distended bladder. Which listed drug class is the most likely exposure?",
      "options": [
        [
          "A",
          "Amphetamine"
        ],
        [
          "B",
          "Benzodiazepines"
        ],
        [
          "C",
          "Tricyclic antidepressants"
        ],
        [
          "D",
          "Barbiturates"
        ]
      ],
      "sourceKey": "C",
      "reviewOnly": false,
      "sourcePage": 597,
      "sourceQuestion": "Toxicology Q12",
      "references": [
        {
          "sourceName": "Royal Children's Hospital: Tricyclic Antidepressant (TCA) Poisoning",
          "part": "Clinical review reference",
          "page": null,
          "questionNumber": null,
          "url": "https://www.rch.org.au/clinicalguide/guideline_index/Tricyclic_Antidepressant_%28TCA%29_Poisoning/"
        }
      ],
      "note": "C (tricyclic antidepressants) best explains the combined anticholinergic findings, seizures and tachycardia. Dry skin, ileus and urinary retention are particularly useful clues; rigidity or myoclonus alone is not diagnostic. Benzodiazepines and barbiturates more typically depress consciousness, while amphetamine does not explain the entire anticholinergic pattern as well. Obtain an ECG and monitor for QRS widening and arrhythmias. Seizures are treated with benzodiazepines; sodium bicarbonate is used for QRS widening or ventricular arrhythmias with expert management. This is an explanation of the provided differential, not proof of an exposure."
    }
  ],
  [
    "part2-toxicology-q13",
    {
      "stem": "What acid-base pattern is expected in salicylate poisoning according to the source recall?",
      "options": [
        [
          "A",
          "Metabolic acidosis with respiratory alkalosis"
        ],
        [
          "X",
          "Other recalled options were not preserved in the source"
        ]
      ],
      "sourceKey": "A",
      "reviewOnly": true,
      "sourcePage": 598,
      "sourceQuestion": "Toxicology Q13",
      "references": [
        {
          "sourceName": "Royal Children's Hospital: Salicylates poisoning",
          "part": "Clinical review reference",
          "page": null,
          "questionNumber": null,
          "url": "https://www.rch.org.au/clinicalguide/guideline_index/Salicylates_Posioning/"
        }
      ],
      "note": "The preserved answer A describes a classic salicylate pattern, not a mandatory finding in every patient. Respiratory alkalosis may occur early; metabolic acidosis can develop with or without persistent respiratory alkalosis. Absence of obvious hyperventilation in a child does not exclude significant toxicity. Interpret the blood gas and compensation in clinical context. Because the source supplies only one substantive option, no distractors are invented and this item remains unscored."
    }
  ]
];
const imageRecord = toxicologyReviewEntries.find(([id]) => id === 'part2-toxicology-q11')[1];
const imageSHA256 = '0cd28f2f72db186a6e698ca79eb096c74521abb6026db1559ed3c770a92e83e9';
export function verifiedToxicologyImage(bytes) {
  if (!Buffer.isBuffer(bytes) || createHash('sha256').update(bytes).digest('hex') !== imageSHA256) return null;
  return {dataUrl:'data:image/jpeg;base64,' + bytes.toString('base64'),width:191,height:228,
    alt:'Original source abdominal radiograph for Toxicology Q11.',
    caption:'Original question image: source collection, PDF page 597, Toxicology Q11. Native resolution: 191 x 228 pixels.'};
}
// Keep the user-supplied image out of the public source repository. The small
// immutable JPEG is configured on the server; only authenticated question JSON
// carries it to a learner. Missing or changed bytes leave the image unavailable.
let cachedEncoded = null, cachedImage = null;
function configuredImage() {
  const encoded = process.env.PEDIA_Q11_SOURCE_IMAGE_BASE64;
  if (encoded === cachedEncoded) return cachedImage;
  cachedEncoded = encoded;
  cachedImage = typeof encoded === 'string' && encoded.length < 20000 &&
    /^[A-Za-z0-9+/]+={0,2}$/.test(encoded) ? verifiedToxicologyImage(Buffer.from(encoded,'base64')) : null;
  return cachedImage;
}
export function toxicologySourceImageFor({id,stem,options,key}) {
  if (id !== 'part2-toxicology-q11' || stem !== imageRecord.stem || key !== imageRecord.sourceKey ||
      JSON.stringify(options.map(o=>[o.key,o.text])) !== JSON.stringify(imageRecord.options)) return null;
  const image=configuredImage();
  return image ? {...image} : null;
}
