import React from 'react';
import _ from 'lodash';
import { SVGContent } from './SectionReaction';
import QuillViewer from '../QuillViewer';
import { fixDigit, validDigit } from '../utils/MathUtils';
import { rmOpsRedundantSpaceBreak, frontBreak } from '../utils/quillFormat';
import ArrayUtils from '../utils/ArrayUtils';
import { Alphabet } from '../utils/ElementUtils';
import { UserSerial } from '../utils/ReportHelper';

const onlyBlank = (target) => {
  if (target.length === 0) return true;
  const content = target.map(t => t.insert).join('').replace(/\s+/, '');
  return !content;
};

const deltaUserSerial = (molecule, molSerials) => {
  const insert = UserSerial(molecule, molSerials);
  return { insert, attributes: { bold: 'true' } };
};

const Title = ({ el, counter, molSerials }) => {
  let title = [];
  el.products.forEach((p, i) => {
    const us = UserSerial(p.molecule, molSerials);
    const key = `${i}-text`;
    const comma = <span key={`${i}-comma`}>, </span>;
    const smn = p.showedName();
    title = smn
      ? [...title, <span key={key}>{smn} (<b>{us}</b>)</span>, comma]
      : [...title, <span key={key}>&quot;<b>NAME</b>&quot; (<b>{us}</b>)</span>, comma];
  });
  title = _.flatten(title).slice(0, -1);

  return (
    <h5>
      <span>4.{counter} </span>
      <span>{title}</span>
    </h5>
  );
};

const deltaSampleMoleculeName = (s) => {
  const smn = s.showedName();
  if (smn) {
    return { insert: smn };
  }
  return { attributes: { bold: 'true' }, insert: '"NAME"' };
};

const isDisableAll = (settings) => {
  let status = false;
  const settingKeys = Object.keys(settings);
  settingKeys.forEach((key) => {
    status = status || settings[key];
  });
  return !status;
};

const productEA = (p) => {
  let ea = [];
  p.elemental_compositions.forEach((ec) => {
    if (ec.description === 'By molecule formula') {
      for (let [k, v] of Object.entries(ec.data)) {
        ea = [...ea, `${k}, ${v}`];
      }
    }
    return null;
  });
  ea = ea.filter(r => r != null).join('; ');
  return ea;
};

const prdIdentifier = (counter, mol, molSerials) => (
  [
    { insert: `{P${counter}|` },
    deltaUserSerial(mol, molSerials),
    { insert: '}' },
  ]
);

const productContent = (products, settings, molSerials) => {
  let content = [];
  let counter = 0;

  products.forEach((p) => {
    const m = p.molecule;
    const ea = productEA(p);
    counter += 1;

    const cas = p.xref && p.xref.cas ? p.xref.cas.value : '- ';
    const deltaName = settings.Name ? [
      { insert: 'Name ' },
      ...prdIdentifier(counter, m, molSerials),
      { insert: ': ' },
      deltaSampleMoleculeName(p),
      { insert: '; ' },
    ] : [];

    const pFormula = settings.Formula ? `Formula: ${m.sum_formular}; ` : '';
    const pCAS = settings.CAS ? `CAS: ${cas}; ` : '';
    const pMMass = settings.MolecularMas
      ? `Molecular Mass: ${fixDigit(m.molecular_weight, 4)}; ` : '';
    const pEMass = settings.ExactMass
      ? `Exact Mass: ${fixDigit(m.exact_molecular_weight, 4)}; ` : '';
    const pEA = settings.EA ? `EA: ${ea}.` : '';

    const pSmiles = `Smiles: ${m.cano_smiles}`;
    const pInChI = `InChIKey: ${m.inchikey}`;
    const dSmiles = settings.Smiles
      ? [{ insert: pSmiles }, { insert: '\n' }]
      : [];
    const dInChI = settings.InChI
      ? [{ insert: pInChI }, { insert: '\n' }]
      : [];

    content = [...content, ...deltaName,
      { insert: pFormula + pCAS + pMMass + pEMass + pEA },
      { insert: '\n' },
      ...dSmiles,
      ...dInChI,
      { insert: '\n' },
    ];
  });
  return content;
};

