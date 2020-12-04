class MigrateUserMacrosToTextTemplate < ActiveRecord::Migration
  def up
    default_template = {
      'MS': %w[ei fab esi apci asap maldi m+ hr hr-ei hr-fab],
      '_toolbar': %w[ndash h-nmr c-nmr ir uv ea]
    }

    Person.all.each do |u|
      profile = u.profile
      macros = profile[:data].delete('macros') || {}
      user_templates = macros.nil? ? default_template : macros
      profile.save!

      %w[sample reaction wellplate screen research_plan].each do |type|
        klass = "#{type.camelize}TextTemplate".constantize
        template = klass.new
        template.user_id = u.id
        template.data = user_templates

        template.save!
      end
    end
  end

  def down
    %w[sample reaction wellplate screen research_plan].each do |type|
      klass = "#{type.camelize}TextTemplate".constantize
      klass.destroy_all
    end
  end
end
