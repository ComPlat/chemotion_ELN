import { useEffect, useRef, useState } from 'react';
import SpectraStore from 'src/stores/alt/stores/SpectraStore';

const shallowEqual = (a, b) => {
  if (a === b) return true;
  if (!a || !b) return false;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (a[key] !== b[key]) return false;
  }
  return true;
};

const identitySelector = (state) => state;

export const useSpectraStoreSlice = (selector = identitySelector) => {
  const selectorRef = useRef(selector);
  selectorRef.current = selector;

  const [slice, setSlice] = useState(() => selectorRef.current(SpectraStore.getState()));

  useEffect(() => {
    const onChange = (next) => {
      const value = selectorRef.current(next);
      setSlice((prev) => (shallowEqual(prev, value) ? prev : value));
    };
    SpectraStore.listen(onChange);
    return () => SpectraStore.unlisten(onChange);
  }, []);

  return slice;
};

export default useSpectraStoreSlice;
