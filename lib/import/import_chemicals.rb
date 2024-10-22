# frozen_string_literal: true

module Import
  class ImportChemicals
    SAFETY_PHRASES = %w[pictograms h_statements p_statements].freeze
    AMOUNT = %w[amount].freeze
    AMOUNT = %w[amount].freeze
    STORAGE_TEMPERATURE = %w[storage_temperature].freeze
    SAFETY_SHEET = %w[safety_sheet_link_merck product_link_merck].freeze
    KEYS_TO_EXCLUDE = SAFETY_SHEET + %w[cas].freeze
    SIGMA_ALDRICH_PATTERN = /(sigmaaldrich|merck)/.freeze
    THERMOFISCHER_PATTERN = /(thermofischer|alfa)/.freeze
    SAFETY_SHEET_PATH = '/safety_sheets/'
    VENDOR_MAP = {
      SIGMA_ALDRICH_PATTERN => 'Merck',
      THERMOFISCHER_PATTERN => 'Alfa',
    }.freeze
    CHEMICAL_FIELDS = [
      'cas', 'status', 'vendor', 'order number', 'amount', 'price', 'person', 'required date', 'ordered date',
      'required by', 'pictograms', 'h statements', 'p statements', 'safety sheet link', 'product link', 'host building',
      'host room', 'host cabinet', 'host group', 'owner', 'borrowed by', 'current building', 'current room',
      'current cabinet', 'current group', 'disposal info', 'important notes', 'expiration date'
    ].freeze
    GHS_VALUES = %w[GHS01 GHS02 GHS03 GHS04 GHS05 GHS06 GHS07 GHS08 GHS09].freeze
    AMOUNT_UNITS = %w[g mg μg].freeze

    def self.build_chemical(row, header)
      chemical = Chemical.new
      chemical.chemical_data = [{}]
      import_data(chemical, row, header)
    end

    def self.import_data(chemical, row, header)
      header.each do |column_header|
        value = row[column_header]
        next if skip_import?(value, column_header)

        if column_header == 'cas'
          chemical.cas = value
        else
          process_column(chemical, column_header, value)
        end
      end
      chemical
    end

    def self.skip_import?(value, column_header)
      value.blank? || column_header.nil?
    end

    def self.process_column(chemical, column_header, value)
      map_column = CHEMICAL_FIELDS.find { |e| e == column_header.downcase.rstrip }
      key = to_snake_case(column_header)
      format_value = value.strip

      return process_chemical_data(chemical, key, format_value) if map_column.present? && should_process_key(key)

      process_special_fields(chemical, key, format_value)
    end

    def self.process_chemical_data(chemical, key, format_value)
      chemical['chemical_data'][0][key] = format_value
    end

    def self.process_special_fields(chemical, key, format_value)
      if SAFETY_SHEET.include?(key)
        set_safety_sheet(chemical, key, format_value)
      elsif SAFETY_PHRASES.include?(key)
        set_safety_phrases(chemical, key, format_value)
      elsif AMOUNT.include?(key)
        set_amount(chemical, format_value)
      elsif STORAGE_TEMPERATURE.include?(key)
        set_storage_temperature(chemical, format_value)
      end
    end

    def self.to_snake_case(column_header)
      key = column_header.downcase.rstrip.gsub(/\s+/, '_')
      key == 'owner' ? 'host_owner' : key
    end

    def self.should_process_key(key)
      KEYS_TO_EXCLUDE.exclude?(key) && (AMOUNT + SAFETY_PHRASES).exclude?(key)
    end

    def self.set_safety_sheet(chemical, key, value)
      vendor = detect_vendor(value)
      return unless vendor

      product_info = handle_safety_sheet(key, vendor, value, chemical)
      product_info_key = "#{vendor.downcase}ProductInfo"
      chemical['chemical_data'][0][product_info_key] ||= {}
      chemical['chemical_data'][0][product_info_key].merge!(product_info || {})
    rescue StandardError => e
      raise "Error setting safety sheet info for chemical: #{e.message}"
    end

    def self.detect_vendor(value)
      VENDOR_MAP.each do |pattern, vendor|
        return vendor if value.present? && value.match?(pattern)
      end
      nil
    end

    def self.handle_safety_sheet(key, vendor, value, chemical)
      case key
      when 'safety_sheet_link_merck'
        product_number = extract_product_number(value)
        create_safety_sheet_path(vendor.downcase, value, product_number, chemical) if product_number.present?
        set_safety_sheet_link(vendor, product_number, value) if product_number.present?
      when 'product_link_merck'
        { 'productLink' => value }
      end
    end

    def self.extract_product_number(url)
      match = url.match(/productNumber=(\d+)/) || url.match(/sku=(\w+)/)
      if match
        match[1]
      else
        path = url.split('/')
        filter = path.last
        # extract digits from the string
        filter.match(/.*?(?=[$%&?]|$)/)&.[](0)
      end
    end

    def self.create_safety_sheet_path(vendor, value, product_number, chemical)
      file_path = "#{product_number}_#{vendor.capitalize}.pdf"
      chemical['chemical_data'][0]['safetySheetPath'] ||= []
      sheet_path = { "#{vendor}_link" => "#{SAFETY_SHEET_PATH}#{file_path}" }
      is_created = Chemotion::ChemicalsService.create_sds_file(file_path, value)
      result = [true].include?(is_created)
      chemical['chemical_data'][0]['safetySheetPath'] << sheet_path if result
      chemical
    end

    def self.set_safety_sheet_link(vendor, product_number, value)
      {
        'vendor' => vendor,
        'productNumber' => product_number,
        'sdsLink' => value,
      }
    end

    def self.check_available_ghs_values(values)
      ghs_values_to_set = []
      values.each do |value|
        format_value = value.strip
        ghs_values_to_set.push(format_value) if GHS_VALUES.include?(format_value)
      end
      ghs_values_to_set
    end

    def self.assign_phrases(key, values, phrases)
      case key
      when 'pictograms'
        value = check_available_ghs_values(values)
        phrases[key] = value
      when 'h_statements'
        value = Chemotion::ChemicalsService.construct_h_statements(values)
        phrases[key] = value
      when 'p_statements'
        value = Chemotion::ChemicalsService.construct_p_statements(values)
        phrases[key] = value
      end
    end

    def self.set_safety_phrases(chemical, key, value)
      phrases = chemical['chemical_data'][0]['safetyPhrases'] ||= {}
      values = value.split(/,|-/)
      assign_phrases(key, values, phrases)
    end

    def self.set_amount(chemical, value)
      chemical['chemical_data'][0]['amount'] = {} if chemical['chemical_data'][0]['amount'].nil?
      quantity = value.to_f
      unit = value.gsub(/\d+(\.\d+)?/, '')
      return chemical unless AMOUNT_UNITS.include?(unit)

      chemical['chemical_data'][0]['amount']['value'] = quantity
      chemical['chemical_data'][0]['amount']['unit'] = unit
    end

    def self.set_storage_temperature(chemical, value)
      unit_is_celsius = value.gsub(/\d+(\.\d+)?/, '') == '°C'
      return chemical unless unit_is_celsius

      if chemical['chemical_data'][0]['storage_temperature'].nil?
        chemical['chemical_data'][0]['storage_temperature'] = {}
      end
      chemical['chemical_data'][0]['storage_temperature']['value'] = value.to_f
      chemical['chemical_data'][0]['storage_temperature']['unit'] = '°C'
    end
  end
end
