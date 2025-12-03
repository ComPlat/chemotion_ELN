const isEqId = (a, b) => a.id === b.id;

const reOrderArr = (sourceTagEl, targetTagEl, criteria, arr = []) => {
  const sourceIndex = arr.findIndex((el) => criteria(el, sourceTagEl));
  const targetIndex = arr.findIndex((el) => criteria(el, targetTagEl));

  if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) {
    return arr;
  }

  const newArr = [...arr];
  const [moved] = newArr.splice(sourceIndex, 1);
  newArr.splice(targetIndex, 0, moved);

  return newArr;
};

export { reOrderArr, isEqId };
