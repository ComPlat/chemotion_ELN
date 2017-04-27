module Chemotion
  class ReportAPI < Grape::API
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
          analyses: true,
          reaction_description: true,
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
          "id", "molecule_id", "created_by", "deleted_at",
          "user_id", "fingerprint_id", "sample_svg_file", "xref"
        ]
      end

      def included_field
        ["molecule.cano_smiles", "molecule.sum_formular",
          "molecule.inchistring", "molecule.molecular_weight"]
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

    resource :reports do
      desc "Build a report using the contents of a JSON file"

      params do
        requires :id
      end
      get :docx do
        r = Reaction.find(params[:id])
        r_hash = ElementReportPermissionProxy.new(current_user, r, user_ids).serialized
        content = Reporter::Docx::Document.new(objs: [r_hash]).convert

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
        requires :exportType, type: Integer
      end
      get :export_samples_from_selections do
        env['api.format'] = :binary

        fileType = ""
        case params[:exportType]
        when 1 # XLSX export
          content_type('application/vnd.ms-excel')
          fileType = ".xlsx"
          export = Reporter::ExcelExport.new
        when 2 # SDF export
          content_type('chemical/x-mdl-sdfile')
          fileType = ".sdf"
          export = Reporter::SdfExport.new
        end
        fileName = params[:type].capitalize + "_" +
                   Time.now.strftime("%Y-%m-%dT%H-%M-%S") + fileType
        fileURI = URI.escape(fileName)
        header 'Content-Disposition', "attachment; filename*=UTF-8''#{fileURI}"

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

        samples.each { |sample| export.add_sample(sample) }
        export.generate_file(excluded_field, included_field, removed_field)
      end

      params do
        requires :id, type: String
      end
      get :excel_wellplate do
        env['api.format'] = :binary
        content_type('application/vnd.ms-excel')
        header 'Content-Disposition', "attachment; filename*=UTF-8''#{URI.escape("Wellplate #{params[:id]} Samples Excel.xlsx")}"

        excel = Reporter::ExcelExport.new

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

        excel = Reporter::ExcelExport.new

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

      desc "return elements to display in the report view."
      params do
        requires :ids, type: Hash, coerce_with: -> (val) { JSON.parse(val) }
      end
      get :content do
        sample_ids = params[:ids][:sample]
        reaction_ids = params[:ids][:reaction]

        ss = Sample.for_user(current_user.id).where(id: sample_ids).includes(:molecule, :residues, collections: :sync_collections_users).uniq
        rs = Reaction.for_user(current_user.id).where(id: reaction_ids).includes(collections: :sync_collections_users).uniq
        samples = ss.map do |s|
          ElementPermissionProxy.new(current_user, s, user_ids).serialized
        end
        reactions = rs.map do |r|
          ElementPermissionProxy.new(current_user, r, user_ids).serialized
        end
        return { samples: samples, reactions: reactions}
      end
    end

    resource :archives do
      desc "return all reports of the user"
      params do
      end
      get :all, each_serializer: ReportSerializer do
        current_user.reports.order(updated_at: :desc)
      end

      desc "return reports which can be downloaded now"
      params do
        requires :ids, type: Array[Integer]
      end
      post :downloadable, each_serializer: ReportSerializer do
        return current_user.reports.select do |r|
          params[:ids].include?(r.id) && r.file_path.present?
        end
      end
    end

    desc "returns a created report"
    params do
      requires :objTags, type: Array[Hash], coerce_with: -> (val) { JSON.parse(val) }
      requires :splSettings, type: Array[Hash], coerce_with: -> (val) { JSON.parse(val) }
      requires :rxnSettings, type: Array[Hash], coerce_with: -> (val) { JSON.parse(val) }
      requires :configs, type: Array[Hash], coerce_with: -> (val) { JSON.parse(val) }
      requires :imgFormat, type: String, default: 'png', values: %w(png eps emf)
      requires :fileName, type: String, default: "ELN_Report_" + Time.now.strftime("%Y-%m-%dT%H-%M-%S")
      optional :fileDescription
    end
    post :reports, each_serializer: ReportSerializer do
      spl_settings = hashize(params[:splSettings])
      rxn_settings = hashize(params[:rxnSettings])
      configs = hashize(params[:configs])

      attributes = {
        file_name: params[:fileName],
        file_description: params[:fileDescription],
        configs: configs,
        sample_settings: spl_settings,
        reaction_settings: rxn_settings,
        objects: params[:objTags],
        img_format: params[:imgFormat],
        author_id: current_user.id
      }

      report = Report.create(attributes)
      current_user.reports << report
      report.create_docx
      return report
    end

    resource :download_report do
      desc "return a report in docx format"

      params do
        requires :id, type: Integer
      end

      get :docx do
        report = current_user.reports.find(params[:id])

        if report
          # set readed
          ru = report.reports_users.find{ |ru| ru.user_id == current_user.id }
          ru.touch :downloaded_at
          # send docx back
          full_file_path = Rails.root.join("public", "docx", report.file_path)
          file_name_ext = report.file_name + ".docx"
          content_type MIME::Types.type_for(file_name_ext)[0].to_s
          env['api.format'] = :binary
          header 'Content-Disposition', "attachment; filename*=UTF-8''#{CGI.escape(file_name_ext)}"
          docx = File.read(full_file_path)
        end
      end
    end
  end
end
