module Chemotion
  class ReportAPI < Grape::API
    resource :reports do
      desc "Build a report using the contents of a JSON file"

      params do
        requires :id
      end
      get :rtf do
        rtf_data = Template::ReactionReport.new(params[:id]).get_rtf_data

        env['api.format'] = :binary
        content_type('text/rtf')
        body rtf_data.generate_report
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

    resource :multiple_reports do
      desc "Build a multi-reactions report using the contents of a JSON file"

      params do
        requires :ids
        requires :settings
      end

      get :rtf do
        ids = params[:ids].split("_")
        settings = params[:settings].split("_")
        rtf_data = Template::ReactionsReport.new(ids, settings).get_rtf_data

        env['api.format'] = :binary
        content_type('text/rtf')
        body rtf_data.generate_report
      end
    end
  end
end
