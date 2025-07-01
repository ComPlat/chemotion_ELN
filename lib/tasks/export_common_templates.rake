# lib/tasks/export_common_templates.rake
# bundle exec rake db:export_common_templates

namespace :db do
  desc 'Export data from a table to JSON'
  task export_common_templates: :environment do
    table_name = 'ketcherails_common_templates'
    model_class = 'KetcherailsCommonTemplate'.constantize
    output_file = 'db/common_templates/custom.json'

    # Delete existing common_templates files first
    Dir.glob('db/common_templates/*.json').each do |file|
      next if File.basename(file) == 'default.json' # skip this file

      File.delete(file)
      puts "Deleted old export file: #{file}"
    end

    if ActiveRecord::Base.connection.data_source_exists?(table_name)
      if model_class.exists?
        data = model_class.all.as_json
        File.write(output_file, JSON.pretty_generate(data))
        puts "Exported #{data.size} records to #{output_file}"
      else
        puts "No data found in #{table_name}"
      end
    else
      puts "Table '#{table_name}' not found for common template export"
    end
  end
end
