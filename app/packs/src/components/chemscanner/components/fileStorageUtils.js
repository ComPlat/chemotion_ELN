import { List, Map } from 'immutable';

const selectFileChildren = (rowNode) => {
  const { data, selected } = rowNode;

  const isFileSelected = data.type === 'File';
  if (!isFileSelected) return;

  const { childrenAfterGroup } = rowNode;
  if (!childrenAfterGroup) return;

  const childrenSchemes = rowNode.childrenAfterGroup.filter(node => (
    node.data.type === 'Scheme'
  ));
  const childrenFiles = rowNode.childrenAfterGroup.filter(node => (
    node.data.type === 'File'
  ));

  childrenSchemes.forEach(node => node.setSelected(selected));
  childrenFiles.forEach((node) => {
    node.setSelected(selected);
    selectFileChildren(node);
  });
};

export const onRowSelected = (event) => {
  selectFileChildren(event.node);
};

export const versionGetter = n => (n.data.type === 'Item' ? '' : n.data.version);
export const fileNameGetter = data => (data[`${data.type.toLowerCase()}Name`]);
// export const fileNameGetter = data => {
//   return data.get('fileName');
// };

export const getNodeChildDetails = (rowItem) => {
  const { children, fileName, type } = rowItem;
  if (!children || children.length === 0) return null;

  let { expanded } = rowItem;
  if (expanded == null) expanded = !(type === 'ItemSummary');

  return {
    group: true,
    expanded,
    children,
    key: fileName
  };
};

const addChildren = (file, child) => {
  const children = file.children || [];
  children.push(child);

  // eslint-disable-next-line no-param-reassign
  file.children = children;
};

const buildFileTree = (files) => {
  const fileMap = {};
  const jsFiles = [];

  files.forEach((immuFile) => {
    const file = immuFile.toJS();
    file.type = 'File';
    file.gridId = `File_${file.id}`;

    const extMData = file.extendedMetadata;
    let expanded;
    // eslint-disable-next-line prefer-destructuring
    if (extMData) expanded = extMData.expanded;
    if (expanded == null) expanded = true;
    file.expanded = expanded;

    const { id } = file;
    fileMap[id] = file;

    jsFiles.push(file);

    // const fileSchemes = schemes.filter(s => s.get('sourceId') === file.id);
    // fileSchemes.forEach((scheme) => {
    //   const idx = scheme.get('index');
    //   schemeMap[idx] = schemeMap[idx]
    // });
  });

  jsFiles.forEach((file) => {
    const { parentId } = file;
    if (!parentId) return;

    const parent = fileMap[parentId];
    if (parent.display && !file.display) {
      /* eslint-disable no-param-reassign */
      file.display = parent.display;
      file.show = parent.show;

      const { expanded } = parent;
      if (expanded != null) file.expanded = expanded;
      /* eslint-enable no-param-reassign */
    }

    addChildren(parent, file);
  });

  const fileTree = Object.keys(fileMap).sort((a, b) => b - a).reduce((arr, fileId) => {
    const file = fileMap[fileId];
    const { parentId } = file;
    if (parentId) return arr;

    arr.push(file);
    return arr;
  }, []);

  return { fileTree, fileMap };
};

