# frozen_string_literal: true

module Chemotion
  class ChemicalsService
    MAP_GERMAN_TO_ENGLISH_PROPERTIES = {
      'qualitätsniveau' => 'quality level',
      'form' => 'form',
      'schmelzpunkt' => 'melting point',
      'siedepunkt' => 'boiling point',
      'dichte' => 'density',
      'dampfdichte' => 'vapor density',
      'dampfdruck' => 'vapor pressure',
      'brechungsindex' => 'refractive_index',
      'farbe' => 'color',
      'löslichkeit' => 'solubility',
      'flammpunkt' => 'flash_point',
      'ph-wert' => 'ph',
      'grad' => 'grade',
      'optische aktivität' => 'optical_activity',
      'funktionelle gruppe' => 'functional_group',
    }.freeze

    PROPERTY_ABBREVIATIONS = {
      'mp' => 'melting_point',
      'bp' => 'boiling_point',
    }.freeze

    SAFETY_SHEETS_DIR = 'public/safety_sheets'

    def self.request_options
      { headers: {
          'Access-Control-Request-Method' => 'GET',
          'Accept' => '*/*',
          'User-Agent' => 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0',
          'Accept-Encoding': 'gzip, deflate, br',
          Connection: 'keep-alive',
        },
        timeout: 15,
        follow_redirects: true }
    end

    def self.merck_request(name)
      string = name.gsub(/\s/, '-')
      merck_res = HTTParty.get("https://www.sigmaaldrich.com/US/en/search/#{string}?focus=products
                                &page=1&perpage=30&sort=relevance&term=#{string}&type=product", request_options)
      Nokogiri::HTML.parse(merck_res.body).xpath("//*[contains(@class, 'MuiTableBody-root')]").children[0].children[2]
                    .children[0].attributes['href'].value
    end

    def self.merck(name, language)
      product_number_string = merck_request(name)
      product_number = merck_request(name)[15, merck_request(name).length].split('/')[1]
      url_string = product_number_string[15, product_number_string.length]
      merck_link = "https://www.sigmaaldrich.com/DE/#{language}/sds/#{url_string}"
      { 'merck_link' => merck_link, 'merck_product_number' => product_number,
        'merck_product_link' => "https://www.sigmaaldrich.com#{product_number_string}" }
    rescue StandardError
      'Could not find safety data sheet from Merck'
    end

    def self.alfa_product(alfa_req)
      response = Nokogiri::HTML.parse(alfa_req.body)
      if response.title && response.title != 'Alfa Aesar'
        product_number = response.css('a').filter_map { |node| node.attribute('item_number') }
        product_number[0].value
      else
        str = 'search-result-number'
        response.xpath("//*[@class=\"#{str}\"]").at_css('span').children.text
      end
    end

    def self.alfa(name, language)
      chosen_lang = { 'en' => 'EE', 'de' => 'DE', 'fr' => 'FR' }
      alfa_req = HTTParty.get("https://www.alfa.com/en/search/?q=#{name}", request_options)
      alfa_link = "https://www.alfa.com/en/msds/?language=#{chosen_lang[language]}&subformat=CLP1&sku=#{alfa_product(alfa_req)}"
      { 'alfa_link' => alfa_link, 'alfa_product_number' => alfa_product(alfa_req),
        'alfa_product_link' => "https://www.alfa.com/en/catalog/#{alfa_product(alfa_req)}" }
    rescue StandardError
      'Could not find safety data sheet from Thermofisher'
    end

    def self.write_file(file_path, file = nil, link = nil)
      full_file_path = "public#{file_path}"

      # Ensure parent directory exists
      FileUtils.mkdir_p(File.dirname(full_file_path))

      if file.is_a?(Hash) && file['tempfile']
        File.binwrite(full_file_path, file['tempfile'].read)
      elsif file.respond_to?(:read)
        File.binwrite(full_file_path, file.read)
      else
        request_pdf_file(link, full_file_path)
      end
    rescue HTTParty::RedirectionTooDeep => e
      "Redirection limit exceeded: #{e}"
    rescue Timeout::Error => e
      "Request timed out: #{e}"
    end

    def self.create_sds_file(link, product_number, vendor_name)
      Tempfile.create(['sds', '.pdf'], Rails.root.join('tmp')) do |tmp_file|
        result = request_pdf_file(link, tmp_file.path)
        return result unless result

        file_hash = GenerateFileHashUtils.generate_full_hash(tmp_file.path)
        existing_file_path = GenerateFileHashUtils.find_duplicate_file_by_hash(vendor_name, product_number, file_hash)
        return existing_file_path if existing_file_path.present? && existing_file_path.is_a?(String)

        file_name = generate_safety_sheet_file_path(vendor_name, product_number, file_hash[0..15], true)
        write_file(file_name.to_s, tmp_file, link)
        return file_name if File.exist?("public/#{file_name}")

        { error: 'could not save safety data sheet' }
      end
    rescue StandardError => e
      { error: e.message }
    end

    def self.request_pdf_file(link, file_path)
      options = request_options.dup
      options[:headers]['Origin'] = 'https://www.sigmaaldrich.com'
      req_safety_sheet = HTTParty.get(link, options)
      if req_safety_sheet.headers['Content-Type'] == 'application/pdf'
        File.binwrite(file_path, req_safety_sheet)
        sleep 1
        true
      else
        Rails.logger.warn("Non-PDF content received from #{link}")
        false
      end
    rescue StandardError => e
      Rails.logger.error("HTTP error downloading PDF: #{e.message}")
      { error: e.message }
    end

    def self.find_existing_file_by_vendor_product_number_signature(vendor, product_number)
      vendor_product_files = GenerateFileHashUtils.find_safety_sheets_by_product_number(vendor, product_number)
      return nil if vendor_product_files.empty?

      # Look for files matching the URL signature pattern
      pattern = "#{SAFETY_SHEETS_DIR}/#{vendor}/#{product_number}_web_*.pdf"
      existing_files = Dir.glob(pattern)
      ## returning the first match is not best practice, for now it is ok as safety sheets which are fetched
      ## using internal fetch_safetysheet API for merck are unique, so existing_files should always contain one file
      return "/safety_sheets/#{vendor}/#{File.basename(existing_files.first)}" if existing_files.any?

      nil
    end

    def self.health_section(product_number)
      alfa_req = HTTParty.get("https://www.alfa.com/en/catalog/#{product_number}/", request_options)
      Nokogiri::HTML.parse(alfa_req.body).xpath("//*[contains(@id, 'health')]")
                    .children[1].children[1].children[1]
    end

    def self.construct_h_statements(h_phrases, vendor = nil)
      h_statements = {}
      h_phrases_hash = JSON.parse(File.read('./public/json/hazardPhrases.json'))

      h_array = vendor == 'merck' ? h_phrases[4].split(',') : h_phrases
      h_array.each do |element|
        h_phrases_hash.map { |k, v| k == element ? h_statements[k] = " #{v}" : nil }
      end
      h_statements
    end

    def self.construct_p_statements(p_phrases, vendor = nil)
      p_statements = {}
      p_phrases_hash = JSON.parse(File.read('./public/json/precautionaryPhrases.json'))
      p_array = vendor == 'merck' ? p_phrases[5].split('-').map { |element| element.gsub(/\s+/, '') } : p_phrases
      p_array.each do |element|
        p_phrases_hash.map { |k, v| k == element ? p_statements[k] = " #{v}" : nil }
      end
      p_statements
    end

    def self.construct_pictograms(pictograms)
      pictograms_hash = JSON.parse(File.read('./public/json/pictograms.json'))
      pictograms.filter_map { |e| pictograms_hash[e] ? e : nil }
    end

    def self.safety_phrases_thermofischer(product_number)
      health_section = health_section(product_number)
      h_phrases = health_section.children[5].text.gsub(/\t|\n|Hazard Statements:/, '').split(/[+-]/)
      p_phrases = health_section.children[11].text.gsub(/\t|\n|Precautionary Statements:/, '').split(/[+-]/)
      pictograms = health_section.css('img').map do |e|
        e.attributes['src'].value.gsub('/static//images/pictogram/', '')
      end
      { 'h_statements' => construct_h_statements(h_phrases),
        'p_statements' => construct_p_statements(p_phrases),
        'pictograms' => construct_pictograms(pictograms) }
    rescue StandardError
      'Could not find H and P phrases'
    end

    def self.safety_section(product_link)
      merck_req = HTTParty.get(product_link, request_options)
      search_string = 'MuiTypography-root MuiLink-root MuiLink-underlineNone MuiTypography-colorPrimary'
      Nokogiri::HTML.parse(merck_req.body)
                    .xpath("//*[contains(@class, '#{search_string}')]")
    end

    def self.safety_phrases_merck(product_link)
      safety_section = safety_section(product_link)
      safety_array = safety_section.children.reject { |i| i.text.empty? }.map(&:text)
      pictograms = safety_array[3].split(',')
      { 'h_statements' => construct_h_statements(safety_array, 'merck'),
        'p_statements' => construct_p_statements(safety_array, 'merck'),
        'pictograms' => construct_pictograms(pictograms) }
    rescue StandardError
      'Could not find H and P phrases'
    end

    def self.chem_properties_alfa(properties)
      chemical_properties = {}
      properties.each_with_index do |property, index|
        property_name = property.tr(' ', '_').downcase
        chemical_properties[property_name] = properties[index + 1] unless index.odd?
      end
      chemical_properties
    end

    def self.chemical_properties_alfa(product_link)
      alfa_req = HTTParty.get(product_link, request_options)
      properties = Nokogiri::HTML.parse(alfa_req.body).xpath("//*[contains(@id, 'product')]").search('div.col-md-12')
                                 .search('div.col-md-3').text.delete("\t").split("\n\n")
      chem_properties_alfa(properties)
    rescue StandardError
      'Could not find additional chemical properties'
    end

    def self.names_properties_merck(properties)
      properties.search('div.MuiGrid-grid-sm-3')
                .css('span').map(&:text).map { |str| str.tr(' ', '_').downcase }
    end

    def self.clean_property_name(property_name)
      return nil if property_name.blank?

      property_name = property_name.downcase.strip
      return PROPERTY_ABBREVIATIONS[property_name] if PROPERTY_ABBREVIATIONS[property_name]

      handle_property_with_parentheses(property_name)
    end

    def self.handle_property_with_parentheses(property_name)
      return MAP_GERMAN_TO_ENGLISH_PROPERTIES[property_name] || property_name unless property_name.include?('(')

      main_term = extract_main_term(property_name)
      return PROPERTY_ABBREVIATIONS[main_term] if PROPERTY_ABBREVIATIONS[main_term]

      german_term = extract_german_term(property_name)
      MAP_GERMAN_TO_ENGLISH_PROPERTIES[german_term] || property_name
    end

    def self.extract_main_term(property_name)
      property_name.split('(').first.strip
    end

    def self.extract_german_term(property_name)
      property_name.match(/\((.*?)\)/).try(:[], 1).to_s.downcase
    end

    def self.chem_properties_merck(chem_properties_names, chem_properties_values)
      chemical_properties = {}
      chem_properties_values.pop
      chem_properties_names.map.with_index do |string, index|
        property_name = clean_property_name(string)
        cleaned_value = CGI.unescapeHTML(chem_properties_values[index]) if chem_properties_values[index]
        cleaned_value = Nokogiri::HTML.fragment(cleaned_value).text.strip if cleaned_value
        chemical_properties[property_name] = cleaned_value if property_name
      end
      chemical_properties
    end

    def self.chemical_properties_merck(product_link)
      merck_req = HTTParty.get(product_link, request_options)
      json_data = Nokogiri::HTML.parse(merck_req.body).at_xpath("//script[@type='application/ld+json']")&.children&.text
      properties = JSON.parse(json_data)['additionalProperty'] if json_data
      chem_properties_names = properties.pluck('name')
      chem_properties_values = properties.map { |property| property['value'].join(', ') }
      chem_properties_values.compact_blank!
      chem_properties_merck(chem_properties_names, chem_properties_values)
    rescue StandardError
      'Could not find additional chemical properties'
    end

    # Generate or extract vendor key for safetySheetPath based on file path
    # Handles both raw filenames and existing versioned file paths
    # @param file_path [String] Path to the SDS file
    # @param product_number [String, nil] Optional product number to match versioned filenames
    # @return [String] Vendor key for safetySheetPath
    def self.extract_vendor_key_from_path(file_path, product_number = nil)
      return nil unless file_path && product_number.present?

      file_name = File.basename(file_path, '.pdf')

      match = file_name.match(/#{@vendor_name}_#{product_number}_(?:web_)?([a-f0-9]{16})/)
      version_num = match && match[1]

      if version_num
        "#{@vendor_name.downcase}_v#{version_num}_link"
      else
        "#{@vendor_name.downcase}_link"
      end
    end

    # Generate safety sheet file path (unique by vendor/product and hash initials)
    # Adds "_web_" marker when file originates from vendor API (url_signature = true)
    # @param vendor_name [String] vendor folder name (e.g. 'merck')
    # @param product_number [String] vendor product number (e.g. '270709')
    # @param file_hash_initials [String] first 16 chars (or similar) of file hash for uniqueness
    # @param url_signature [Boolean] whether to include the "_web_" segment (API-fetched)
    # @return [String] relative path starting with /safety_sheets/
    # rubocop:disable Style/OptionalBooleanParameter
    def self.generate_safety_sheet_file_path(vendor_name, product_number, file_hash_initials, url_signature = false)
      base_file_name = "#{vendor_name}/#{product_number}"
      if url_signature
        "/safety_sheets/#{base_file_name}_web_#{file_hash_initials}.pdf"
      else
        "/safety_sheets/#{base_file_name}_#{file_hash_initials}.pdf"
      end
    end
    # rubocop:enable Style/OptionalBooleanParameter

    # Check if chemical record already contains this vendor and product combination
    # @param chemical [Chemical] Chemical record to check
    # @param vendor_name [String] Vendor name
    # @param product_number [String] Product number
    # @return [Boolean] true if vendor+product exists in chemical
    def self.chemical_has_vendor_product?(chemical, vendor_name, product_number)
      return false unless chemical&.chemical_data.is_a?(Array) && chemical.chemical_data[0]

      # Check if vendor product key exists
      vendor_product_key = "#{vendor_name.downcase}ProductInfo"
      vendor_info = chemical.chemical_data[0][vendor_product_key]

      vendor_info.present? && vendor_info['productNumber'] == product_number
    end

    def self.update_chemical_data(chemical_data, file_path, product_number, vendor)
      hash_initials = file_path[%r{/safety_sheets/#{vendor}/#{product_number}_(?:web_)?([a-f0-9]{16})\.pdf$}, 1]
      if file_path.present? && file_path.is_a?(String) && hash_initials.present?
        safety_sheet_key = "#{product_number}_#{hash_initials}_link"
        chemical_data[0]['safetySheetPath'] ||= []
        existing_keys = chemical_data[0]['safetySheetPath'].flat_map(&:keys)
        unless existing_keys.include?(safety_sheet_key)
          chemical_data[0]['safetySheetPath'] << {
            safety_sheet_key => file_path,
          }
        end
      end
      chemical_data
    end

    def self.find_existing_or_create_safety_sheet(link, vendor, product_number)
      existing_file_path = find_existing_file_by_vendor_product_number_signature(
        vendor,
        product_number,
      )
      existing_file_path || create_sds_file(link, product_number, vendor)
    end

    # Finds existing chemical or creates new one with updated safety data
    # @param sample_id [Integer] Sample identifier
    # @param cas [String] CAS number for chemical identification
    # @param chemical_data [Array<Hash>] Chemical data array
    # @param file_path [String] Path to safety data sheet file
    # @param product_number [String] Vendor product number
    # @param vendor [String] Vendor name
    # @return [Chemical] Created or updated chemical record
    def self.find_or_create_chemical_with_safety_data(**args)
      updated_chemical_data = update_chemical_data(
        args[:chemical_data],
        args[:file_path],
        args[:product_number],
        args[:vendor],
      )
      chemical = Chemical.find_by(sample_id: args[:sample_id])

      if chemical.present?
        update_existing_chemical(chemical, updated_chemical_data)
      else
        create_chemical(args[:sample_id], args[:cas], updated_chemical_data)
      end
    end

    # Updates existing chemical with new data
    # @param chemical [Chemical] Existing chemical record
    # @param chemical_data [Array<Hash>] Updated chemical data
    # @return [Chemical] Updated chemical record
    def self.update_existing_chemical(chemical, chemical_data)
      chemical.update!(chemical_data: chemical_data)
      chemical
    end

    # Creates new chemical record with data
    # @param sample_id [Integer] Sample identifier
    # @param cas [String] CAS number
    # @param chemical_data [Array<Hash>] Chemical data
    # @return [Chemical] Created chemical record
    def self.create_chemical(sample_id, cas, chemical_data)
      Chemical.create!(
        sample_id: sample_id,
        cas: cas,
        chemical_data: chemical_data,
      )
    rescue StandardError => e
      Rails.logger.error("Error creating chemical: #{e.message}")
      { error: "Error creating chemical: #{e.message}" }
    end

    def self.handle_exceptions
      yield
    rescue ActiveRecord::StatementInvalid => e
      Rails.logger.error("Database error: #{e.message}")
      { error: e.message }
    rescue ActiveRecord::RecordInvalid => e
      Rails.logger.error("Record invalid: #{e.message}")
      { error: e.message }
    rescue JSON::ParserError => e
      Rails.logger.error("JSON parse error: #{e.message}")
      { error: 'Invalid JSON data' }
    rescue StandardError => e
      Rails.logger.error("Error: #{e.message}")
      { error: e.message }
    end
  end
end
