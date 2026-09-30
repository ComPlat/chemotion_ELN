# frozen_string_literal: true

class AddReactionSteps < ActiveRecord::Migration[6.1]
  def change
    create_table :reaction_steps do |t|
      t.integer :reaction_id, null: false
      t.integer :position, null: false
      t.jsonb :temperature, default: { 'data' => [], 'userText' => '', 'valueUnit' => '°C' }
      t.string :duration
      t.string :timestamp_start
      t.string :timestamp_stop
      t.string :conditions
      t.text :description
      t.string :ph_operator, null: false, default: '='
      t.float :ph_value
      t.jsonb :vessel_size, default: { 'unit' => 'ml', 'amount' => nil }
      t.decimal :volume, precision: 10, scale: 4
      t.datetime :deleted_at
      t.timestamps
      t.index :reaction_id
      t.index :deleted_at
    end

    change_table :reactions_samples, bulk: true do |t|
      t.bigint :reaction_step_id, null: true, default: nil
      t.boolean :carry_on, null: false, default: false
      t.index :reaction_step_id
    end
  end
end
