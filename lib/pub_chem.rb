module PubChem
  include HTTParty

  #debug_output $stderr
  PUBCHEM_HOST = 'pubchem.ncbi.nlm.nih.gov'

  def self.http_s
    Rails.env.test? && "http://" || "https://"
  end

  def self.faraday_conn
    Faraday.new(:url => http_s + PUBCHEM_HOST) do |faraday|
      # faraday.use FaradayMiddleware::FollowRedirects
      # faraday.request  :url_encoded
      # faraday.response :logger , ::Logger.new(STDOUT), bodies: true
      faraday.adapter  :net_http
    end
  end

  def self.get_record_from_molfile(molfile)
    @auth = {:username => '', :password => ''}
    options = { :timeout => 10,  :headers => {'Content-Type' => 'application/x-www-form-urlencoded'}, :body => { 'sdf' => molfile } }

    HTTParty.post(http_s + PUBCHEM_HOST + '/rest/pug/compound/sdf/record/JSON', options)
  end

  def self.get_record_from_inchikey(inchikey)
    @auth = {:username => '', :password => ''}
    options = { :timeout => 10,  :headers => {'Content-Type' => 'text/json'}  }

    HTTParty.get(http_s + PUBCHEM_HOST + '/rest/pug/compound/inchikey/'+inchikey+'/record/JSON', options)
  end

  def self.get_cids_from_inchikeys(inchikeys)
    # faraday_conn.post { |req|
    #   req.headers['Content-Type'] = 'application/x-www-form-urlencoded'
    #   req.url('/rest/pug/compound/inchikey/property/InChIKey/JSON')
    #   req.body = "inchikey=#{inchikeys.join(',')}"
    # }.body

    options = {
      :timeout => 10,
      :headers => {'Content-Type' => 'application/x-www-form-urlencoded'},
      :body => { "inchikey"=>"#{inchikeys.join(',')}" },
    }
    HTTParty.post(http_s + PUBCHEM_HOST + '/rest/pug/compound/inchikey/property/InChIKey/JSON', options).body
  end

  def self.get_records_from_inchikeys(inchikeys)
    # faraday_conn.post { |req|
    #   req.headers['Content-Type'] = 'application/x-www-form-urlencoded'
    #   req.url('/rest/pug/compound/inchikey/record/JSON')
    #   req.body = "inchikey=#{inchikeys.join(',')}"
    # }.body

    options = {
      :timeout => 10,
      :headers => {'Content-Type' => 'application/x-www-form-urlencoded'},
      :body => { "inchikey"=>"#{inchikeys.join(',')}" },
    }
    HTTParty.post(http_s + PUBCHEM_HOST + '/rest/pug/compound/inchikey/record/JSON', options).body
  end

  def self.get_molfile_by_inchikey(inchikey)
    @auth = {:username => '', :password => ''}
    options = { :timeout => 10,  :headers => {'Content-Type' => 'text/json'}  }

    HTTParty.get(http_s + PUBCHEM_HOST + '/rest/pug/compound/inchikey/'+inchikey+'/record/SDF', options).body
  end

  def self.get_molfiles_by_inchikeys(inchikeys)
    # faraday_conn.post { |req|
    #   req.headers['Content-Type'] = 'application/x-www-form-urlencoded'
    #   req.url('/rest/pug/compound/inchikey/record/SDF')
    #   req.body = "inchikey=#{inchikeys.join(',')}"
    # }.body

    options = {
      :timeout => 10,
      :headers => {'Content-Type' => 'application/x-www-form-urlencoded'},
      :body => { "inchikey"=>"#{inchikeys.join(',')}" },
    }
    HTTParty.post(http_s+'/rest/pug/compound/inchikey/record/SDF', options).body
  end

  def self.get_molfile_by_smiles(smiles)
    @auth = {:username => '', :password => ''}
    options = { :timeout => 10,  :headers => {'Content-Type' => 'text/json'}  }
    encoded_smiles = URI::encode(smiles, '[]/()+-.@#=\\')
    HTTParty.get(http_s + PUBCHEM_HOST + '/rest/pug/compound/smiles/'+encoded_smiles+'/record/SDF', options).body
  end

  def self.get_xref_by_inchikey(inchikey)
    @auth = {:username => '', :password => ''}
    options = { :timeout => 10,  :headers => {'Content-Type' => 'text/json'}  }

    HTTParty.get(http_s + PUBCHEM_HOST + '/rest/pug/compound/inchikey/'+inchikey+'/xrefs/RN/JSON', options).body
  end

  def self.get_cid_from_inchikey(inchikey)
    # resp = faraday_conn.get('/rest/pug/compound/inchikey/' + inchikey + '/cids/TXT')
    # return nil unless resp.success?

    options = { :timeout => 10,  :headers => {'Content-Type' => 'text/plain'}  }
    resp = HTTParty.get(http_s + PUBCHEM_HOST + '/rest/pug/compound/inchikey/' + inchikey + '/cids/TXT', options)

    resp.body.presence&.strip
  end

  def self.get_cas_from_cid(cid)
    return [] unless cid

    options = { :timeout => 10,  :headers => {'Content-Type' => 'text/json'}  }
    page = "https://#{PUBCHEM_HOST}/rest/pug_view/data/compound/#{cid}/XML?heading=CAS"
    resp_xml = HTTParty.get(page, options).body
    resp_doc = Nokogiri::XML(resp_xml)
    cas_values = resp_doc.css('Name:contains("CAS")').map { |x| x.parent.css('StringValue').text }
    cas = most_occurance(cas_values)
    [cas]
  end

  def self.get_lcss_from_cid(cid)
    return nil unless cid
    return nil unless cid.is_a? Integer
    options = { :timeout => 10,  :headers => {'Content-Type' => 'text/json'}, :format => 'plain'  }
    page = "https://#{PUBCHEM_HOST}/rest/pug_view/data/compound/#{cid}/JSON?heading=GHS%20Classification"
    resp = HTTParty.get(page, options)
    return nil unless resp.success?
    JSON.parse resp, symbolize_names: true
  end

  FTP_PATH = 'ftp.ncbi.nlm.nih.gov'

  # return list of week directory names
  def self.update_list(type = 'Weekly')
    dir_path = ftp_update_dir(type: type)
    ftp = Net::FTP.new
    ftp.connect(FTP_PATH)
    ftp.login
    ftp.chdir(dir_path)
    dirname_list = ftp.list.map { |entry| entry.split(/\s+/)[-1]}
    ftp.close
    dirname_list
  end

  def self.date_select(date, date_list)
    date = Date.parse(date) unless date.is_a?(Date)
    date_list.select { |d|  d =~ /\d{4}-\d{1,2}-\d{1,2}/ && Date.parse(d) > date  }
  end

  def self.sdf_file_list(date, type = 'Weekly')
    dir_path = ftp_update_dir(date: date, type: type)
    ftp = Net::FTP.new
    ftp.connect(FTP_PATH)
    ftp.login
    ftp.chdir(dir_path)
    dirname_list = ftp.list('Compound*').map { |entry| entry.split(/\s+/)[-1]}
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
      ftp.getbinaryfile(remotefile_path) { |data|  tf.write data }
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
      lines.each.with_index do |line, i|
        cid = line.strip if previous_line =~ />\s+<PUBCHEM_COMPOUND_CID>/
        ink = line.strip if previous_line =~ />\s+<PUBCHEM_IUPAC_INCHIKEY>/
        if previous_line =~ />\s+<PUBCHEM_IUPAC_(\w+)_NAME>/
          names[$1] = line.strip
        end
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
