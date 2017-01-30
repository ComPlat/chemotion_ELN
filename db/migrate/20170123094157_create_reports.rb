class CreateReports < ActiveRecord::Migration
  def change
    create_table :reports do |t|
      t.integer :author_id, index: true
      t.string :file_name, index: true
      t.text :file_description
      t.text :configs
      t.text :sample_settings
      t.text :reaction_settings
      t.text :objects
      t.string :img_format
      t.string :file_path

      t.datetime :generated_at
      t.datetime :deleted_at
      t.timestamps null: false
    end

    create_table :reports_users do |t|
      t.belongs_to :user, index: true
      t.belongs_to :report, index: true

      t.datetime :downloaded_at
      t.datetime :deleted_at, index: true
      t.timestamps null: false
    end
  end
end
