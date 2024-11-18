import { fuelKetcherData, mols } from "../components/structureEditor/KetcherEditor";

const template_list_for_storage = [
  { "struct": "{\n    \"root\": {\n        \"nodes\": [\n            {\n                \"$ref\": \"mol0\"\n            },\n            {\n                \"type\": \"image\",\n                \"format\": \"image/svg+xml\",\n                \"boundingBox\": {\n                    \"x\": 8.700000000000001,\n                    \"y\": -5.824999999999999,\n                    \"z\": 0,\n                    \"width\": 1.0749999999999995,\n                    \"height\": 1.0749999999999995\n                },\n                \"data\": \"PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4NCiAgPGRlZnM+DQogICAgPHJhZGlhbEdyYWRpZW50IGlkPSJncmFkMSIgY3g9IjUwJSIgY3k9IjUwJSIgcj0iNTAlIiBmeD0iNTAlIiBmeT0iNTAlIj4NCiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOnJnYigyNTUsMjU1LDI1NSk7c3RvcC1vcGFjaXR5OjEiIC8+DQogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOnJnYigwLDAsMCk7c3RvcC1vcGFjaXR5OjEiIC8+DQogICAgPC9yYWRpYWxHcmFkaWVudD4NCiAgPC9kZWZzPg0KICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0idXJsKCNncmFkMSkiIC8+DQo8L3N2Zz4NCg==\"\n            }\n        ],\n        \"connections\": [],\n        \"templates\": []\n    },\n    \"header\": {\n        \"moleculeName\": \"t_01\"\n    },\n    \"mol0\": {\n        \"type\": \"molecule\",\n        \"atoms\": [\n            {\n                \"label\": \"A\",\n                \"alias\": \"t_01\",\n                \"location\": [\n                    8.700000000000001,\n                    -6.550000000000001,\n                    0\n                ]\n            },\n            {\n                \"label\": \"H\",\n                \"location\": [\n                    9.700000000000001,\n                    -6.550000000000001,\n                    0\n                ]\n            }\n        ],\n        \"bonds\": [\n            {\n                \"type\": 1,\n                \"atoms\": [\n                    0,\n                    1\n                ]\n            }\n        ],\n        \"sgroups\": [\n            {\n                \"type\": \"SUP\",\n                \"atoms\": [\n                    0,\n                    1\n                ],\n                \"name\": \"\",\n                \"expanded\": true,\n                \"id\": 0,\n                \"attachmentPoints\": [\n                    {\n                        \"attachmentAtom\": 0,\n                        \"leavingAtom\": 1,\n                        \"attachmentId\": \"1\"\n                    }\n                ]\n            }\n        ]\n    }\n}", "props": { "atomid": 0, "bondid": 0 } },
  { "struct": "{\n    \"root\": {\n        \"nodes\": [\n            {\n                \"$ref\": \"mol0\"\n            },\n            {\n                \"type\": \"image\",\n                \"format\": \"image/svg+xml\",\n                \"boundingBox\": {\n                    \"x\": 8.775000000000006,\n                    \"y\": -6.000000000000000,\n                    \"z\": 0,\n                    \"width\":  2.0,\n                    \"height\": 0.5\n                },\n                \"data\": \"PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMzAwIDMwMCI+CiAgPHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIxNTAiIHk9IjgwIiByeD0iMjAiIHJ5PSIyMCIKICBzdHJva2U9IiMwMDAiIHN0cm9rZS13aWR0aD0iMTAiIGZpbGw9Ijc1NzA3MCIKICAvPgo8L3N2Zz4=\"\n            }\n        ],\n        \"connections\": [],\n        \"templates\": []\n    },\n    \"header\": {\n        \"moleculeName\": \"t_02\"\n    },\n    \"mol0\": {\n        \"type\": \"molecule\",\n        \"atoms\": [\n            {\n                \"label\": \"A\",\n                \"alias\": \"t_02\",\n                \"location\": [\n                    8.700000000000001,\n                    -6.550000000000001,\n                    0\n                ]\n            },\n            {\n                \"label\": \"H\",\n                \"location\": [\n                    9.700000000000001,\n                    -6.550000000000001,\n                    0\n                ]\n            }\n        ],\n        \"bonds\": [\n            {\n                \"type\": 1,\n                \"atoms\": [\n                    0,\n                    1\n                ]\n            }\n        ],\n        \"sgroups\": [\n            {\n                \"type\": \"SUP\",\n                \"atoms\": [\n                    0,\n                    1\n                ],\n                \"name\": \"\",\n                \"expanded\": true,\n                \"id\": 0,\n                \"attachmentPoints\": [\n                    {\n                        \"attachmentAtom\": 0,\n                        \"leavingAtom\": 1,\n                        \"attachmentId\": \"1\"\n                    }\n                ]\n            }\n        ]\n    }\n}", "props": { "atomid": 0, "bondid": 0 } }
];

