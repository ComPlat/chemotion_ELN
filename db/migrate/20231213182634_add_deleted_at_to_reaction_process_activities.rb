# frozen_string_literal: true

class AddDeletedAtToReactionProcessActivities < ActiveRecord::Migration[6.1]
  def change
    add_column :reaction_process_activities, :deleted_at, :datetime
  end
end
