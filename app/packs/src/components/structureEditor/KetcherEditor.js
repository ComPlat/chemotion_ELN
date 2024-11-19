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
} from '../../utilities/Ketcher2SurfaceChemistryUtils';

export let FILOStack = [];
export let uniqueEvents = new Set();
export let latestData = null;
export let imagesList = [];
export let mols = [];
export let allNodes = [];
export let all_atoms = [];
export let image_used_counter = -1;
export let re_render_canvas = false;
export let _selection = null;
export let deleted_atoms_list = [];

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
  all_atoms = [];
};

// load data into respective containers/vars
export const fuelKetcherData = async (data) => {
  allNodes = [...data.root.nodes];
  imagesList = allNodes.filter(item => item.type === 'image');
  const sliceEnd = Math.max(0, allNodes.length - imagesList.length);
  mols = sliceEnd > 0
    ? allNodes.slice(0, sliceEnd).map(i => i.$ref)
    : [];
  mols.forEach((item) => data[item]?.atoms.map(i => all_atoms.push(i)));
};

// latestData setter
export const latestdataSetter = async data => {
  latestData = data;
};

// selection setter it can have images, atoms, bonds or anything selected in the canvas
export const _selectionSetter = async data => {
  _selection = data;
};

// image counter is strictly related and synced with how many images are there in the canvas
export const imageUsedCounterSetter = async count => {
  image_used_counter = count;
};

// when one/more atoms are selected and deleted this holds array of deleted atoms
export const deleteAtomListSetter = async data => {
  deleted_atoms_list = data;
};

// helper function to rebase with the ketcher canvas data
const fetchKetcherData = async (editor) => {
  if (editor) {
    all_atoms = [];
    latestData = JSON.parse(await editor.structureDef.editor.getKet());
    await fuelKetcherData(latestData);
  }
};

// helper function to remove images from the ketfile on atom move or manual atom move
export const moveTemplate = async () => {
  try {
    latestData.root.nodes = latestData?.root?.nodes?.slice(0, mols.length);
  } catch (err) {
    console.error("moveTemplate", err.message);
  }
};

// helper function to place image on atom location coordinates
export const placeImageOnAtoms = async (mols_, imagesList_) => {
  try {
    mols_.forEach((item) => {
      latestData[item]?.atoms.forEach((atom) => {
        if (atom && three_parts_patten.test(atom?.alias)) {
          const splits_alias = atom.alias.split("_");
          let image_coordinates = imagesList_[parseInt(splits_alias[2])]?.boundingBox;
          if (!image_coordinates) throw new ("Invalid alias");
          image_coordinates = {
            ...image_coordinates,
            x: atom.location[0] - image_coordinates?.width / 2,
            y: atom.location[1] + image_coordinates?.height / 2,
            z: 0,
            height: template_list_data[parseInt(splits_alias[1])].boundingBox.height,
            width: template_list_data[parseInt(splits_alias[1])].boundingBox.width,
          };
          imagesList_[splits_alias[2]].boundingBox = image_coordinates;
        };
      });
    });
    latestData.root.nodes = [...latestData.root.nodes.slice(0, mols_.length), ...imagesList_];
  } catch (err) {
    console.error("placeImageOnAtoms", err.message);
  }
};

// helper function to calculate counters for the ketcher2 setup based on file source type
export const setKetcherData = async (rails_polymers_list, data) => {
  let collected_images = [];
  if (rails_polymers_list && rails_polymers_list.length) {
    const { c_images, molfileData, image_counter } = await adding_polymers_ketcher_format(rails_polymers_list, mols, data, image_used_counter);
    image_used_counter = image_counter;
    molfileData?.root?.nodes.push(...c_images);
    return { collected_images: c_images, molfileData };
  }
  return { collected_images, molfileData: data };
};

// helper function to test alias list consistency
export const isAliasConsistent = () => {
  const index_list = [];
  const uniqueIndices = new Set();

  for (const mol of mols) {
    const molecule = latestData[mol];
    molecule?.atoms?.forEach((item) => {
      if (item.alias) {
        const splits = item.alias.split("_");
        const index = parseInt(splits[2]);

        // Check for duplicates
        if (uniqueIndices.has(index)) {
          return false;  // Duplicate found
        }
        uniqueIndices.add(index);
        index_list.push(index);
      }
    });
  }

  index_list.sort((a, b) => a - b);
  for (let i = 0; i < index_list.length; i++) {
    if (index_list[i] !== i) {
      return false;  // Missing or incorrect number sequence
    }
  }
  return true;  // Passed all checks
};

