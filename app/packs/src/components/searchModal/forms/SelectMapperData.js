const mapperFields = [
  {
    value: "=",
    label: "EXACT"
  },
  {
    value: "LIKE",
    label: "LIKE (substring)"
  },
  {
    value: "ILIKE",
    label: "LIKE (case insensitive substring)"
  },
  {
    value: "NOT LIKE",
    label: "NOT LIKE (substring)"
  },
  {
    value: "NOT ILIKE",
    label: "NOT LIKE (case insensitive substring)"
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
