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

    # Sheets per sample. Cf. MAX_SAVED_SDS in ChemicalTab.js, which refuses first; this is
    # the backstop for any client that does not.
    MAX_SAVED_SDS = 5

    # Sigma brand keys as they appear in catalogue URLs, most-preferred catalogue line first.
    SDS_VENDOR = 'Sigma-Aldrich'
    FISHER_VENDORS = ['Thermo Fisher Scientific', 'Fisher Chemical'].freeze
    # Fisher partitions this endpoint by catalogue availability, so the country code is pinned
    # to the one the part numbers below were verified against.
    FISHER_SDS_URL = 'https://www.fishersci.com/store/msds?partNumber=%<part_number>s' \
                     '&productDescription=&language=EN&countryCode=US'
    # Alfa-lineage sheets come from DirectWebViewer, which unlike the Fisher catalogue
    # serves the requested language.
    THERMO_SDS_URL = 'https://documents.thermofisher.com/directwebviewer/private/results.aspx' \
                     '?page=NewSearch&LANGUAGE=d__%<language>s&SUBFORMAT=d__CLP1' \
                     '&SKU=%<sku>s&PLANT=d__ALF'
    THERMO_LANGUAGES = { 'en' => 'EN', 'de' => 'DE', 'fr' => 'FR' }.freeze

    # PubChem lists 30 to 50 vendors per compound, most of them building-block houses
    # a European lab will not order from. Only these are surfaced; the rest stay one
    # click away on PubChem itself.
    CURATED_VENDORS = ['abcr GmbH', 'TCI (Tokyo Chemical Industry)', 'LGC Standards',
                       'Glentham Life Sciences Ltd.', 'Fluorochem', 'CymitQuimica'].freeze
    PUBCHEM_VENDOR_URL = 'https://pubchem.ncbi.nlm.nih.gov/compound/%<cid>s#section=Chemical-Vendors'
    MERCK_BRAND_PRIORITY = %w[sigald sial aldrich sigma supelco vetec saj usp cerillian].freeze
    MERCK_PRODUCT_URL_RE = %r{sigmaaldrich\.com/catalog/product/([a-z0-9]+)/([a-z0-9\-_.]+)}i.freeze
    ALLOWED_DOMAINS = %w[sigmaaldrich.com fishersci.com thermofisher.com].freeze

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

    private_class_method :validate_url_for_request!,
                         :allowed_host?

    def self.merck(name, language, wanted_number = nil)
      brand, product_number = merck_product_from_pubchem(name, wanted_number)
      raise StandardError, 'No Sigma-Aldrich catalogue entry found' unless brand

      validate_product_number!(product_number)
      merck_product_entry(brand, product_number, language)
    rescue StandardError
      'Could not find safety data sheet from Merck'
    end

    def self.merck_product_entry(brand, product_number, language)
      path = "#{brand}/#{product_number}"
      { 'merck_link' => "https://www.sigmaaldrich.com/DE/#{language}/sds/#{path}",
        'merck_product_number' => product_number,
        'merck_product_link' => "https://www.sigmaaldrich.com/DE/de/product/#{path}",
        'save_mode' => vendor_save_mode(SDS_VENDOR),
        'save_modes' => vendor_save_modes(SDS_VENDOR) }
    end

    # Form-encoded params arrive with the sheet list rebuilt as an index-keyed Hash, so
    # both shapes count.
    def self.sds_limit_reached?(chemical_data)
      first = chemical_data.is_a?(Array) ? chemical_data[0] : nil
      return false unless first.is_a?(Hash)

      sheets = first['safetySheetPath'] || first[:safetySheetPath]
      sheets.is_a?(Enumerable) && sheets.count >= MAX_SAVED_SDS
    end

    # Every route that can reach a sheet, preferred one first: Sigma refuses the server but
    # serves a cross-origin browser read, Fisher the reverse. Empty means no save is offered.
    def self.vendor_save_modes(vendor)
      return %w[browser server] if vendor.casecmp?(SDS_VENDOR)
      return %w[server browser] if FISHER_VENDORS.any? { |name| vendor.casecmp?(name) }

      []
    end

    # The preferred route alone, for stored rows and clients that read a single mode.
    def self.vendor_save_mode(vendor)
      vendor_save_modes(vendor).first || 'none'
    end

    # Sigma's own search rejects automated clients, so the catalogue entry comes from
    # PubChem's Chemical Vendors list. Returns [brand, product_number] or nil.
    def self.merck_product_from_pubchem(name, product_number = nil)
      cid = PubChem.get_cid_from_identifier(name)
      return nil unless cid

      candidates = merck_candidates(PubChem.get_vendor_sources_from_cid(cid))
      wanted = normalize_product_number(product_number)
      candidates = candidates.select { |_, number| normalize_product_number(number) == wanted } if wanted.present?

      candidates.min_by { |c| merck_rank(*c) }
    end

    def self.merck_candidates(sources)
      sources.filter_map do |source|
        next unless source[:SourceName].to_s.casecmp?(SDS_VENDOR)

        match = MERCK_PRODUCT_URL_RE.match(source[:SourceRecordURL].to_s)
        [match[1].downcase, match[2].downcase] if match
      end
    end

    def self.merck_rank(brand, number)
      [MERCK_BRAND_PRIORITY.index(brand) || MERCK_BRAND_PRIORITY.size, number]
    end

    # One entry per vendor for the "All vendors" view, Sigma-Aldrich first because it
    # is the only vendor whose SDS URL can be derived.
    def self.vendor_groups(name, language)
      cid = PubChem.get_cid_from_identifier(name)
      return [] unless cid

      grouped_vendor_sources(PubChem.get_vendor_sources_from_cid(cid), language)
    end

    def self.grouped_vendor_sources(sources, language)
      sources.group_by { |source| source[:SourceName].to_s }
             .filter_map { |vendor, group| vendor_group(vendor, group, language) }
             .sort_by { |group| [vendor_rank(group), -group['count']] }
    end

    # Splits the curated vendors into the ones we can fetch a sheet from and the ones that
    # only have a catalogue page, and points at PubChem for the full list.
    def self.vendor_overview(name, language, product_number = nil)
      cid = PubChem.get_cid_from_identifier(name)
      return { 'sds_vendors' => [], 'catalogue_vendors' => [], 'vendor_count' => 0 } unless cid

      groups = grouped_vendor_sources(PubChem.get_vendor_sources_from_cid(cid), language)
      shown = filter_by_product_number(curated_groups(groups), product_number)
      sds, catalogue = shown.partition { |group| group['sds_supported'] }
      { 'sds_vendors' => sds, 'catalogue_vendors' => catalogue, 'vendor_count' => groups.size,
        'pubchem_url' => format(PUBCHEM_VENDOR_URL, cid: cid) }
    end

    # Narrows the listing to the catalogue number the user already knows, so one row comes
    # back instead of every product the vendor sells. Vendors left with nothing drop out.
    def self.filter_by_product_number(groups, product_number)
      wanted = normalize_product_number(product_number)
      return groups if wanted.blank?

      groups.filter_map do |group|
        products = group['products'].select { |product| product_number_match?(product, wanted) }
        next if products.empty?

        group.merge('products' => products, 'count' => products.size)
      end
    end

    def self.normalize_product_number(value)
      value.to_s.strip.downcase.delete('-_. ')
    end

    # Fisher prefixes its catalogue codes (AC..., ALFAA...), so an edge match counts.
    def self.product_number_match?(product, wanted)
      numbers = product.keys.grep(/_product_number\z/).map { |key| product[key] }
      (numbers << product['label']).compact.any? do |value|
        candidate = normalize_product_number(value)
        candidate == wanted || candidate.start_with?(wanted) || candidate.end_with?(wanted)
      end
    end

    def self.curated_groups(groups)
      groups.select do |group|
        group['sds_supported'] || CURATED_VENDORS.any? { |name| group['vendor'].casecmp?(name) }
      end
    end

    # Sigma-Aldrich leads as the ELN's primary vendor, then the other vendors whose SDS
    # can be fetched, then catalogue-only ones.
    def self.vendor_rank(group)
      return 0 if group['vendor'].casecmp?(SDS_VENDOR)

      group['sds_supported'] ? 1 : 2
    end

    def self.vendor_group(vendor, sources, language)
      return nil if vendor.empty?

      products, sds_supported = vendor_products(vendor, sources, language)
      return nil if products.empty?

      { 'vendor' => vendor, 'count' => products.size, 'sds_supported' => sds_supported,
        'save_mode' => sds_supported ? vendor_save_mode(vendor) : 'none',
        'save_modes' => sds_supported ? vendor_save_modes(vendor) : [], 'products' => products }
    end

    def self.vendor_products(vendor, sources, language)
      return [merck_products(sources, language), true] if vendor.casecmp?(SDS_VENDOR)

      if FISHER_VENDORS.any? { |name| vendor.casecmp?(name) }
        fisher = fisher_products(sources, language)
        return [fisher, true] if fisher.any? { |product| product['fisher_link'] }
      end

      [other_vendor_products(sources), false]
    end

    # Returns [part_number, sds_url]. A Fisher Chemical RegistryID is a catalogue number
    # already; Thermo codes are all-numeric (Acros, US catalogue only) or dotted (Alfa).
    def self.fisher_sds(source, language)
      registry = source[:RegistryID].to_s
      if registry.present? && !registry.start_with?('GID_') && registry.match?(/\A[A-Za-z0-9]+\z/)
        return [registry, format(FISHER_SDS_URL, part_number: registry)]
      end

      code = url_last_segment(source[:SourceRecordURL].to_s).to_s
      return ["AC#{code}", format(FISHER_SDS_URL, part_number: "AC#{code}")] if code.match?(/\A\d+\z/)

      alfa_sds(code, language)
    end

    # Only a letter-prefixed dotted code resolves; the dotted suffix is a pack size.
    def self.alfa_sds(code, language)
      base = code[/\A([A-Za-z][A-Za-z0-9]*)\./, 1]
      return nil unless base

      sku = "ALFAA#{base.upcase}"
      [sku, format(THERMO_SDS_URL, language: THERMO_LANGUAGES.fetch(language, 'EN'), sku: sku)]
    end

    def self.fisher_products(sources, language)
      sources.filter_map { |source| fisher_product(source, language) }
             .uniq { |product| product['fisher_product_number'] || product['product_link'] }
    end

    def self.fisher_product(source, language)
      url = source[:SourceRecordURL].to_s
      part_number, sds_url = fisher_sds(source, language)
      return { 'label' => vendor_product_label(source, url), 'product_link' => url } if part_number.blank?

      product = { 'fisher_link' => sds_url, 'fisher_product_number' => part_number,
                  'save_mode' => vendor_save_mode(FISHER_VENDORS.first),
                  'save_modes' => vendor_save_modes(FISHER_VENDORS.first) }
      product['fisher_product_link'] = url if url.present?
      product
    end

    def self.url_last_segment(url)
      return nil if url.blank?

      URI.parse(url).path.to_s.split('/').reject(&:empty?).last
    rescue URI::InvalidURIError
      nil
    end

    def self.merck_products(sources, language)
      merck_candidates(sources).uniq.sort_by { |c| merck_rank(*c) }
                               .map { |brand, number| merck_product_entry(brand, number, language) }
    end

    def self.other_vendor_products(sources)
      sources.filter_map do |source|
        url = source[:SourceRecordURL].to_s
        next if url.empty?

        { 'label' => vendor_product_label(source, url), 'product_link' => url }
      end
    end

    # RegistryID is the vendor's catalogue number unless PubChem assigned an internal GID.
    def self.vendor_product_label(source, url)
      registry = source[:RegistryID].to_s
      return registry unless registry.empty? || registry.start_with?('GID_')

      url_last_segment(url) || url
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

    # Cf. .merck: the vendor's own search is unreachable from the server, so the catalogue
    # entry is resolved through PubChem and the SDS URL built from it. alfa.com is off the
    # allowlist, which is why .alfa can only ever return its failure string.
    def self.thermofisher(name, language, product_number = nil)
      cid = PubChem.get_cid_from_identifier(name)
      raise StandardError, 'No PubChem CID for this name' unless cid

      wanted = normalize_product_number(product_number)
      product = fisher_products(fisher_candidates(PubChem.get_vendor_sources_from_cid(cid)), language)
                .select { |candidate| candidate['fisher_link'] }
                .find { |candidate| wanted.blank? || product_number_match?(candidate, wanted) }
      raise StandardError, 'No Thermofisher catalogue entry found' unless product

      product
    rescue StandardError
      'Could not find safety data sheet from Thermofisher'
    end

    def self.fisher_candidates(sources)
      sources.select do |source|
        FISHER_VENDORS.any? { |vendor| source[:SourceName].to_s.casecmp?(vendor) }
      end
    end

    def self.write_file(file_path, file = nil, link = nil)
      full_file_path = "public#{file_path}"

      # Ensure parent directory exists
      FileUtils.mkdir_p(File.dirname(full_file_path))

      # Grape hands the upload over with symbol keys, so both spellings have to be accepted.
      upload = file.is_a?(Hash) ? (file[:tempfile] || file['tempfile']) : nil
      if upload.respond_to?(:read)
        upload.rewind if upload.respond_to?(:rewind)
        File.binwrite(full_file_path, upload.read)
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
        # Only true means bytes landed; an error Hash is truthy and would hash the empty tempfile.
        return result unless result == true

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

    # Every redirect hop is re-validated, so a whitelisted host cannot forward us off-allowlist.
    def self.fetch_allowed_url(url, limit: 3)
      safe_url = validate_url_for_request!(url)
      options = request_options.dup
      origin = URI.parse(safe_url)
      options[:headers]['Origin'] = "#{origin.scheme}://#{origin.host}"
      response = HTTParty.get(safe_url, options)
      location = response.headers['Location']
      return response if location.blank? || !limit.positive?
      return response unless response.code.to_i.between?(300, 399)

      fetch_allowed_url(URI.join(safe_url, location).to_s, limit: limit - 1)
    end

    def self.request_pdf_file(link, file_path)
      req_safety_sheet = fetch_allowed_url(link)
      # Vendors append a charset to the PDF content type, so this cannot be an equality test.
      if req_safety_sheet.headers['Content-Type'].to_s.start_with?('application/pdf')
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
