# frozen_string_literal: true

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

      def is_int?
        self == /\A[-+]?\d+\z/
      end
    end

    resource :reports do
      desc 'Build a reaction report using the contents of a JSON file'
      params do
        requires :id
      end
      get :docx do
        params[:template] = 'single_reaction'
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

        %i[sample reaction wellplate].each do |table|
          next unless (p_t = params[:uiState][table])

          ids = p_t[:checkedAll] ? p_t[:uncheckedIds] : p_t[:checkedIds]
          next unless p_t[:checkedAll] || ids.present?

          column_query = build_column_query(filter_column_selection(table), current_user.id)
          sql_query = send("build_sql_#{table}_sample", column_query, c_id, ids, p_t[:checkedAll])
          next unless sql_query

          result = db_exec_query(sql_query)
          export.generate_sheet_with_samples(table, result)
        end

        if params[:exportType] == 1 && params[:columns][:analyses].present?
          %i[sample].each do |table|
            next unless (p_t = params[:uiState][table])

            ids = p_t[:checkedAll] ? p_t[:uncheckedIds] : p_t[:checkedIds]
            next unless p_t[:checkedAll] || ids

            column_query = build_column_query(filter_column_selection("#{table}_analyses".to_sym), current_user.id)
            sql_query = send("build_sql_#{table}_analyses", column_query, c_id, ids, p_t[:checkedAll])
            next unless sql_query

            result = db_exec_query(sql_query)
            export.generate_analyses_sheet_with_samples("#{table}_analyses".to_sym, result, params[:columns][:analyses])
          end
        end

        case export.file_extension
        when 'xlsx' # XLSX export
          content_type('application/vnd.ms-excel')
        when 'sdf' # SDF export
          content_type('chemical/x-mdl-sdfile')
        when 'zip'
          content_type('application/zip, application/octet-stream')
        end
        filename = CGI.escape("sample_export_#{t}.#{export.file_extension}")
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
        filename = CGI.escape("reaction_smiles_#{time_now}.csv")
        header 'Content-Disposition', "attachment; filename=\"#{filename}\""
        real_coll_id = Collection.find_by(
          id: params[:uiState][:currentCollection].to_i,
          user_id: user_ids
        )
        return unless real_coll_id
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
          "attachment; filename*=UTF-8''#{CGI.escape("Wellplate_#{params[:id]}_\
          Samples Excel.xlsx")}"
        )
        export = Export::ExportExcel.new
        column_query = build_column_query(default_columns_wellplate, current_user.id)
        sql_query = build_sql_wellplate_sample(column_query, nil, params[:id], false)
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
          "attachment; filename*=UTF-8''#{CGI.escape("Reaction_#{params[:id]}_\
          Samples Excel.xlsx")}"
        )
        export = Export::ExportExcel.new
        column_query = build_column_query(default_columns_reaction, current_user.id)
        sql_query = build_sql_reaction_sample(column_query, nil, params[:id], false)
        next unless sql_query

        result = db_exec_query(sql_query)
        export.generate_sheet_with_samples(:reaction, result)
        export.read
      end
    end

    resource :archives do
      rescue_from ActiveRecord::RecordNotFound do |_error|
        message = 'Archive not found'
        error!(message, 404)
      end

      desc 'return all reports of the user'
      params do
      end
      get :all do
        reports = current_user.reports.order(updated_at: :desc)
        present reports, with: Entities::ReportEntity, root: :archives, current_user: current_user
      end

      desc 'return reports which can be downloaded now'
      params do
        requires :ids, type: Array[Integer]
      end
      post :downloadable do
        reports = current_user.reports.where(id: params[:ids]).where.not(generated_at: nil)

        present reports, with: Entities::ReportEntity, root: :archives, current_user: current_user
      end

      desc 'delete an archive'
      params do
        requires :id, type: Integer
      end
      route_param :id do
        delete do
          rp = current_user.reports.find(params[:id])
          att = rp.attachments.first
          att&.destroy!
          rp.destroy!
        end
      end
    end

    desc 'returns a created report'
    params do
      requires :objTags, type: Array[Hash]
      requires :splSettings, type: Array[Hash]
      requires :rxnSettings, type: Array[Hash]
      requires :siRxnSettings, type: Array[Hash]
      requires :configs, type: Array[Hash]
      requires :molSerials, type: Array[Hash]
      requires :prdAtts, type: Array[Hash]
      requires :imgFormat, type: String, default: 'png', values: %w[png eps emf]
      requires :fileName, type: String, default: 'ELN_Report_' + Time.now.strftime('%Y-%m-%dT%H-%M-%S')
      requires :templateId, type: String
      optional :templateType, type: String, default: 'standard', values: ReportTemplate::REPORT_TYPES
      optional :fileDescription
    end
    post :reports do
      spl_settings = hashize(params[:splSettings])
      rxn_settings = hashize(params[:rxnSettings])
      si_rxn_settings = hashize(params[:siRxnSettings])
      configs = hashize(params[:configs])

      attributes = {
        file_name: params[:fileName],
        file_description: params[:fileDescription],
        configs: configs,
        sample_settings: spl_settings,
        reaction_settings: rxn_settings,
        si_reaction_settings: si_rxn_settings,
        mol_serials: params[:molSerials],
        prd_atts: params[:prdAtts],
        objects: params[:objTags],
        img_format: params[:imgFormat],
        template: params[:templateType],
        report_templates_id: !!/\A\d+\z/.match(params[:templateId]) ? params[:templateId].to_i : nil,
        author_id: current_user.id
      }

      report = Report.create(attributes)
      current_user.reports << report
      report.create_docx

      present report, with: Entities::ReportEntity, root: :report
    end

    resource :download_report do
      desc 'return a report in file format'

      params do
        requires :id, type: Integer
        requires :ext, type: String
      end

      get :file do
        ext = params[:ext]
        report = current_user.reports.find(params[:id])

        if report
          # set readed
          ru = report.reports_users.find { |r| r.user_id == current_user.id }
          ru.touch :downloaded_at
          # send file
          att = report.attachments.first
          content_type att.content_type
          env['api.format'] = :binary
          header(
            'Content-Disposition',
            "attachment; filename*=UTF-8''#{CGI.escape(att.filename)}"
          )
          att.read_file
        end
      end
    end
  end
end
