# frozen_string_literal: true

module Chemotion
  # rubocop:disable Metrics/ClassLength
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
    ALLOWED_DOMAINS = %w[sigmaaldrich.com].freeze

    # Sending only a User-Agent + `Accept: */*`
    # (and the CORS-preflight `Access-Control-Request-Method` header) is treated
    # as automated, so `__NEXT_DATA__` returns Nil. The header set below
    # mirrors a real Chrome document navigation to avoid bot screening.
    #
    # Accept-Encoding is intentionally NOT set: Net::HTTP only transparently
    # decompresses gzip when it adds the header itself. Advertising it manually
    # (especially brotli) yields an undecoded body that Nokogiri can't parse.
    def self.request_options
      { headers: {
          'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language' => 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
          'User-Agent' => 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 ' \
                          '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'sec-ch-ua' => '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
          'sec-ch-ua-mobile' => '?0',
          'sec-ch-ua-platform' => '"Linux"',
          'Sec-Fetch-Dest' => 'document',
          'Sec-Fetch-Mode' => 'navigate',
          'Sec-Fetch-Site' => 'none',
          'Sec-Fetch-User' => '?1',
          'Upgrade-Insecure-Requests' => '1',
          'Connection' => 'keep-alive',
        },
        timeout: 15,
        follow_redirects: false }
    end

    def self.merck_request(name)
      string = CGI.escape(name.gsub(/\s/, '-'))
      url = "https://www.sigmaaldrich.com/DE/de/search/#{string}" \
            "?focus=products&page=1&perpage=30&sort=relevance&term=#{string}&type=product"
      safe_url = validate_url_for_request!(url)
      merck_res = HTTParty.get(safe_url, request_options)
      doc = Nokogiri::HTML.parse(merck_res.body.to_s)

      href = extract_product_href_from_next_data(doc) || extract_product_href_from_html(doc)
      raise StandardError, 'Product link not found on Sigma-Aldrich search page' unless href

      href
    end

    # Primary: read ROOT_QUERY.getNewProductSearchResults(...).products[0] from the
    # Apollo GraphQL cache that Next.js embeds in __NEXT_DATA__. Product objects in
    # the cache carry brandKey and productNumber but no URL, so we construct it.
    def self.extract_product_href_from_next_data(doc)
      script = doc.at_css('#__NEXT_DATA__')
      return nil unless script

      data = JSON.parse(script.text)
      extract_product_href_from_apollo_state(data)
    rescue JSON::ParserError, TypeError
      nil
    end

    # Construct the canonical /DE/de/product/{brand}/{number} path from the first
    # entry in the Apollo GraphQL cache search results.
    def self.extract_product_href_from_apollo_state(data)
      first = apollo_first_search_product(data)
      return nil unless first

      brand_key = first['brandKey'].to_s.downcase
      product_number = first['productNumber'].to_s
      return nil if brand_key.empty? || product_number.empty?

      "/DE/de/product/#{brand_key}/#{product_number}"
    end

    # Return the first product object from ROOT_QUERY.getNewProductSearchResults.
    def self.apollo_first_search_product(data)
      root_query = data.dig('props', 'apolloState', 'ROOT_QUERY') ||
                   data.dig('apolloState', 'ROOT_QUERY')
      return nil unless root_query.is_a?(Hash)

      sr_key = root_query.keys.find { |k| k.start_with?('getNewProductSearchResults') }
      return nil unless sr_key

      products = root_query.dig(sr_key, 'products')
      products.is_a?(Array) ? products.first : nil
    end

    # Last-resort fallback: first anchor whose href matches the product path pattern.
    def self.extract_product_href_from_html(doc)
      product_path_re = %r{\A/[A-Z]{2}/[a-z]{2}/product/}i
      doc.css("a[href*='/product/']").map { |a| a['href'] }.find { |h| h.match?(product_path_re) }
    end

    # Validate that a URL is safe to request (SSRF protection).
    # Redirects are disabled in request_options so whitelisted URLs cannot
    # redirect to untrusted hosts.
    # Returns a URI reconstructed from parsed components so callers receive a
    # taint-free string even when the input originated from user data.
    def self.validate_url_for_request!(url)
      raise StandardError, 'URL cannot be nil or empty' if url.blank?

      parsed_uri = URI.parse(url)
      raise StandardError, 'Invalid URL scheme' unless %w[https].include?(parsed_uri.scheme)
      raise StandardError, 'URL host cannot be empty' if parsed_uri.host.blank?
      raise StandardError, "Domain #{parsed_uri.host} is not allowed" unless allowed_host?(parsed_uri.host)

      # Return the URI rebuilt from parsed components to break the taint flow.
      parsed_uri.to_s
    rescue URI::InvalidURIError
      raise StandardError, 'Invalid URL format'
    end

    # Returns true when +host+ matches an entry in ALLOWED_DOMAINS exactly or
    # as a subdomain (e.g. "www.sigmaaldrich.com" matches "sigmaaldrich.com").
    def self.allowed_host?(host)
      normalized = host.to_s.downcase
      ALLOWED_DOMAINS.any? do |allowed|
        normalized == allowed || normalized.end_with?(".#{allowed}")
      end
    end

    private_class_method :extract_product_href_from_next_data,
                         :extract_product_href_from_apollo_state,
                         :apollo_first_search_product,
                         :extract_product_href_from_html,
                         :validate_url_for_request!,
                         :allowed_host?

    def self.merck(name, language)
      product_number_string = merck_request(name)
      product_number = product_number_string[15, product_number_string.length].split('/')[1]
      validate_product_number!(product_number)
      url_string = product_number_string[15, product_number_string.length]
      merck_link = "https://www.sigmaaldrich.com/DE/#{language}/sds/#{url_string}"
      { 'merck_link' => merck_link, 'merck_product_number' => product_number,
        'merck_product_link' => "https://www.sigmaaldrich.com#{product_number_string}" }
    rescue StandardError
      'Could not find safety data sheet from Merck'
    end

    # Validate product number: allow letters, digits, hyphen, underscore, dot.
    def self.validate_product_number!(product_number)
      if product_number.nil? || product_number.to_s.strip.empty?
        raise StandardError, 'Could not find safety data sheet from Merck'
      end

      allowed_pattern = /\A[A-Za-z0-9\-_.]+\z/
      return if product_number.to_s.match?(allowed_pattern)

      raise StandardError, 'Could not find safety data sheet from Merck'
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
      url = "https://www.alfa.com/en/search/?q=#{CGI.escape(name)}"
      safe_url = validate_url_for_request!(url)
      alfa_req = HTTParty.get(safe_url, request_options)
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
      safe_url = validate_url_for_request!(link)
      options = request_options.dup
      options[:headers]['Origin'] = 'https://www.sigmaaldrich.com'
      req_safety_sheet = HTTParty.get(safe_url, options)
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
      url = "https://www.alfa.com/en/catalog/#{CGI.escape(product_number)}/"
      safe_url = validate_url_for_request!(url)
      alfa_req = HTTParty.get(safe_url, request_options)
      Nokogiri::HTML.parse(alfa_req.body).xpath("//*[contains(@id, 'health')]")
                    .children[1].children[1].children[1]
    end

    def self.construct_h_statements(h_phrases)
      h_statements = {}
      h_phrases_hash = load_hazard_phrases_hash
      h_array = normalize_phrases_to_array(h_phrases, 'H')

      h_array.each do |code|
        process_statement(code, h_phrases_hash, h_statements)
      end

      h_statements
    end

    def self.process_statement(code, phrases_hash, statements)
      code = code.to_s.strip
      return if code.empty?

      if (value = phrases_hash[code])
        # Exact match (single code or a combined code such as "P305+P351+P338"):
        # store it as one statement.
        statements[code] = " #{value}"
      elsif code.include?('+')
        # Combined code with no combined entry in the lookup table: fall back to its
        # individual parts so the available statements are still surfaced.
        code.split('+').each do |part|
          statements[part] = " #{phrases_hash[part]}" if phrases_hash[part]
        end
      end
    end

    # Split a phrase string into the codes used as lookup keys.
    #
    # A single code is an optional "EU" prefix (for supplemental EUH### statements),
    # the H/P letter, 1-3 digits, and optional sub-category letters (e.g. EUH071,
    # H360FD, H350i). Codes joined by "+" (e.g. "P305 + P351 + P338") are kept
    # together as one token so they resolve to the combined statement rather than
    # being split into separate phrases; inner whitespace is stripped to match the
    # JSON keys (e.g. "P305+P351+P338").
    def self.normalize_phrases_to_array(phrases, prefix)
      return phrases.map { |p| p.to_s.gsub(/\s+/, '') }.reject(&:empty?) if phrases.is_a?(Array)

      return [] unless phrases.is_a?(String)

      atom = /(?:EU)?#{prefix}\d{1,3}[A-Za-z]*/
      phrases.scan(/#{atom}(?:\s*\+\s*#{atom})*/).map { |code| code.gsub(/\s+/, '') }
    end

    def self.load_hazard_phrases_hash
      JSON.parse(File.read('./public/json/hazardPhrases.json'))
    end

    def self.construct_p_statements(p_phrases)
      p_statements = {}
      p_phrases_hash = load_precautionary_phrases_hash
      p_array = normalize_phrases_to_array(p_phrases, 'P')

      p_array.each do |code|
        process_statement(code, p_phrases_hash, p_statements)
      end

      p_statements
    end

    def self.load_precautionary_phrases_hash
      JSON.parse(File.read('./public/json/precautionaryPhrases.json'))
    end

    def self.construct_pictograms(pictograms)
      pictograms_hash = JSON.parse(File.read('./public/json/pictograms.json'))
      # Accept either a comma-separated string or an array
      pictogram_array = if pictograms.is_a?(String)
                          pictograms.split(',').map(&:strip)
                        elsif pictograms.is_a?(Array)
                          pictograms.map { |x| x.to_s.strip }
                        else
                          []
                        end

      pictogram_array.filter_map { |e| pictograms_hash.key?(e) ? e : nil }
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

    # Fetch and parse __NEXT_DATA__ Apollo state from a Sigma-Aldrich product page.
    # Returns the first Hash with __typename == 'Product', or nil.
    def self.fetch_product_from_apollo(product_link)
      safe_url = validate_url_for_request!(product_link)
      response = HTTParty.get(safe_url, request_options)
      doc = Nokogiri::HTML.parse(response.body.to_s)
      script = doc.at_css('#__NEXT_DATA__')
      return nil unless script

      apollo = JSON.parse(script.text).dig('props', 'apolloState') || {}
      apollo.values.find { |v| v.is_a?(Hash) && v['__typename'] == 'Product' }
    rescue JSON::ParserError, TypeError
      nil
    end

    private_class_method :fetch_product_from_apollo
    private_class_method :process_statement, :normalize_phrases_to_array, :load_hazard_phrases_hash,
                         :load_precautionary_phrases_hash

    def self.safety_phrases_merck(product_link)
      product = fetch_product_from_apollo(product_link)
      raise StandardError, 'Product not found in Apollo state' unless product

      compliance = product['compliance'] || []
      { 'h_statements' => construct_h_statements(compliance_value(compliance, 'hcodes')),
        'p_statements' => construct_p_statements(compliance_value(compliance, 'pcodes')),
        'pictograms' => construct_pictograms(compliance_value(compliance, 'pictograms')) }
    rescue StandardError
      'Could not find H and P phrases'
    end

    # Return the value string for a given key from a compliance array, or ''.
    def self.compliance_value(compliance, key)
      compliance.find { |c| c['key'] == key }&.fetch('value', '').to_s
    end

    private_class_method :compliance_value

    def self.chem_properties_alfa(properties)
      chemical_properties = {}
      properties.each_with_index do |property, index|
        property_name = property.tr(' ', '_').downcase
        chemical_properties[property_name] = properties[index + 1] unless index.odd?
      end
      chemical_properties
    end

    def self.chemical_properties_alfa(product_link)
      safe_url = validate_url_for_request!(product_link)
      alfa_req = HTTParty.get(safe_url, request_options)
      properties = Nokogiri::HTML.parse(alfa_req.body).xpath("//*[contains(@id, 'product')]").search('div.col-md-12')
                                 .search('div.col-md-3').text.delete("\t").split("\n\n")
      chem_properties_alfa(properties)
    rescue StandardError
      'Could not find additional chemical properties'
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
      safe_url = validate_url_for_request!(product_link)
      product = fetch_product_from_apollo(safe_url)
      raise StandardError, 'Product not found in Apollo state' unless product

      (product['attributes'] || []).each_with_object({}) do |attr, result|
        property_name = clean_property_name(attr['label'])
        next unless property_name

        raw_value = Array(attr['values']).join(', ')
        cleaned_value = Nokogiri::HTML.fragment(CGI.unescapeHTML(raw_value)).text.strip
        result[property_name] = cleaned_value unless cleaned_value.empty?
      end
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
  # rubocop:enable Metrics/ClassLength
end
