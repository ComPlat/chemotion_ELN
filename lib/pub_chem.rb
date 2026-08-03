require 'resolv-replace'

# rubocop:disable Metrics/ModuleLength
module PubChem
  include HTTParty

  # debug_output $stderr
  PUBCHEM_HOST = 'pubchem.ncbi.nlm.nih.gov'

  def self.http_s
    (Rails.env.test? && 'http://') || 'https://'
  end

  def self.get_record_from_molfile(molfile)
    @auth = { username: '', password: '' }
    options = { timeout: 10, headers: { 'Content-Type' => 'application/x-www-form-urlencoded' },
                body: { 'sdf' => molfile } }

    HTTParty.post(http_s + PUBCHEM_HOST + '/rest/pug/compound/sdf/record/JSON', options)
  rescue StandardError => e
    Rails.logger.error ["with molfile: #{molfile}", e.message, *e.backtrace].join($INPUT_RECORD_SEPARATOR)
    nil
  end

  # @param timeout [Numeric] seconds allowed for the connect and for the read *separately*
  #   (HTTParty's single +timeout:+ sets both, so a caller wanting a tight bound would otherwise
  #   get up to twice what it asked for). Callers on a request path pass a low value and treat a
  #   miss as "no data" — see {Molecule#enrich_from_pubchem}.
  #
  #   NB it does not bound name resolution: +require 'resolv-replace'+ at the top of this file
  #   routes DNS through pure-Ruby Resolv, whose own per-nameserver timeouts and retries run
  #   before the connect timeout starts. A slow or flapping resolver can therefore overrun the
  #   requested bound.
  # @return [HTTParty::Response, nil] nil on any failure, including a timeout
  def self.get_record_from_inchikey(inchikey, timeout: 10)
    fetch_record_from_inchikey(inchikey, timeout: timeout).first
  end

  # Same fetch, but says *why* it came back empty.
  #
  # +get_record_from_inchikey+ collapses a 404, a timeout, a DNS failure and a 500 all to nil,
  # so a caller cannot tell "PubChem has no record for this structure" — a permanent fact about
  # an in-house compound — from "we failed to ask", which is transient. Only the former is safe
  # to remember; caching the latter would strand the molecule unenriched for good.
  #
  # @return [Array(HTTParty::Response, Symbol), Array(nil, Symbol)] +[record, outcome]+ where
  #   outcome is +:ok+, +:not_found+ (PubChem answered, and has nothing), or +:unavailable+
  #   (we could not get an answer — transport failure, timeout, or a server-side error)
  def self.fetch_record_from_inchikey(inchikey, timeout: 10)
    @auth = { username: '', password: '' }
    options = { open_timeout: timeout, read_timeout: timeout,
                headers: { 'Content-Type' => 'text/json' } }
    response = HTTParty.get(
      "#{http_s}#{PUBCHEM_HOST}/rest/pug/compound/inchikey/#{inchikey}/record/JSON",
      options,
    )
    return [response, :ok] if response.success?
    # Only 404 is PubChem answering "there is no such compound". The rest of the 4xx range is
    # about *us*, not the structure: PubChem returns 403 to an IP over its request-volume
    # policy and 429 under dynamic throttling, and treating either as :not_found would let one
    # throttling episode stamp pubchem_checked_at on a whole chunk of molecules it does have
    # records for — blacklisting them for PUBCHEM_MISS_TTL. 5xx is PubChem failing to answer.
    return [nil, :not_found] if response.code.to_i == 404

    [nil, :unavailable]
  rescue StandardError => e
    Rails.logger.error ["with inchikey: #{inchikey}", e.message, *e.backtrace].join($INPUT_RECORD_SEPARATOR)
    [nil, :unavailable]
  end

  def self.get_cids_from_inchikeys(inchikeys)
    options = {
      timeout: 10,
      headers: { 'Content-Type' => 'application/x-www-form-urlencoded' },
      body: { 'inchikey' => "#{inchikeys.join(',')}" },
    }
    HTTParty.post(http_s + PUBCHEM_HOST + '/rest/pug/compound/inchikey/property/InChIKey/JSON', options).body
  rescue StandardError => e
    Rails.logger.error ["with inchikey: #{inchikeys}", e.message, *e.backtrace].join($INPUT_RECORD_SEPARATOR)
    nil
  end

  def self.get_molfile_by_inchikey(inchikey)
    @auth = { username: '', password: '' }
    options = { timeout: 10, headers: { 'Content-Type' => 'text/json' } }

    HTTParty.get(http_s + PUBCHEM_HOST + '/rest/pug/compound/inchikey/' + inchikey + '/record/SDF', options).body
  rescue StandardError => e
    Rails.logger.error ["with inchikey: #{inchikey}", e.message, *e.backtrace].join($INPUT_RECORD_SEPARATOR)
    nil
  end

  def self.get_molfiles_by_inchikeys(inchikeys)
    options = {
      timeout: 10,
      headers: { 'Content-Type' => 'application/x-www-form-urlencoded' },
      body: { 'inchikey' => "#{inchikeys.join(',')}" },
    }
    HTTParty.post(http_s + '/rest/pug/compound/inchikey/record/SDF', options).body
  rescue StandardError => e
    Rails.logger.error "[PubChemError] of [get_molfiles_by_inchikeys] with inchikey [#{inchikeys}], exception [#{e.backtrace}]"
    nil
  end

  def self.get_molfile_by_smiles(smiles)
    @auth = { username: '', password: '' }
    options = { timeout: 10, headers: { 'Content-Type' => 'text/json' } }
    encoded_smiles = URI::DEFAULT_PARSER.escape(smiles, '[]/()+-.@#=\\')
    response = HTTParty.get(http_s + PUBCHEM_HOST + '/rest/pug/compound/smiles/' + encoded_smiles + '/record/SDF', options)
    return nil unless response.success?

    response.body
  rescue StandardError => e
    Rails.logger.error ["with smiles: #{smiles}", e.message, *e.backtrace].join($INPUT_RECORD_SEPARATOR)
    nil
  end

  def self.get_xref_by_inchikey(inchikey)
    @auth = { username: '', password: '' }
    options = { timeout: 10, headers: { 'Content-Type' => 'text/json' } }

    HTTParty.get(http_s + PUBCHEM_HOST + '/rest/pug/compound/inchikey/' + inchikey + '/xrefs/RN/JSON', options).body
  rescue StandardError => e
    Rails.logger.error ["with inchikey: #{inchikey}", e.message, *e.backtrace].join($INPUT_RECORD_SEPARATOR)
    nil
  end

  # @param cid [String] the cid to be converted
  # @note cid can be a multiple line string with each line containing a cid
  #   However, only the last cid will be used
  # @return [Array<String>] the cas number(s) of the cid
  def self.get_cas_from_cid(cid)
    return [] if cid.blank?

    cid = cid.to_s.split(/\s+|,/).compact_blank.last
    options = { timeout: 10, headers: { 'Content-Type' => 'text/json' } }
    page = "https://#{PUBCHEM_HOST}/rest/pug_view/data/compound/#{cid}/XML?heading=CAS"
    resp = HTTParty.get(page, options)
    return [] unless resp.success?

    resp_xml = resp.body
    resp_doc = Nokogiri::XML(resp_xml)
    cas_values = resp_doc.css('Value').css('StringWithMarkup').css('String').map(&:text).flatten
    cas = most_occurance(cas_values)
    [cas]
  end

  def self.get_smiles_from_identifier(identifier)
    return nil unless valid_identifier?(identifier)

    fetch_smiles_from_pubchem(identifier.strip)
  rescue StandardError => e
    Rails.logger.error ["with identifier: #{identifier}", e.message, *e.backtrace].join($INPUT_RECORD_SEPARATOR)
    nil
  end

  def self.valid_identifier?(identifier)
    identifier.is_a?(String) && !identifier.strip.empty?
  end

  def self.fetch_smiles_from_pubchem(identifier)
    url = build_smiles_url(identifier)
    options = { timeout: 10, headers: { 'Content-Type' => 'application/json' } }

    resp = HTTParty.get(url, options)
    return nil unless resp.success?

    parse_smiles_response(resp.body)
  end

  def self.build_smiles_url(identifier)
    encoded_id = URI.encode_www_form_component(identifier)
    properties = 'IsomericSMILES,CanonicalSMILES,SMILES,ConnectivitySMILES'
    "#{http_s}#{PUBCHEM_HOST}/rest/pug/compound/name/#{encoded_id}/property/#{properties}/JSON"
  end

  def self.parse_smiles_response(response_body)
    result = JSON.parse(response_body)
    return nil if fault_response?(result)

    extract_smiles_property(result)
  end

  def self.fault_response?(result)
    return false unless result['Fault']

    Rails.logger.warn "PubChem API error: #{result['Fault']['Code']} - #{result['Fault']['Message']}"
    true
  end

  def self.extract_smiles_property(result)
    props = result.dig('PropertyTable', 'Properties', 0)
    return nil unless props.is_a?(Hash)

    props['IsomericSMILES'] || props['CanonicalSMILES'] || props['SMILES'] || props['ConnectivitySMILES']
  end

  # @param cid [Integer, String, nil] PubChem compound id; anything not wholly numeric is
  #   rejected rather than interpolated into the URL. Coerced rather than type-checked because
  #   the cid arrives from +element_tags.taggable_data+, where a value written as a JSON string
  #   deserialises to a String — under the old +is_a? Integer+ guard that silently disabled LCSS
  #   for the molecule, with nothing to show for it.
  # @return [Hash, nil] parsed GHS classification, or nil when there is none or the fetch fails
  def self.get_lcss_from_cid(cid)
    cid = Integer(cid, exception: false) unless cid.is_a?(Integer)
    return nil unless cid

    options = { timeout: 10, headers: { 'Content-Type' => 'text/json' }, format: 'plain' }
    page = "https://#{PUBCHEM_HOST}/rest/pug_view/data/compound/#{cid}/JSON?heading=GHS%20Classification"
    begin
      resp = HTTParty.get(page, options)
      return nil unless resp.success?

      JSON.parse resp, symbolize_names: true
    rescue StandardError => e
      Rails.logger.error ["with cid: #{cid}", e.message, *e.backtrace].join($INPUT_RECORD_SEPARATOR)
      nil
    end
  end

  FTP_PATH = 'ftp.ncbi.nlm.nih.gov'

  # return list of week directory names
  def self.update_list(type = 'Weekly')
    dir_path = ftp_update_dir(type: type)
    ftp = Net::FTP.new
    ftp.connect(FTP_PATH)
    ftp.login
    ftp.chdir(dir_path)
    dirname_list = ftp.list.map { |entry| entry.split(/\s+/)[-1] }
    ftp.close
    dirname_list
  end

  def self.date_select(date, date_list)
    date = Date.parse(date) unless date.is_a?(Date)
    date_list.select { |d|  d =~ /\d{4}-\d{1,2}-\d{1,2}/ && Date.parse(d) > date }
  end

  def self.sdf_file_list(date, type = 'Weekly')
    dir_path = ftp_update_dir(date: date, type: type)
    ftp = Net::FTP.new
    ftp.connect(FTP_PATH)
    ftp.login
    ftp.chdir(dir_path)
    dirname_list = ftp.list('Compound*').map { |entry| entry.split(/\s+/)[-1] }
    ftp.close
    dirname_list
  end

  # compose the ftp directory
  def self.ftp_update_dir(type: 'Weekly', date: nil)
    return "/pubchem/Compound/#{type}/" unless date.present?

    date = date.strftime('%Y-%m-%d') if date.is_a?(Date)
    "/pubchem/Compound/#{type}/#{date}/SDF/"
  end

  # download an update sdf file given a path into a tempfile
  def self.dowload_sdf_update_files(remotefile_path)
    tf = Tempfile.new
    tf.binmode
    ftp = Net::FTP.new
    ftp.connect(FTP_PATH)
    ftp.login
    begin
      ftp.getbinaryfile(remotefile_path) { |data| tf.write data }
    ensure
      ftp.close
    end
    tf.rewind
    tf
  end

  def self.ungzip(tempfile)
    tf = Tempfile.new
    Zlib::GzipReader.open(tempfile.path) { |gz| tf.write(gz.read) }
    tf.rewind
    tempfile.close if tempfile.respond_to?(:close)
    tempfile.unlink if tempfile.respond_to?(:unlink)
    tf
  end

  def self.sdf_to_hash(tempfile)
    tempfile.rewind
    results = {}
    IO.foreach(tempfile.path, "$$$$\n") do |molfile|
      lines = molfile.lines
      previous_line = ''
      names = {}
      cid = nil
      ink = nil
      lines.each.with_index do |line, _i|
        cid = line.strip if />\s+<PUBCHEM_COMPOUND_CID>/.match?(previous_line)
        ink = line.strip if />\s+<PUBCHEM_IUPAC_INCHIKEY>/.match?(previous_line)
        names[::Regexp.last_match(1)] = line.strip if />\s+<PUBCHEM_IUPAC_(\w+)_NAME>/.match?(previous_line)
        previous_line = line
      end
      results[ink] = { 'cid' => cid, 'names' => names }
    end
    results
  end

  private

  def self.most_occurance(arr)
    arr.group_by(&:to_s).values.max_by(&:size).try(:first)
  end
end
# rubocop:enable Metrics/ModuleLength
