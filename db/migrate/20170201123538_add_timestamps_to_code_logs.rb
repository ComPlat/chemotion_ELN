class AddTimestampsToCodeLogs < ActiveRecord::Migration[4.2]
  def change
    add_timestamps(:code_logs)
  end
end
