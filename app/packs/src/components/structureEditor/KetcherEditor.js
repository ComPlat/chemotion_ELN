/* eslint-disable react/require-default-props */
/* eslint-disable react/forbid-prop-types */
import PropTypes from 'prop-types';
import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import {
  // data stores
  template_list_data,

  // patterns
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
  removeImageTemplateAtom,
  reAttachPolymerList,

  // DOM Methods
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
} from '../../utilities/Ketcher2SurfaceChemistryUtils';

let FILOStack = [];
let uniqueEvents = new Set();
let latestData = null;
let imagesList = [];
let mols = [];
let allNodes = [];
let all_atoms = [];
let image_used_counter = -1;
let re_render_canvas = false;
let _selection = null;
let deleted_atoms_list = [];

// funcation to reset all data containers
export const resetStore = () => {
  FILOStack = [];
  uniqueEvents = new Set();
  latestData = null;
  imagesList = [];
  mols = [];
  allNodes = [];
  image_used_counter = -1;
  re_render_canvas = false;
  deleted_atoms_list = [];
  FILOStack = [];
  uniqueEvents = new Set();
};

// helper function to rebase with the ketcher canvas data
export const fuelKetcherData = async (editor) => {
  if (editor) {
    all_atoms = [];
    latestData = JSON.parse(await editor.structureDef.editor.getKet());
    allNodes = [...latestData.root.nodes];
    imagesList = allNodes.length > mols.length ? allNodes.filter(
      item => item.type === 'image'
    ) : [];
    const sliceEnd = Math.max(0, allNodes.length - imagesList.length);
    mols = sliceEnd > 0
      ? allNodes.slice(0, sliceEnd).map(i => i.$ref)
      : [];
    mols.forEach((item) => latestData[item]?.atoms.map(i => all_atoms.push(i)));
    // console.log("DATA FUELED", { image_used_counter, latestData, allNodes, imagesList, mols, decision: allNodes.length > mols.length });
  }
};

// helper function to handle new atoms added to the canvas
export const handleAddAtom = async (editor) => {
  console.log("Atom moved!");
  await fuelKetcherData(editor);
  let already_processed = [];
  image_used_counter = -1;
  const seenThirdParts = new Set();

  for (let m = 0; m < mols.length; m++) {
    const mol = latestData[mols[m]];
    for (let a = 0; a < mol?.atoms?.length; a++) {
      const atom = mol.atoms[a];
      if (atom?.alias && three_parts_patten.test(atom?.alias)) {
        const splits = atom?.alias?.split("_");
        if (!seenThirdParts.has(splits[2])) {
          already_processed.push(`${m}_${a}_${splits[2]}`);
          seenThirdParts.add(splits[2]);
        }
      }
    }
  }

  image_used_counter = already_processed.length - 1;
  let new_images = [...imagesList];
  for (let m = 0; m < mols.length; m++) {
    const mol = latestData[mols[m]];
    const is_h_id_list = [];
    for (let a = 0; a < mol?.atoms?.length; a++) {
      const atom = mol.atoms[a];
      const splits = atom?.alias?.split("_");
      // label A with three part alias
      if (two_parts_pattern.test(atom.alias)) {
        // console.log("TWO", { new_images }, image_used_counter, atom.alias);
        image_used_counter += 1;
        if (!new_images[image_used_counter]) {
          const img = prepareImageFromTemplateList(parseInt(splits[1]), atom.location);
          new_images.push(img);
        }
        atom.alias += `_${image_used_counter}`;
        already_processed.push(`${m}_${a}_${image_used_counter}`);
        // console.log("TWO END XXXXXXXXXXXXXXXXXXX", { new_images }, image_used_counter, atom.alias);
      }
      else if (three_parts_patten.test(atom.alias)) {
        console.log("Three", `${m}_${a}_${splits[2]}`);
        if (already_processed.indexOf(`${m}_${a}_${splits[2]}`) != -1) {
          console.warn("dying from existance!!!!!", atom.alias, image_used_counter, new_images);
          // add image if image doesnt exists

          if (!new_images[image_used_counter]) {
            const img = prepareImageFromTemplateList(parseInt(splits[1]), atom.location);
            new_images.push(img);
          }
        } else {
          console.log(atom.alias, "doesn't exists here!!!!", image_used_counter);
          image_used_counter += 1;
          atom.alias = `t_${splits[1]}_${image_used_counter}`;
          already_processed.push(`${m}_${a}_${image_used_counter}`);
        }
        // console.log("Three END XXXXXXXXXXXX", atom.alias, image_used_counter);
      }
      if (atom.label === "H") {
        is_h_id_list.push(atom);
      };
      console.log("-----------------------------");
    }
    if (is_h_id_list.length) {
      mol.atoms?.splice(mol.atoms.length - is_h_id_list.length, is_h_id_list.length);
      mol.bonds?.splice(mol.bonds.length - is_h_id_list.length, is_h_id_list.length);
    }
  }
  const d = { ...latestData };
  const mols_list = d.root.nodes.slice(0, mols.length);
  d.root.nodes = [...mols_list, ...new_images];
  await editor.structureDef.editor.setMolecule(JSON.stringify(d));
  await fuelKetcherData(editor);
  moveTemplate(editor);
};

