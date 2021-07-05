class CreateReportTemplates < ActiveRecord::Migration[4.2]
  def change
    create_table :report_templates do |t|
      t.string :name
      t.string :report_type

      t.timestamps null: false
      t.references :attachment, index: true, foreign_key: true
    end

    add_reference :reports, :report_templates, index: true 
    change_column_null :report_templates, :name, false 
    change_column_null :report_templates, :report_type, false

    ReportTemplate.reset_column_information
    Attachment.reset_column_information
    seed_path = Rails.root.join('db', 'seeds', 'shared', 'report_templates.seed.rb')
    load(seed_path) if File.exist?(seed_path)
  end
end
