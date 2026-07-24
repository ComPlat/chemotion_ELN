# frozen_string_literal: true

class AddAccessTrackingToAttachments < ActiveRecord::Migration[6.1]
  def change
    change_table :attachments, bulk: true do |t|
      t.column :last_accessed_at, :datetime
      t.column :access_count, :integer, default: 0, null: false
    end
  end
end