// helper function to move image and update molecule positions
export const moveTemplate = async (editor) => {
  if (editor && editor.structureDef) {
    console.log("move template!!");
    mols.forEach(async (mol) => {
      const molecule = latestData[mol];

      // Check if molecule and atoms exist, and if the alias is formatted correctly
      molecule?.atoms?.forEach((item, atom_idx) => {
        if (item.alias) {
          if (three_parts_patten.test(item.alias)) {
            const alias = item.alias.split("_");

            const image = imagesList[parseInt(alias[2])];
            if (image?.boundingBox) {
              const { x, y } = image?.boundingBox;
              const location = [x, y, 0]; // Set location as an array of coordinates
              // molecule.atoms[atom_idx].location = location; // enable this is you want to handle location based on images 
              molecule.atoms[atom_idx].alias = item.alias.trim();
              if (molecule?.stereoFlagPosition) {
                molecule.stereoFlagPosition = {
                  x: location[0],
                  y: location[1],
                  z: 0,

                };
              }
            }
          }
        }
      });
      latestData[mol] = molecule;
    });
    latestData.root.nodes = latestData.root.nodes.slice(0, mols.length);
    await editor.structureDef.editor.setMolecule(JSON.stringify(latestData));
    re_render_canvas = false;
    images_to_be_updated_setter();
    imagesList.length && placeImageOnAtoms(mols, imagesList, editor);
  }
};

// helper function to place image on atom location coordinates
export const placeImageOnAtoms = async (mols_, imagesList_, editor) => {
  mols_.forEach((item) => {
    latestData[item]?.atoms.forEach((atom) => {
      if (atom && three_parts_patten.test(atom?.alias)) {
        const splits_alias = atom.alias.split("_");
        console.log({ splits_alias, imagesList_, mols_ });
        let image_coordinates = imagesList_[parseInt(splits_alias[2])]?.boundingBox;
        image_coordinates = {
          ...image_coordinates,
          x: atom.location[0] - image_coordinates?.width / 2 || 1,
          y: atom.location[1] + image_coordinates?.height / 2 || 1,
          z: 0,
          height: template_list_data[parseInt(splits_alias[1])].boundingBox.height,
          width: template_list_data[parseInt(splits_alias[1])].boundingBox.width,
        };
        imagesList_[splits_alias[2]].boundingBox = image_coordinates;
      };
    });
  });
  latestData.root.nodes = [...latestData.root.nodes.slice(0, mols_.length), ...imagesList_];
  await editor.structureDef.editor.setMolecule(JSON.stringify(latestData));
};

