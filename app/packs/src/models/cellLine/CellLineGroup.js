export default class CellLineGroup {
  constructor() {
    this.cellLineItems = [];
  }

  static buildFromElements(cellLineElements = []) {
    const cellLineGroups = [];
    cellLineElements.forEach((cellLine) => {
      CellLineGroup.addCelllineToGroup(cellLine, cellLineGroups);
    });

    return cellLineGroups;
  }

  static addCelllineToGroup(cellLine, cellLineGroups) {
    const matchingGroups = CellLineGroup.findMatchingGroups(cellLineGroups, cellLine);

    if (matchingGroups.length === 0) {
      CellLineGroup.addCellLineToNewGroup(cellLineGroups, cellLine);
    } else {
      matchingGroups[0].cellLineItems.push(cellLine);
    }
  }

  static addCellLineToNewGroup(cellLineGroups, cellLine) {
    const groupInFocus = new CellLineGroup();
    cellLineGroups.push(groupInFocus);
    groupInFocus.cellLineItems.push(cellLine);
  }

  static findMatchingGroups(cellLineGroups, cellLine) {
    let matchingGroups = [];
    cellLineGroups.forEach((g) => {
      if (g.matchingGroup(cellLine)) {
        matchingGroups = [g];
      }
    });
    return matchingGroups;
  }

  matchingGroup(cellLineToCheck) {
    if (this.cellLineItems.length === 0) { return false; }

    const firstItemInGroup = this.cellLineItems[0];

    return firstItemInGroup.cellLineName === cellLineToCheck.cellLineName
    && firstItemInGroup.source === cellLineToCheck.source;
  }
}
