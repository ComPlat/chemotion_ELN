module Reactable
  extend ActiveSupport::Concern

  def update_equivalent
    ref_record = self.reaction.starting_materials.first
    return unless ref_record

    amount = self.sample.amount_mmol
    ref_amount = ref_record.amount_mmol

    self.update_attribute :equivalent, amount / ref_amount
  end
end
