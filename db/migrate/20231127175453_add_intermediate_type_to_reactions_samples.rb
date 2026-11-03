# frozen_string_literal: true

class AddIntermediateTypeToReactionsSamples < ActiveRecord::Migration[6.1]
  def change
    add_column :reactions_samples, :reaction_process_step_id, :uuid
    add_column :reactions_samples, :intermediate_type, :string
  end
end
