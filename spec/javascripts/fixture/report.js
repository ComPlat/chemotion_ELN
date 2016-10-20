const settings = [  {text: "formula", checked: true},
                  {text: "material", checked: true},
                  {text: "description", checked: true},
                  {text: "purification", checked: true},
                  {text: "tlc", checked: true},
                  {text: "observation", checked: true},
                  {text: "analysis", checked: true},
                  {text: "literature", checked: true} ]

const configs = [ {text: "Page Break", checked: true},
                  {text: "Show all material in formulas (unchecked to show Products only)", checked: true} ]

const originalState = {
  settings: settings,
  configs: [ {text: "Page Break", checked: true},
             {text: "Show all material in formulas (unchecked to show Products only)", checked: true} ],
  checkedAllSettings: true,
  checkedAllConfigs: true,
  processingReport: false,
  selectedReactionIds: [],
  selectedReactions: [],
}

export { originalState, settings, configs }
