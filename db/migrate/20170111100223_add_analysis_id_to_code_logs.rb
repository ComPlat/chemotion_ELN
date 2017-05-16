class AddAnalysisIdToCodeLogs < ActiveRecord::Migration
  def change
    add_column :code_logs, :analysis_id, :string
  end
end
