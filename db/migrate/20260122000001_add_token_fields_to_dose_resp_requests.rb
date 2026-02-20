# frozen_string_literal: true

# Add token-based authentication fields to dose_resp_requests
class AddTokenFieldsToDoseRespRequests < ActiveRecord::Migration[4.2]
  def self.up
    return unless table_exists?(:dose_resp_requests)

    # Change request_id from integer to string for readable timestamps
    if column_exists?(:dose_resp_requests, :request_id)
      change_column :dose_resp_requests, :request_id, :string
    end

    add_column :dose_resp_requests, :access_token, :string unless column_exists?(:dose_resp_requests, :access_token)
    add_column :dose_resp_requests, :expires_at, :datetime unless column_exists?(:dose_resp_requests, :expires_at)
    add_column :dose_resp_requests, :revoked_at, :datetime unless column_exists?(:dose_resp_requests, :revoked_at)
    add_column :dose_resp_requests, :first_accessed_at, :datetime unless column_exists?(:dose_resp_requests, :first_accessed_at)
    add_column :dose_resp_requests, :last_accessed_at, :datetime unless column_exists?(:dose_resp_requests, :last_accessed_at)
    add_column :dose_resp_requests, :access_count, :integer, default: 0 unless column_exists?(:dose_resp_requests, :access_count)
    add_column :dose_resp_requests, :input_metadata, :jsonb, default: {}, null: false unless column_exists?(:dose_resp_requests, :input_metadata)

    # Add unique index for access_token
    add_index :dose_resp_requests, :access_token, unique: true unless index_exists?(:dose_resp_requests, :access_token)

    # Add index for faster lookups
    add_index :dose_resp_requests, :element_id unless index_exists?(:dose_resp_requests, :element_id)
    add_index :dose_resp_requests, :created_by unless index_exists?(:dose_resp_requests, :created_by)
  end

  def self.down
    return unless table_exists?(:dose_resp_requests)

    remove_index :dose_resp_requests, :access_token if index_exists?(:dose_resp_requests, :access_token)
    remove_index :dose_resp_requests, :element_id if index_exists?(:dose_resp_requests, :element_id)
    remove_index :dose_resp_requests, :created_by if index_exists?(:dose_resp_requests, :created_by)

    remove_column :dose_resp_requests, :access_token if column_exists?(:dose_resp_requests, :access_token)
    remove_column :dose_resp_requests, :expires_at if column_exists?(:dose_resp_requests, :expires_at)
    remove_column :dose_resp_requests, :revoked_at if column_exists?(:dose_resp_requests, :revoked_at)
    remove_column :dose_resp_requests, :first_accessed_at if column_exists?(:dose_resp_requests, :first_accessed_at)
    remove_column :dose_resp_requests, :last_accessed_at if column_exists?(:dose_resp_requests, :last_accessed_at)
    remove_column :dose_resp_requests, :access_count if column_exists?(:dose_resp_requests, :access_count)
    remove_column :dose_resp_requests, :input_metadata if column_exists?(:dose_resp_requests, :input_metadata)
  end
end