// helper function to handle new atoms added to the canvas
export const handleAddAtom = async () => {
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
  console.log({ already_processed });
  return await addAtomAliasHelper(already_processed);
};

// IMP: helper funcation when new atom is added or rebase for alias
const addAtomAliasHelper = async (already_processed) => {
  try {
    let new_images = [...imagesList];
    image_used_counter = already_processed.length - 1;
    for (let m = 0; m < mols.length; m++) {
      const mol = latestData[mols[m]];
      const is_h_id_list = [];
      for (let a = 0; a < mol?.atoms?.length; a++) {
        const atom = mol.atoms[a];
        const splits = atom?.alias?.split("_");
        // label A with three part alias
        if (two_parts_pattern.test(atom.alias)) {
          image_used_counter += 1;
          if (!new_images[image_used_counter]) {
            const img = prepareImageFromTemplateList(parseInt(splits[1]), atom.location);
            new_images.push(img);
          }
          atom.alias += `_${image_used_counter}`;
          already_processed.push(`${m}_${a}_${image_used_counter}`);
        } else if (three_parts_patten.test(atom.alias)) {
          if (already_processed.indexOf(`${m}_${a}_${splits[2]}`) != -1) {
            // add image if image doesnt exists
            if (!new_images[image_used_counter]) {
              const img = prepareImageFromTemplateList(parseInt(splits[1]), atom.location);
              new_images.push(img);
            }
          } else {
            image_used_counter += 1;
            atom.alias = `t_${splits[1]}_${image_used_counter}`;
            already_processed.push(`${m}_${a}_${image_used_counter}`);
          }
        }
        if (atom.label === "H") {
          is_h_id_list.push(atom);
        };
      }
      if (is_h_id_list.length) {
        mol.atoms?.splice(mol.atoms.length - is_h_id_list.length, is_h_id_list.length);
        mol.bonds?.splice(mol.bonds.length - is_h_id_list.length, is_h_id_list.length);
      }
    }
    const d = { ...latestData };
    const mols_list = d.root.nodes.slice(0, mols.length);
    d.root.nodes = [...mols_list, ...new_images];
    return { d, isConsistent: isAliasConsistent() };
  } catch (err) {
    console.error("addAtomAliasHelper", err.message);
  }
};

// helper function to delete a template and update the counter, assign new alias to all atoms
export const handleOnDeleteImage = async () => {
  mols = mols.filter(item => item != null);

  if (_selection) {
    const { images } = _selection;
    if (images && images.length) {
      let { latestData: data, imageFoundIndexCount } = await removeImageTemplateAtom(new Set([...images]), mols, latestData);
      console.log(data, imageFoundIndexCount);

      // image_used_counter -= imageFoundIndexCount;
      // return data;
    }
  }
  return latestData;
};

