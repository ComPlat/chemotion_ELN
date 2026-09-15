# frozen_string_literal: true

class AddDeletedAtToReactionProcessSteps < ActiveRecord::Migration[6.1]
  def change
    add_column :reaction_process_steps, :deleted_at, :datetime
  end
end
