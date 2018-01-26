class AddPrdAttsToReports < ActiveRecord::Migration
  def change
    add_column :reports, :prd_atts, :text, default: []
  end
end
