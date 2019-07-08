class OlsTerm < ActiveRecord::Base
  has_ancestry

  class << self
    COLUMNS  = %w[
      owl_name
      term_id
      ancestry_term_id
      label
      synonym
      synonyms
      "desc"
      metadata
      created_at
      updated_at
    ]

    SQL_BULK_INSERT = <<~SQL
      INSERT  INTO ols_terms (#{COLUMNS.join(',')}) VALUES
    SQL

    BULK_INSERT_STRING_SIZE = SQL_BULK_INSERT.size

    INSERT_VALUE_QUESTION_MARKS =  "(#{Array.new(COLUMNS.size){'?'}.join(',')})"

    SQL_BULK_DELETE = <<~SQL
      DELETE FROM ols_terms WHERE owl_name = ?
    SQL

    SQL_BULK_INSERT_SANITIZE = "#{SQL_BULK_INSERT} #{INSERT_VALUE_QUESTION_MARKS}"

    def delete_owl_by_name(owl_name)
      delete_sql =  sanitize_sql([ SQL_BULK_DELETE, owl_name])
      ActiveRecord::Base.connection.exec_query(delete_sql)
    end

    def import_and_create_ols_from_file_path(owl_name, file_path)
      xml_doc = Nokogiri::XML(File.open(file_path)).to_xml
      json_doc = Hash.from_xml(xml_doc).as_json
      all_terms = json_doc['RDF']['Class']
      version_info = json_doc['RDF']['Ontology']
      all_terms.each_slice(50) do |nodes|
        create_from_owl_nodes(nodes, owl_name, version_info: version_info)
      end
      rebuilt_ancestry_by_owl_name(owl_name)
    end

    def create_from_owl_nodes(nodes, owl_name, version_info: {})
      values = []
      created_at = Time.now

      # compile sanitized values
      nodes.select{|node| node['id'].present? && node['deprecated'] != 'true' }.each do |node|
        subClassTermId = extract_subclass_term_id_from_node(node)

        if (synonyms = node['hasExactSynonym'].presence)
          if synonyms.class == String
            synonym = synonyms
            synonyms = [synonyms]
          else
            synonym = synonyms.sort_by(&:length)[0]
          end
        end
        # to correspond in order to SQL_BULK_INSERT listed columns
        value = [
          owl_name,
          node['id'],
          subClassTermId,
          node['label'],
          synonym,
          synonyms.to_json,
          node['IAO_0000115'],
          { "klass": node, "version": version_info }.to_json,
          created_at,
          created_at
        ]
        values <<  sanitize_sql([SQL_BULK_INSERT_SANITIZE] + value)[BULK_INSERT_STRING_SIZE..-1]
      end
      ActiveRecord::Base.connection.exec_query("#{SQL_BULK_INSERT} #{values.join(',')}")
    end

    def rebuilt_ancestry_by_owl_name(owl_name)
      build_direct_parent_ancestry(owl_name)
      reprocess_count = 10
      while reprocess_count.positive? do
        count = 0
        OlsTerm.where(owl_name: owl_name).find_each do |o|
          next if (root = o.root) == o
          next if root.root == root
          new_a = root.ancestry + '/' + o.ancestry
          o.update_columns(ancestry: new_a)
          count += 1
        end
        break if count == 0
        reprocess_count -= 1
      end
    end

    def disable_branch_by(args)
      a = args.slice(:owl_name, :term_id)
      node = find_by(**a)
      return unless node
      ([node] + node.descendants).each { |n| n.update!(is_enabled: false) }
    end

    private

    def build_direct_parent_ancestry(owl_name)
      where(owl_name: owl_name).find_each do |o|
        next if o.ancestry_term_id.nil?
        ancestor = OlsTerm.find_by(owl_name: owl_name, term_id: o.ancestry_term_id)
        next if ancestor.nil?
        if ancestor.ancestry.nil?
          new_a = ancestor.id.to_s
        else
          new_a = ancestor.ancestry + '/' + ancestor.id.to_s
        end
        o.update_columns(ancestry: new_a)
      end
    end

    def extract_subclass_term_id_from_node(node)
      return nil unless node['subClassOf'].present?
      if (node['subClassOf'].length > 1)
        subClass = node['subClassOf'][0]["rdf:resource"]
      else
        subClass = node['subClassOf']["rdf:resource"]
      end

      ## special case: RXNO:0000024
      if subClass.nil? && (sc = node.dig('equivalentClass', 'Class', 'intersectionOf', 'Description', 'rdf:about'))
        subClass = sc
      end
      subClass.split('/').last.gsub('_',':') unless subClass.nil?
    end
  end
end
