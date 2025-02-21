# frozen_string_literal: true

class AddTimestampsToReactionsSamples < ActiveRecord::Migration[5.2]
  def change
    change_table :reactions_samples do |t|
      t.timestamps null: true
    end
  end
end
