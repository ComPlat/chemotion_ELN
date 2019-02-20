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
      'updated_at', 'MW'
    ].freeze

    # allowed sample/molecule headers for sample detail level 10
    HEADERS_SAMPLE_10 = HEADERS_SAMPLE_0 + [
      'molfile', 'sample readout', 'image', 'identifier', 'molecule name',
      'canonical smiles', 'sum formula', 'inchistring', 'InChI'#, 'analyses'
    ].freeze

    HEADERS_SAMPLE_ID = [
      'sample external label', 'sample name', 'short label'
    ].freeze

    # allowed well/wellplate headers for wellplate detail level 0
    HEADERS_WELLPLATE_0 = [
      'wellplate name'
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
    HEADERS_ANALYSIS = ["name", "description", "uuid", "kind", "status", "content"].freeze
    HEADERS_DATASET_0 = [].freeze
    HEADERS_DATASET = ["dataset name", "instrument", "dataset description"].freeze
    HEADERS_ATTACHMENT_0 = [].freeze
    HEADERS_ATTACHMENT = ["filename", "checksum"].freeze

    def generate_headers(table, excluded_columns = [], selected_columns = [])
      @row_headers = @samples.columns - excluded_columns
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
      when :sample
        generate_headers_sample
      else generate_headers_sample_id
      end
    end

    def generate_headers_wellplate
      @headers010 = @headers.map { |column|
        (HEADERS_SAMPLE_0 + HEADERS_WELLPLATE_10).include?(column) ? column : nil
      }
      @headers100 = @headers.map { |column|
        (HEADERS_SAMPLE_10 + HEADERS_WELLPLATE_0).include?(column) ? column : nil
      }
      @headers00 = @headers.map { |column|
        (HEADERS_SAMPLE_0 + HEADERS_WELLPLATE_0).include?(column) ? column : nil
      }
    end

    def generate_headers_reaction
      @headers010 = @headers.map { |column|
        (HEADERS_SAMPLE_0 + HEADERS_REACTION_10).include?(column) ? column : nil
      }
      @headers100 = @headers.map { |column|
        (HEADERS_SAMPLE_10 + HEADERS_REACTION_0).include?(column) ? column : nil
      }
      @headers00 = @headers.map { |column|
        (HEADERS_SAMPLE_0 + HEADERS_REACTION_0).include?(column) ? column : nil
      }
      @headers1010 = @headers.map { |column|
        (HEADERS_SAMPLE_10 + HEADERS_REACTION_10).include?(column) ? column : nil
      }
    end

    def generate_headers_sample
      @headers00 = @headers.map { |column|
        HEADERS_SAMPLE_0.include?(column) ? column : nil
      }
      @headers100 = @headers.map { |column|
        HEADERS_SAMPLE_10.include?(column) ? column : nil
      }
    end

    def generate_headers_sample_id
      @headers = @row_headers & HEADERS_SAMPLE_ID
      @headers00 = @headers.dup
      @headers100 = @headers.dup
    end

    def add_analyses_header(selected_headers)
      h = HEADERS_ANALYSIS + HEADERS_DATASET + HEADERS_ATTACHMENT
      h = h & selected_headers
      @headers += h
      # @headers00 << 'analyses'
      @headers100 << 'analyses'
    end

    def quill_to_html_to_string(delta)
      html_content = Chemotion::QuillToHtml.new.convert(delta)
      Nokogiri::HTML( html_content).text
    end
  end
end
