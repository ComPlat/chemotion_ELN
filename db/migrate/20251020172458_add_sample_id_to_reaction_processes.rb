# frozen_string_literal: true

class AddSampleIdToReactionProcesses < ActiveRecord::Migration[6.1]
  def change
    add_column :reaction_processes, :sample_id, :integer
    add_column :reaction_processes, :user_id, :integer
    add_column :reaction_processes, :sample_initial_info, :jsonb, default: {}
  end
end
