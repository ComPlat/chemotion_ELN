# frozen_string_literal: true

module GoeChem
  class Mapper
    # GoeChem sends uppercase unit abbreviations; Chemotion uses lowercase
    UNIT_MAP = {
      'G' => 'g',
      'MG' => 'mg',
      'KG' => 'kg',
      'ML' => 'ml',
      'L' => 'l',
      'ST' => 'pcs', # Stück / pieces
      'g' => 'g',    # occasionally already lowercase
      '-1' => nil,   # unknown unit (string form)
      -1 => nil,     # unknown unit (integer form from API)
      '' => nil,     # empty unit
    }.freeze

    LIQUID_UNITS = %w[ml l].freeze
    SOLID_UNITS  = %w[g mg kg pcs].freeze

    # GoeChem fields copied verbatim into goechemProductInfo (0/false are meaningful)
    PRODUCT_INFO_RAW_KEYS = %w[id cid cont einh inh regzeit].freeze
    # GoeChem fields copied only when present (blank strings dropped)
    PRODUCT_INFO_PRESENCE_KEYS = %w[
      firma hersteller katnr prodnr eink_preis eink_waehrung hhinweis phinweis
      fp smp unnr eu_referenz charge schluessel mfgdatum minhaltbar
    ].freeze

    # Map a GoeChem CHEMIKALIENBESTAND row to Sample attributes.
    # real_amount_value/unit mirrors the Chemical chemical_data amount/volume fields
    # so the sample list quick-view and the Chemical tab stay in sync.
    # Physical properties (flash_point) go into xref so the Chemical tab can display them.
    def self.to_sample_attrs(row)
      unit = UNIT_MAP.fetch(row['einh'].to_s.strip, row['einh'].to_s.strip.downcase.presence)
      {
        name: row['name'].to_s.strip,
        location: build_location(row),
        real_amount_value: row['inh'].presence&.to_f,
        real_amount_unit: unit,
        melting_point: parse_temperature_range(row['smp']),
        xref: build_xref(row),
        inventory_sample: true,
      }.compact
    end

    # Map a GoeChem row to Chemical attributes.
    # chemical_data[0] structure:
    #   amount/volume  — canonical quantity fields (routed by unit type)
    #   status         — "Available" / "Empty"
    #   safetyPhrases  — Chemotion-native format: h_statements, p_statements, pictograms
    #   goechemProductInfo — raw GoeChem fields under their native German names for traceability
    def self.to_chemical_attrs(row)
      {
        cas: row['cas'].presence || row['casnr'].presence,
        chemical_data: [build_chemical_data_entry(row)],
      }.compact
    end

    private_class_method def self.build_chemical_data_entry(row)
      unit = UNIT_MAP.fetch(row['einh'].to_s.strip, nil)
      inh  = row['inh'].presence&.to_f

      entry = {}

      if inh && unit
        if LIQUID_UNITS.include?(unit)
          entry['volume'] = { 'value' => inh, 'unit' => unit }
        else
          entry['amount'] = { 'value' => inh, 'unit' => unit }
        end
      end

      entry['status']             = inh.to_f.positive? ? 'Available' : 'Empty'
      entry['safetyPhrases']      = build_safety_phrases(row)
      entry['goechemProductInfo'] = build_goechem_product_info(row)
      entry.compact
    end

    private_class_method def self.build_xref(row)
      xref = {
        'goechem_id' => row['id'],
        'goechem_cid' => row['cid'],
        'goechem_synced' => Time.current.iso8601,
      }
      xref['cas']         = row['cas']        if row['cas'].present?
      xref['batch']       = row['charge']     if row['charge'].present?
      xref['order_ref']   = row['eu_referenz'] if row['eu_referenz'].present?
      # flash_point in xref matches ChemicalTab's xref.flash_point = {unit, value} convention
      xref['flash_point'] = { 'unit' => '°C', 'value' => row['fp'] } if row['fp'].present?
      xref
    end

    private_class_method def self.build_location(row)
      parts = [
        row['gebaeude'].presence ? "Geb. #{row['gebaeude']}" : nil,
        row['raum'].presence     ? "Raum #{row['raum']}"     : nil,
        row['platz'].presence    ? "Platz #{row['platz']}"   : nil,
      ].compact
      parts.join(', ').presence
    end

    # Build the Chemotion-native safetyPhrases object from GoeChem H/P phrase strings.
    # Uses ChemicalsService to expand codes to full text from the JSON lookup tables.
    # Returns nil if no H or P phrases are present (compacted away by caller).
    private_class_method def self.build_safety_phrases(row)
      h_str = row['hhinweis'].to_s
      p_str = row['phinweis'].to_s
      return nil if h_str.blank? && p_str.blank?

      {
        'h_statements' => Chemotion::ChemicalsService.construct_h_statements(h_str),
        'p_statements' => Chemotion::ChemicalsService.construct_p_statements(p_str),
        'pictograms' => [],
      }
    rescue StandardError
      nil
    end

    # goechemProductInfo stores the raw GoeChem field values under their native German
    # field names so the data is traceable back to the source API without translation loss.
    private_class_method def self.build_goechem_product_info(row)
      info = PRODUCT_INFO_RAW_KEYS.index_with { |key| row[key] }
      PRODUCT_INFO_PRESENCE_KEYS.each { |key| info[key] = row[key].presence }
      info.compact
    end

    # Parse strings like "-31 °C", "101-103 °C", "> 200 °C" (may contain UTF-8 mojibake "Â°C")
    # into a Ruby Range that ActiveRecord can serialize to PostgreSQL numrange.
    private_class_method def self.parse_temperature_range(str)
      return nil if str.blank?

      # Fix mojibake: "Â°" is latin1-as-utf8 for "°"
      str = str.to_s.encode('UTF-8', invalid: :replace, undef: :replace, replace: '')
      str = str.gsub(/Â/, '').gsub(/°/, '').gsub(/\s*C\s*$/, '').strip

      if (m = str.match(/\A([><!~]?\s*-?\d+(?:\.\d+)?)\s*[-–]\s*(-?\d+(?:\.\d+)?)\z/))
        (m[1].strip.to_f)..(m[2].strip.to_f)
      elsif (m = str.match(/\A[><!~]?\s*(-?\d+(?:\.\d+)?)\z/))
        v = m[1].to_f
        v..v
      end
    rescue StandardError
      nil
    end
  end
end