const ProductsInfo = ({ products = [], settings, molSerials }) => {
  const disableAll = isDisableAll(settings);
  if (disableAll) return null;

  const content = productContent(products, settings, molSerials);
  return <QuillViewer value={{ ops: content }} />;
};

const stAndReContent = (el, prevContent, molSerials) => {
  let counter = 0;
  let content = prevContent;
  [...el.starting_materials, ...el.reactants].forEach((elm) => {
    counter += 1;
    content = [...content,
      { insert: `{${Alphabet(counter)}|` },
      deltaUserSerial(elm.molecule, molSerials),
      { insert: '} ' },
      deltaSampleMoleculeName(elm),
      { insert: ` (${validDigit(elm.amount_g, 3)} g, ${validDigit(elm.amount_mol * 1000, 3)} mmol, ${validDigit(elm.equivalent, 3)} equiv); ` }];
  });
  return { content };
};

const solventsContent = (el, prevContent) => {
  let counter = 0;
  let content = prevContent;
  el.solvents.forEach((elm) => {
    counter += 1;
    content = [...content,
      { insert: `{S${counter}` },
      { insert: '} ' },
      deltaSampleMoleculeName(elm),
      { insert: ` (${validDigit(elm.amount_l * 1000, 2)} mL); ` }];
  });
  return { content };
};

const porductsContent = (el, prevContent, molSerials) => {
  let counter = 0;
  let content = prevContent;
  content = [...content, { insert: 'Yield: ' }];
  el.products.forEach((p) => {
    const mol = p.molecule;
    counter += 1;
    content = [...content, ...prdIdentifier(counter, mol, molSerials),
      { insert: ` = ${validDigit(p.equivalent * 100, 0)}%` },
      { insert: ` (${validDigit(p.amount_g, 3)} g, ${validDigit(p.amount_mol * 1000, 3)} mmol)` },
      { insert: '; ' }];
  });
  content = content.slice(0, -1);
  content = [...content, { insert: '.' }];
  return { content };
};

const materailsContent = (el, molSerials) => {
  const content = [];
  const stAndRe = stAndReContent(el, content, molSerials);
  const solvCon = solventsContent(el, stAndRe.content);
  const prodCon = porductsContent(el, solvCon.content, molSerials);

  return prodCon.content;
};

const tlcContent = (el) => {
  let content = [];
  if (el.tlc_solvents) {
    content = [{ attributes: { italic: 'true' }, insert: 'R' },
      { attributes: { script: 'sub', italic: 'true' }, insert: 'f' },
      { insert: ` = ${el.rf_value} (${el.tlc_solvents}).` }];
  }
  return content;
};

const obsvTlcContent = (el) => {
  let content = [];
  const ops = el.observation.ops || [];
  content = [...ops, ...tlcContent(el)];
  content = rmOpsRedundantSpaceBreak(content);
  if (onlyBlank(content)) return [];
  return frontBreak(content);
};

const rmHeadSpace = (content) => {
  let els = content;
  let head = null;
  els.some((el) => {
    head = el.insert.replace(/^\s+/, '');
    if (!head) els = [...els.slice(1)];
    return head;
  });
  if (onlyBlank(els) || !head) return [];
  els[0].insert = head;

  return els;
};

const rmTailSpace = (content) => {
  let els = content;
  let tail = null;
  els.reverse().some((el) => {
    tail = el.insert.replace(/\s*[,.;]*\s*$/, '');
    if (!tail) els = [...els.slice(1)];
    return tail;
  });
  if (onlyBlank(els) || !tail) return [];
  els.reverse();
  els[els.length - 1].insert = tail;

  return els;
};

const opsTailWithSymbol = (els, symbol) => [...els, { insert: symbol }];

const endingSymbol = (content, symbol) => {
  if (onlyBlank(content)) return [];

  let els = rmHeadSpace(content);
  els = rmTailSpace(els);

  if (onlyBlank(els)) return [];

  return opsTailWithSymbol(els, symbol);
};

