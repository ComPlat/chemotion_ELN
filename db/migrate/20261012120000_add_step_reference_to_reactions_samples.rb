# frozen_string_literal: true

class AddStepReferenceToReactionsSamples < ActiveRecord::Migration[6.1]
  def change
    add_column :reactions_samples, :step_reference, :boolean, null: false, default: false
  end
end
