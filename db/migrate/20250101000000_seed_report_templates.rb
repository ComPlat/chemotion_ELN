class SeedReportTemplates < ActiveRecord::Migration[4.2]
  def change
    ReportTemplate.reset_column_information
    Attachment.reset_column_information
    User.reset_column_information
    seed_path = Rails.root.join('db', 'seeds', 'shared', 'report_templates.seed.rb')
    load(seed_path) if File.exist?(seed_path)
  end
end
