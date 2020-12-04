class CreateTextTemplates < ActiveRecord::Migration
  def up
    create_table :text_templates do |t|
      t.column :type, :string
      t.integer :user_id, null: false, index: true
      t.jsonb :data, default: {}
      t.datetime :deleted_at, index: true
      t.timestamps null: false
    end
  end

  def down
    drop_table :text_templates
  end
end
