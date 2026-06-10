# frozen_string_literal: true

class CreateInfoSupportLinks < ActiveRecord::Migration[6.1]
  def change
    create_table :info_support_links do |t|
      t.string  :label, null: false
      t.string  :url, null: false
      t.integer :position, null: false, default: 0
      t.boolean :enabled, null: false, default: true

      t.timestamps
    end
  end
end
