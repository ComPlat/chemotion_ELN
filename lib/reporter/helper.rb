module Reporter
  module Helper
    def self.mol_serial(mol_id, mol_serials)
      s = mol_serials.select { |x| x['mol'] && x['mol']['id'] == mol_id }[0]
      s.present? && s['value'].present? && s['value'] || 'xx'
    end
  end
end
