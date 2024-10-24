// standard sizes for the shapes
const [standard_height_cirlce, standard_width_circle] = [1.0250000000000006, 1.0250000000000006];
const [standard_height_square, standard_width_square] = [0.9750000000000001, 1.5749999999999986];

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

// helper function to examine the file coming ketcherrails
const hasKetcherData = async (molfile, cb) => {
  const indigo_converted_ket = await editor._structureDef.editor.indigo.convert(molfile);
  if (!molfile.includes("<PolymersList>")) return { struct: indigo_converted_ket.struct, rails_polymers_list: null };
  // when ketcher mofile and polymers exists
  const lines = molfile.trim().split('\n');
  let rails_polymers_list = -1;
  for (let i = lines.length - 1; i > -1; i--) {
    if (lines[i].indexOf("> <PolymersList>") != -1) {
      rails_polymers_list = lines[i + 1].trim();
      break;
    }
  }
  if (rails_polymers_list == -1) {
    cb({ struct: indigo_converted_ket.struct, rails_polymers_list: null });
  } else {
    // polymers list exists
    cb({ struct: indigo_converted_ket.struct, rails_polymers_list });
  }
};

// helper function to process ketcherrails files and adding image to ketcher2 canvas
const adding_polymers_ketcher_format = (rails_polymers_list, mols, latestData, image_used_counter) => {
  const p_items = rails_polymers_list.split(" ");
  // p_items-example:  10, 11s, 12, 13s
  let visited_atoms = 0;
  let collected_images = [];

  for (let m = 0; m < mols.length; m++) {
    const mol = latestData[mols[m]];
    for (let a = 0; a < mol.atoms.length; a++) {
      // if (p_items.length - 1 == visited_atoms) break;
      const atom = mol.atoms[a];
      const p_value = p_items[visited_atoms];
      if (atom.type === "rg-label" || three_parts_patten.test(atom.label)) {
        const select_template_type = p_value.includes("s") ? "02" : "01";
        latestData[mols[m]].atoms[a] = {
          "label": "A",
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
  return { c_images: collected_images, molfileData: latestData, image_counter: image_used_counter };
};

// helper function to process ketcher2 indigo file to add images to ketcher2 canvas
const adding_polymers_indigo_molfile = (mols, latestData) => {
  let collected_images = [];
  for (let m = 0; m < mols.length; m++) {
    const mol = latestData[mols[m]];
    for (let a = 0; a < mol.atoms.length; a++) {
      const atom = mol.atoms[a];
      const splits = atom?.label?.split("    ");
      if (splits && three_parts_patten.test(splits[0])) {
        atom.label = "A";
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

// helper function to match and indentify collectio three part alias and match then my image_used_counter number
const checkAliasMatch = (aliasInput, aliasSet) => {
  // Get the last part of the input alias
  const inputLastPart = aliasInput.split('_').pop();

  for (let alias of aliasSet) {
    const aliasLastPart = alias.split('_').pop();  // Get the last part of each alias in the set
    if (aliasLastPart === inputLastPart) {
      return true;
    }
  }
  return false;
};

// helper function to return a new image in imagesList with a location
const prepareImageFromTemplateList = (idx, location) => {
  template_list_data[idx].boundingBox.x = location[0];
  template_list_data[idx].boundingBox.y = location[1];
  template_list_data[idx].boundingBox.z = location[2];
  return template_list_data[idx];
};

const resetOtherAliasCounters = (atom, mols, latestData) => {
  for (let m = 0; m < mols?.length; m++) {
    const mol = mols[m];
    const atoms = latestData[mol]?.atoms;
    for (let a = 0; a < atoms?.length; a++) {
      const item = atoms[a];
      if (three_parts_patten.test(item.alias)) {
        const atom_splits = atom?.alias?.split("_");
        const item_splits = item?.alias?.split("_");
        console.log(parseInt(atom_splits[2]), parseInt(item_splits[2]), parseInt(atom_splits[2]) <= parseInt(item_splits[2]));
        if (parseInt(atom_splits[2]) <= parseInt(item_splits[2])) {
          console.log("should be updated", item);
          const step_back = parseInt(item_splits[2]) - 1;
          const new_alias = `${item_splits[0]}_${item_splits[1]}_${step_back}`;
          atoms[a].alias = new_alias;
        }
      }
    }
  };
  return latestData;
};

export {
  // data stores
  three_parts_patten,
  two_parts_pattern,

  // flags
  skip_template_name_hide,
  skip_image_layering,

  // methods
  hasKetcherData,
  adding_polymers_ketcher_format,
  adding_polymers_indigo_molfile,
  checkAliasMatch,
  prepareImageFromTemplateList,
  resetOtherAliasCounters
};

