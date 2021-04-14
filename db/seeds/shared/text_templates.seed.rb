PredefinedTextTemplate.init_seeds
Person.all.each(&:create_text_template)