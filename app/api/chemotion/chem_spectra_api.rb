# frozen_string_literal: true

# Belong to Chemotion module
module Chemotion
  # API for ChemSpectra manipulation
  class ChemSpectraAPI < Grape::API
    format :json

    helpers do # rubocop:disable BlockLength
      def encode64(path)
        target = File.exist?(path) && IO.binread(path) || false
        Base64.encode64(target)
      end

      def to_zip_file(filename, src, dst, img, predict)
        Zip::OutputStream.write_buffer do |zip|
          zip.put_next_entry "orig_#{src[:filename]}"
          zip.write src[:tempfile].read
          zip.put_next_entry "#{filename}.jdx"
          zip.write dst.read
          zip.put_next_entry "#{filename}.png"
          zip.write img.read
          unless predict.try(:[], 'output')
                        .try(:[], 'result').try(:empty?)
            zip.put_next_entry "#{filename}.json"
            zip.write predict.to_json
          end
        end
      end

      def conversion(params)
        file = params[:file][:tempfile]
        molfile = params[:molfile][:tempfile]
        tmp_jcamp, tmp_img = Chemotion::Jcamp::Create.spectrum(
          file.path, molfile.path, false, params
        ) # abs_path, is_regen, peaks, shift
        jcamp = encode64(tmp_jcamp.path)
        img = encode64(tmp_img.path)
        { status: true, jcamp: jcamp, img: img }
      rescue
        { status: false }
      end

      def convert_to_zip(params)
        file = params[:dst][:tempfile]
        molfile = params[:molfile][:tempfile]
        jcamp, img = Chemotion::Jcamp::Create.spectrum(
          file.path, molfile.path, false, params
        )
        predict = JSON.parse(params['predict'])
        to_zip_file(params[:filename], params[:src], jcamp, img, predict)
      rescue
        error!('Save files error!', 500)
      end

      def convert_for_refresh(params)
        file = params[:dst][:tempfile]
        molfile = params[:molfile][:tempfile]
        tmp_jcamp, tmp_img = Chemotion::Jcamp::Create.spectrum(
          file.path, molfile.path, false, params
        )
        jcamp = encode64(tmp_jcamp.path)
        img = encode64(tmp_img.path)
        { status: true, jcamp: jcamp, img: img }
      rescue
        { status: false }
      end
    end

    resource :chemspectra do # rubocop:disable BlockLength
      resource :file do
        desc 'Convert file'
        params do
          requires :file, type: Hash
          requires :molfile, type: Hash
          requires :mass, type: String
        end
        post 'convert' do
          conversion(params)
        end

        desc 'Save files'
        params do
          requires :src, type: Hash
          requires :dst, type: Hash
          requires :molfile, type: Hash
          requires :filename, type: String
          requires :peaks_str, type: String
          requires :shift_select_x, type: String
          requires :shift_ref_name, type: String
          requires :shift_ref_value, type: String
          optional :integration, type: String
          optional :multiplicity, type: String
          optional :mass, type: String
          optional :scan, type: String
          optional :thres, type: String
          optional :predict, type: String
        end
        post 'save' do
          env['api.format'] = :binary
          content_type('application/zip, application/octet-stream')
          filename = CGI.escape("#{params[:filename]}.zip")
          header('Content-Disposition', "attachment; filename=\"#{filename}\"")

          zip_io = convert_to_zip(params)
          zip_io.rewind
          zip_io.read
        end

        desc 'Refresh files'
        params do
          requires :src, type: Hash
          requires :dst, type: Hash
          requires :molfile, type: Hash
          requires :filename, type: String
          requires :peaks_str, type: String
          requires :shift_select_x, type: String
          requires :shift_ref_name, type: String
          requires :shift_ref_value, type: String
          optional :integration, type: String
          optional :multiplicity, type: String
          optional :mass, type: String
          optional :scan, type: String
          optional :thres, type: String
          optional :predict, type: String
        end
        post 'refresh' do
          convert_for_refresh(params)
        end
      end

      resource :predict do
        desc 'Predict NMR by peaks'
        params do
          requires :molfile, type: Hash
          requires :layout, type: String
          requires :peaks, type: String
          requires :shift, type: String
        end
        post 'nmr_peaks_form' do
          molfile = params['molfile']['tempfile']
          rsp = Chemotion::Jcamp::Predict::NmrPeaksForm.exec(
            molfile, params[:layout], params[:peaks], params[:shift], false
          )

          content_type('application/json')
          rsp
        end

        desc 'Predict IR'
        params do
          requires :molfile, type: Hash
          requires :spectrum, type: Hash
        end
        post 'infrared' do
          molfile = params['molfile']['tempfile']
          spectrum = params['spectrum']['tempfile']
          rsp = Chemotion::Jcamp::Predict::Ir.exec(
            molfile, spectrum
          )

          content_type('application/json')
          rsp
        end
      end

      resource :molfile do
        desc 'convert molfile'
        params do
          requires :molfile, type: Hash
        end
        post 'convert' do
          molfile = params['molfile']['tempfile'].read
          m = Chemotion::OpenBabelService.molecule_info_from_molfile(molfile)

          content_type('application/json')
          { smi: m[:smiles], mass: m[:mass], svg: m[:svg], status: true }
        end
      end
    end
  end
end