// helper function to delete a template and update the counter, assign new alias to all atoms
export const handleOnDeleteImage = async (editor) => {
  mols = mols.filter(item => item != null);
  console.log("handleOnDelete", mols, _selection);
  if (_selection) {
    const { images } = _selection;
    if (images && images.length) {
      images = imagesList;
      let data = removeImageTemplateAtom(new Set([...images]), mols, latestData);
      console.log({ data });
      // return;
      await editor.structureDef.editor.setMolecule(JSON.stringify(data));
      image_used_counter -= images.length;
      // await fuelKetcherData(editor);
      await moveTemplate(editor);
    }
  }
  // resetStore();
  // return;
};

// function when a canvas is saved using main "SAVE" button
export const saveMolefile = async (iframeRef, canvas_data_Mol) => {
  // molfile disection
  const lines = canvas_data_Mol.split('\n');
  const elements_info = lines[3];
  const header_starting_from = 4;
  const all_templates_consumed = [];

  let [atoms_count, bonds_count] = elements_info.trim().split(" ").filter(i => i != "");
  atoms_count = parseInt(atoms_count);
  bonds_count = parseInt(bonds_count);
  const extra_data_start = header_starting_from + atoms_count + bonds_count;
  const extra_data_end = lines.length - 2;

  for (let i = extra_data_start; i < extra_data_end; i++) {
    const alias = lines[i];
    if (three_parts_patten.test(alias)) {
      const splits = parseInt(alias.split("_")[2]);
      if (imagesList[splits]) { // image found
        all_templates_consumed.push(parseInt(alias.split("_")[1]));
        const { boundingBox } = imagesList[splits];
        if (boundingBox) {
          const { width, height } = boundingBox;
          lines[i] += `    ${height}    ${width}`;
        }
      }
    }
  }

  const iframeDocument = iframeRef.current.contentWindow.document;
  const svg = iframeDocument.querySelector('svg'); // Get the main SVG tag
  const imageElements = iframeDocument.querySelectorAll('image');

  imageElements.forEach((img) => {
    svg.removeChild(img);
  });

  imageElements.forEach((img) => {
    // const temp_num = all_templates_consumed[idx];
    const width = img.getAttribute('width');
    const height = img.getAttribute('height');
    console.log({ width, height });
    const x = img.getAttribute('x');
    const y = img.getAttribute('y');
    const newImg = document.createElementNS('http://www.w3.org/2000/svg', 'image');

    newImg.setAttribute('x', x);
    newImg.setAttribute('y', y);
    newImg.setAttribute('width', width);
    newImg.setAttribute('height', height);
    newImg.setAttribute('href', img.getAttribute('href'));
    svg.appendChild(newImg);
  });

  const svgElement = new XMLSerializer().serializeToString(svg);
  return { ket2Molfile: reAttachPolymerList({ lines, atoms_count, extra_data_start, extra_data_end }), svgElement };
};

// helper function to delete a template and update the counter, when an atom is delete with alias with no image/image not selected.
export const handleOnDeleteAtom = async (editor) => {
  await fuelKetcherData();
  console.log('handleOnDeleteAtom main', { mols, imagesList });
  try {
    await fuelKetcherData(editor);
    const images_tbr = [];
    let last_item = false;

    deleted_atoms_list.forEach((item, _) => {
      const deleted_splits = parseInt(item.alias.split("_")[2]);
      for (let m = 0; m < mols.length; m++) {
        const mol = latestData[mols[m]];
        if (mol && mol?.atoms) {
          const atoms = mol?.atoms || [];
          for (let i = 0; i < atoms.length; i++) {
            const atom = atoms[i];
            // console.log(atom, "out");
            if (three_parts_patten.test(atom?.alias)) {
              const atom_splits = atom.alias.split("_");
              // console.log({ nd: parseInt(atom_splits[2]), ds: deleted_splits });
              if (parseInt(atom_splits[2]) === 0) {
                images_tbr.push(0);
              }
              if (parseInt(atom_splits[2]) > deleted_splits) {
                atom.alias = `t_${atom_splits[1]}_${parseInt(atom_splits[2]) - 1}`;
                images_tbr.push(parseInt(atom_splits[2]));
              }
            } else {
              last_item = true;
            }
          }
          latestData[mols[m]].atoms = atoms;
        }
      }
    });
    console.log({ late: latestData });
    image_used_counter -= deleted_atoms_list.length;


    latestData.root.nodes = [...latestData.root.nodes.slice(0, mols.length), ...imagesList];
    await editor.structureDef.editor.setMolecule(JSON.stringify(latestData));
    await moveTemplate(editor);

    // clear the stack to avoid further event render
    resetStore();
    return;
  } catch (err) {
    console.error("handleDelete!!", err.message);
  }
};


