class AddAnalysisIdToCodeLogs < ActiveRecord::Migration[4.2]
  def change
    add_column :code_logs, :analysis_id, :string
  end
end
