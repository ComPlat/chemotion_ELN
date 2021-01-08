class MigrateToTextTemplate < ActiveRecord::Migration
  def change
    Rake::Task['data:ver_20201202134541_migrate_user_macros_to_text_template'].invoke
    Rake::Task['data:ver_20201212022300_migrate_predefined_text_template'].invoke
    Rake::Task['data:ver_20210110090000_migrate_reaction_description_to_text_template'].invoke
  end
end
