class AddPrdAttsToReports < ActiveRecord::Migration[5.2]
  def change
    add_column :reports, :prd_atts, :text, default: "[]"
  end
end
