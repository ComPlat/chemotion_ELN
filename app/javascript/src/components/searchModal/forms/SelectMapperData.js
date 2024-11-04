const mapperFields = [
  {
    value: "=",
    label: "EXACT"
  },
  {
    value: "ILIKE",
    label: "LIKE"
  },
  {
    value: "NOT ILIKE",
    label: "NOT LIKE"
  }
]

const unitMapperFields = [
  {
    value: '=',
    label: 'EXACT',
  },
  {
    value: '<',
    label: 'LESS THAN',
  },
  {
    value: '>',
    label: 'BIGGER THAN',
  },
]

export { mapperFields, unitMapperFields };
