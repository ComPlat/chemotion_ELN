require 'net/http'

module PubChem
  include HTTParty

  debug_output $stderr

  def self.get_record_from_molfile(molfile)

    @auth = {:username => '', :password => ''}

    options = { :timeout => 4,  :headers => {'Content-Type' => 'application/x-www-form-urlencoded'}, :body => { 'sdf' => molfile } }

    HTTParty.post('http://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/sdf/record/JSON', options)
  end

  def self.get_record_from_inchikey(inchikey)

    @auth = {:username => '', :password => ''}

    options = { :timeout => 3,  :headers => {'Content-Type' => 'text/json'}  }

    HTTParty.get('http://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/inchikey/'+inchikey+'/record/JSON', options)
  end

  def self.get_molfile_by_inchikey(inchikey)

    @auth = {:username => '', :password => ''}

    options = { :timeout => 3,  :headers => {'Content-Type' => 'text/json'}  }

    HTTParty.get('http://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/inchikey/'+inchikey+'/record/SDF', options).body
  end


end
