/* eslint-disable no-param-reassign */
/* eslint-disable no-plusplus */
/* eslint-disable radix */
import { addingPolymersToKetcher } from 'src/utilities/ketcherSurfaceChemistry/AtomsAndMolManipulation';
import { ALIAS_PATTERNS, KET_TAGS } from 'src/utilities/ketcherSurfaceChemistry/constants';
import { imageNodeCounter } from 'src/components/structureEditor/KetcherEditor';
import { imagesList } from 'src/utilities/ketcherSurfaceChemistry/stateManager';

// generating images for ket2 format from molfile polymers list
const addPolymerTags = async (polymerTag, data) => {
  try {
    if (polymerTag && polymerTag.length) {
      const processedResponse = await addingPolymersToKetcher(polymerTag, data, imageNodeCounter);
      processedResponse.molfileData?.root?.nodes.push(...processedResponse.c_images);
      return {
        collected_images: processedResponse.c_images,
        molfileData: processedResponse.molfileData
      };
    }
    throw new Error('No polymer tags found');
  } catch (err) {
    console.log('addPolymerTags', err);
    return { collectedImages: [], molfileData: data };
  }
};

// collect polymers atom list from molfile
const processAtomLines = async (linesCopy, atomStarts, atomsCount) => {
  const atomAliasList = [];

  for (let i = atomStarts; i < atomsCount + atomStarts; i++) {
    const line = linesCopy[i].split(' ');
    const idx = line.indexOf(KET_TAGS.inspiredLabel);
    if (idx !== -1) {
      line[idx] = KET_TAGS.RGroupTag;
      atomAliasList.push(`${i - atomStarts}`);
    }
    linesCopy[i] = line.join(' ');
  }
  return { linesCopy, atomAliasList };
};

// helper to combine and prepare alias into a polymer list
const templateAliasesPrepare = async (aliasesList, atomAliasList) => {
  let counter = 0;

  for (let i = 1; i < aliasesList.length; i += 2) {
    if (ALIAS_PATTERNS.threeParts.test(aliasesList)) {
      const templateId = parseInt(aliasesList[i].split('_')[1]);
      const imagePlace = parseInt(aliasesList[i].split('_')[2]);
      const { height, width } = imagesList[imagePlace].boundingBox;
      if (templateId) {
        atomAliasList[counter] += templateId === KET_TAGS.templateSurface ? 's' : `/${templateId}`;
        atomAliasList[counter] += `/${height.toFixed(2)}-${width.toFixed(2)}`;
        counter++;
      }
    }
  }
  return atomAliasList.join(' ');
};

/* attaching polymers list is ketcher rails standards to a molfile
    s => S means its a surface polymers
    final output is expected a string:  "11 12s 13"
  */
const reAttachPolymerList = async ({
  lines, atomsCount, additionalDataStart, additionalDataEnd
}) => {
  const lineCopy = [...lines];
  const aliasesList = [];
  for (let i = additionalDataStart; i <= additionalDataEnd; i++) {
    if (ALIAS_PATTERNS.threeParts.test(lines[i])) {
      const splitTemp = parseInt(lines[i].split('_')[1]);
      if (splitTemp < 50) aliasesList.push(lines[i - 1], lines[i]);
      lines.splice(i - 1, 2); // Remove 2 elements starting from index i - 1
      i -= 2;
    }
  }

  // change atoms to R# for ketcher rails compatibilty
  const { linesCopy, atomAliasList } = await processAtomLines(lines, KET_TAGS.molfileHeaderLinenumber, atomsCount);

  // helper to combine and prepare alias into a polymer list
  // 0/3/1.30-1.28 7/1/0.90-0.91 => 2 aliases combined with space to form a string
  // 0/3/1.30-1.28 => what a single alias has atomIndex/template#/height-width
  const preparedAliasPolymerLine = await templateAliasesPrepare(aliasesList, atomAliasList);
  const collectedLines = [KET_TAGS.polymerIdentifier, preparedAliasPolymerLine];
  linesCopy.splice(lineCopy.length, 0, ...collectedLines);
  return linesCopy;
};

export { addPolymerTags, reAttachPolymerList };
