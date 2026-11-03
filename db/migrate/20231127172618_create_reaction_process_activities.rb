# frozen_string_literal: true

class CreateReactionProcessActivities < ActiveRecord::Migration[6.1]
  def change
    create_table :reaction_process_activities, id: :uuid do |t|
      t.uuid :reaction_process_step_id

      t.string :activity_name
      t.integer :position
      t.json :workup

      t.timestamps
    end
  end
end
