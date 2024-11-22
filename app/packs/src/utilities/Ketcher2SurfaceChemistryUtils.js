import { fuelKetcherData, mols } from "src/components/structureEditor/KetcherEditor";
import template_list_for_storage from 'src/surfaceChemistryTemplates.json';
import { template_list_data } from "../surfaceChemistryImages";

// pattern's for alias identification
const three_parts_patten = /t_\d{1,3}_\d{1,3}/;
const two_parts_pattern = /^t_\d{1,3}$/;

// enable/disable text labels Matching label A and putting images in the end
const skip_template_name_hide = false;
const skip_image_layering = false;

// image exists in dom
let images_to_be_updated = false;

// allowed to process based on atom
let allowed_to_process = true;

// tags
const inspired_label = "A";
const rails_polymer_identifier = "R#";
const template_surface = 2;
const template_bead = 1;
const poly_identifier = "> <PolymersList>";
const file_end_indentifier = "$$$$";
const molfile_header_line_number = 4;
const rgLabel = "rg-label";
const shapes = ["Bead", "Surface"];

// Helper to initialize Ketcher data
const initializeKetcherData = async (data) => {
  try {
    await fuelKetcherData(data);
  } catch (err) {
    throw new Error(`Failed to initialize Ketcher data: ${err.message}`);
  }
};

// helper function to examine the file coming ketcherrails
const hasKetcherData = async (molfile) => {
  try {
    const lines = molfile.trim().split('\n');
    let rails_polymers_list = -1;
    for (let i = lines.length - 1; i > -1; i--) {
      if (lines[i].indexOf(poly_identifier) != -1) {
        rails_polymers_list = lines[i + 1].trim();
        break;
      }
    }
    return rails_polymers_list == -1 ? null : rails_polymers_list;
  } catch (err) {
    console.error(err);
    alert("Opening this molfile is possible at the movement. Please report this molfile to chemotion ELN dev team.");
  }
};

// Helper to determine template type based on polymer value
const getTemplateType = (polymerValue) => {
  return polymerValue.includes("s") ? template_surface : template_bead;
};

// Helper to update an atom with new labels and aliases
const updateAtom = (atomLocation, templateType, imageCounter) => ({
  label: inspired_label,
  alias: `t_${templateType}_${imageCounter}`,
  location: atomLocation
});

// Helper to create a bounding box for a template
const templateWithBoundingBox = (templateType, atomLocation) => {
  const template = template_list_data[templateType];
  const boundingBox = { ...template.boundingBox };
  boundingBox.x = atomLocation[0];
  boundingBox.y = atomLocation[1];
  boundingBox.z = 0;
  return { ...template, boundingBox };
};

// helper function to process ketcherrails files and adding image to ketcher2 canvas
const adding_polymers_ketcher_format = async (railsPolymersList, _, data, image_used_counter) => {
  try {
    const polymerList = railsPolymersList.split(" "); // e.g., ["10", "11s", "12", "13s"]
    let visited_atoms = 0;
    let collected_images = [];
    await initializeKetcherData(data);

    for (const molName of mols) {
      const molecule = data[molName];
      for (let atomIndex = 0; atomIndex < molecule.atoms.length; atomIndex++) {
        const atom = molecule.atoms[atomIndex];
        const polymerItem = polymerList[visited_atoms];
        if (!(atom.type === rgLabel || three_parts_patten.test(atom.label))) continue;

        // counters
        ++image_used_counter;
        ++visited_atoms;

        // step 1: get template type
        const template_type = getTemplateType(polymerItem);
        // step 2: update atom with alias
        data[molName].atoms[atomIndex] = updateAtom(atom.location, template_type, image_used_counter);
        // step 3: sync boundingbox with atom location
        const new_template = templateWithBoundingBox(template_type, atom.location);
        // step 4: add to the list
        collected_images.push(new_template);
      }
    }
    return { c_images: collected_images, molfileData: data, image_counter: image_used_counter };
  } catch (err) {
    console.error({ err: err.message });
  }
};

// helper function to return a new image in imagesList with a location
const prepareImageFromTemplateList = (idx, location) => {
  template_list_data[idx].boundingBox.x = location[0];
  template_list_data[idx].boundingBox.y = location[1];
  template_list_data[idx].boundingBox.z = location[2];
  return template_list_data[idx];
};

