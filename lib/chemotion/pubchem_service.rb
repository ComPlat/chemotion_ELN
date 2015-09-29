module Chemotion::PubchemService

  def self.molecule_info_from_molfile molfile
    record = PubChem.get_record_from_molfile(molfile)
    interpret_record record
  end

  def self.molecule_info_from_inchikey inchikey
    record = PubChem.get_record_from_inchikey(inchikey)
    interpret_record record
  end

  def self.interpret_record record
    result = {
      cid: nil,         # optional
      iupac_name: nil,
      names: [],
      topological: nil, # optional
      log_p: nil        # optional
    }

    if record && record['PC_Compounds']
      result[:cid] = record['PC_Compounds'][0]['id']['id']['cid']

      record['PC_Compounds'][0]['props'].each do |prop|
        if (prop['urn']['label'] == 'IUPAC Name' && prop['urn']['name'] == 'Preferred')
          result[:iupac_name] = prop['value']['sval'].to_s
        end

        if (prop['urn']['label'] == 'IUPAC Name')
          result[:names] << prop['value']['sval'].to_s
          result[:names].uniq!
        end

        if (prop['urn']['label'] == 'Topoligical')
          result[:topological] = prop['value']['fval'].to_s
        end

        if (prop['urn']['label'] == 'Log P')
          result[:log_p] = prop['value']['fval'].to_s
        end
      end
    end
    result
  end

  def self.molfile_from_inchikey inchikey
    PubChem.get_molfile_by_inchikey(inchikey)
  end

end
