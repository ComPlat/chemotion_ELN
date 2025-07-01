require Rails.root.join('lib/tasks/support/ketcher_common_templates.rb')

class ExportCommonTemplatesToFile < ActiveRecord::Migration[6.1]
  def up
    say_with_time "Exporting common templates to file..." do
      CommonTemplateExporter.export
    end
  end

  def down
    # roll back not required
  end
end
