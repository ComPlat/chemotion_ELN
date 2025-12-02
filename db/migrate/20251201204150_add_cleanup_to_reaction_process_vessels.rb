class AddCleanupToReactionProcessVessels < ActiveRecord::Migration[6.1]
  def change
    add_column :reaction_process_vessels, :cleanup, :string
  end
end
