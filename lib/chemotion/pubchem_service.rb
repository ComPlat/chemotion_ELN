module Chemotion::PubchemService

  def self.lcss_from_cid cid
    record = PubChem.get_lcss_from_cid(cid)
  end

  def self.molecule_info_from_molfile molfile
    record = PubChem.get_record_from_molfile(molfile)
    interpret_record record
  end

  def self.molecule_info_from_inchikey inchikey
    record = PubChem.get_record_from_inchikey(inchikey)
    interpret_record record
  end

  def self.molecule_info_from_inchikeys inchikey_array
    records = PubChem.get_records_from_inchikeys(inchikey_array)
    interpret_record records, true
  end

  # Fetch SMILES from PubChem by identifier
  # @param identifier [String] identifier
  # @return [Hash] { smiles: String, nil }
  def self.smiles_from_identifier(identifier)
    smiles = PubChem.get_smiles_from_identifier(identifier)
    { smiles: smiles }
  end

  def self.interpret_record(record, as_array = false)
    record = JSON.parse(record) if record.is_a?(String)
    result = {
      cid: nil,         # optional
      iupac_name: nil,
      names: [],
      topological: nil, # optional
      log_p: nil        # optional
    }

    results=[]

    unless record && record['PC_Compounds']
      return result unless as_array
      return results
    end

    record['PC_Compounds'].each do |rec|
      result = {
        cid: nil,         # optional
        iupac_name: nil,
        names: [],
        topological: nil, # optional
        log_p: nil        # optional
      }

      result[:cid] = rec['id']['id']['cid']

      rec['props'].each do |prop|
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

        if (prop['urn']['label'] == 'InChIKey')
          result[:inchikey] = prop['value']['sval'].to_s
        end
      end

      results << result
    end

    if !as_array
      results[0]
    else
      results
    end
  end

  def self.molfile_from_inchikey inchikey
    PubChem.get_molfile_by_inchikey(inchikey)
  end

  def self.molfile_from_smiles smiles
    PubChem.get_molfile_by_smiles(smiles)
  end

  def self.xref_from_inchikey inchikey
    PubChem.get_xref_by_inchikey(inchikey)
  end
end
