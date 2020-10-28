module Reactable
  extend ActiveSupport::Concern

  def update_equivalent
    ref_record = ReactionsSample.where(reaction_id: self.reaction_id, reference: true).first
    return unless ref_record
    return unless ref_record.id != self.id

    amount = if self.sample.real_amount_value && self.sample.real_amount_value != 0
      self.sample.amount_mmol(:real)
    else
      self.sample.amount_mmol
    end
    amount = self.sample.amount_mmol(:real) if self.is_a? ReactionsProductSample
    ref_amount = if ref_record.sample.real_amount_value && ref_record.sample.real_amount_value != 0
      ref_record.sample.amount_mmol(:real)
    else
      ref_record.sample.amount_mmol
    end
    self.update_attribute :equivalent, amount / ref_amount
  end
end
