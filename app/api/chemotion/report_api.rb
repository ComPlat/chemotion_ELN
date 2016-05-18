module Chemotion
  class ReportAPI < Grape::API
    resource :reports do
      desc "Build a report using the contents of a JSON file"

      params do
        requires :id
      end
      get :rtf do
        reaction = Reaction.find(params[:id])

        svg_paths = {}
        svg_paths[:starting_materials] = reaction.starting_materials.map do |material|
          material.get_svg_path
        end
        svg_paths[:reactants] = reaction.reactants.map do |material|
          material.get_svg_path
        end
        svg_paths[:products] = reaction.products.map do |material|
          material.get_svg_path
        end

        composer = SVG::ReactionComposer.new(svg_paths, label: [reaction.solvent, reaction.temperature].reject{|c| c.blank?}.join(", "))
        reaction_svg = composer.compose_reaction_svg

        report = Report::RTFReport.new do |r|
          r.add_title do |t|
            t.add_text reaction.name, font_style: :bold
          end
          r.line_break
          r.add_paragraph do |p|
            p.add_text reaction.description
          end
          r.line_break
          r.add_image do |i|
            i.set_blob reaction_svg
            i.size x: 50, y: 50
          end
          r.line_break
          r.add_paragraph do |p|
            p.add_text 'Starting Materials:', font_style: :bold
          end
          if reaction.starting_materials.count > 0
            r.add_table(reaction.starting_materials.count + 1, 6) do |t|
              t.add_line 'Name', 'Molecule', 'mg', 'ml', 'mmol', 'Equiv'
              samples = reaction.reactions_starting_material_samples.includes(:sample).each do |item|
                t.add_line item.sample.name.to_s, item.sample.molecule.sum_formular, item.sample.amount_mg.round(5).to_s, item.sample.amount_ml.to_s, item.sample.amount_mmol.round(5).to_s, item.equivalent.to_s
              end
            end
          end
          r.line_break
          r.add_paragraph do |p|
            p.add_text 'Reactants:', font_style: :bold
          end
          if reaction.reactants.count > 0
            r.add_table(reaction.reactants.count + 1, 6) do |t|
              t.add_line 'Name', 'Molecule', 'mg', 'ml', 'mmol', 'Equiv'
              samples = reaction.reactions_reactant_samples.includes(:sample).each do |item|
                t.add_line item.sample.name.to_s, item.sample.molecule.sum_formular, item.sample.amount_mg.round(5).to_s, item.sample.amount_ml.to_s, item.sample.amount_mmol.round(5).to_s, item.equivalent.try(:round, 2).try(:to_s)
              end
            end
          end
          r.line_break
          r.add_paragraph do |p|
            p.add_text 'Products:', font_style: :bold
          end
          if reaction.products.count > 0
            r.add_table(reaction.products.count + 1, 6) do |t|
              t.add_line 'Name', 'Molecule', 'mg', 'ml', 'mmol', 'Yield'
              samples = reaction.reactions_product_samples.includes(:sample).each do |item|
                t.add_line item.sample.name.to_s, item.sample.molecule.sum_formular, item.sample.amount_mg(:real).round(5).to_s, item.sample.amount_ml(:real).to_s, item.sample.amount_mmol(:real).round(5).to_s, item.formatted_yield
              end
            end
          end
          r.line_break
          r.add_paragraph do |p|
            p.add_text 'Literatures', font_style: :bold
          end
          if reaction.literatures.count > 0
            r.add_table(reaction.literatures.count + 1, 2) do |t|
              t.add_line "Title", "URL"
              reaction.literatures.each do |l|
                t.add_line l.title, l.url
              end
            end
          end
          r.line_break
        end

        env['api.format'] = :binary
        content_type('text/rtf')
        body report.generate_report
      end

      params do
        requires :id, type: String
      end
      get :export_samples_from_collection_samples do
        env['api.format'] = :binary
        content_type('application/vnd.ms-excel')
        header 'Content-Disposition', "attachment; filename*=UTF-8''#{URI.escape("#{params[:id]} Samples Excel.xlsx")}"

        excel = Report::ExcelExport.new

        Collection.find(params[:id]).samples.includes(:molecule).each do |sample|
          excel.add_sample(sample)
        end

        excel.generate_file
      end

      params do
        requires :id, type: String
      end
      get :export_samples_from_collection_reactions do
        env['api.format'] = :binary
        content_type('application/vnd.ms-excel')
        header 'Content-Disposition', "attachment; filename*=UTF-8''#{URI.escape("#{params[:id]} Reactions Excel.xlsx")}"

        excel = Report::ExcelExport.new

        Collection.find(params[:id]).reactions.each do |reaction|
          reaction.starting_materials.each do |material|
            excel.add_sample(material)
          end
          reaction.reactants.each do |reactant|
            excel.add_sample(reactant)
          end
          reaction.products.each do |product|
            excel.add_sample(product)
          end
        end

        excel.generate_file
      end

      params do
        requires :id, type: String
      end
      get :export_samples_from_collection_wellplates do
        env['api.format'] = :binary
        content_type('application/vnd.ms-excel')
        header 'Content-Disposition', "attachment; filename*=UTF-8''#{URI.escape("#{params[:id]} Samples Excel.xlsx")}"

        excel = Report::ExcelExport.new

        Collection.find(params[:id]).wellplates.each do |wellplate|
          wellplate.wells.each do |well|
            excel.add_sample(well.sample)
          end
        end

        excel.generate_file
      end

      params do
        requires :id, type: String
      end
      get :excel_wellplate do
        env['api.format'] = :binary
        content_type('application/vnd.ms-excel')
        header 'Content-Disposition', "attachment; filename*=UTF-8''#{URI.escape("Wellplate #{params[:id]} Samples Excel.xlsx")}"

        excel = Report::ExcelExport.new

        Wellplate.find(params[:id]).wells.each do |well|
          sample = well.sample
          if (sample)
            excel.add_sample(sample)
          end
        end

        excel.generate_file
      end

      params do
        requires :id, type: String
      end
      get :excel_reaction do
        env['api.format'] = :binary
        content_type('application/vnd.ms-excel')
        header 'Content-Disposition', "attachment; filename*=UTF-8''#{URI.escape("Reaction #{params[:id]} Samples Excel.xlsx")}"

        excel = Report::ExcelExport.new

        reaction = Reaction.find(params[:id])

        reaction.starting_materials.each do |material|
          excel.add_sample(material)
        end
        reaction.reactants.each do |reactant|
          excel.add_sample(reactant)
        end
        reaction.products.each do |product|
          excel.add_sample(product)
        end

        excel.generate_file
      end
    end
  end
end