// helper funcation to update counter for other mols when a image-template is removed
const resetOtherAliasCounters = (atom, mols, latestData) => {
  for (let m = 0; m < mols?.length; m++) {
    const mol = mols[m];
    const atoms = latestData[mol]?.atoms;
    for (let a = 0; a < atoms?.length; a++) {
      const item = atoms[a];
      if (three_parts_patten.test(item.alias)) {
        const atom_splits = atom?.alias?.split("_");
        const item_splits = item?.alias?.split("_");
        if (parseInt(atom_splits[2]) <= parseInt(item_splits[2])) {
          if (parseInt(item_splits[2]) == 0) continue;
          let step_back = parseInt(item_splits[2]) - 1;
          const new_alias = `${item_splits[0]}_${item_splits[1]}_${step_back}`;
          atoms[a].alias = new_alias;
        }
      }
    }
  };
  return latestData;
};

// to find is new atom
const isNewAtom = (eventItem) => {
  return eventItem.label === inspired_label;
};

//  Removes a molecule from `data` and updates the root node structure.
const removeMoleculeFromData = (data, molKey) => {
  // Filter out the node referencing the removed molecule
  return data.root.nodes.filter(node => node.$ref !== molKey);;
};

// Updates atom aliases in a molecule after removing certain images and updates the molecule data.
const updateMoleculeAliases = async (container, atoms_list) => {
  for (const img_idx of container) {
    for (let i = 0; i < atoms_list.length; i++) {
      const atom = atoms_list[i];
      if (three_parts_patten.test(atom.alias)) {
        const splits = atom.alias.split("_");
        if (parseInt(splits[2]) > img_idx) {
          atoms_list[i].alias = `t_${splits[1]}_${parseInt(splits[2]) - 1}`;
        }
      }
    }
  }
  return atoms_list;
};

const updateBondList = (indexToMatch, bondList) => {
  // Update bonds to reflect the removal of the atom
  let list = [];
  for (let ba of bondList) {
    if (!ba.atoms.includes(indexToMatch)) {
      const adjustedAtoms = ba.atoms.map(j => (j > indexToMatch ? j - 1 : j));
      list.push({ ...ba, atoms: adjustedAtoms });
    }
  }
  return list;
};

// Removes atoms that match specific criteria, updates bonds, and collects removed indices.
const removeAndUpdateAtoms = async (atomsList, bondsList, images, container) => {
  let imageFoundIndex = 0;

  // Iterate backwards to avoid index-shifting issues
  for (let i = atomsList.length - 1; i >= 0; i--) {
    const atom = atomsList[i];

    if (atom?.alias && atom.label == inspired_label) {
      const imgIndex = parseInt(atom.alias.split("_")[2]);
      if (images.has(imgIndex)) {
        container.add(imgIndex);
        bondsList = updateBondList(i, bondsList); // Update bonds to reflect the removal of the atom
        atomsList.splice(i, 1); // Remove the atom
        imageFoundIndex++; // Increment counter for found images
      }
    }
  }
  return {
    updatedAtoms: atomsList,
    updatedBonds: bondsList,
    removedIndices: container,
    removedCount: imageFoundIndex,
    selectedImageList: images
  };
};

// Updates molecule data or removes it from the dataset based on the atoms list.
const updateOrRemoveMolecule = async (molecule, container, atomsList, bondsList) => {
  // Molecule has atoms, update its data
  molecule.atoms = await updateMoleculeAliases(container, atomsList);
  molecule.bonds = bondsList;
  return molecule;
};

// remove image from the template
const removeImageTemplateAtom = async (images, mols, data) => {
  try {
    let removeIndexList = new Set();
    let imageFoundIndexCount = 0;

    for (const molKey of mols) {
      const molecule = data[molKey];
      if (!molecule || !molecule.atoms) continue;
      let atoms_list = molecule?.atoms || [];
      let bonds_list = molecule?.bonds || [];

      // step 1: remove atoms and bonds based on images list
      const { updatedAtoms, updatedBonds, removedIndices, removedCount } = await removeAndUpdateAtoms(atoms_list, bonds_list, images, removeIndexList);

      // // step 2: data filler
      imageFoundIndexCount += removedCount; // Update total found count
      removedIndices.forEach(item => removeIndexList.add(item)); // updated remove indices

      // step 3: Updates molecule data or delete atoms if empty
      if (atoms_list.length) {
        data[molKey] = await updateOrRemoveMolecule(molecule, removeIndexList, updatedAtoms, updatedBonds);
      } else {
        // Molecule has no atoms, remove it from the data
        data.root.nodes = removeMoleculeFromData(data, molKey);
        delete data[molKey];
      }
    }
    return { data, imageFoundIndexCount };
  } catch (err) {
    console.error("removeImageTemplateAtom", err.message);
  }
};

// Processes atom lines to replace inspired_label with rails_polymer_identifier and collect atom aliases.
const processAtomLines = async (linesCopy, atomStarts, atomsCount) => {
  const atomAliasList = [];

  for (let i = atomStarts; i < atomsCount + atomStarts; i++) {
    const atom_line = linesCopy[i].split(" ");
    const idx = atom_line.indexOf(inspired_label);
    if (idx != -1) {
      atom_line[idx] = rails_polymer_identifier;
      atomAliasList.push(`${i - atomStarts}`);
    }
    linesCopy[i] = atom_line.join(" ");
  }
  return { linesCopy, atomAliasList };
};