// helper function to delete a template and update the counter, when an atom is delete with alias with no image/image not selected.
export const handleOnDeleteAtom = async () => {
  try {
    deleted_atoms_list.forEach((item, _) => {
      if (three_parts_patten.test(item.alias)) {
        const deleted_splits = parseInt(item.alias.split("_")[2]);

        for (let m = 0; m < mols.length; m++) {
          const mol = latestData[mols[m]];
          if (mol && mol?.atoms) {
            const atoms = mol?.atoms || [];
            for (let i = 0; i < atoms.length; i++) {
              const atom = atoms[i];
              if (three_parts_patten.test(atom?.alias)) {
                const atom_splits = atom.alias.split("_");
                console.log("atom splits", parseInt(atom_splits[2]), deleted_splits);
                if (parseInt(atom_splits[2]) > deleted_splits) {
                  atom.alias = `t_${atom_splits[1]}_${parseInt(atom_splits[2]) - 1}`;
                }
              }
            }
            latestData[mols[m]].atoms = atoms;
          }
        }
      }
    });
    return latestData;
  } catch (err) {
    console.error("handleDelete!!", err.message);
  }
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

/* istanbul ignore next */
// container funcation for templatemove
const onTemplateMove = async (editor) => {
  if (editor && editor.structureDef) {
    // set atom stereo
    await moveTemplate();
    await saveMoveCanvas(null, true, false);
    // ----

    re_render_canvas = false; // no-rerender
    const mols_copy = mols;
    const imagelist_copy = imagesList;
    await fetchKetcherData(editor);
    if (imagelist_copy.length) {
      await placeImageOnAtoms(mols_copy, imagelist_copy, editor);
      await saveMoveCanvas(null, true, false);
    }
    images_to_be_updated_setter();
  }
};

/* istanbul ignore next */
// container funcation for onAddAtom
const onAddAtom = async (editor) => {
  if (editor && editor.structureDef) {
    await fetchKetcherData(editor);
    const { d, isConsistent } = await handleAddAtom();
    !isConsistent && console.error("Generated aliases are inconsistent. Please try reopening the canvas again.");
    isConsistent && await saveMoveCanvas(d, true, true);
  }
};

/* istanbul ignore next */
// container function for on image delete
const onDeleteImage = async (editor) => {
  if (editor && editor.structureDef && !deleted_atoms_list.length) {
    console.log("hitting iamge");
    // await fetchKetcherData(editor);
    const data = await handleOnDeleteImage();
    console.log({ data, imagesList, mols, _selection });
    await saveMoveCanvas(data, false, true);
  }
};

// function to remove image by index
const removeImageByIndex = async () => {
  const list = latestData.root.nodes;
  deleted_atoms_list.forEach(item => {
    const imageIndex = parseInt(item.alias.split("_")[2]);
    list.splice(imageIndex + mols.length, 1);
  });
  latestData.root.nodes = list;
  deleted_atoms_list = [];

};

/* istanbul ignore next */
// container funcation on atom delete
const onAtomDelete = async (editor) => {
  if (editor && editor.structureDef) {
    await fetchKetcherData(editor);
    const data = await handleOnDeleteAtom(); // rebase atom aliases
    image_used_counter -= deleted_atoms_list.length; // update image used counter

    if (image_used_counter < imagesList.length - 1) {
      console.log("p pharo pye");
      await removeImageByIndex(); // remove and add images
    }
    await saveMoveCanvas(data, true, true); // save
  }
};

/* istanbul ignore next */
// savemolfile with source, should_fetch, should_move
const saveMoveCanvas = async (data, should_fetch, should_move) => {
  data = data ? data : latestData;
  await editor.structureDef.editor.setMolecule(JSON.stringify(data));
  should_fetch && fetchKetcherData(editor);
  should_move && onTemplateMove(editor);
};

/* istanbul ignore next */
// component
const KetcherEditor = forwardRef((props, ref) => {
  const { editor, iH, iS, molfile } = props;

  const iframeRef = useRef();
  let initMol = molfile || '\n  noname\n\n  0  0  0  0  0  0  0  0  0  0999 V2000\nM  END\n';

  // Handlers for each event operation, mapped by operation name;
  const eventOperationHandlers = {
    "Load canvas": async () => {
      await fetchKetcherData(editor);
      if (re_render_canvas) await onTemplateMove(editor);
    },
    "Move image": async (_) => {
      addEventToFILOStack("Move image");
    },
    "Add atom": async (_) => {
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
    "Update": async (_) => { },
  };

  // action based on event-name
  const eventHandlers = {
    'Move image': async () => await onTemplateMove(editor),
    'Move atom': async () => await onTemplateMove(editor),
    'Add atom': async () => await onAddAtom(editor),
    'Delete image': async () => await onDeleteImage(editor),
    'Delete atom': async () => await onAtomDelete(editor),
  };

  // DOM button events with scope
  const buttonEvents = {
    "[title='Clean Up \\(Ctrl\\+Shift\\+L\\)']": async () => {
      await fetchKetcherData(editor);
      re_render_canvas = true;
    },
    "[title='Layout \\(Ctrl\\+L\\)']": async () => {
      await fetchKetcherData(editor);
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
      await fetchKetcherData(editor);
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

  const setMolfileAndMove = async (data) => {
    data = data ? data : latestData;
    await editor.structureDef.editor.setMolecule(JSON.stringify(data));
    await fetchKetcherData(editor);
    await onTemplateMove(editor);
  };

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
      window.editor = editor;
      if (editor && editor.structureDef) {
        onEditorContentChange(editor);
        const rails_polymers_list = await hasKetcherData(initMol);
        const ketfile = await editor._structureDef.editor.indigo.convert(initMol).catch((err) => {
          alert("invalid molfile. Please try again");
          console.error(err);
        });
        const file_content = JSON.parse(ketfile.struct);
        // process polymers
        const { collected_images, molfileData } = await setKetcherData(rails_polymers_list, file_content);
        if (collected_images && collected_images.length) {
          setMolfileAndMove(molfileData);
        }
      }
    };
  };

  // main funcation to capture all events from editor
  const handleEventCapture = async (data) => {
    const selection = editor._structureDef.editor.editor._selection;
    allowed_to_process_setter(true);
    if (selection?.images) {
      await editor.structureDef.editor.setMolecule(JSON.stringify(latestData));
      await fetchKetcherData(editor);
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

    await fetchKetcherData(editor);
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
      await fetchKetcherData(editor);
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