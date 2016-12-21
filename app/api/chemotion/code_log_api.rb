module Chemotion
  class CodeLogAPI < Grape::API
    resource :code_logs do
      namespace :with_bar_code do
        desc "Return code log by bar code"
        params do
          requires :code, type: String
        end
        get do
          code_log = CodeLog.find_by(code_type: "bar_code", value: params[:code])

          if code_log.nil?
            error!("404 Element with supplied code not found", 404)
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
            error!("404 Element with supplied code not found", 404)
          else
            code_log
          end
        end
      end
    end
  end
end