const buildFileSchemeTree = (fileTree, fileMap, schemes, reactions, molecules) => {
  const schemeArr = [];

  schemes.forEach((immuScheme) => {
    const scheme = immuScheme.toJS();

    const extMData = immuScheme.get('extendedMetadata');
    let expanded;
    if (extMData) expanded = extMData.get('expanded');
    if (expanded == null) expanded = true;
    scheme.expanded = expanded;

    schemeArr.push(scheme);

    const { version, imageData } = scheme;
    scheme.type = 'Scheme';
    scheme.gridId = `Scheme_${scheme.id}`;

    const file = fileMap[scheme.sourceId];
    if (!file) return;

    const { fileName } = file;

    const noFileSchemes = schemes.filter(s => s.get('sourceId') === file.id).size;
    file.schemeCount = noFileSchemes;
    file.version = version;

    let leaf = file;
    if (noFileSchemes > 1) {
      scheme.schemeName = `Scheme ${scheme.index + 1}`;
      scheme.fileName = fileName;
      addChildren(file, scheme);
      leaf = scheme;
    } else if (noFileSchemes === 1) {
      file.schemeId = scheme.id;
      file.schemeExtendedMetadata = scheme.extendedMetadata;
      file.imageData = imageData;

      if (scheme.show) file.show = true;
    }

    const type = 'Item';
    const schemeMolecules = molecules.filter(m => m.get('schemeId') === scheme.id);
    const schemeReactions = reactions.filter(r => r.get('schemeId') === scheme.id);

    const approvedReactions = schemeReactions.filter(r => r.get('isApproved'));
    const approvedMolecules = schemeMolecules.filter(m => m.get('isApproved'));
    if (approvedReactions.size === schemeReactions.size &&
        approvedMolecules.size === schemeMolecules.size) {
      scheme.isApproved = true;
    } else {
      scheme.isApproved = false;
    }

    const importedReactions = schemeReactions.filter(r => r.get('importedId'));
    const importedMolecules = schemeMolecules.filter(m => m.get('importedId'));
    if (importedReactions.size === schemeReactions.size &&
        importedMolecules.size === schemeMolecules.size) {
      scheme.isImported = true;
    } else {
      scheme.isImported = false;
    }

    let moleculesWarnings = [];
    const moleculeArr = [];
    schemeMolecules.forEach((m) => {
      const moleculeRow = {
        id: m.get('id'),
        gridId: `${type}_${m.get('id')}`,
        type,
        itemType: 'Molecule',
        fileName,
        isApproved: m.get('isApproved'),
        isImported: !!m.get('importedId'),
        itemName: `Molecule ${m.get('id')}`,
      };

      const extData = (m.get('extendedMetadata') || Map());
      const warnings = (extData.get('warnings') || List()).toJS();
      if (warnings.length > 0) {
        const mWarnings = warnings.map(w => `Molecule ${m.get('id')}: ${w}`);
        moleculesWarnings = moleculesWarnings.concat(mWarnings);

        moleculeRow.extendedMetadata = { warnings };
      }

      moleculeArr.push(moleculeRow);
    });

    const moleculeSummary = {
      fileName,
      itemsummaryName: `Molecules: ${scheme.moleculeCount}`,
      type: 'ItemSummary',
      itemType: 'Molecule',
      version
    };
    if (moleculesWarnings.length > 0) {
      moleculeSummary.extendedMetadata = { warnings: moleculesWarnings };
    }
    if (moleculeArr.length > 0) moleculeSummary.children = moleculeArr;
    addChildren(leaf, moleculeSummary);

    let reactionsWarnings = [];
    const reactionArr = [];
    schemeReactions.forEach((r) => {
      const reactionRow = {
        type,
        id: r.get('id'),
        gridId: `${type}_${r.get('id')}`,
        itemType: 'Reaction',
        fileName,
        isApproved: r.get('isApproved'),
        itemName: `Reaction ${r.get('id')}`,
        isImported: !!r.get('importedId'),
      };

      const extData = (r.get('extendedMetadata') || Map());
      const warnings = (extData.get('warnings') || List()).toJS();
      if (warnings.length > 0) {
        const rWarnings = warnings.map(w => `Reaction ${r.get('id')}: ${w}`);
        reactionsWarnings = reactionsWarnings.concat(rWarnings);

        reactionRow.extendedMetadata = { warnings };
      }

      reactionArr.push(reactionRow);
    });

    const reactionSummary = {
      fileName,
      itemsummaryName: `Reactions: ${scheme.reactionCount}`,
      type: 'ItemSummary',
      itemType: 'Reaction',
      version
    };
    if (reactionsWarnings.length > 0) {
      reactionSummary.extendedMetadata = { warnings: reactionsWarnings };
    }
    if (reactionArr.length > 0) reactionSummary.children = reactionArr;
    addChildren(leaf, reactionSummary);
  });

  return schemeArr;
};

