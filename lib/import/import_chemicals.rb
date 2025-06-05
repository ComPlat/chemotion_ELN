# frozen_string_literal: true

module Import
  class ImportChemicals
    SAFETY_PHRASES = %w[pictograms h_statements p_statements].freeze
    AMOUNT = %w[amount].freeze
    STORAGE_TEMPERATURE = %w[storage_temperature].freeze
    VOLUME = %w[volume].freeze
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
      'cas', 'status', 'vendor', 'order number', 'amount', 'volume', 'price', 'person', 'required date', 'ordered date',
      'required by', 'pictograms', 'h statements', 'p statements', 'safety sheet link', 'product link', 'host building',
      'host room', 'host cabinet', 'host group', 'owner', 'borrowed by', 'current building', 'current room',
      'current cabinet', 'current group', 'disposal info', 'important notes', 'expiration date', 'storage temperature'
    ].freeze
    MAP_ACTION = {
      SAFETY_SHEET => ->(chemical, key, formatted_value) { set_safety_sheet(chemical, key, formatted_value) },
      SAFETY_PHRASES => ->(chemical, key, formatted_value) { set_safety_phrases(chemical, key, formatted_value) },
      AMOUNT + VOLUME => ->(chemical, key, formatted_value) { set_amount_or_volume(chemical, key, formatted_value) },
      STORAGE_TEMPERATURE => ->(chemical, _key, formatted_value) { set_storage_temperature(chemical, formatted_value) },
    }.freeze

    GHS_VALUES = %w[GHS01 GHS02 GHS03 GHS04 GHS05 GHS06 GHS07 GHS08 GHS09].freeze
    AMOUNT_UNITS = %w[g mg μg].freeze
    VOLUME_UNITS = %w[ml l μl].freeze

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

    def self.build_chemical_data(map_column, chemical, key, formatted_value)
      if map_column.present? && should_process_key(key)
        process_map_column(chemical, key, formatted_value)
      else
        MAP_ACTION.each do |keys, action|
          if keys.include?(key)
            action.call(chemical, key, formatted_value)
            break
          end
        end
      end
    end

    def self.process_map_column(chemical, key, formatted_value)
      chemical['chemical_data'][0][key] = formatted_value
    end

    def self.process_column(chemical, column_header, value)
      map_column = CHEMICAL_FIELDS.find do |e|
        e.downcase.rstrip.gsub(/\s+/, '_') == column_header.downcase.rstrip
      end
      key = to_snake_case(column_header)
      formatted_value = value.strip
      build_chemical_data(map_column, chemical, key, formatted_value)
    end

    def self.to_snake_case(column_header)
      key = column_header.downcase.rstrip.gsub(/\s+/, '_')
      key == 'owner' ? 'host_owner' : key
    end

    def self.should_process_key(key)
      KEYS_TO_EXCLUDE.exclude?(key) && (AMOUNT + VOLUME + SAFETY_PHRASES + STORAGE_TEMPERATURE).exclude?(key)
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
      ## only fetch and save safety sheets for accepted vendors
      accepted_vendors = %w[merck sigma_aldrich]
      return unless accepted_vendors.include?(vendor.downcase) && product_number.present?

      file_path = Chemotion::ChemicalsService.create_sds_file(value, product_number, vendor)
      is_created = File.exist?("public/safety_sheets/#{file_path}.pdf")

      if is_created
        chemical_data = Chemotion::ChemicalsService.update_chemical_data(
          chemical['chemical_data'],
          file_path,
          product_number,
          vendor,
        )
        chemical['chemical_data'] = chemical_data
      end
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

    def self.extract_quantity(value)
      value.to_f
    end

    def self.extract_unit(value)
      value.gsub(/[0-9.]+/, '').strip
    end

    def self.format_value_unit(chemical, key, value, unit)
      chemical['chemical_data'][0][key] ||= {}
      chemical['chemical_data'][0][key]['value'] = value
      chemical['chemical_data'][0][key]['unit'] = unit
      chemical
    end

    def self.set_amount_or_volume(chemical, key, value)
      quantity = extract_quantity(value)
      unit = extract_unit(value)

      return chemical if key == 'amount' && AMOUNT_UNITS.exclude?(unit)

      return chemical if key == 'volume' && VOLUME_UNITS.exclude?(unit)

      format_value_unit(chemical, key, quantity, unit)
    end

    def self.set_storage_temperature(chemical, value)
      unit_is_celsius = value.gsub(/\d+(\.\d+)?/, '').strip == '°C'
      return chemical unless unit_is_celsius

      if chemical['chemical_data'][0]['storage_temperature'].nil?
        chemical['chemical_data'][0]['storage_temperature'] = {}
      end
      chemical['chemical_data'][0]['storage_temperature']['value'] = value.to_f
      chemical['chemical_data'][0]['storage_temperature']['unit'] = '°C'
    end
  end
end
