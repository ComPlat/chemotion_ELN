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

  def set_loading
    return unless residue = self.sample.residues[0]
    return unless self.composition_type == 'found'
    return unless self.data.values.map(&:to_f).sum <= 100.0
    return unless self.data.values.map(&:to_f).sum > 0.0

    # use different algorythm if this is reaction product
    if d_reaction = (self.sample.reactions_product_samples.first ||
                     self.sample.reactions_reactant_samples.first)
      return unless sm_data =
                d_reaction.reaction.reactions_starting_material_samples.first

      return unless ea_c = sm_data.sample.elemental_compositions
                       .where(composition_type: ['loading', 'formula']).first

      product_yield = self.data['C'].to_f / ea_c.data['C'].to_f
      return if product_yield == 0.0

      new_amount = sm_data.sample.amount_mmol * product_yield

      self.loading = new_amount / self.sample.target_amount_value * 1000.0
    else
      return unless mf = self.sample.molecule.sum_formular
      return unless pf = residue.custom_info['formula']

      self.loading = Chemotion::Calculations.get_loading mf, pf, self.data
    end
  end
end
