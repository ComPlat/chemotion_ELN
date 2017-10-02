module Chemotion
  class ReportAPI < Grape::API
    helpers do
      def hashize(inputs)
        output = {}
        inputs.each do |inp|
          key = inp['text'].to_sym
          val = inp['checked']
          output[key] = val
        end
        output
      end

      def excluded_field
        %w(
          id molecule_id created_by deleted_at identifier molecule_name_id
          user_id fingerprint_id sample_svg_file xref impurities ancestry
        )
      end

      def included_field
        %w(
          molecule.cano_smiles molecule.sum_formular molecule_name
          molecule.inchistring molecule.molecular_weight molecule.inchikey
        )
      end

      def selected_elements(
          type, checkedAll, checkedIds, uncheckedIds, currentCollection
        )
        elements = "#{type}s".to_sym
        if checkedAll
          Collection.find(currentCollection)
                    .send(elements).where.not(id: uncheckedIds).order(updated_at: :desc)
        else
          Collection.find(currentCollection)
                    .send(elements).where(id: checkedIds)
                    .order("position(#{type}s.id::text in '#{checkedIds}')")
        end
      end

      def time_now
        Time.now.strftime('%Y-%m-%dT%H-%M-%S')
      end
    end

    resource :reports do
      desc "Build a reaction report using the contents of a JSON file"
      params do
        requires :id
      end
      get :docx do
        params[:template] = "single_reaction"
        docx, filename = Report.create_reaction_docx(
                            current_user, user_ids, params
                          )
        content_type MIME::Types.type_for(filename)[0].to_s
        env['api.format'] = :binary
        header(
          'Content-Disposition',
          "attachment; filename*=UTF-8''#{CGI.escape(filename)}"
        )
        docx
      end

      params do
        requires :columns, type: Array[String]
        requires :exportType, type: Integer
        requires :uiState, type: Hash do
          requires :sample, type: Hash do
            requires :checkedIds, type: Array
            requires :uncheckedIds, type: Array
            requires :checkedAll, type: Boolean
          end
          requires :reaction, type: Hash do
            requires :checkedIds, type: Array
            requires :uncheckedIds, type: Array
            requires :checkedAll, type: Boolean
          end
          requires :wellplate, type: Hash do
            requires :checkedIds, type: Array
            requires :uncheckedIds, type: Array
            requires :checkedAll, type: Boolean
          end
          requires :currentCollection, type: Integer
          requires :isSync, type: Boolean
        end
        requires :columns, type: Array
      end
      post :export_samples_from_selections do
        env['api.format'] = :binary
        fileType = ''
        case params[:exportType]
        when 1 # XLSX export
          content_type('application/vnd.ms-excel')
          fileType = '.xlsx'
          export = Reporter::ExcelExport.new
        when 2 # SDF export
          content_type('chemical/x-mdl-sdfile')
          fileType = '.sdf'
          export = Reporter::SdfExport.new
        end
        fileName =  'sample_export_' + time_now + fileType
        fileURI = URI.escape(fileName)
        header 'Content-Disposition', "attachment; filename=\"#{fileURI}\""
        # header 'Content-Disposition', "attachment; filename*=UTF-8''#{fileURI}"
        currColl = params[:uiState][:isSync] ? 0 : params[:uiState][:currentCollection]
        removed_field = params[:columns]
        [:sample, :reaction, :wellplate].each do |type|
          next unless ( p_t = params[:uiState][type])
          elements = selected_elements(
            type.to_s, p_t[:checkedAll], p_t[:checkedIds],
            p_t[:uncheckedIds], currColl
          )
          samples = case type.to_s
                    when 'sample'
                      elements.includes([:molecule,:molecule_name])
                    when 'reaction'
                      elements.map { |r|
                        r.starting_materials + r.reactants + r.products
                      }.flatten
                    when 'wellplate'
                      elements.map { |wellplate|
                        wellplate.wells.map(&:sample).flatten
                      }.flatten
                    end
          samples.each { |sample| export.add_sample(sample) }
        end
        export.generate_file(excluded_field, included_field, removed_field)
      end

      params do
        requires :id, type: String
      end
      get :excel_wellplate do
        env['api.format'] = :binary
        content_type('application/vnd.ms-excel')
        header(
          'Content-Disposition',
          "attachment; filename*=UTF-8''#{URI.escape("Wellplate #{params[:id]} \
          Samples Excel.xlsx")}"
        )

        excel = Reporter::ExcelExport.new

        Wellplate.find(params[:id]).wells.each do |well|
          sample = well.sample
          sample && excel.add_sample(sample)
        end

        excel.generate_file(excluded_field, included_field)
      end

      params do
        requires :id, type: String
      end

      get :excel_reaction do
        env['api.format'] = :binary
        content_type('application/vnd.ms-excel')
        header(
          'Content-Disposition',
          "attachment; filename*=UTF-8''#{URI.escape("Reaction #{params[:id]} \
          Samples Excel.xlsx")}"
        )

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
    end

    resource :archives do
      desc 'return all reports of the user'
      params do
      end
      get :all, each_serializer: ReportSerializer do
        current_user.reports.order(updated_at: :desc)
      end

      desc 'return reports which can be downloaded now'
      params do
        requires :ids, type: Array[Integer]
      end
      post :downloadable, each_serializer: ReportSerializer do
        return current_user.reports.select do |r|
          params[:ids].include?(r.id) && r.file_path.present?
        end
      end

      desc 'delete an archive'
      params do
        requires :id, type: Integer
      end
      route_param :id do
        delete do
          current_user.reports.find(params[:id]).destroy!
        end
      end
    end

    desc 'returns a created report'
    params do
      requires :objTags, type: Array[Hash], coerce_with: ->(val) { JSON.parse(val) }
      requires :splSettings, type: Array[Hash], coerce_with: ->(val) { JSON.parse(val) }
      requires :rxnSettings, type: Array[Hash], coerce_with: ->(val) { JSON.parse(val) }
      requires :configs, type: Array[Hash], coerce_with: ->(val) { JSON.parse(val) }
      requires :molSerials, type: Array[Hash], coerce_with: ->(val) { JSON.parse(val) }
      requires :imgFormat, type: String, default: 'png', values: %w(png eps emf)
      requires :fileName, type: String, default: "ELN_Report_" + Time.now.strftime("%Y-%m-%dT%H-%M-%S")
      requires :template, type: String, default: "standard"
      optional :fileDescription
    end
    post :reports, each_serializer: ReportSerializer do
      spl_settings = hashize(params[:splSettings])
      rxn_settings = hashize(params[:rxnSettings])
      configs = hashize(params[:configs])
      mol_serials = params[:molSerials].map(&:to_hash)

      attributes = {
        file_name: params[:fileName],
        file_description: params[:fileDescription],
        configs: configs,
        sample_settings: spl_settings,
        reaction_settings: rxn_settings,
        mol_serials: mol_serials,
        objects: params[:objTags],
        img_format: params[:imgFormat],
        template: params[:template],
        author_id: current_user.id
      }

      report = Report.create(attributes)
      current_user.reports << report
      report.create_docx
      return report
    end

    resource :download_report do
      desc 'return a report in docx format'

      params do
        requires :id, type: Integer
      end

      get :docx do
        report = current_user.reports.find(params[:id])

        if report
          # set readed
          ru = report.reports_users.find { |r| r.user_id == current_user.id }
          ru.touch :downloaded_at
          # send docx back
          full_file_path = Rails.root.join('public', 'docx', report.file_path)
          file_name_ext = report.file_name + '.docx'
          content_type MIME::Types.type_for(file_name_ext)[0].to_s
          env['api.format'] = :binary
          header(
            'Content-Disposition',
            "attachment; filename*=UTF-8''#{CGI.escape(file_name_ext)}"
          )
          File.read(full_file_path)
        end
      end
    end
  end
end
