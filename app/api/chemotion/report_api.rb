module Chemotion
  class ReportAPI < Grape::API
    helpers ReportHelpers
    helpers CollectionHelpers
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
        docx, filename = Report.create_reaction_docx(current_user, user_ids, params)
        content_type MIME::Types.type_for(filename)[0].to_s
        env['api.format'] = :binary
        header(
          'Content-Disposition',
          "attachment; filename*=UTF-8''#{CGI.escape(filename)}"
        )
        docx
      end

      params do
        use :export_params
      end
      post :export_samples_from_selections do
        env['api.format'] = :binary
        t = time_now
        case params[:exportType]
        when 1 # XLSX export
          export = Export::ExportExcel.new
        when 2 # SDF export
          export = Export::ExportSdf.new(time: t)
          force_molfile_selection
        end
        c_id = params[:uiState][:currentCollection]
        c_id = SyncCollectionsUser.find(c_id)&.collection_id if params[:uiState][:isSync]

        %i[sample reaction wellplate].each do |table|
          next unless (p_t = params[:uiState][table])
          ids = p_t[:checkedAll] ? p_t[:uncheckedIds] : p_t[:checkedIds]
          next unless p_t[:checkedAll] || ids
          column_query = build_column_query(filter_column_selection(table))
          sql_query = build_sql(table, column_query, c_id, ids, p_t[:checkedAll])
          next unless sql_query
          result = db_exec_query(sql_query)
          export.generate_sheet_with_samples(table, result)
        end

        case export.file_extension
        when 'xlsx' # XLSX export
          content_type('application/vnd.ms-excel')
        when 'sdf' # SDF export
          content_type('chemical/x-mdl-sdfile')
        when 'zip'
          content_type('application/zip, application/octet-stream')
        end
        filename = URI.escape("sample_export_#{t}.#{export.file_extension}")
        header('Content-Disposition', "attachment; filename=\"#{filename}\"")
        # header 'Content-Disposition', "attachment; filename*=UTF-8''#{fileURI}"

        export.read
      end

      params do
        use :export_params
      end
      post :export_reactions_from_selections do
        env['api.format'] = :binary
        params[:exportType]
        content_type('text/csv')
        filename = URI.escape('reaction_smiles_' + time_now + '.csv')
        header 'Content-Disposition', "attachment; filename=\"#{filename}\""
        real_coll_id = fetch_collection_id_w_current_user(
          params[:uiState][:currentCollection], params[:uiState][:isSync]
        )
        return unless (p_t = params[:uiState][:reaction])
        results = reaction_smiles_hash(
          real_coll_id,
          p_t[:checkedAll] && p_t[:uncheckedIds] || p_t[:checkedIds],
          p_t[:checkedAll]
        ) || {}
        smiles_construct = "r_smiles_#{params[:exportType]}"
        results.map { |_, v| send(smiles_construct, v) }.join("\r\n")
      end

      params do
        requires :id, type: String
      end
      get :excel_wellplate do
        env['api.format'] = :binary
        content_type('application/vnd.ms-excel')
        header(
          'Content-Disposition',
          "attachment; filename*=UTF-8''#{URI.escape("Wellplate_#{params[:id]}_\
          Samples Excel.xlsx")}"
        )
        export = Export::ExportExcel.new
        column_query = build_column_query(default_columns_wellplate)
        sql_query = build_sql(:wellplate, column_query, nil, params[:id], false)
        next unless sql_query
        result = db_exec_query(sql_query)
        export.generate_sheet_with_samples(:wellplate, result)
        export.read
      end

      params do
        requires :id, type: String
      end

      get :excel_reaction do
        env['api.format'] = :binary
        content_type('application/vnd.ms-excel')
        header(
          'Content-Disposition',
          "attachment; filename*=UTF-8''#{URI.escape("Reaction_#{params[:id]}_\
          Samples Excel.xlsx")}"
        )
        export = Export::ExportExcel.new
        column_query = build_column_query(default_columns_reaction)
        sql_query = build_sql(:reaction, column_query, nil, params[:id], false)
        next unless sql_query
        result = db_exec_query(sql_query)
        export.generate_sheet_with_samples(:reaction, result)
        export.read
      end
    end

    resource :archives do
      rescue_from ActiveRecord::RecordNotFound do |error|
        message = "Archive not found"
        error!(message, 404)
      end

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
      requires :siRxnSettings, type: Array[Hash], coerce_with: ->(val) { JSON.parse(val) }
      requires :configs, type: Array[Hash], coerce_with: ->(val) { JSON.parse(val) }
      requires :molSerials, type: Array[Hash], coerce_with: ->(val) { JSON.parse(val) }
      requires :prdAtts, type: Array[Hash], coerce_with: ->(val) { JSON.parse(val) }
      requires :imgFormat, type: String, default: 'png', values: %w(png eps emf)
      requires :fileName, type: String, default: "ELN_Report_" + Time.now.strftime("%Y-%m-%dT%H-%M-%S")
      requires :template, type: String, default: "standard"
      optional :fileDescription
    end
    post :reports, each_serializer: ReportSerializer do
      spl_settings = hashize(params[:splSettings])
      rxn_settings = hashize(params[:rxnSettings])
      si_rxn_settings = hashize(params[:siRxnSettings])
      configs = hashize(params[:configs])
      mol_serials = params[:molSerials].map(&:to_hash)
      prd_atts = params[:prdAtts].map(&:to_hash)

      attributes = {
        file_name: params[:fileName],
        file_description: params[:fileDescription],
        configs: configs,
        sample_settings: spl_settings,
        reaction_settings: rxn_settings,
        si_reaction_settings: si_rxn_settings,
        mol_serials: mol_serials,
        prd_atts: prd_atts,
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
