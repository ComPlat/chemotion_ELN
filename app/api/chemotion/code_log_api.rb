module Chemotion
  class CodeLogAPI < Grape::API
    resource :code_logs do
      namespace :with_bar_code do
        desc "Return code log by bar code"
        params do
          requires :code, type: String
        end
        get do
          code_log = CodeLog.where(code_type: ["bar_code", "bar_code_bruker"]).find_by(value: params[:code])

          if code_log.nil?
            error!("Element with barcode #{params[:code]} not found", 404)
          else
            code_log
          end
        end
      end

      namespace :with_qr_code do
        desc "Return code log by qr code"
        params do
          requires :code, type: String
        end
        get do
          code_log = CodeLog.find_by(code_type: "qr_code", value: params[:code])

          if code_log.nil?
            error!("Element with QR code #{params[:code]} not found", 404)
          else
            code_log
          end
        end
      end

      namespace :print_codes do
        desc "Build PDF with element bar & qr code"
        params do
          requires :ids, type: Array[Integer]
          requires :type, type: String
          requires :size, type: String, values: ["small", "big"]
        end
        get do
          # TODO use find_by with error! ?
          ids = params[:ids]
          elements = case params[:type]
                     when "sample"
                       Sample.find(ids)
                     when "reaction"
                       Reaction.find(ids)
                     when "wellplate"
                       Wellplate.find(ids)
                     when "screen"
                       Screen.find(ids)
                     end

          content_type('application/pdf')
          header 'Content-Disposition', "attachment; filename*=UTF-8''#{params[:type]}_codes_#{params[:size]}.pdf"
          env["api.format"] = :binary

          body CodePDF.new(elements, params[:size], params[:type]).render
        end
      end

      namespace :print_analyses_codes do
        desc "Build PDF with analyses codes of one analysis type"
        params do
          requires :sample_id, type: Integer
          requires :analyses_ids, type: Array[String]
          requires :type, type: String
          requires :size, type: String, values: ["small", "big"]
        end
        get do
          sample = Sample.find(params[:sample_id])
          elements = []

          params[:analyses_ids].each do |analysis_id|
            analysis = sample.analyses.detect { |a| a["id"] == analysis_id }
            elements << OpenStruct.new(analysis.merge(sample_id: params[:sample_id])) unless analysis.nil?
          end


          content_type('application/pdf')
          header 'Content-Disposition', "attachment; filename*=UTF-8''analysis_codes_#{params[:size]}.pdf"
          env["api.format"] = :binary

          case params[:type]
          when "nmr_analysis"
            body AnalysisNmrPdf.new(elements).render
          when "analysis"
            body AnalysisPdf.new(elements, params[:size]).render
          else
            error!("Analysis with #{params[:type]} not defined", 500)
          end
        end
      end
    end
  end
end
