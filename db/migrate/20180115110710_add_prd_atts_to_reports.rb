class AddPrdAttsToReports < ActiveRecord::Migration[4.2]
  def change
    add_column :reports, :prd_atts, :text, default: [], array: true
  end
end