// helper function to calculate counters for the ketcher2 setup based on file source type
export const setKetcherData = async ({ rails_polymers_list, editor }) => {
  await fuelKetcherData(editor);
  let collected_images = [];
  if (rails_polymers_list) {
    const { c_images, molfileData, image_counter } = adding_polymers_ketcher_format(rails_polymers_list, mols, latestData, image_used_counter);
    collected_images = c_images;
    image_used_counter = image_counter;
    latestData = { ...molfileData };
  } else { // type == "Indigo"
    const { c_images, molfileData } = adding_polymers_indigo_molfile();
    latestData = { ...molfileData };
    collected_images = c_images;
  }
  latestData?.root?.nodes.push(...collected_images);
  console.log({ setkatcherdata: latestData });
  await editor.structureDef.editor.setMolecule(JSON.stringify(latestData));
  await fuelKetcherData(editor);
  await moveTemplate(editor);
};

const KetcherEditor = forwardRef((props, ref) => {
  const { editor, iH, iS, molfile } = props;
  const iframeRef = useRef();
  let initMol = molfile || '\n  noname\n\n  0  0  0  0  0  0  0  0  0  0999 V2000\nM  END\n';

  // Handlers for each event operation, mapped by operation name;
  const eventOperationHandlers = {
    "Load canvas": async () => {
      await fuelKetcherData(editor);
      if (re_render_canvas) await moveTemplate(editor);
    },
    "Move image": async (_) => {
      addEventToFILOStack("Move image");
    },
    "Add atom": async (eventItem) => {
      console.log("Add atom", eventItem);
      addEventToFILOStack("Add atom");
    },
    "Upsert image": async (_) => {
      addEventToFILOStack("Upsert image");
    },
    "Move atom": async (eventItem) => {
      const { exists } = should_canvas_update_on_movement(eventItem);
      allowed_to_process_setter(exists);
      addEventToFILOStack("Move atom");
    },
    "Delete image": async (_) => {
      addEventToFILOStack("Delete image");
    },
    "Delete atom": async (eventItem) => {
      let atom_counter = -1;
      if (eventItem.label === inspired_label) {
        for (let m = 0; m < mols?.length; m++) {
          const mol = mols[m];
          const atoms = latestData[mol]?.atoms;
          for (let a = 0; a < atoms?.length; a++) {
            atom_counter++;
            if (atom_counter == eventItem.id) {
              deleted_atoms_list.push(atoms[a]);
            }
          }
        }
        addEventToFILOStack("Delete atom");
      }
    },
    "Update": async (eventItem) => {
      console.log(eventItem);
    },
  };

  // action based on event-name
  const eventHandlers = {
    'Load canvas': async () => await fuelKetcherData(editor),
    'Move image': async () => await moveTemplate(editor),
    'Move atom': async () => await moveTemplate(editor),
    'Add atom': async () => await handleAddAtom(editor),
    'Delete image': async () => await handleOnDeleteImage(editor),
    'Delete atom': async () => await handleOnDeleteAtom(editor),
  };

  // DOM button events with scope
  const buttonEvents = {
    "[title='Clean Up \\(Ctrl\\+Shift\\+L\\)']": async () => {
      await fuelKetcherData(editor);
      re_render_canvas = true;
    },
    "[title='Layout \\(Ctrl\\+L\\)']": async () => {
      console.log("Layout");
      await fuelKetcherData(editor);
      re_render_canvas = true;
    },
    "[title='Clear Canvas \\(Ctrl\\+Del\\)']": async () => {
      image_used_counter = -1;
      resetStore();
    },
    "[title='Undo \\(Ctrl\\+Z\\)']": () => {
      try {
        const list = [...editor._structureDef.editor.editor.historyStack];
        const historyPtr = editor._structureDef.editor.editor.historyPtr;
        console.log({ list, historyPtr });
        let opp_idx = 0;
        for (let i = historyPtr - 1; i >= 0; i--) {
          if (list[i]?.operations[0]?.type !== 'Load canvas') {
            break;
          } else {
            opp_idx++;
          }
        }
        for (let j = 0; j < opp_idx; j++) {
          editor._structureDef.editor.editor.undo();
        }
      } catch (error) {
        console.error({ undo: error });
      }
    },
    "[title='Redo \\(Ctrl\\+Shift\\+Z\\)']": () => {
      try {
        const list = [...editor._structureDef.editor.editor.historyStack];
        const historyPtr = editor._structureDef.editor.editor.historyPtr;
        let opp_idx = 1;

        for (let i = historyPtr; i < list.length; i++) {
          if (list[i]?.operations[0]?.type !== 'Load canvas') {
            break;
          } else {
            opp_idx++;
          }
        }
        for (let j = 0; j < opp_idx; j++) {
          editor._structureDef.editor.editor.redo();
        }
      } catch (error) {
        console.error({ redo: error });
      }
    },
    'Erase \\(Del\\)': async () => {
      // on click event is can be access is funcation eraseStateAlert
    },
    "[title='Add/Remove explicit hydrogens']": async () => {
      // TODO:pattern identify
      await fuelKetcherData(editor);
      re_render_canvas = true;
    },

  };

  useEffect(() => {
    resetStore();
    if (editor && editor.structureDef) {
      const iframe = iframeRef.current;
      if (iframe) {
        iframe.addEventListener('load', attachClickListeners); // DOM change listener
      }
      window.addEventListener('message', loadContent); // molfile intializer

      return () => {
        if (iframe) {
          iframe.removeEventListener('load', attachClickListeners);
        }
        window.removeEventListener('message', loadContent);
      };
    }
  }, [editor]);

  // enable editor change listener
  const onEditorContentChange = (editor) => {
    editor._structureDef.editor.editor.subscribe('change', async (eventData) => {
      const result = await eventData;
      handleEventCapture(result);
    });
    editor._structureDef.editor.editor.subscribe('click', async (_) => {
      _selection = editor._structureDef.editor.editor._selection;
    });
  };

  // Load the editor content and set up the molecule
  const loadContent = async (event) => {
    if (event.data.eventType === 'init') {
      // editor = createEditors({})['ketcher2'] || editorProp;
      window.editor = editor;
      if (editor && editor.structureDef)
        await hasKetcherData(initMol, async ({ struct, rails_polymers_list }) => {
          await editor.structureDef.editor.setMolecule(struct); // set initial
          await setKetcherData({ rails_polymers_list, editor }); // process polymers
          onEditorContentChange(editor); // subscribe to editor change
        });
    };
  };

  // main funcation to capture all events from editor
  const handleEventCapture = async (data) => {
    const selection = editor._structureDef.editor.editor._selection;
    allowed_to_process_setter(true);
    if (selection?.images) {
      await editor.structureDef.editor.setMolecule(JSON.stringify(latestData));
      await fuelKetcherData(editor);
      images_to_be_updated_setter();
      return;
    }

    for (const eventItem of data) {
      const operationHandler = eventOperationHandlers[eventItem?.operation];
      if (operationHandler) {
        await operationHandler(eventItem);
      }
    }

    if (allowed_to_process) {
      processFILOStack();
    } else {
      FILOStack = [];
      uniqueEvents = new Set();
      return;
    }
  };

  // all logic implementation if move atom has an alias which passed three part regex
  const should_canvas_update_on_movement = (eventItem) => {
    const { id } = eventItem;
    const target_atom = all_atoms[id];
    if (target_atom) {
      return { exists: three_parts_patten.test(target_atom.alias), atom: target_atom };
    }
    return { exists: true, atom: target_atom };
  };

  // helper function to add event to stack
  const addEventToFILOStack = (event) => {
    if (!uniqueEvents.has(event)) {
      FILOStack.push(event);
      uniqueEvents.add(event);
    }
  };

  // helper function to ececute a stack: first in last out
  const processFILOStack = async () => {
    if (!latestData) {
      // alert("data not present!!");
      return;
    }

    await fuelKetcherData(editor);
    const loadCanvasIndex = FILOStack.indexOf("Load canvas");
    if (loadCanvasIndex > -1) {
      FILOStack.splice(loadCanvasIndex, 1);
      uniqueEvents.delete("Load canvas");
    }
    while (FILOStack.length > 0) {
      const event = FILOStack.pop();
      uniqueEvents.delete(event);
      if (eventHandlers[event]) {
        await eventHandlers[event]();
      }
    }
    if (images_to_be_updated && !skip_image_layering) {
      setTimeout(async () => {
        await updateImagesInTheCanvas(iframeRef);
      }, [250]);
    }
  };

  // helper function to add mutation oberservers to DOM elements
  const attachClickListeners = () => {
    // Main function to attach listeners and observers
    if (iframeRef.current) {
      const iframeDocument = iframeRef.current.contentWindow.document;

      const checkEraseButtonClass = () => {
        setTimeout(() => {
          const eraseButton = iframeDocument.querySelector('[title="Erase \\(Del\\)"]');
          if (eraseButton && eraseButton.classList.contains('ActionButton-module_selected__kPCxA')) {
            eraseStateAlert(); // Call your function if the class is present
          }
        }, 10);
      };

      // Attach the click listener for the Erase button
      const attachEraseButtonListener = () => {
        const eraseButton = iframeDocument.querySelector('[title="Erase \\(Del\\)"]');
        if (eraseButton) {
          eraseButton.addEventListener('click', checkEraseButtonClass);
        }
      };

      // Attach MutationObserver to listen for relevant DOM mutations (e.g., new buttons added)
      const observer = new MutationObserver(async (mutationsList) => {
        for (const mutation of mutationsList) {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            Object.keys(buttonEvents).forEach((selector) => {
              attachListenerForTitle(iframeDocument, selector, buttonEvents);
              attachListenerForTitle(iframeDocument, selector, buttonEvents);
              makeTransparentByTitle(iframeDocument);
              // attachEraseButtonListener();
            });
          }
        }

        if (!skip_template_name_hide) {
          await updateTemplatesInTheCanvas(iframeRef);
        }
      });

      // Start observing the iframe's document for changes
      observer.observe(iframeDocument, {
        childList: true,
        subtree: true,
      });


      // Fallback: Try to manually find buttons after some time, debounce the function
      const debounceAttach = setTimeout(() => {
        Object.keys(buttonEvents).forEach((title) => {
          attachListenerForTitle(iframeDocument, title);
        });
      }, 1000);

      // Cleanup function
      return () => {
        observer.disconnect();
        clearTimeout(debounceAttach);
        Object.keys(buttonEvents).forEach((title) => {
          const button = iframeDocument.querySelector(`[title="${title}"]`);
          if (button) {
            button.removeEventListener('click', buttonEvents[title]);
          }
        });
      };
    }
  };

  // ref functions when a canvas is saved using main "SAVE" button
  useImperativeHandle(ref, () => ({
    onSaveFileK2SC: async () => {
      await fuelKetcherData(editor);
      const canvasDataMol = await editor.structureDef.editor.getMolfile();
      const result = await saveMolefile(iframeRef, canvasDataMol);
      resetStore();
      return result;
    }
  }));

  return (
    <div>
      <iframe
        ref={iframeRef}
        id={editor?.id}
        src={editor?.extSrc}
        title={editor?.label}
        height={iH}
        width="100%"
        style={iS}
      />
    </div>
  );
});

KetcherEditor.propTypes = {
  molfile: PropTypes.string,
  editor: PropTypes.object.isRequired,
  iH: PropTypes.string.isRequired,
  iS: PropTypes.object.isRequired,
};

export default KetcherEditor;