// standard sizes for the shapes
const [standard_height_cirlce, standard_width_circle] = [1.0250000000000006, 1.0250000000000006];
const [standard_height_square, standard_width_square] = [0.50, 2.0];

// list of data is required when alias is t_##, and image is not available in canvas
const template_list_data = [
  null, // templates starting with 1 
  {
    "type": "image",
    "format": "image/svg+xml",
    "boundingBox": {
      "width": standard_width_circle,
      "height": standard_height_cirlce
    },
    "data": "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4NCiAgPGRlZnM+DQogICAgPHJhZGlhbEdyYWRpZW50IGlkPSJncmFkMSIgY3g9IjUwJSIgY3k9IjUwJSIgcj0iNTAlIiBmeD0iNTAlIiBmeT0iNTAlIj4NCiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOnJnYigyNTUsMjU1LDI1NSk7c3RvcC1vcGFjaXR5OjEiIC8+DQogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOnJnYigwLDAsMCk7c3RvcC1vcGFjaXR5OjEiIC8+DQogICAgPC9yYWRpYWxHcmFkaWVudD4NCiAgPC9kZWZzPg0KICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0idXJsKCNncmFkMSkiIC8+DQo8L3N2Zz4NCg=="
  },
  {
    "type": "image",
    "format": "image/svg+xml",
    "boundingBox": {
      "width": standard_width_square,
      "height": standard_height_square
    },
    "data": "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMzAwIDMwMCI+CiAgPHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIxNTAiIHk9IjgwIiByeD0iMjAiIHJ5PSIyMCIKICBzdHJva2U9IiMwMDAiIHN0cm9rZS13aWR0aD0iMTAiIGZpbGw9Ijc1NzA3MCIKICAvPgo8L3N2Zz4="
  }
];

// pattern's for alias identification
const three_parts_patten = /t_\d{1,3}_\d{1,3}/;
const two_parts_pattern = /^t_\d{2,3}$/;

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

