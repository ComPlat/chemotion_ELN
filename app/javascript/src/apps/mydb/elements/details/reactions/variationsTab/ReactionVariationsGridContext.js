import { createContext } from 'react';

/*
Carries the per-row update handlers into the cells.

The context value is deliberately NOT memoized: AG Grid does not re-render cell components when the
surrounding React tree re-renders, but context updates do reach them (portals keep the React tree
intact). Recreating the value on every render is what keeps every cell in sync with the mutated
Reaction models after an edit, without going through `api.refreshCells`, which would tear down and
rebuild the cell component and steal focus from the input being typed into.

It lives in a module of its own because both halves of the variations tab read it: the grid shell in
ReactionVariationComponents, which provides it, and the scheme cells in
ReactionVariationSchemaComponents, which the shell in turn renders. Keeping it with either of the two
would make them import each other.
*/
const VariationsGridContext = createContext({
  variations: [],
  columnUnits: {},
  setColumnUnit: () => {},
  getRowHandler: () => null,
  setActiveVariation: () => {},
  onGroupChange: () => {},
});

export default VariationsGridContext;
