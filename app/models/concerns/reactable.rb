# frozen_string_literal: true

# Reactable module
module Reactable
  extend ActiveSupport::Concern

  def update_equivalent
    ref_record = ReactionsSample.where(reaction_id: reaction_id, reference: true).first
    return unless ref_record
    return unless ref_record.id != id

    amount = sample.real_amount_value && sample.real_amount_value != 0 ? sample.amount_mmol(:real) : sample.amount_mmol

    case self
    when ReactionsProductSample
      amount = sample.amount_mmol(:real) if is_a? ReactionsProductSample
      ref_amount = ref_record.sample.amount_mmol(:target) *
                   (self[:coefficient] || 1.0) / (ref_record[:coefficient] || 1.0)
    else
      condition = sample.real_amount_value && sample.real_amount_value != 0
      ref_record_condition = ref_record.sample.real_amount_value && ref_record.sample.real_amount_value != 0
      amount = condition ? sample.amount_mmol(:real) : sample.amount_mmol
      ref_amount = ref_record_condition ? ref_record.sample.amount_mmol(:real) : ref_record.sample.amount_mmol
    end
    update_attribute :equivalent, ref_amount.zero? ? 0 : amount / ref_amount
  end
end
