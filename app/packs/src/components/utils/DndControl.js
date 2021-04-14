const isEqId = (a, b) => {
  return a.id === b.id;
}

const findArrIndex = (tagEl, criteria, arr = []) => {
  let elIndex;
  arr.forEach( (el, i) => {
    if(criteria(el, tagEl)) {
      elIndex = i;
    }
  });
  return elIndex;
}

const reOrderArr = (sourceTagEl, targetTagEl, criteria, arr = []) => {
  const sourceIndex = findArrIndex(sourceTagEl, criteria, arr);
  const targetIndex = findArrIndex(targetTagEl, criteria, arr);
  const arrWoSource = [...arr.slice(0, sourceIndex),
                        ...arr.slice(sourceIndex + 1)];
  const newArr = [ ...arrWoSource.slice(0, targetIndex),
                    arr[sourceIndex],
                    ...arrWoSource.slice(targetIndex)]
                      .filter(o => o != null) || [];
  return newArr;
}

export { reOrderArr, isEqId };