// helper function for output molfile re-structure
const reAttachPolymerList = async ({ lines, atoms_count, extra_data_start, extra_data_end }) => {
  let lines_copy = [...lines];
  let list_alias = lines_copy.slice(extra_data_start, extra_data_end);
  const { linesCopy, atomAliasList }
    = await processAtomLines(lines_copy, molfile_header_line_number, atoms_count);
  linesCopy.splice(extra_data_start, extra_data_end - extra_data_start);

  lines_copy = linesCopy;

  let counter = 0;
  for (let i = 1; i < list_alias.length; i += 2) {
    const t_id = list_alias[i].split("_")[1];
    if (t_id) {
      atomAliasList[counter] += t_id == template_surface ? "s" : "";
      counter++;
    }
  }
  lines_copy.splice(lines_copy.length - 1, 0, ...[poly_identifier, atomAliasList.join(" "), file_end_indentifier]);

  return lines_copy.join("\n");
};

// DOM functions
// Function to attach click listeners based on titles
const attachListenerForTitle = (iframeDocument, selector, buttonEvents) => {
  const button = iframeDocument.querySelector(selector);
  if (button && !button.hasClickListener) {
    button.addEventListener('click', buttonEvents[selector]);
    button.hasClickListener = true;
  }
};

// function to make template list extra content hidden
const makeTransparentByTitle = (iframeDocument) => {
  const elements = iframeDocument.querySelectorAll('[title]');
  elements.forEach((element) => {
    if (shapes.indexOf(element.getAttribute('title')) != -1) {
      element.querySelectorAll("path, text").forEach((child) => {
        if (child.getAttribute("stroke-width") === "2" &&
          child.getAttribute("stroke-linecap") === "round" &&
          child.getAttribute("stroke-linejoin") === "round" ||
          (child.tagName.toLowerCase() === 'text' &&
            (child.textContent.trim() === 'R1' || child.textContent.trim() === 'A'))) {
          child.style.opacity = '0';
        }
      });
    }
  });
};

// funcation to disable canvas button based on title
const disableButton = (iframeDocument, title) => {
  const button = iframeDocument.querySelector(`[title="${title}"]`);
  if (button) {
    button.setAttribute("disabled", true);
    button.classList.add("disabled");
  }
};

// helper function to update DOM images using layering technique 
const updateImagesInTheCanvas = async (iframeRef) => {
  if (iframeRef.current) {
    const iframeDocument = iframeRef.current.contentWindow.document;
    const svg = iframeDocument.querySelector('svg'); // Get the main SVG tag
    if (svg) {
      const imageElements = iframeDocument.querySelectorAll('image'); // Select all text elements
      imageElements.forEach((img) => {
        svg?.removeChild(img);
      });

      imageElements.forEach((img) => {
        svg?.appendChild(img);
      });
    }
    images_to_be_updated = false;
  }
};

// helper funcation to update text > span > t_###_### fill transparent
const updateTemplatesInTheCanvas = async (iframeRef) => {
  const iframeDocument = iframeRef.current.contentWindow.document;
  const svg = iframeDocument.querySelector('svg'); // Get the main SVG tag
  if (svg) {
    const textElements = svg.querySelectorAll('text'); // Select all text elements
    textElements.forEach((textElem) => {
      const textContent = textElem.textContent; // Get the text content of the <text> element
      if (textContent === inspired_label) { // Check if it matches the pattern
        textElem.setAttribute('fill', 'transparent'); // Set fill to transparent
      }
    });
  }
};

// setter
const images_to_be_updated_setter = (status) => {
  images_to_be_updated = status;
};

// setter
const allowed_to_process_setter = (data) => {
  allowed_to_process = data;
};

export {
  // data store
  template_list_for_storage,
  template_list_data,

  // data patterns
  three_parts_patten,
  two_parts_pattern,

  // flags
  skip_template_name_hide,
  skip_image_layering,
  images_to_be_updated,
  allowed_to_process,

  // methods
  hasKetcherData,
  adding_polymers_ketcher_format,
  prepareImageFromTemplateList,
  resetOtherAliasCounters,
  isNewAtom,
  removeImageTemplateAtom,
  reAttachPolymerList,

  // DOM Methods
  disableButton,
  attachListenerForTitle,
  updateImagesInTheCanvas,
  updateTemplatesInTheCanvas,
  makeTransparentByTitle,

  // setters
  images_to_be_updated_setter,
  allowed_to_process_setter,

  // tags
  inspired_label,
  rails_polymer_identifier
};

