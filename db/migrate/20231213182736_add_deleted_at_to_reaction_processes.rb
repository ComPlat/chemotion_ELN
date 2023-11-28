# frozen_string_literal: true

class AddDeletedAtToReactionProcesses < ActiveRecord::Migration[6.1]
  def change
    add_column :reaction_processes, :deleted_at, :datetime
  end
end