const analysesContent = (products) => {
  let content = [];
  products.forEach((p) => {
    const sortAnalyses = ArrayUtils.sortArrByIndex(p.analyses);
    sortAnalyses.forEach((a) => {
      const data = a && a.extended_metadata
        && a.extended_metadata.report
        && a.extended_metadata.report === 'true'
        ? JSON.parse(a.extended_metadata.content)
        : { ops: [] };
      content = [...content, ...endingSymbol(data.ops, '; ')];
    });
  });
  if (onlyBlank(content)) return [];
  content = rmOpsRedundantSpaceBreak(content);
  content = [...content.slice(0, -1), { insert: '.' }];
  return frontBreak(content);
};

const dangContent = (el) => {
  if (el.dangerous_products.length === 0) return [];
  let content = [{ attributes: { bold: 'true' }, insert: 'Attention! ' },
    { insert: 'The reaction includes the use of dangerous ' +
      'chemicals, which have the following ' +
      'classification: ' }];
  el.dangerous_products.forEach((d) => {
    content = [...content, { insert: d }, { insert: ', ' }];
  });
  content = content.slice(0, -1);
  content = rmOpsRedundantSpaceBreak(content);
  return content;
};

const DangerBlock = ({ el }) => {
  const block = dangContent(el);
  return block.length > 0 ? <QuillViewer value={{ ops: block }} /> : null;
};

const descContent = (el) => {
  if (el.role !== 'single') return [];
  let block = rmOpsRedundantSpaceBreak(el.description.ops);
  block = [{ insert: '\n' }, ...block, { insert: '\n' }];
  return block;
};

const synNameContent = (el) => {
  const title = el.name || el.short_label;
  return [{ insert: `${title}: ` }];
};

const ContentBlock = ({ el, molSerials }) => {
  const synName = synNameContent(el);
  const desc = descContent(el);
  const materials = materailsContent(el, molSerials);
  const obsvTlc = obsvTlcContent(el);
  const analyses = analysesContent(el.products);
  const block = [...synName, ...desc, ...materials, ...obsvTlc, ...analyses];
  return <QuillViewer value={{ ops: block }} />;
};

const docFragment = (input) => {
  const t = document.createElement('template');
  t.innerHTML = input;
  try {
    return t.content.childNodes[0].childNodes[1].childNodes[2].childNodes;
  } catch (err) {
    return null;
  }
};

const bibContent = (bib, idx) => {
  let delta = [{ insert: `[${idx + 1}] ` }];
  const nodes = docFragment(bib);
  if (!nodes) return [];
  nodes.forEach((node) => {
    const text = node.textContent;
    let target = { insert: text };
    if (node.nodeName === 'I') {
      target = { attributes: { italic: 'true' }, insert: text };
    } else if (node.nodeName === 'B') {
      target = { attributes: { bold: 'true' }, insert: text };
    }
    delta = [...delta, target];
  });
  return [...delta, { insert: '\n' }];
};

const ZoteroBlock = ({ el }) => {
  const refs = el.references || [];
  let bibs = [];
  refs.forEach((ref, idx) => {
    bibs = [...bibs, ...bibContent(ref.bib, idx)];
  });

  return bibs.length > 0
    ? <QuillViewer value={{ ops: bibs }} />
    : null;
};

const SynthesisRow = ({ el, counter, configs, molSerials, settings }) => (
  <div>
    <Title el={el} counter={counter} molSerials={molSerials} />
    <SVGContent
      show
      svgPath={el.svgPath}
      products={el.products}
      isProductOnly={!configs.Showallchemi}
    />
    <ProductsInfo
      products={el.products}
      settings={settings}
      molSerials={molSerials}
    />
    <ContentBlock el={el} molSerials={molSerials} />
    <DangerBlock el={el} />
    <ZoteroBlock el={el} />
  </div>
);

const SectionSiSynthesis = ({
  previewObjs, configs, molSerials, settings,
}) => {
  let counter = 0;
  const contents = previewObjs.map((obj) => {
    if (obj.type === 'reaction' && obj.role !== 'gp') {
      counter += 1;
      return (
        <SynthesisRow
          id={obj.id}
          key={obj.id}
          el={obj}
          counter={counter}
          configs={configs}
          molSerials={molSerials}
          settings={settings}
        />
      );
    }
    return null;
  }).filter(r => r !== null);

  return (
    <div>
      {contents}
    </div>
  );
};

export default SectionSiSynthesis;
