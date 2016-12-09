require 'net/http'

module PubChem
  include HTTParty


  debug_output $stderr

  def self.http_s
    Rails.env.test? && "http://" || "https://"
  end

  def self.get_record_from_molfile(molfile)
    @auth = {:username => '', :password => ''}
    options = { :timeout => 10,  :headers => {'Content-Type' => 'application/x-www-form-urlencoded'}, :body => { 'sdf' => molfile } }

    HTTParty.post(http_s+'pubchem.ncbi.nlm.nih.gov/rest/pug/compound/sdf/record/JSON', options)
  end

  def self.get_record_from_inchikey(inchikey)
    @auth = {:username => '', :password => ''}
    options = { :timeout => 10,  :headers => {'Content-Type' => 'text/json'}  }

    HTTParty.get(http_s+'pubchem.ncbi.nlm.nih.gov/rest/pug/compound/inchikey/'+inchikey+'/record/JSON', options)
  end

  def self.get_records_from_inchikeys(inchikeys)
    conn = Faraday.new(:url => http_s+'pubchem.ncbi.nlm.nih.gov') do |faraday|
      faraday.request  :url_encoded             # form-encode POST params
      faraday.adapter  Faraday.default_adapter  # make requests with Net::HTTP
    end
    conn.post('/rest/pug/compound/inchikey/record/JSON', {"inchikey"=>"#{inchikeys.join(',')}"}).body
  end

  def self.get_molfile_by_inchikey(inchikey)
    @auth = {:username => '', :password => ''}
    options = { :timeout => 10,  :headers => {'Content-Type' => 'text/json'}  }

    HTTParty.get(http_s+'pubchem.ncbi.nlm.nih.gov/rest/pug/compound/inchikey/'+inchikey+'/record/SDF', options).body
  end

  def self.get_molfiles_by_inchikeys(inchikeys)
    conn = Faraday.new(:url => http_s+'pubchem.ncbi.nlm.nih.gov') do |faraday|
      faraday.request  :url_encoded             # form-encode POST params
      faraday.adapter  Faraday.default_adapter  # make requests with Net::HTTP
    end
    conn.post('/rest/pug/compound/inchikey/record/SDF', {"inchikey"=>"#{inchikeys.join(',')}"}).body
  end

  def self.get_molfile_by_smiles(smiles)
    @auth = {:username => '', :password => ''}
    options = { :timeout => 10,  :headers => {'Content-Type' => 'text/json'}  }
    encoded_smiles = URI::encode(smiles, '[]/()+-.@#=\\')
    HTTParty.get(http_s+'pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/'+encoded_smiles+'/record/SDF', options).body
  end
end