export const buildRowData = (files, schemes, reactions, molecules) => {
  const { fileTree, fileMap } = buildFileTree(files);
  const schemeArr = buildFileSchemeTree(
    fileTree,
    fileMap,
    schemes,
    reactions,
    molecules
  );

  // Dectect file approve
  Object.values(fileMap).forEach((file) => {
    const fileSchemes = schemeArr.filter(s => s.sourceId === file.id);

    const numApprovedSchemes = fileSchemes.filter(s => s.isApproved).length;
    if (fileSchemes.length === numApprovedSchemes && numApprovedSchemes > 0) {
      // eslint-disable-next-line no-param-reassign
      file.isApproved = true;
    } else {
      // eslint-disable-next-line no-param-reassign
      file.isApproved = false;
    }

    const numImportedSchemes = fileSchemes.filter(s => s.isImported).length;
    if (fileSchemes.length === numImportedSchemes && numImportedSchemes > 0) {
      // eslint-disable-next-line no-param-reassign
      file.isImported = true;
    } else {
      // eslint-disable-next-line no-param-reassign
      file.isImported = false;
    }
  });

  Object.values(fileMap).forEach((file) => {
    const { children } = file;
    if (!children || children.length === 0) return;

    if (children[0].type !== 'File') return;

    const numApprovedChildren = children.filter(f => f.isApproved).length;
    if (children.length === numApprovedChildren && numApprovedChildren > 0) {
      // eslint-disable-next-line no-param-reassign
      file.isApproved = true;
    } else {
      // eslint-disable-next-line no-param-reassign
      file.isApproved = false;
    }

    const numImportedChildren = children.filter(f => f.isImported).length;
    if (children.length === numImportedChildren && numImportedChildren > 0) {
      // eslint-disable-next-line no-param-reassign
      file.isImported = true;
    } else {
      // eslint-disable-next-line no-param-reassign
      file.isImported = false;
    }
  });

  return fileTree;
};

const insertItemToGridData = (gridData, item, insertIdx) => {
  gridData.splice(insertIdx, 0, item);

  gridData.forEach((idx) => {
    if (idx > insertIdx) {
      // eslint-disable-next-line no-param-reassign
      gridData[idx].gridIdx += 1;
    }
  });
};

// export const buildTreeData = (files, schemes, reactions, molecules) => {
//   const fileData = [];
//   const fileMap = {};

//   files.forEach((immuFile) => {
//     const file = immuFile.toJS();
//     file.type = 'File';
//     file.gridId = `File_${file.id}`;
//     file.gridIdx = files.indexOf(immuFile);

//     const extMData = file.extendedMetadata;
//     let expanded;
//     // eslint-disable-next-line prefer-destructuring
//     if (extMData) expanded = extMData.expanded;
//     if (expanded == null) expanded = true;
//     file.expanded = expanded;

//     const { id } = file;
//     fileMap[id] = file;
//     fileData.push(file);
//   });

//   schemes.forEach((immuScheme) => {
//     const scheme = immuScheme.toJS();
//     scheme.type = 'Scheme';
//     scheme.gridId = `File_${scheme.id}`;

//     const fileIdx = fileMap[scheme.sourceId];
//     const file = fileData[fileIdx];
//     if (!file.expanded) { return; }

//     insertItemToGridData(fileData, scheme, fileIdx + 1);
//   });

//   return fileData;
// };


const concatData = (newData, data, level = 0) => {
  data.forEach((item) => {
    // eslint-disable-next-line no-param-reassign
    item.level = level;
    newData.push(item);
    if (item.expanded && item.children) {
      concatData(newData, item.children, level + 1);
    }
  });
};

export const buildTreeData = (rowData) => {
  const newData = [];
  concatData(newData, rowData);

  return newData;
};
