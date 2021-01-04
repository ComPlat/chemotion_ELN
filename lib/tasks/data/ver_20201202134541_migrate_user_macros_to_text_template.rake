namespace :data do
  desc 'Migrate saved user macros to text template'
  task ver_20201202134541_migrate_user_macros_to_text_template: :environment do
    element_names = %w[sample reaction wellplate screen research_plan]
    element_names.each do |type|
      klass = "#{type.camelize}TextTemplate".constantize
      klass.destroy_all
    end

    default_template = {
      'MS': %w[ei fab esi apci asap maldi m+ hr hr-ei hr-fab],
      '_toolbar': %w[ndash h-nmr c-nmr ir uv ea]
    }

    Person.all.each do |u|
      profile = u.profile
      macros = profile[:data].delete('macros') || {}
      user_templates = macros.nil? ? default_template : macros
      profile.save!

      element_names.each do |type|
        klass = "#{type.camelize}TextTemplate".constantize
        template = klass.new
        template.user_id = u.id
        template.data = user_templates

        template.save!
      end
    end
  end
end
