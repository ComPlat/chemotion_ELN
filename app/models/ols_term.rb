# == Schema Information
#
# Table name: ols_terms
#
#  id               :integer          not null, primary key
#  ancestry         :string           default("/"), not null
#  desc             :string
#  is_enabled       :boolean          default(TRUE)
#  label            :string
#  metadata         :jsonb
#  owl_name         :string
#  synonym          :string
#  synonyms         :jsonb
#  created_at       :datetime         not null
#  updated_at       :datetime         not null
#  ancestry_term_id :string
#  term_id          :string
#
# Indexes
#
#  index_ols_terms_on_ancestry              (ancestry)
#  index_ols_terms_on_owl_name_and_term_id  (owl_name,term_id) UNIQUE
#

class OlsTerm < ApplicationRecord
  has_ancestry

  NODE_RECENTLY_SELECTED = {
    title: '-- Recently selected --', selectable: false, children: [], value: 'recently selected'
  }.freeze

  class << self
    # rubocop:disable Lint/PercentStringArray
    # NB: quoted "desc" to avoid conflict reserved word in SQL
    COLUMNS = %w[
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
    ].freeze
    # rubocop:enable Lint/PercentStringArray

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

    SQL_REBUILD_ANCESTRY = <<~SQL.squish
      WITH RECURSIVE terms AS (
        SELECT id, term_id, ancestry_term_id FROM ols_terms WHERE owl_name = :owl_name
      ), tree AS (
        SELECT t.id, t.term_id, '/'::text AS path
        FROM terms t
        WHERE NOT EXISTS (SELECT 1 FROM terms p WHERE p.term_id = t.ancestry_term_id)
        UNION ALL
        SELECT c.id, c.term_id, tree.path || tree.id || '/'
        FROM terms c JOIN tree ON c.ancestry_term_id = tree.term_id
      )
      UPDATE ols_terms o SET ancestry = coalesce(tree.path, '/')
      FROM terms LEFT JOIN tree ON tree.id = terms.id
      WHERE o.id = terms.id AND o.ancestry IS DISTINCT FROM coalesce(tree.path, '/')
    SQL

    def delete_owl_by_name(owl_name)
      delete_sql =  sanitize_sql([ SQL_BULK_DELETE, owl_name])
      ApplicationRecord.connection.exec_query(delete_sql)
    end

    # Replaces the terms of +owl_name+ with the classes of an OWL file and applies the
    # post-import defaults: the BFO:0000002 (continuant) branch is disabled and the
    # CHMO 13C NMR term gets its short synonym.
    #
    # @param owl_name [String] ontology name, e.g. +chmo+
    # @param file_path [String] path to the OWL (RDF/XML) file
    # @return [void]
    def import_owl(owl_name, file_path)
      delete_owl_by_name(owl_name)
      import_and_create_ols_from_file_path(owl_name, file_path)
      disable_branch_by(owl_name: owl_name, term_id: 'BFO:0000002')
      find_by(owl_name: 'chmo', term_id: 'CHMO:0000595')&.update!(synonym: '13C NMR') if owl_name == 'chmo'
    end

    def import_and_create_ols_from_file_path(owl_name, file_path)
      xml_doc = Nokogiri::XML(File.open(file_path)).to_xml
      json_doc = Hash.from_xml(xml_doc).as_json
      all_terms = unique_term_nodes(Array.wrap(json_doc['RDF']['Class']))
      version_info = json_doc['RDF']['Ontology']
      replacements = obsolete_replacements(all_terms)
      all_terms.each_slice(100) do |nodes|
        create_from_owl_nodes(nodes, owl_name, version_info: version_info, replacements: replacements)
      end
      rebuilt_ancestry_by_owl_name(owl_name)
    end

    # bulk insert from a slice of owl nodes
    #
    # @param replacements [Hash{String => String}] obsolete term id => replacing term id,
    #   applied to parent links (see {#obsolete_replacements})
    def create_from_owl_nodes(nodes, owl_name, version_info: {}, replacements: {})
      values = []
      created_at = Time.now

      # compile sanitized values
      nodes.each do |node|
        next if (term_id = node_term_id(node)).nil? || node['deprecated'] == 'true' || node['label'].blank?

        subClassTermId = replaced_term_id(extract_subclass_term_id_from_node(node), replacements)

        if (synonyms = node['hasExactSynonym'].presence)
          if synonyms.is_a?(String)
            synonym = synonyms
            synonyms = [synonyms]
          else # synonyms.is_a?(Array)
            synonym = synonyms.min_by(&:length)
          end
        end
        label = node['label'].is_a?(String)? node['label'] : node['label'][0]
        # to correspond in order to SQL_BULK_INSERT listed columns
        value = [
          owl_name,
          term_id,
          subClassTermId,
          node['label'].is_a?(String)? node['label'] : node['label'].join(' - '), #[0],
          synonym,
          synonyms.nil? ? nil : synonyms.to_json,
          node['IAO_0000115'].is_a?(Array)? node['IAO_0000115'].join(' - ') : node['IAO_0000115'],
          { "klass": node, "version": version_info }.to_json,
          created_at,
          created_at
        ]
        next unless value.compact.present?
        values <<  sanitize_sql([SQL_BULK_INSERT_SANITIZE] + value)[BULK_INSERT_STRING_SIZE..-1]
      end
      ApplicationRecord.connection.exec_query("#{SQL_BULK_INSERT} #{values.join(',')}") if values.present?
    end

    # Sets every term's +ancestry+ to its full materialized_path2 path ("/root/…/parent/")
    # from the +ancestry_term_id+ links, whatever the order the terms were imported in.
    #
    # A term whose parent is not in the ontology is a root. Each term has a single parent,
    # so the recursion from the roots cannot loop; terms on a cycle are never reached and
    # become roots as well.
    #
    # @param owl_name [String] ontology name, e.g. +chmo+
    # @return [Integer] number of terms whose ancestry changed
    def rebuilt_ancestry_by_owl_name(owl_name)
      connection.exec_update(sanitize_sql([SQL_REBUILD_ANCESTRY, { owl_name: owl_name }]))
    end

    def disable_branch_by(owl_name:, term_id:)
      node = find_by(owl_name: owl_name, term_id: term_id)
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
      ApplicationRecord.connection.exec_query(sanitized_sql)
    end

    private

    # The term id of an OWL class: the id encoded in its OBO class IRI
    # (+http://purl.obolibrary.org/obo/BFO_0000002+ gives +BFO:0000002+), the same mapping
    # {#extract_subclass_term_id_from_node} applies to parent links; for other IRIs, its
    # +oboInOwl:id+. The IRI wins because it is the class identifier: classes imported from
    # other ontologies (BFO, OBI, IAO, ...) often carry no +oboInOwl:id+, and an annotation
    # can be wrong.
    #
    # @param node [Hash] an +owl:Class+ element parsed with +Hash.from_xml+
    # @return [String, nil] +nil+ for a class without either
    def node_term_id(node)
      iri = node['rdf:about'].to_s
      return iri.split('/').last.tr('_', ':') if iri.match?(%r{/obo/[A-Za-z]+_\w+\z})

      node['id'].presence
    end

    # Maps each deprecated class that names its successor ("term replaced by",
    # +IAO:0100001+) to that successor. Deprecated classes are not imported, so without
    # this their subclasses would become roots.
    #
    # @param nodes [Array<Hash>] +owl:Class+ elements parsed with +Hash.from_xml+
    # @return [Hash{String => String}] obsolete term id => replacing term id
    def obsolete_replacements(nodes)
      nodes.each_with_object({}) do |node, map|
        next unless node['deprecated'] == 'true' && (term_id = node_term_id(node))

        successor = node['IAO_0100001']
        successor = successor['rdf:resource'] if successor.is_a?(Hash)
        map[term_id] = successor.split('/').last.tr('_', ':') if successor.is_a?(String)
      end
    end

    # Follows +replacements+ from +term_id+ to a term that is not replaced; stops on a loop.
    def replaced_term_id(term_id, replacements)
      seen = Set.new
      term_id = replacements[term_id] while replacements.key?(term_id) && seen.add?(term_id)
      term_id
    end

    # Keeps the first class of each term id, so an OWL file that declares an id twice
    # still imports.
    def unique_term_nodes(nodes)
      nodes.group_by { |node| node_term_id(node) }.flat_map do |term_id, same|
        next same if term_id.nil?

        Rails.logger.warn("OLS import: #{term_id} declared #{same.size} times, keeping the first") if same.size > 1
        same.first
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
