# frozen_string_literal: true

module Import
  class ImportChemicals
    SAFETY_PHRASES = %w[pictograms h_statements p_statements].freeze
    AMOUNT = %w[amount unit].freeze
    SAFETY_SHEET = %w[safety_sheet_link product_link].freeze
    KEYS_TO_EXCLUDE = SAFETY_SHEET + %w[cas].freeze
    SIGMA_ALDRICH_PATTERN = /(sigmaaldrich|merck)/.freeze
    THERMOFISCHER_PATTERN = /(thermofischer|alfa)/.freeze
    SAFETY_SHEET_PATH = '/safety_sheets/'
    VENDOR_MAP = {
      SIGMA_ALDRICH_PATTERN => 'Merck',
      THERMOFISCHER_PATTERN => 'Alfa',
    }.freeze

    def self.create_chemical(sample_id, row, header)
      chemical = Chemical.new
      chemical['sample_id'] = sample_id
      chemical['chemical_data'] = [{}]
      header.each do |column_header|
        value = row[column_header]
        next if value.blank?

        ## only import value for column if value is valid
        chemical['cas'] = value if column_header == 'cas'
        process_column(chemical, column_header, value)
      end
      chemical.save!
    rescue StandardError => e
      Rails.logger.error "Error importing chemical: #{e.message}"
    end

    class << self
      private

      def process_column(chemical, column_header, value)
        map_column = chemical_fields.find { |e| e == column_header.downcase.rstrip }
        key = to_snake_case(column_header)

        if map_column.present? && should_process_key(key)
          chemical['chemical_data'][0][key] = value
        elsif SAFETY_SHEET.include?(key)
          set_safety_sheet(chemical, key, value)
        elsif SAFETY_PHRASES.include?(key)
          set_safety_phrases(chemical, key, value)
        elsif AMOUNT.include?(key)
          set_amount(chemical, key, value)
        end
      end

      def chemical_fields
        [
          'cas',
          'status',
          'vendor',
          'order number',
          'amount',
          'unit',
          'price',
          'person',
          'required date',
          'ordered date',
          'required by',
          'pictograms',
          'h statements',
          'p statements',
          'safety sheet link',
          'product link',
          'host building',
          'host room',
          'host cabinet',
          'host group',
          'owner',
          'borrowed by',
          'current building',
          'current room',
          'current cabinet',
          'current group',
          'disposal info',
          'important notes',
        ]
      end

      def to_snake_case(column_header)
        key = column_header.downcase.rstrip.gsub(/\s+/, '_')
        key == 'owner' ? 'host_owner' : key
      end

      def should_process_key(key)
        KEYS_TO_EXCLUDE.exclude?(key) && (AMOUNT + SAFETY_PHRASES).exclude?(key)
      end

      def set_safety_sheet(chemical, key, value)
        vendor = detect_vendor(value)
        return unless vendor

        product_number = extract_product_number(value)
        product_info = handle_safety_sheet(key, vendor, product_number, value, chemical)

        product_info_key = "#{vendor.downcase}ProductInfo"
        chemical['chemical_data'][0][product_info_key] ||= {}
        chemical['chemical_data'][0][product_info_key].merge!(product_info)
      rescue StandardError => e
        Rails.logger.error "Error setting safety sheet info for chemical: #{e.message}"
      end
    end

    def detect_vendor(value)
      VENDOR_MAP.each do |pattern, vendor|
        return vendor if value.present? && value.match?(pattern)
      end
      nil
    end

    def extract_product_number(url)
      match = url.match(/productNumber=(\d+)/)
      match[1] if match
    end

    def handle_safety_sheet(key, vendor, product_number, value, chemical)
      case key
      when 'safety_sheet_link'
        create_safety_sheet_path(vendor.downcase, value, product_number, chemical)
        set_safety_sheet_link(vendor, product_number, value)
      when 'product_link'
        { 'productLink' => value }
      end
    end

    def create_safety_sheet_path(vendor, value, product_number, chemical)
      file_path = "#{product_number}_#{vendor.capitalize}.pdf"
      chemical['chemical_data'][0]['safetySheetPath'] ||= []
      sheet_path = { "#{vendor}_link" => "#{SAFETY_SHEET_PATH}#{file_path}" }
      is_created = Chemotion::ChemicalsService.create_sds_file(file_path, value)
      result = [true, 'file is already saved'].include?(is_created)
      chemical['chemical_data'][0]['safetySheetPath'] << sheet_path if result
      chemical
    end

    def set_safety_sheet_link(vendor, product_number, value)
      {
        'vendor' => vendor,
        'productNumber' => product_number,
        'sdsLink' => value,
      }
    end

    def set_safety_phrases(chemical, key, value)
      phrases = chemical['chemical_data'][0]['safetyPhrases'] ||= {}
      values = value.split(/,|-/)
      statements = {
        'pictograms' => values,
        'h_statements' => Chemotion::ChemicalsService.construct_h_statements(values),
        'p_statements' => Chemotion::ChemicalsService.construct_p_statements(values),
      }
      phrases[key] = statements[key] unless statements[key].empty?
    end

    def set_amount(chemical, key, value)
      chemical['chemical_data'][0]['amount'] = {} if chemical['chemical_data'][0]['amount'].nil?
      case key
      when 'amount' then chemical['chemical_data'][0]['amount']['value'] = value
      when 'unit' then chemical['chemical_data'][0]['amount']['unit'] = value
      end
    rescue StandardError => e
      Rails.logger.error "Error setting amount for chemical: #{e.message}"
    end
  end
end
