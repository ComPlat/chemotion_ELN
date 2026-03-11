# frozen_string_literal: true

# Create dose_resp_outputs table to store response data from MTT external app
class CreateDoseRespOutputs < ActiveRecord::Migration[4.2]
  def self.up
    return if table_exists?(:dose_resp_outputs)

    create_table :dose_resp_outputs do |t|
      t.references :dose_resp_request, null: false, index: true, foreign_key: { to_table: :dose_resp_requests }
      t.jsonb :output_data, null: false, default: {}
      t.text :notes
      t.datetime :deleted_at
      t.timestamps null: false
    end

    add_index :dose_resp_outputs, :deleted_at
    add_index :dose_resp_outputs, :created_at
  end

  def self.down
    return unless table_exists?(:dose_resp_outputs)

    drop_table :dose_resp_outputs
  end
end
