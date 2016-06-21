module Template
  class ReactionContent
    def title
      @report.add_title do |t|
        t.add_text @reaction.name, font_style: :bold
      end
    end

    def description
      @report.add_paragraph do |p|
        p.add_text 'Description:', font_style: :bold
        p.line_break
        p.add_text @reaction.description
      end
      @report.line_break
    end

    def svg_composer
      paths = {}
      paths[:starting_materials] = @reaction.starting_materials.map do |material|
        material.get_svg_path
      end
      paths[:reactants] = @reaction.reactants.map do |material|
        material.get_svg_path
      end
      paths[:products] = @reaction.products.map do |material|
        material.get_svg_path
      end
      SVG::ReactionComposer.new(paths, paths: [@reaction.solvent, @reaction.temperature].reject{|c| c.blank?}.join(", "))
    end

    def reaction_svg
      reaction_svg = svg_composer.compose_reaction_svg
      @report.add_paragraph do |p|
        p.add_text 'Reaction:', font_style: :bold
      end
      @report.add_image do |i|
        i.set_blob reaction_svg
        i.size x: 50, y: 50
      end
      @report.line_break
    end

    def materials
      startings
      reactants
      products
    end

    def startings
      @report.add_paragraph do |p|
        p.add_text 'Starting Materials:', font_style: :bold
      end
      if @reaction.starting_materials.count > 0
        @report.add_table(@reaction.starting_materials.count + 1, 6) do |t|
          t.add_line 'Name', 'Molecule', 'mg', 'ml', 'mmol', 'Equiv'
          samples = @reaction.reactions_starting_material_samples.includes(:sample).each do |item|
            t.add_line item.sample.name.to_s, item.sample.molecule.sum_formular, item.sample.amount_mg.round(5).to_s, item.sample.amount_ml.to_s, item.sample.amount_mmol.round(5).to_s, item.equivalent.to_s
          end
        end
      end
      @report.line_break
    end

    def reactants
      @report.add_paragraph do |p|
        p.add_text 'Reactants:', font_style: :bold
      end
      if @reaction.reactants.count > 0
        @report.add_table(@reaction.reactants.count + 1, 6) do |t|
          t.add_line 'Name', 'Molecule', 'mg', 'ml', 'mmol', 'Equiv'
          samples = @reaction.reactions_reactant_samples.includes(:sample).each do |item|
            t.add_line item.sample.name.to_s, item.sample.molecule.sum_formular, item.sample.amount_mg.round(5).to_s, item.sample.amount_ml.to_s, item.sample.amount_mmol.round(5).to_s, item.equivalent.try(:round, 2).try(:to_s)
          end
        end
      end
      @report.line_break
    end

    def products
      @report.add_paragraph do |p|
        p.add_text 'Products:', font_style: :bold
      end
      if @reaction.products.count > 0
        @report.add_table(@reaction.products.count + 1, 6) do |t|
          t.add_line 'Name', 'Molecule', 'mg', 'ml', 'mmol', 'Yield'
          samples = @reaction.reactions_product_samples.includes(:sample).each do |item|
            t.add_line item.sample.name.to_s, item.sample.molecule.sum_formular, item.sample.amount_mg(:real).round(5).to_s, item.sample.amount_ml(:real).to_s, item.sample.amount_mmol(:real).round(5).to_s, item.formatted_yield
          end
        end
      end
      @report.line_break
    end

    def properties
      @report.add_paragraph do |p|
        p.add_text 'Properties:', font_style: :bold
      end
      @report.add_table(3, 2) do |t|
        t.add_line 'Observation', @reaction.observation
        t.add_line 'Purification', @reaction.purification.map { |i| i.to_s }.join(" / ")
        t.add_line 'Dangerous products', @reaction.dangerous_products.map { |i| i.to_s }.join(" / ")
      end
      @report.line_break
    end

    def tlc_control
      @report.add_paragraph do |p|
        p.add_text 'TLC control:', font_style: :bold
        p.line_break
        p.add_text @reaction.tlc_description
      end
      @report.line_break
    end

    def literatures
      @report.add_paragraph do |p|
        p.add_text 'literature', font_style: :bold
      end
      if @reaction.literatures.count > 0
        @report.add_table(@reaction.literatures.count + 1, 2) do |t|
          t.add_line "Title", "URL"
          @reaction.literatures.each do |l|
            t.add_line l.title, l.url
          end
        end
      end
    end

    def reaction_ending
      @report.line_break
      @report.line_break
      @report.line_break
      @report.line_break
    end
  end
end
