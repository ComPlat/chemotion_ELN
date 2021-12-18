# frozen_string_literal: true

# ChemScanner wrapper lib
module Chemscanner
  # Post and pre-process for each ChemScanner file
  # rubocop:disable Metrics/ModuleLength
  module Process
    CHEMSCANNER_VERSION = Gem.loaded_specs['chem_scanner'].version.to_s

    class << self
      def retrieve_beilstein_identifier(cdx_name, data)
        %w[figures schemes].each do |k|
          next unless data.key?(k)

          identifier = data[k].detect do |metadata|
            metadata['graphicsIdentifier'] == cdx_name
          end

          return Hash[k, identifier] unless identifier.nil?
        end

        {}
      end

      def beilstein_process(source, tmp_dir_path)
        file = source.file
        zip_path = file.file_path

        metadata = {}
        cdx_paths = []

        Zip::File.open(zip_path) do |zip_file|
          prefix = zip_file.glob('*/*.cdx').empty? ? '' : '*/'
          json_file = zip_file.glob("#{prefix}*.json").first
          unless json_file.nil?
            json = json_file.get_input_stream.read
            metadata = JSON.parse(json)
          end

          cdx_files = zip_file.glob("#{prefix}*.cdx")
          cdx_files.each do |cdx_f|
            fname = File.basename(cdx_f.name)
            cdx_path = "#{tmp_dir_path}/#{fname}"
            cdx_f.extract(cdx_path)
            cdx_paths.push(cdx_path)
          end
        end

        [cdx_paths, metadata]
      end

      def zip_process(source)
        dir_path = Dir.mktmpdir
        cdx_paths, metadata = beilstein_process(source, dir_path)
        source.extended_metadata = metadata

        schemes = []
        cdx_paths.each do |cdx_path|
          cdx_source = source.create_child(cdx_path)

          cdx_name = File.basename(cdx_path, '.cdx')
          cdx_metadata = retrieve_beilstein_identifier(cdx_name, metadata)
          cdx_source.extended_metadata = cdx_metadata

          cdx_schemes = cdx_process(cdx_source)
          schemes.concat(cdx_schemes)
        end

        schemes
      ensure
        FileUtils.rm_rf(dir_path) if File.exist?(dir_path)
      end

      def docx_process(source)
        docx = Chemscanner::DocxProcess.new
        docx.read(source.file.file_path)

        schemes = []
        docx.cdx_map.values.each_with_index do |info, idx|
          cdx = info[:cdx]

          scheme = Chemscanner::SchemeBuilder.new(source, cdx).build
          scheme.index = idx
          scheme.image_data = process_docx_image(info[:img_b64], info[:img_ext])

          schemes.push(scheme)
        end

        schemes
      end

      def doc_process(source)
        doc = ChemScanner::Doc.new
        doc.read(source.file.file_path)

        schemes = []
        doc.cdx_map.values.each_with_index do |cdx, idx|
          scheme = Chemscanner::SchemeBuilder.new(source, cdx).build

          scheme.image_data = Base64.encode64(cdx.raw_data)
          scheme.index = idx

          schemes.push(scheme)
        end

        schemes
      end

      def cdx_process(source)
        file = source.file

        cdx = ChemScanner::Cdx.new
        cdx.read(file.file_path)

        scheme = Chemscanner::SchemeBuilder.new(source, cdx).build
        scheme.image_data = Base64.encode64(cdx.raw_data)

        [scheme]
      end

      def cdxml_process(source)
        file = source.file

        cdxml = ChemScanner::Cdxml.new
        cdxml.read(file.file_path)

        scheme = Chemscanner::SchemeBuilder.new(source, cdxml).build
        scheme.image_data = cdxml.raw_data

        [scheme]
      end

      def xml_process(source)
        file = source.file

        eln = ChemScanner::PerkinEln.new
        eln.read(file.file_path)

        eln.scheme_list.each_with_index.reduce([]) do |schemes, (eln_scheme, idx)|
          cdxml = eln_scheme.cdxml
          scheme_builder = Chemscanner::SchemeBuilder.new(source, cdxml)

          scheme = scheme_builder.build
          scheme.image_data = cdxml.raw_data
          scheme.index = idx

          schemes.push(scheme)
        end
      end

      def process_docx_image(img_b64, img_ext)
        return "data:image/png;base64,#{img_b64}" if img_ext == '.png'

        emf_file = Tempfile.new(['chemscanner', img_ext])
        svg_file = Tempfile.new(['chemscanner', '.svg'])
        svg_path = svg_file.path
        emf_path = emf_file.path

        IO.binwrite(emf_path, Base64.decode64(img_b64))

        cmd = "inkscape -l #{svg_path} #{emf_path}"
        Open3.popen3(cmd) { |_, _, _, wait| wait.value }

        File.read(svg_path)
      ensure
        emf_file&.close
        svg_file&.close

        emf_file&.unlink
        svg_file&.unlink
      end
    end
  end
  # rubocop:enable Metrics/ModuleLength
end
