require 'barby'
require 'barby/barcode/qr_code'
require 'barby/outputter/svg_outputter'

module Chemotion
  class AttachmentAPI < Grape::API
    resource :attachments do

      resource :thumbnails do
        desc 'Return Base64 encoded thumbnail'
        get do
          thumbnail_dir = File.join('uploads', 'thumbnails')
          thumbnail_path = "#{thumbnail_dir}/#{params[:filename]}.png"

          if File.exist?(thumbnail_path)
            Base64.encode64(File.open(thumbnail_path, 'rb').read)
          else
            nil
          end
        end
      end

      namespace :svgs do
        desc "Get QR Code SVG for element"
        params do
          requires :element_id, type: Integer
          requires :element_type, type: String
        end
        get do
          case params[:element_type]
          when "sample"
            sample = Sample.find(params[:element_id])
            qr_code = Barby::QrCode.new(sample.qr_code, size: 1, level: :l)
            outputter = Barby::SvgOutputter.new(qr_code)
            outputter.to_svg(margin: 0)
          when "wellplate"
            wellplate = Wellplate.find(params[:element_id])
            qr_code = Barby::QrCode.new(wellplate.qr_code, size: 1, level: :l)
            outputter = Barby::SvgOutputter.new(qr_code)
            outputter.to_svg(margin: 0)
          else
            ""
          end
        end
      end

    end
  end
end
