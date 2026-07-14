module Reporter
  module Helper
    def self.mol_serial(mol_id, mol_serials)
      s = mol_serials.select { |x| x['mol'] && x['mol']['id'] == mol_id }[0]
      s.present? && s['value'].present? && s['value'] || 'xx'
    end

    def self.get_rinchi_keys(obj)
      long_key = obj[:rinchi_long_key]
      web_key = obj[:rinchi_web_key]
      short_key = obj[:rinchi_short_key]
      [long_key, web_key, short_key]
    end

    # Renders a sample/product PNG via {Reporter::Docx::DiagramSample} and
    # returns the resulting +[path, Tempfile]+ tuple. Caller must keep the
    # Tempfile alive until the path has been consumed and then call
    # +close!+ on it.
    #
    # @param p [Hash] serialized product/sample hash; must include
    #   +:get_svg_path+
    # @return [Array(String, Tempfile)] +[path, tmp]+ — the PNG path and its
    #   backing Tempfile (see {Reporter::Docx::Diagram#img_path})
    def self.mol_img_path(p)
      ext = 'png'
      Reporter::Docx::DiagramSample.new(
        obj: p, format: ext
      ).img_path
    end
  end
end
