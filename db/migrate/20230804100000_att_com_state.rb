class AttComState < ActiveRecord::Migration[6.1]
  def self.up
    add_column :attachments, :con_state, :integer unless column_exists? :attachments, :con_state
  end

  def self.down
    remove_column :attachments, :con_state if column_exists? :attachments, :con_state
  end
end
