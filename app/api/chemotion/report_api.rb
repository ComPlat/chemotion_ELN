module Chemotion
  class ReportAPI < Grape::API
    resource :reports do
      desc "Build a report using the contents of a JSON file"

      params do
        requires :id
      end
      get :docx do
        reaction = Reaction.find(params[:id])
        content = Report::Docx::Document.new(objs: [reaction]).convert

        filename = "ELN_Reaction_" + Time.now.strftime("%Y-%m-%dT%H-%M-%S") + ".docx"
        template_path = Rails.root.join("lib", "template", "ELN_Objs.docx")

        content_type MIME::Types.type_for(filename)[0].to_s
        env['api.format'] = :binary
        header 'Content-Disposition', "attachment; filename*=UTF-8''#{CGI.escape(filename)}"
        docx = Sablon.template(template_path).render_to_string(merge(content, all_spl_settings, all_rxn_settings, all_configs))
      end

      params do
        requires :type, type: String
        requires :checkedIds
        requires :uncheckedIds
        requires :checkedAll, type: Boolean
        requires :currentCollection, type: Integer
        requires :removedColumns, type: String
      end
      get :export_samples_from_selections do
        env['api.format'] = :binary
        content_type('application/vnd.ms-excel')
        header 'Content-Disposition', "attachment; filename*=UTF-8''#{URI.escape("#{params[:type].capitalize}_#{Time.now.strftime("%Y-%m-%dT%H-%M-%S")}.xlsx")}"
        excel = Report::ExcelExport.new
        # - - - - - - -
        type = params[:type]
        checkedIds = params[:checkedIds].split(",")
        uncheckedIds = params[:uncheckedIds].split(",")
        checkedAll = params[:checkedAll]
        currentCollection = params[:currentCollection]
        removed_field = params[:removedColumns].split(",")

        elements = selected_elements(type, checkedAll, checkedIds, uncheckedIds, currentCollection)
        samples = if type == "sample"
          elements.includes(:molecule)
        elsif type == "reaction"
          elements.map { |r| r.starting_materials + r.reactants + r.products }.flatten
        elsif type == "wellplate"
          elements.map do |wellplate|
            wellplate.wells.map { |well| well.sample }.flatten
          end.flatten
        end

        samples.each { |sample| excel.add_sample(sample) }
        excel.generate_file(excluded_field, included_field, removed_field)
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

        excel.generate_file(excluded_field, included_field)
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

        excel.generate_file(excluded_field, included_field)
      end
    end

    resource :multiple_reports do
      desc "Build a multi-objects report using the contents of a JSON file"

      params do
        requires :objTags
        requires :splSettings
        requires :rxnSettings
        requires :configs
        optional :img_format, default: 'png', values: %w(png eps emf)
      end

      get :docx do
        objTags = JSON.parse(params[:objTags])
        spl_settings = hashize(JSON.parse(params[:splSettings]))
        rxn_settings = hashize(JSON.parse(params[:rxnSettings]))
        configs = hashize(JSON.parse(params[:configs]))
        puts "- - -- - - "
        puts spl_settings

        objs = objTags.map { |tag| tag["type"].camelize.constantize.find(tag["id"]) }
        contents = Report::Docx::Document.new(
                      objs: objs,
                      img_format: params[:img_format]
                    ).convert

        filename = "ELN_Report_" + Time.now.strftime("%Y-%m-%dT%H-%M-%S") + ".docx"
        template_path = Rails.root.join("lib", "template", "ELN_Objs.docx")

        content_type MIME::Types.type_for(filename)[0].to_s
        env['api.format'] = :binary
        header 'Content-Disposition', "attachment; filename*=UTF-8''#{CGI.escape(filename)}"
        docx = Sablon.template(template_path).render_to_string(merge(contents, spl_settings, rxn_settings, configs))
      end
    end

    helpers do
      def hashize(inputs)
        output = {}
        inputs.each do |inp|
          key = inp["text"].to_sym
          val = inp["checked"]
          output[key] = val
        end
        output
      end

      def all_spl_settings
        {
          diagram: true,
          collection: true,
          analyses_description: true,
          analyses_content: true,
        }
      end

      def all_rxn_settings
        {
          diagram: true,
          material: true,
          description: true,
          purification: true,
          tlc: true,
          observation: true,
          analysis: true,
          literature: true,
        }
      end

      def all_configs
        {
          page_break: true,
          whole_diagram: true,
        }
      end

      def merge(contents, spl_settings, rxn_settings, configs)
        {
          date: Time.now.strftime("%d.%m.%Y"),
          author: "#{current_user.first_name} #{current_user.last_name}",
          spl_settings: spl_settings,
          rxn_settings: rxn_settings,
          configs: configs,
          objs: contents
        }
      end

      def excluded_field
        [
          "id", "molecule_id", "analyses_dump", "created_by", "deleted_at",
          "user_id", "fingerprint_id", "sample_svg_file"
        ]
      end

      def included_field
        ["molecule.cano_smiles", "molecule.sum_formular", "molecule.inchistring"]
      end

      def selected_elements(type, checkedAll, checkedIds, uncheckedIds, currentCollection)
        elements = "#{type}s".to_sym
        if checkedAll
          Collection.find(currentCollection).send(elements).where.not(id: uncheckedIds)
        else
          Collection.find(currentCollection).send(elements).where(id: checkedIds)
        end
      end
    end
  end
end
