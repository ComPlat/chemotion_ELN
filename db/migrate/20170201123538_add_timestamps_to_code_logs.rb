class AddTimestampsToCodeLogs < ActiveRecord::Migration
  def change
    add_timestamps(:code_logs)
  end
end
