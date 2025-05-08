# frozen_string_literal: true

module Export
  class ExportTable
    attr_reader :file_extension

    # allowed headers depending on element detail level
    # names from ReportHelpers::EXP_MAP_ATTR
    # allowed sample/molecule headers for sample detail level 0
    HEADERS_SAMPLE_0 = [
      'sample external label', 'sample name', 'target amount', 'target unit',
      'real amount', 'real unit', 'description', 'purity', 'solvent', 'location',
      'secret', 'short label', 'density', 'melting pt', 'boiling pt', 'created_at',
      'updated_at', 'MW', 'user_labels', 'decoupled', 'molecular mass (decoupled)', 'sum formula (decoupled)',
      'sample uuid'
    ].freeze

    # allowed sample/molecule headers for sample detail level 10
    HEADERS_SAMPLE_10 = HEADERS_SAMPLE_0 + [
      'molfile', 'sample readout', 'image', 'identifier', 'molecule name',
      'canonical smiles', 'sum formula', 'inchistring', 'InChI' # , 'analyses'
    ].freeze

    HEADERS_SAMPLE_ID = [
      'sample external label',
      'sample name',
      'short label',
      'sample type',
      'sample uuid',
    ].freeze

    # allowed well/wellplate headers for wellplate detail level 0
    HEADERS_WELLPLATE_0 = [
      'wellplate name',
    ].freeze

    # allowed well/wellplate headers for wellplate detail level 10
    HEADERS_WELLPLATE_10 = HEADERS_WELLPLATE_0 + [
      'size', 'wp description', 'wp created at',
      'wp updated at', 'well x', 'well y', 'well readout', 'additive'
    ].freeze

    # allowed reaction/reaction-sample headers for reaction detail level 0
    HEADERS_REACTION_0 = [
      'r name', 'type'
    ].freeze
    # allowed reaction/reaction-sample headers for reaction detail level 10
    HEADERS_REACTION_10 = HEADERS_REACTION_0 + [
      'r ref', 'r eq'
    ].freeze

    HEADERS_ANALYSIS_0 = [].freeze
    HEADERS_ANALYSIS = %w[name description uuid kind status content].freeze
    HEADERS_DATASET_0 = [].freeze
    HEADERS_DATASET = %w[dataset name instrument dataset description].freeze
    HEADERS_ATTACHMENT_0 = [].freeze
    HEADERS_ATTACHMENT = %w[filename checksum].freeze

    def extract_label_from_solvent_column(sample_column)
      return unless sample_column.is_a?(String) && !sample_column.empty?

      solvent_hash = begin
        JSON.parse(sample_column)
      rescue StandardError
        nil
      end

      return nil if solvent_hash.nil?

      solvent_values = solvent_hash.map { |solvent| solvent&.fetch('label', nil) }
      solvent_values.compact.join('-')
    end

    def generate_headers(table, excluded_columns = [], selected_columns = [])
      @row_headers = @samples.columns - excluded_columns
      # Ensure required fields are in row_headers before creating @headers
      @row_headers << 'sample uuid' unless @row_headers.include?('sample uuid')

      @headers = @row_headers - %w[s_id ts co_id scu_id shared_sync pl dl_s dl_wp dl_r m_image molfile_version]
      @image_index = @headers.index('image')

      case table.to_sym
      when :wellplate
        generate_headers_wellplate
      when :reaction
        generate_headers_reaction
      when :sample_analyses
        generate_headers_sample_id
        add_analyses_header(selected_columns)
      when :sample_components
        generate_headers_sample_id
        add_components_header(selected_columns)
      when :sample, :sample_chemicals
        generate_headers_sample
      else
        generate_headers_sample_id
      end
    end

    def generate_headers_wellplate
      @headers010 = @headers.map do |column|
        (HEADERS_SAMPLE_0 + HEADERS_WELLPLATE_10).include?(column) ? column : nil
      end
      @headers100 = @headers.map do |column|
        (HEADERS_SAMPLE_10 + HEADERS_WELLPLATE_0).include?(column) ? column : nil
      end
      @headers00 = @headers.map do |column|
        (HEADERS_SAMPLE_0 + HEADERS_WELLPLATE_0).include?(column) ? column : nil
      end
    end

    def generate_headers_reaction
      @headers010 = @headers.map do |column|
        (HEADERS_SAMPLE_0 + HEADERS_REACTION_10).include?(column) ? column : nil
      end
      @headers100 = @headers.map do |column|
        (HEADERS_SAMPLE_10 + HEADERS_REACTION_0).include?(column) ? column : nil
      end
      @headers00 = @headers.map do |column|
        (HEADERS_SAMPLE_0 + HEADERS_REACTION_0).include?(column) ? column : nil
      end
      @headers1010 = @headers.map do |column|
        (HEADERS_SAMPLE_10 + HEADERS_REACTION_10).include?(column) ? column : nil
      end
    end

    def flash_point_format(value)
      return if value.blank?

      # Add quotes around unquoted keys & values
      value = value.gsub(/(\w+):/, '"\1":')
      value = value.gsub(/:\s*([^",{}\s]+)/, ':"\1"')

      flash_point = JSON.parse(value)
      "#{flash_point['value']} #{flash_point['unit']}"
    rescue JSON::ParserError => e
      Rails.logger.warn("Failed to parse flash_point JSON: #{e.message}")
      nil
    end

    def format_headers(headers)
      headers.map! do |header|
        header = header.tr('_', ' ')
        if header.scan('molarity value').first == 'molarity value'
          'molarity'
        elsif header == 'molarity unit'
          nil
        else
          header
        end
      end
      headers.compact
    end

    def generate_headers_sample
      @headers00 = @headers.map do |column|
        HEADERS_SAMPLE_0.include?(column) ? column : nil
      end
      @headers100 = @headers.map do |column|
        HEADERS_SAMPLE_10.include?(column) ? column : nil
      end
      @headers = format_headers(@headers)
    end

    def generate_headers_sample_id
      @headers = @row_headers & HEADERS_SAMPLE_ID
      @headers00 = @headers.dup
      @headers100 = @headers.dup
    end

    def add_analyses_header(selected_headers)
      h = HEADERS_ANALYSIS + HEADERS_DATASET + HEADERS_ATTACHMENT
      h &= selected_headers
      @headers += h
      # @headers00 << 'analyses'
      @headers100 << 'analyses'
    end

    def add_components_header(selected_headers)
      @headers.concat(Export::ExportComponents::COMPONENT_FIELDS & selected_headers)
      @headers100 << 'components'
    end

    def quill_to_html_to_string(delta)
      html_content = Chemotion::QuillToHtml.convert(delta)
      Nokogiri::HTML(html_content).text
    end
  end
end
