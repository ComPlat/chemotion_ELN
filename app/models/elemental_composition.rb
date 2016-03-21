class ElementalComposition < ActiveRecord::Base
  belongs_to :sample

  TYPES = {
    full_conv: 'According to 100% conversion',
    loading: 'By user-defined loading',
    mass_diff: 'According to mass difference reaction/yield',
    formula: 'By molecule formula',
    found: 'Found'
  }

  validates_inclusion_of :composition_type, in: TYPES.keys.map(&:to_s)

  before_save :calculate_loading

private

  def calculate_loading
    return unless self.composition_type == 'found'
    return unless self.data.values.map(&:to_f).sum <= 100.0
    return unless self.data.values.map(&:to_f).sum > 0.0
    return unless mf = self.sample.molecule.sum_formular
    return unless pf = self.sample.residues[0].custom_info['formula']

    self.loading = Chemotion::Calculations.get_loading mf, pf, self.data
  end
end
