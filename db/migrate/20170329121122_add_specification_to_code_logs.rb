class AddSpecificationToCodeLogs < ActiveRecord::Migration[4.2]
  def change
    add_column :code_logs, :specification, :jsonb
    remove_column :code_logs, :analysis_id if column_exists? :code_logs, :analysis_id

    remove_column :samples,    :bar_code if column_exists? :samples, :bar_code
    remove_column :samples,    :qr_code  if column_exists? :samples, :qr_code
    remove_column :reactions,  :bar_code if column_exists? :reactions, :bar_code
    remove_column :reactions,  :qr_code  if column_exists? :reactions, :qr_code
    remove_column :screens,    :bar_code if column_exists? :screens, :bar_code
    remove_column :screens,    :qr_code  if column_exists? :screens, :qr_code
    remove_column :wellplates, :bar_code if column_exists? :wellplates, :bar_code
    remove_column :wellplates, :qr_code  if column_exists? :wellplates, :qr_code

  end

  add_index :code_logs, [:source, :source_id, :code_type]
  add_index :code_logs, :value


end
