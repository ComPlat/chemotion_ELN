# frozen_string_literal: true

class CreateReactionProcessVessels < ActiveRecord::Migration[6.1]
  def change
    create_table :reaction_process_vessels, id: :uuid do |t|
      t.uuid :reaction_process_id
      t.uuid :vessel_id
      t.string :preparations, array: true, default: []

      t.timestamps
      t.datetime :deleted_at
    end
  end
end
