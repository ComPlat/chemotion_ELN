# frozen_string_literal: true

# Create generic segments
class CreateDoseRespRequests < ActiveRecord::Migration[6.1]
  def self.up
    unless table_exists? :dose_resp_requests
      create_table :dose_resp_requests do |t|
        t.integer :request_id
        t.integer :element_id
        t.integer :state
        t.jsonb :wellplates_metadata
        t.string :resp_message
        t.integer :created_by
        t.datetime :created_at
        t.datetime :updated_at
        t.datetime :deleted_at
      end
    end
  end

  def self.down
    drop_table :dose_resp_requests if table_exists? :dose_resp_requests
  end
end
