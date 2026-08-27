module Chemotion::PubchemService

  def self.lcss_from_cid cid
    record = PubChem.get_lcss_from_cid(cid)
  end

  def self.molecule_info_from_molfile molfile
    record = PubChem.get_record_from_molfile(molfile)
    interpret_record record
  end

  # @param timeout [Numeric, nil] per-phase HTTP bound in seconds; nil uses PubChem's default
  def self.molecule_info_from_inchikey(inchikey, timeout: nil)
    molecule_info_and_outcome_from_inchikey(inchikey, timeout: timeout).first
  end

  # Same lookup, but also reports whether an empty result means "PubChem has nothing" or
  # "we could not ask". See {PubChem.fetch_record_from_inchikey}.
  #
  # @return [Array(Hash, Symbol)] +[info, outcome]+ — outcome is +:ok+, +:not_found+ or
  #   +:unavailable+
  def self.molecule_info_and_outcome_from_inchikey(inchikey, timeout: nil)
    opts = timeout ? { timeout: timeout } : {}
    record, outcome = PubChem.fetch_record_from_inchikey(inchikey, **opts)
    [interpret_record(record), outcome]
  end

  # Fetch SMILES from PubChem by identifier
  # @param identifier [String] identifier
  # @return [Hash] { smiles: String, nil }
  def self.smiles_from_identifier(identifier)
    smiles = PubChem.get_smiles_from_identifier(identifier)
    { smiles: smiles }
  end

  def self.interpret_record(record, as_array = false)
    compounds = compounds_in(record)
    return as_array ? [] : empty_result if compounds.nil?

    results = compounds.filter_map { |rec| compound_result(rec) }

    as_array ? results : results[0]
  end

  # @param record [Object] a parsed record, a JSON string, or an HTTParty response
  # @return [Array, nil] the PC_Compounds entries, or nil when the record carries none
  def self.compounds_in(record)
    record = JSON.parse(record) if record.is_a?(String)
    return nil unless record && record['PC_Compounds']

    Array(record['PC_Compounds'])
  end

  # A malformed entry -- one that is not a Hash at all, an absent or wrongly typed id, missing
  # props, a props entry with no urn -- must degrade to the same nil-filled result a Fault
  # produces, not raise up through PubchemLookupJob. Every read goes through dig_hash for that
  # reason; see its note on why Hash#dig alone is not enough.
  #
  # @param rec [Object] one PC_Compounds entry
  # @return [Hash, nil] the interpreted result, or nil for an entry that is not a Hash
  def self.compound_result(rec)
    return unless rec.is_a?(Hash)

    result = empty_result
    result[:cid] = dig_hash(rec, 'id', 'id', 'cid')
    Array(rec['props']).each { |prop| apply_prop(result, prop) }
    result
  end

  # Built fresh per call rather than shared: apply_prop mutates +names+ in place.
  #
  # @return [Hash] the nil-filled shape every caller sees when PubChem has nothing to say
  def self.empty_result
    {
      cid: nil,         # optional
      iupac_name: nil,
      names: [],
      topological: nil, # optional
      log_p: nil,       # optional
    }
  end

  # Walks +keys+ only while each level is genuinely a Hash.
  #
  # Hash#dig guards a *missing* key but still raises TypeError when an intermediate value is
  # present and not diggable (+{'id' => 'unknown'}.dig('id', 'id')+), which is exactly the shape
  # a malformed PubChem record arrives in.
  #
  # @param hash [Object] any value; a non-Hash yields nil rather than raising
  # @return [Object, nil] the nested value, or nil if any level is absent or not a Hash
  def self.dig_hash(hash, *keys)
    keys.reduce(hash) do |node, key|
      return nil unless node.is_a?(Hash)

      node[key]
    end
  end

  # Folds one PC_Compounds property into +result+, in place. A property whose urn carries no
  # label is skipped: it identifies nothing, and PubChem sends no such entry for a well-formed
  # record.
  #
  # @param result [Hash] mutated in place
  # @param prop [Object] one entry of the record's +props+; anything malformed is ignored
  # @return [void]
  def self.apply_prop(result, prop)
    label = dig_hash(prop, 'urn', 'label')
    return if label.nil?

    case label
    when 'IUPAC Name'
      sval = dig_hash(prop, 'value', 'sval').to_s
      result[:iupac_name] = sval if dig_hash(prop, 'urn', 'name') == 'Preferred'
      result[:names] << sval
      result[:names].uniq!
    when 'Topoligical'
      result[:topological] = dig_hash(prop, 'value', 'fval').to_s
    when 'Log P'
      result[:log_p] = dig_hash(prop, 'value', 'fval').to_s
    when 'InChIKey'
      result[:inchikey] = dig_hash(prop, 'value', 'sval').to_s
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
