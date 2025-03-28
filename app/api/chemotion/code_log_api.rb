# frozen_string_literal: true

module Chemotion
  class CodeLogAPI < Grape::API
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

          content_type('application/pdf')
          header 'Content-Disposition',
                 "attachment; filename*=UTF-8''#{params[:element_type]}_codes_#{params[:size]}.pdf"
          env['api.format'] = :binary
          body CodePdf.new(elements,
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
                           text_position: params[:text_position]).render
        end
      end

      namespace :print_analyses_codes do
        desc 'Build PDF with analyses codes of one analysis type'
        params do
          requires(:element_type, type: String, values: %w[
            sample reaction wellplate screen device_description sequence_based_macromolecule_sample
          ])
          requires :id, type: Integer, desc: 'Element id'
          requires :analyses_ids, type: Array[String]
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
