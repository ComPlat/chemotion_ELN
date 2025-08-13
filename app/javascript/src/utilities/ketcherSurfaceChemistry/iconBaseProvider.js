const loadTemplates = async () => {
  try {
    const response = await fetch('/json/surfaceChemistryShapes.json');
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching the JSON data:', error);
    return null;
  }
};

const findIconNameCategoryFromTemplates = async (iconName) => {
  const allTemplates = await loadTemplates();
  if (!allTemplates) {
    return 'basic';
  }
  for (const category of Object.keys(allTemplates)) {
    for (const tab of allTemplates[category]) {
      for (const subTab of tab.subTabs) {
        for (const shape of subTab.shapes) {
          if (shape.iconName === iconName) {
            return category;
          }
        }
      }
    }
  }
  return 'basic';
};

const checkFileExists = async (url) => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.error('Error checking file existence:', error);
    return false;
  }
};

const loadAndEncodeSVG = async (iconName) => {
  try {
    const polymerCategory = await findIconNameCategoryFromTemplates(iconName);
    const path = `/polymerShapes/${polymerCategory}/${iconName}.svg`;

    const exists = await checkFileExists(path);
    if (!exists) {
      console.warn(`SVG not found at: ${path}`);
      return null;
    }

    const response = await fetch(path);
    const svgText = await response.text();
    const encoded = btoa(svgText);
    return encoded;
  } catch (error) {
    console.error('Failed to load SVG:', error);
    return null;
  }
};

export default loadAndEncodeSVG;