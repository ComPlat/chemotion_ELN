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

    SQL_BULK_SWITCH = <<~SQL
      UPDATE ols_terms SET is_enabled = ? WHERE id in (?)
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
      all_terms.each_slice(100) do |nodes|
        create_from_owl_nodes(nodes, owl_name, version_info: version_info)
      end
      rebuilt_ancestry_by_owl_name(owl_name)
    end

    # bulk insert from a slice of owl nodes
    def create_from_owl_nodes(nodes, owl_name, version_info: {})
      values = []
      created_at = Time.now

      # compile sanitized values
      nodes.select{|node| node['id'].present? && node['deprecated'] != 'true' }.each do |node|
        subClassTermId = extract_subclass_term_id_from_node(node)

        if (synonyms = node['hasExactSynonym'].presence)
          if synonyms.is_a?(String)
            synonym = synonyms
            synonyms = [synonyms]
          else # synonyms.is_a?(Array)
            synonym = synonyms.sort_by(&:length)[0]
          end
        end
        label = node['label'].is_a?(String)? node['label'] : node['label'][0]
        # to correspond in order to SQL_BULK_INSERT listed columns
        value = [
          owl_name,
          node['id'],
          subClassTermId,
          node['label'].is_a?(String)? node['label'] : node['label'].join(' - '), #[0],
          synonym,
          synonyms.to_json,
          node['IAO_0000115'].is_a?(Array)? node['IAO_0000115'].join(' - ') : node['IAO_0000115'],
          { "klass": node, "version": version_info }.to_json,
          created_at,
          created_at
        ]
        next unless value.compact.present?
        values <<  sanitize_sql([SQL_BULK_INSERT_SANITIZE] + value)[BULK_INSERT_STRING_SIZE..-1]
      end
      ActiveRecord::Base.connection.exec_query("#{SQL_BULK_INSERT} #{values.join(',')}") if values.present?
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
      node_ids = [node.id] + node.descendants.pluck(:id)
      disable_by_ids(node_ids)
    end

    def disable_by_ids(ids)
      switch_by_ids(ids, false)
    end

    def enable_by_ids(ids)
      switch_by_ids(ids, true)
    end

    def switch_by_ids(ids, bool = false)
      ids = [ids].flatten
      sanitized_sql = sanitize_sql([SQL_BULK_SWITCH, bool, ids])
      ActiveRecord::Base.connection.exec_query(sanitized_sql)
    end

    def write_public_file(owl_name, owl)
      file_path = Rails.public_path.join('ontologies', "#{owl_name}.json")
      File.write(file_path, owl.to_json)
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