// helper function to examine the file coming ketcherrails
const hasKetcherData = async (molfile) => {
  try {
    const lines = molfile.trim().split('\n');
    let rails_polymers_list = -1;
    for (let i = lines.length - 1; i > -1; i--) {
      if (lines[i].indexOf("> <PolymersList>") != -1) {
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

// helper function to process ketcherrails files and adding image to ketcher2 canvas
const adding_polymers_ketcher_format = async (rails_polymers_list, _, data, image_used_counter) => {
  try {
    const p_items = rails_polymers_list.split(" ");
    // p_items-example:  10, 11s, 12, 13s
    let visited_atoms = 0;
    let collected_images = [];
    await fuelKetcherData(data);

    for (let m = 0; m < mols.length; m++) {
      const mol = data[mols[m]];
      for (let a = 0; a < mol.atoms.length; a++) {
        // if (p_items.length - 1 == visited_atoms) break;
        const atom = mol.atoms[a];
        const p_value = p_items[visited_atoms];
        if (atom.type === "rg-label" || three_parts_patten.test(atom.label)) {
          const select_template_type = p_value.includes("s") ? "02" : "01";
          data[mols[m]].atoms[a] = {
            "label": inspired_label,
            "alias": `t_${select_template_type}_${++image_used_counter}`,
            "location": atom.location
          };
          const bb = template_list_data[parseInt(select_template_type)];
          bb.boundingBox = { ...bb.boundingBox, x: atom.location[0], y: atom.location[1], z: 0 };
          collected_images.push(bb);
          visited_atoms += 1;
        }
      }
    }
    return { c_images: collected_images, molfileData: data, image_counter: image_used_counter };
  } catch (err) {
    console.error({ err: err.message });
  }
};

// helper function to process ketcher2 indigo file to add images to ketcher2 canvas
const adding_polymers_indigo_molfile = (mols, latestData) => {
  let collected_images = [];
  for (let m = 0; m < mols?.length; m++) {
    const mol = latestData[mols[m]];
    for (let a = 0; a < mol.atoms.length; a++) {
      const atom = mol.atoms[a];
      const splits = atom?.label?.split("    ");
      if (splits && three_parts_patten.test(splits[0])) {
        atom.label = inspired_label;
        atom.alias = splits[0];
        const alias_splits = splits[0].split("_");
        const bb = template_list_data[parseInt(alias_splits[1])];
        bb.boundingBox = { ...bb.boundingBox, x: atom.location[0], y: atom.location[1], z: 0 };
        collected_images.push(bb);
      }
    }
  }
  return { c_images: collected_images, molfileData: latestData };
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

// is new atom
const isNewAtom = (eventItem) => {
  return eventItem.label === inspired_label;
};

// remove image from the template
const removeImageTemplateAtom = async (images, mols, latestData) => {
  try {
    let container = [];
    let indexFound = 0;

    for (let m = 0; m < mols.length; m++) {
      const mol = latestData[mols[m]];
      const atoms_list = mol?.atoms || [];
      let bonds_list = mol?.bonds || [];
      if (mol && mol?.atoms) {
        // Iterate backwards to avoid index-shifting issues
        for (let i = atoms_list.length - 1; i >= 0; i--) {
          const atom = mol.atoms[i];
          const updatedBondsList = [];

          if (atom?.alias && atom.label == inspired_label) {
            const splits_2 = parseInt(atom.alias.split("_")[2]);
            const has_idx = images.has(splits_2);
            if (has_idx) {
              images.delete(splits_2);
              container.push(splits_2);
              indexFound++;

              // Update bonds to reflect the removal of the atom
              for (let ba of bonds_list) {
                if (!ba.atoms.includes(i)) {
                  const adjustedAtoms = ba.atoms.map(j => (j > i ? j - 1 : j));
                  updatedBondsList.push({ ...ba, atoms: adjustedAtoms });
                }
              }
              bonds_list = updatedBondsList;

              // Remove the atom
              atoms_list.splice(i, 1);
            }
          }
        }

        // Update aliases and manage remaining data
        if (atoms_list.length) {
          for (let img_i = 0; img_i < container.length; img_i++) {
            const img_idx = container[img_i];
            for (let i = 0; i < atoms_list.length; i++) {
              const atom = atoms_list[i];
              if (atom?.alias && atom.label == inspired_label) {
                const splits = atom.alias.split("_");
                if (parseInt(splits[2]) > img_idx) {
                  atoms_list[i].alias = `t_${splits[1]}_${parseInt(splits[2]) - 1}`;
                }
              }
            }
          }
          mol.atoms = atoms_list;
          mol.bonds = bonds_list;
          latestData[mols[m]] = mol;
        } else {
          // Remove the molecule if no atoms remain
          delete latestData[mols[m]];
          const atom_removed_when_empty = latestData.root.nodes.filter(item => item.$ref != mols[m]);
          latestData.root.nodes = atom_removed_when_empty;
        }
      }
    }
    return { latestData, container: indexFound };
  } catch (err) {
    console.error("removeImageTemplateAtom", err.message);
  }
};

// helper function for output molfile re-structure
const reAttachPolymerList = ({ lines, atoms_count, extra_data_start, extra_data_end }) => {
  const poly_identifier = "> <PolymersList>";
  let lines_copy = [...lines];
  const atom_with_alias_list = [];
  let list_alias = lines_copy.slice(extra_data_start, extra_data_end);
  const atom_starts = 4;
  for (let i = atom_starts; i < atoms_count + atom_starts; i++) {
    const atom_line = lines[i].split(" ");
    const idx = atom_line.indexOf(inspired_label);
    if (idx != -1) {
      atom_line[idx] = rails_polymer_identifier;
      atom_with_alias_list.push(`${i - atom_starts}`);
    }
    lines_copy[i] = atom_line.join(" ");
  }
  lines_copy.splice(extra_data_start, extra_data_end - extra_data_start);
  let counter = 0;

  for (let i = 1; i < list_alias.length; i += 2) {
    const t_id = list_alias[i].split("    ")[0].split("_")[1];
    if (t_id) {
      atom_with_alias_list[counter] += t_id == '02' ? "s" : "";
      counter++;
    }
  }
  lines_copy.splice(lines_copy.length - 1, 0, ...[poly_identifier, atom_with_alias_list.join(" "), "$$$$"]);
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
    if (two_parts_pattern.test(element.getAttribute('title'))) {
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
const images_to_be_updated_setter = () => {
  images_to_be_updated = !images_to_be_updated;
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
  adding_polymers_indigo_molfile,
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

