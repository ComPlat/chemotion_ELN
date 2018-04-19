const ChemReadObjectHelper = {
  renderSvg(svg) {
    let newSvg = svg.replace(/<rect.*\/>/, '');
    const viewBox = svg.match(/viewBox="(.*)"/)[1];
    newSvg = newSvg.replace(/<svg.*viewBox.*>/, '');
    newSvg = newSvg.replace(/<\/svg><\/svg>/, '</svg>');
    const svgDOM = new DOMParser().parseFromString(newSvg, 'image/svg+xml');
    const editedSvg = svgDOM.documentElement;
    editedSvg.removeAttribute('width');
    editedSvg.removeAttribute('height');
    editedSvg.setAttribute('viewBox', viewBox);
    editedSvg.setAttribute('width', '100%');
    return editedSvg.outerHTML;
  },
  extractDetails(desc) {
    if (Object.keys(desc).includes('time')) {
      return { description: desc.detail };
    }

    const details = {};
    Object.keys(desc).forEach((k) => {
      if (!desc[k]) return;

      if (k === 'detail') {
        const detailOutline = desc[k];

        Object.keys(detailOutline).forEach((dk) => {
          const detailList = detailOutline[dk];

          detailList.forEach((detail, idx) => {
            const detailKey = detailList.length === 1 ? dk : `${dk} ${idx + 1}`;
            const dconstructor = detail.constructor;

            if (dconstructor === Object) {
              details[detailKey] = detail;
            } else if (dconstructor === String) {
              const trimmedDetail = detail.trim();
              if (trimmedDetail) {
                const dobj = {};
                dobj[detailKey] = trimmedDetail;
                details[dk] = Object.assign(details[dk] || {}, dobj);
              }
            }
          });
        });
      } else {
        Object.keys(desc[k]).forEach((d) => {
          const dk = k.endsWith('s') ? k.slice(0, -1) : k;
          const dkey = `${dk} ${parseInt(d, 10) + 1}`;
          details[dkey] = desc[k][d].detail;
        });
      }
    });

    return details;
  }
};

module.exports = ChemReadObjectHelper;
