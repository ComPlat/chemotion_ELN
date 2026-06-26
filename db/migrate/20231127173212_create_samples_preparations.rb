# frozen_string_literal: true

class CreateSamplesPreparations < ActiveRecord::Migration[6.1]
  def change
    create_table :samples_preparations, id: :uuid do |t|
      t.uuid :reaction_process_id
      t.integer :sample_id

      t.string :preparations, array: true
      t.string :equipment, array: true
      t.string :details

      t.timestamps
    end
  end
end
