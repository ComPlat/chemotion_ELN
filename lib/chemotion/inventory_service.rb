# frozen_string_literal: true

module Chemotion::InventoryService
  def self.merck(name, language)
    # PostmanRuntime/7.28.4 can be used as user agent in case current one gets blocked
    options = { headers: {
      'Access-Control-Request-Method' => 'GET',
      'Accept' => '*/*',
      'User-Agent': 'Google Chrome'
    } }
    begin
      merck_res = HTTParty.get("https://www.sigmaaldrich.com/DE/en/search/#{name}?focus=products&page=1&perpage=30&sort=relevance&term=#{name}&type=product=", options)
      # product_number = Nokogiri::HTML.parse(merck_req.body).xpath("//*[contains(@class, 'MuiTableContainer-root')]").children[0].children[1].children[2].children[1].children[0].attributes['href'].value
      product_number_string = Nokogiri::HTML.parse(merck_res.body).xpath("//*[contains(@class, 'MuiTableBody-root')]").children[0].children[2].children[0].attributes['href'].value
      product_number = (product_number_string[15, product_number_string.length]).split('/')[1]
      merck_link = "https://www.sigmaaldrich.com/DE/#{language}/sds/#{product_number_string[15, product_number_string.length]}"
      merck_info = { 'merck_link' => merck_link, 'merck_product_number' => product_number, 'merck_product_link' => "https://www.sigmaaldrich.com/#{product_number_string}"}
      return merck_info
    rescue
      err_body = 'Could not find safety data sheet'
      err_body
    end
  end

  def self.alfa(name, language)
    options = { headers: {
      'Access-Control-Request-Method' => 'GET',
      'Accept' => '*/*',
      'User-Agent': 'Mozilla'
    }}

    if language == 'en'
      lan = 'EE'
    elsif language == 'de'
      lan = 'DE'
    elsif language == 'fr'
      lan = 'FR'
    end
    begin
      alfa_req = HTTParty.get("https://www.alfa.com/en/search/?q=#{name}", options)
      product_number = Nokogiri::HTML.parse(alfa_req.body).xpath("//*[@class=\"#{'search-result-number'}\"]").at_css('span').children.text
      alfa_link = "https://www.alfa.com/en/msds/?language=#{lan}&subformat=CLP1&sku=#{product_number}"
      alfa_info = { 'alfa_link' => alfa_link, 'alfa_product_number' => product_number, 'alfa_product_link' => "https://www.alfa.com/en/catalog/#{product_number}" }
      return alfa_info
    rescue
      err_body = 'Could not find safety data sheet'
      err_body
    end
  end

  def self.check_if_ssd_already_saved(file_name)
    ssd_files_names = Dir.children('public/safety_sheets')
    if ssd_files_names.length.zero?
      return false
    else
      saved = false
      for file in ssd_files_names.reverse do
        if file == file_name
          saved = true
          break
        end
      end
      return saved
    end
  end

  def self.create_sds_file(vendor, link, product_number)
    options = { headers: {
      'Access-Control-Request-Method' => 'GET',
      'Accept' => '*/*',
      'User-Agent': 'Google Chrome'
    } }
    begin
      file_name = "#{product_number}_#{vendor}.pdf"
      if check_if_ssd_already_saved(file_name) == false
        req_ssd = HTTParty.get(link, options)
        if req_ssd.headers['Content-Type'] == 'application/pdf'
          File.open(Rails.root.join('public/safety_sheets', file_name), 'wb') do |file|
            file.write(req_ssd)
          end
          true
        else
          'there is no file to save'
        end
      else
        return 'file is already saved'
      end
    rescue
      err_body = 'could not save safety data sheet'
      err_body
    end
  end

  def self.safety_phrases_thermofischer(product_number)
    options = { headers: {
      'Access-Control-Request-Method' => 'GET',
      'Accept' => '*/*',
      'User-Agent': 'Mozilla'
    }}
    begin
      alfa_req = HTTParty.get("https://www.alfa.com/en/catalog/#{product_number}/", options)
      health_section = Nokogiri::HTML.parse(alfa_req.body).xpath("//*[contains(@id, 'health')]").children[1].children[1].children[1]
      h_phrases = health_section.children[5].text.gsub(/\t|\n|Hazard Statements:/, '')
      p_phrases = health_section.children[11].text.gsub(/\t|\n|Precautionary Statements:/, '')

      p_array = p_phrases.split(/-/)
      h_array = h_phrases.split(/-/)

      h_statements = {}
      h_phrases_hash = JSON.parse(File.read('./public/json/hazardPhrases.json'))
      p_phrases_hash = JSON.parse(File.read('./public/json/precautionaryPhrases.json'))
      pictograms_hash = JSON.parse(File.read('./public/json/pictograms.json'))
      h_array.each do |element|
        h_phrases_hash.map { |k, v| k == element ? h_statements[k] = v : nil }
      end
      p_statements = {}
      p_array.each do |element|
        p_phrases_hash.map { |k, v| k == element ? p_statements[k] = v : nil }
      end
      pictograms = health_section.css('img').map { |e| e.attributes['src'].value.gsub('/static//images/pictogram/', '') }
      pictograms_signs = pictograms.map { |e| pictograms_hash[e]? pictograms_hash[e] : nil }.compact
      # pictograms_signs = []
      { 'h_statements' => h_statements, 'p_statements' => p_statements, 'pictograms' => pictograms_signs }
    rescue
      err_body = 'Could not find H and P phrases'
      err_body
    end
  end

  def self.safety_phrases_merck(product_link)
    options = { headers: {
      'Access-Control-Request-Method' => 'GET',
      'Accept' => '*/*',
      'User-Agent': 'Google Chrome'
    }}
    begin
      merck_req = HTTParty.get(product_link, options)
      safety_section = Nokogiri::HTML.parse(merck_req.body).xpath("//*[contains(@class, 'MuiTypography-root MuiLink-root MuiLink-underlineNone MuiTypography-colorPrimary')]")
      h_statements = {}
      p_statements = {}
      safety_array = safety_section.children.reject { |i| i.text.empty? }.map(&:text)
      h_array = safety_array[1].split(/ - /)

      h_phrases_hash = JSON.parse(File.read('./public/json/hazardPhrases.json'))
      p_phrases_hash = JSON.parse(File.read('./public/json/precautionaryPhrases.json'))
      h_array.each do |element|
        h_phrases_hash.map { |k, v| k == element ? h_statements[k] = v : nil }
      end
      p_array = safety_array[2].split(/ - /)
      p_array.each do |element|
        p_phrases_hash.map { |k, v| k == element ? p_statements[k] = v : nil }
      end
      pictograms = safety_array[0].split(/,/)
      { 'h_statements' => h_statements, 'p_statements' => p_statements, 'pictograms' => pictograms }
    rescue
      err_body = 'Could not find H and P phrases'
      err_body
    end
  end

  def self.chemical_properties_alfa(product_link)
    options = { headers: {
      'Access-Control-Request-Method' => 'GET',
      'Accept' => '*/*',
      'User-Agent': 'Mozilla'
    }}
    begin
      alfa_req = HTTParty.get(product_link, options)
      properties = Nokogiri::HTML.parse(alfa_req.body).xpath("//*[contains(@id, 'product')]").search('div.col-md-12').search('div.col-md-3').text.gsub(/\t/, '').split(/\n\n/)

      chemical_properties = {}
      properties.each_with_index do |property, index|
        property_name = property.gsub(' ', '_').downcase
        chemical_properties[property_name] = properties[index + 1] unless index.odd?
      end
      chemical_properties
    rescue
      err_body = 'Could not find additional chemical properties'
      err_body
    end
  end

  def self.chemical_properties_merck(product_link)
    options = { headers: {
      'Access-Control-Request-Method' => 'GET',
      'Accept' => '*/*',
      'User-Agent': 'Google Chrome'
    }}
    begin
      merck_req = HTTParty.get(product_link, options)
      properties = Nokogiri::HTML.parse(merck_req.body).xpath("//*[contains(@class, 'MuiGrid-root MuiGrid-item MuiGrid-grid-xs-12 MuiGrid-grid-md-9')]")
      chem_properties_names = properties.search('div.MuiGrid-grid-sm-3').css('span').map(&:text).map { |str| str.gsub(' ', '_').downcase }
      chem_properties_values = properties.search('p.MuiTypography-root').map(&:text)
      chem_properties_values.pop
      chemical_properties = {}
      chem_properties_names.map.with_index { |string, index|
        property_name = if string == 'mp'
                          'melting_point'
                        elsif string == 'bp'
                          'boiling_point'
                        else
                          string
                        end
        chemical_properties[property_name] = chem_properties_values[index]
      }
      chemical_properties
    rescue
      err_body = 'Could not find additional chemical properties'
      err_body
    end
  end
end
