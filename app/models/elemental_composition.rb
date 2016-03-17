class ElementalComposition < ActiveRecord::Base
  belongs_to :sample

  TYPES = {
    full_conv: 'According to 100% conversion',
    loading: 'By user-defined loading',
    mass_diff: 'According to mass difference reaction/yield',
    formula: 'By molecule formula'
  }

  validates_inclusion_of :composition_type, in: TYPES.keys.map(&:to_s)
end
