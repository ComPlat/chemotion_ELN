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
      product_number = (merck_request(name)[15, merck_request(name).length]).split('/')[1]
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

    def self.write_file(file_path, link)
      options = request_options.dup
      options[:headers]['Origin'] = 'https://www.sigmaaldrich.com'
      req_safety_sheet = HTTParty.get(link, options)
      file_name = "public/safety_sheets/#{file_path}"
      if req_safety_sheet.headers['Content-Type'] == 'application/pdf'
        File.binwrite(file_name, req_safety_sheet)
        true
      else
        'there is no file to save'
      end
    rescue HTTParty::RedirectionTooDeep => e
      "Redirection limit exceeded: #{e}"
    rescue HTTParty::TimeoutError => e
      "Request timed out: #{e}"
    end

    def self.create_sds_file(file_path, link)
      write_file(file_path, link)
      sleep 1
    rescue StandardError
      'could not save safety data sheet'
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

      # Handle cases like "mp (schmelzpunkt)" or "bp (siedepunkt)"
      if property_name.include?('(')
        main_term = property_name.split('(').first.strip
        german_term = property_name.match(/\((.*?)\)/).try(:[], 1).to_s.downcase

        return PROPERTY_ABBREVIATIONS[main_term] if PROPERTY_ABBREVIATIONS[main_term]

        return MAP_GERMAN_TO_ENGLISH_PROPERTIES[german_term] if MAP_GERMAN_TO_ENGLISH_PROPERTIES[german_term]
      end
      MAP_GERMAN_TO_ENGLISH_PROPERTIES[property_name] || property_name
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
    rescue StandardError => e
      'Could not find additional chemical properties'
    end

    def self.handle_exceptions
      yield
    rescue ActiveRecord::StatementInvalid, ActiveRecord::RecordInvalid => e
      error!({ error: e.message }, 422)
    rescue JSON::ParserError
      error!({ error: 'Invalid JSON data' }, 400)
    rescue StandardError => e
      Rails.logger.error("Error: #{e.message}")
    end
  end
end
