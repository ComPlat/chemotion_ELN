import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { FN } from '@complat/react-spectra-editor';

import { loadCompareSpectra } from '../services/compareLoadService';
import { saveCompareSpectra } from '../services/compareSaveService';
import { buildCompareInfos } from '../utils/compareInfos';

const STATUS = Object.freeze({
  IDLE: 'idle',
  LOADING: 'loading',
  READY: 'ready',
  ERROR: 'error',
  SAVING: 'saving',
});

const initialState = {
  status: STATUS.IDLE,
  spectra: [],
  failures: [],
  error: null,
  container: null,
  originalAnalyses: null,
  saveError: null,
};

const sameInfos = (a, b) => {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i]?.idx !== b[i]?.idx) return false;
  }
  return true;
};

const cloneAnalyses = (analyses) => (
  Array.isArray(analyses) ? analyses.map((entry) => ({ ...entry })) : null
);

function reducer(state, action) {
  switch (action.type) {
    case 'INIT_CONTAINER':
      return {
        ...state,
        container: action.container,
        originalAnalyses: cloneAnalyses(action.container?.extended_metadata?.analyses_compared),
      };
    case 'SET_CONTAINER':
      return { ...state, container: action.container };
    case 'LOAD_START':
      return { ...state, status: STATUS.LOADING, error: null };
    case 'LOAD_SUCCESS':
      return {
        ...state,
        status: STATUS.READY,
        spectra: action.spectra,
        failures: action.failures,
        error: null,
      };
    case 'LOAD_FAIL':
      return {
        ...state,
        status: STATUS.ERROR,
        spectra: [],
        failures: action.failures || [],
        error: action.error,
      };
    case 'SAVE_START':
      return { ...state, status: STATUS.SAVING, saveError: null };
    case 'SAVE_SUCCESS':
      return {
        ...state,
        status: STATUS.READY,
        container: action.container,
        originalAnalyses: cloneAnalyses(action.container?.extended_metadata?.analyses_compared),
        saveError: null,
      };
    case 'SAVE_FAIL':
      return { ...state, status: STATUS.READY, saveError: action.error };
    case 'UNDO':
      return {
        ...state,
        container: action.container,
      };
    case 'RESET':
      return { ...initialState };
    default:
      return state;
  }
}

const buildEntityCache = () => {
  const cache = new Map();
  return {
    get(spc) {
      if (!spc) return null;
      const key = spc.idx;
      if (cache.has(key)) return cache.get(key);
      const built = spc.jcamp ? FN.buildData(spc.jcamp) : null;
      const entity = built?.entity || null;
      cache.set(key, entity);
      return entity;
    },
    invalidate(keys = null) {
      if (!keys) {
        cache.clear();
        return;
      }
      keys.forEach((k) => cache.delete(k));
    },
  };
};

export const useCompareSpectra = ({ sample, container }, deps = {}) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const cacheRef = useRef(buildEntityCache());
  const loadRef = useRef(0);
  const previousInfosRef = useRef([]);

  const load = deps.load || loadCompareSpectra;
  const save = deps.save || saveCompareSpectra;

  useEffect(() => {
    if (container && container !== state.container) {
      dispatch({ type: 'INIT_CONTAINER', container });
    }
  }, [container]); // eslint-disable-line react-hooks/exhaustive-deps

  const compareInfos = useMemo(
    () => buildCompareInfos(sample, state.container || container),
    [sample, state.container, container],
  );

  useEffect(() => {
    if (sameInfos(previousInfosRef.current, compareInfos)) return;
    previousInfosRef.current = compareInfos;

    if (compareInfos.length === 0) {
      cacheRef.current.invalidate();
      dispatch({ type: 'LOAD_SUCCESS', spectra: [], failures: [] });
      return;
    }

    const callId = (loadRef.current += 1);
    dispatch({ type: 'LOAD_START' });

    load(compareInfos)
      .then(({ spectra, failures }) => {
        if (callId !== loadRef.current) return;
        cacheRef.current.invalidate();
        if (spectra.length === 0 && failures.length > 0) {
          dispatch({
            type: 'LOAD_FAIL',
            error: new Error('Unable to decode any spectrum.'),
            failures,
          });
          return;
        }
        dispatch({ type: 'LOAD_SUCCESS', spectra, failures });
      })
      .catch((error) => {
        if (callId !== loadRef.current) return;
        dispatch({ type: 'LOAD_FAIL', error, failures: [] });
      });
  }, [compareInfos, load]);

  const multiEntities = useMemo(() => (
    state.spectra.map((spc) => cacheRef.current.get(spc)).filter(Boolean)
  ), [state.spectra]);

  const setContainer = useCallback((nextContainer) => {
    dispatch({ type: 'SET_CONTAINER', container: nextContainer });
  }, []);

  const undo = useCallback(() => {
    if (!state.container || !state.originalAnalyses) return null;
    const next = {
      ...state.container,
      extended_metadata: {
        ...(state.container.extended_metadata || {}),
        analyses_compared: state.originalAnalyses.map((entry) => ({ ...entry })),
      },
    };
    dispatch({ type: 'UNDO', container: next });
    return next;
  }, [state.container, state.originalAnalyses]);

  const persist = useCallback(async ({ payloads, frontCurveIdx = 0 } = {}) => {
    if (!state.container) {
      return null;
    }
    dispatch({ type: 'SAVE_START' });
    try {
      const result = await save({
        container: state.container,
        spectra: state.spectra,
        payloads,
        frontCurveIdx,
      }, { combineSpectra: deps.combineSpectra });
      cacheRef.current.invalidate();
      dispatch({ type: 'SAVE_SUCCESS', container: result.container });
      return result;
    } catch (error) {
      dispatch({ type: 'SAVE_FAIL', error });
      throw error;
    }
  }, [save, state.container, state.spectra, deps.combineSpectra]);

  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  const showUndo = useMemo(() => {
    const original = state.originalAnalyses?.length || 0;
    const current = state.container?.extended_metadata?.analyses_compared?.length || 0;
    return current < original;
  }, [state.originalAnalyses, state.container]);

  return {
    status: state.status,
    spectra: state.spectra,
    failures: state.failures,
    error: state.error,
    saveError: state.saveError,
    container: state.container,
    multiEntities,
    showUndo,
    setContainer,
    undo,
    persist,
    reset,
  };
};

export const COMPARE_STATUS = STATUS;
export default useCompareSpectra;
