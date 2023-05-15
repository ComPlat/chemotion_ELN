export default class CellLineGroup {
  constructor() {
    this.cellLineItems = [];
  }

  static buildFromElements(cellLineElements = []) {
    const cellLineGroups = [];
    cellLineElements.forEach((cellLine) => {
      let groupInFocus;
      if (cellLineGroups.length === 0) {
        groupInFocus = new CellLineGroup();
        cellLineGroups.push(groupInFocus);
      } else {
        let matchingGroups = [];
        cellLineGroups.forEach((g) => {
          if (g.matchingGroup(cellLine)) {
            matchingGroups = [g];
          }
        });
        if (matchingGroups.length === 0) {
          groupInFocus = new CellLineGroup();
          cellLineGroups.push(groupInFocus);
        } else {
          groupInFocus = matchingGroups[0];
        }
      }
      groupInFocus.cellLineItems.push(cellLine);
    });
    return cellLineGroups;
  }

  matchingGroup(cellLineToCheck) {
    if (this.cellLineItems.length === 0) { return false; }

    const firstItemInGroup = this.cellLineItems[0];

    return firstItemInGroup.cellLineName === cellLineToCheck.cellLineName
    && firstItemInGroup.mutation === cellLineToCheck.mutation
    && firstItemInGroup.disease === cellLineToCheck.disease
    && firstItemInGroup.organism === cellLineToCheck.organism
    && firstItemInGroup.tissue === cellLineToCheck.tissue
    && firstItemInGroup.variant === cellLineToCheck.variant
    && firstItemInGroup.bioSafetyLevel === cellLineToCheck.bioSafetyLevel
    && firstItemInGroup.cryopreservationMedium === cellLineToCheck.cryopreservationMedium;
  }
}
