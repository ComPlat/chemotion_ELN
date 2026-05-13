# frozen_string_literal: true

module Chemotion
  class CodeLogAPI < Grape::API
    helpers ParamsHelpers
    helpers CollectionHelpers

    resource :code_logs do
      rescue_from ActiveRecord::RecordNotFound do |_error|
        message = 'Could not find code log'
        error!(message, 404)
      end

      # desc "Delete code logs by analysis ID"
      # params do
      #   requires :analysis_id, type: String, desc: "Analysis ID"
      # end
      # route_param :analysis_id do
      #   delete do
      #     code_logs = CodeLog.where(analysis_id: params[:analysis_id])
      #     code_logs.destroy_all
      #   end
      # end

      namespace :generic do
        desc 'Return code log by qr code'
        params do
          requires :code, type: String, regexp: /\A\d{6,40}\Z/
        end
        get do
          code = params[:code]
          s = code&.size || 0
          code_log =
            if s >= 39
              CodeLog.find(CodeCreator.digit_to_uuid(code))
            elsif s >= 8
              # TODO: use where instead of find_by ?
              CodeLog.where('value ~ ?', "\\A0#{code}").first
            elsif s == 6
              # TODO: use where instead of find_by ?
              CodeLog.find_by(value_xs: code.to_i)
            end

          if code_log.nil?
            error!("Element with #{code.size}-digit code #{params[:code]} not found", 404)
          else
            present code_log, with: Entities::CodeLogEntity, root: :code_log
          end
        end
      end

      namespace :print_codes do
        helpers do
          # Translates the request params into the option hash accepted by
          # {CodePdf#initialize}.
          # @return [Hash]
          def code_pdf_options
            {
              width: params[:width],
              element_type: params[:element_type],
              code_type: params[:code_type],
              code_image_size: params[:code_image_size],
              display_sample: params[:displaySample],
              name: params[:name],
              short_label: params[:short_label],
              external_label: params[:external_label],
              molecule_name: params[:molecule_name],
              code_log: params[:code_log],
              text_position: params[:text_position],
            }
          end

          # Sets the HTTP envelope and returns the rendered PDF body.
          # @param elements [ActiveRecord::Relation]
          # @return [String] rendered PDF body
          def render_print_codes_pdf(elements)
            content_type('application/pdf')
            header 'Content-Disposition',
                   "attachment; filename*=UTF-8''#{params[:element_type]}_codes_#{params[:size]}.pdf"
            env['api.format'] = :binary
            CodePdf.new(elements, **code_pdf_options).render
          end
        end

        desc 'Build PDF with element bar & qr code'
        params do
          requires(:element_type, type: String, values: %w[
                     sample reaction wellplate screen device_description sequence_based_macromolecule_sample
                   ])
          # TODO: check coerce with  type Array[Integer] not working with before do
          requires :ids, type: Array # , coerce_with: ->(val) { val.split(/,/).map(&:to_i) }
          requires :width, type: Integer
          requires :displaySample, type: Boolean
          requires :name, type: Boolean
          requires :short_label, type: Boolean
          requires :external_label, type: Boolean
          requires :molecule_name, type: Boolean
          requires :code_log, type: Boolean
          requires :code_type, type: String
        end

        before do
          # TODO: vide supra
          ids = params[:ids][0]&.split(',')&.map(&:to_i)
          error!('401 Unauthorized', 401) unless ElementsPolicy.new(
            current_user,
            params[:element_type].classify.constantize.where(id: ids),
          ).read?
        end

        get do
          # TODO: vide supra
          ids = params[:ids][0]&.split(',')&.map(&:to_i)
          elements = params[:element_type].classify.constantize.where(id: ids)
          body render_print_codes_pdf(elements)
        end
      end

      # POST variant of print_codes that accepts a ui_state payload so that
      # "select all pages" (checkedAll + uncheckedIds) and large selections can
      # be resolved server-side against the current collection scope, and
      # rendered into a single multi-page PDF instead of N per-id requests.
      namespace :print_codes_by_ui_state do
        desc 'Build PDF with element bar & qr code from ui_state'
        params do
          requires(:element_type, type: String, values: %w[
                     sample reaction wellplate screen device_description sequence_based_macromolecule_sample
                   ])
          requires(:ui_state, type: Hash) do
            use :ui_state_params
          end
          requires :width, type: Integer
          requires :displaySample, type: Boolean
          requires :name, type: Boolean
          requires :short_label, type: Boolean
          requires :external_label, type: Boolean
          requires :molecule_name, type: Boolean
          requires :code_log, type: Boolean
          requires :code_type, type: String
          optional :code_image_size, type: Integer
          optional :text_position, type: String
        end

        before do
          klass = params[:element_type].classify.constantize
          cid = fetch_collection_id_w_current_user(
            params[:ui_state][:collection_id],
            params[:ui_state][:is_sync_to_me],
          )
          scope = klass.by_collection_id(cid).by_ui_state(params[:ui_state])
          scope = scope.for_user(current_user.id) if klass.respond_to?(:for_user)
          @print_code_elements = scope
          error!('401 Unauthorized', 401) unless ElementsPolicy.new(current_user, @print_code_elements).read?
        end

        post do
          body render_print_codes_pdf(@print_code_elements)
        end
      end

      namespace :print_analyses_codes do
        desc 'Build PDF with analyses codes of one analysis type'
        params do
          requires(:element_type, type: String, values: %w[
                     sample reaction wellplate screen device_description sequence_based_macromolecule_sample
                   ])
          requires :id, type: Integer, desc: 'Element id'
          requires :analyses_ids, type: [String]
          requires :size, type: String, values: %w[small big]
        end

        before do
          error!('401 Unauthorized', 401) unless ElementPolicy.new(
            current_user,
            params[:element_type].classify.constantize.find(params[:id]),
          ).read?
        end

        get do
          element = params[:element_type].classify.constantize.find(params[:id])
          # TODO: check that analyses is defined for all element type
          analyses = element.analyses.where(id: params[:analyses_ids])

          content_type('application/pdf')
          header 'Content-Disposition', "attachment; filename*=UTF-8''analysis_codes_#{params[:size]}.pdf"
          env['api.format'] = :binary
          # TODO: check container type/info instead
          # case params[:type]
          # when "nmr_analysis"
          #   body AnalysisNmrPdf.new(elements).render
          # when "analysis"
          body AnalysisPdf.new(element, analyses, params[:size]).render
          # else
          #   error!("Analysis with #{params[:type]} not defined", 500)
          # end
        end
      end
    end
  end
end
