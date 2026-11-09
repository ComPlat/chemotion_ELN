# frozen_string_literal: true

module OlsTerms
  # Writes the two JSON trees served by +GET /api/v1/ols_terms/list+ for one ontology:
  #
  # - +<basename>.json+: every term with its +is_enabled+ flag, read by the admin page;
  # - +<basename>.edited.json+: enabled terms only, led by the "Recently selected" node,
  #   read by the term pickers.
  #
  # In the edited tree each enabled term hangs under its nearest enabled ancestor, so
  # disabling a term in the middle of a branch keeps its enabled descendants reachable.
  module PublicFiles
    # Selects enabled terms with +ancestry+ reduced to their enabled ancestors, in
    # materialized_path2 form ("/1/2/", or "/" for a root).
    EDITED_SELECT = <<~SQL.squish
      id, owl_name, term_id, label, synonym, synonyms, is_enabled,
      coalesce('/' || nullif(array_to_string(array(
        select t.id
        from unnest(string_to_array(
          trim(both '/' from regexp_replace(ols_terms.ancestry, '/+', '/', 'g')), '/')::int[]
        ) with ordinality t(id, ord)
        join ols_terms a on a.id = t.id
        where a.is_enabled
        order by t.ord
      ), '/'), '') || '/', '/') as ancestry
    SQL

    # Siblings sorted by label; the term id breaks ties so the output is reproducible.
    ORDER = %i[label term_id].freeze

    module_function

    # Writes both files for +owl_name+.
    #
    # @param owl_name [String] ontology name, e.g. +chmo+
    # @param dir [Pathname, String] target directory
    # @param basename [String] file name stem (+chmo+ gives +chmo.json+ and +chmo.edited.json+)
    # @param ids [Boolean] keep the database ids of the terms; +false+ for files shipped
    #   with the code, whose ids would not match any instance
    # @return [Array(Pathname, Pathname)] +[full, edited]+ paths written
    def write(owl_name, dir: default_dir, basename: owl_name, ids: true)
      dir = Pathname.new(dir)
      full = dir.join("#{basename}.json")
      edited = dir.join("#{basename}.edited.json")
      File.write(full, { ols_terms: prune(full_tree(owl_name), ids) }.to_json)
      File.write(edited, { ols_terms: prune(edited_tree(owl_name), ids) }.to_json)
      [full, edited]
    end

    # @return [Pathname] +public/ontologies+, where the API looks first
    def default_dir
      Rails.public_path.join('ontologies')
    end

    # @param owl_name [String]
    # @return [Array<Hash>] every term of the ontology as a nested tree
    def full_tree(owl_name)
      represent(OlsTerm.where(owl_name: owl_name).arrange_serializable(order: ORDER))
    end

    # @param owl_name [String]
    # @return [Array<Hash>] enabled terms as a nested tree, led by the "Recently selected" node
    def edited_tree(owl_name)
      terms = OlsTerm.where(owl_name: owl_name, is_enabled: true).select(EDITED_SELECT)
      represent(terms.arrange_serializable(order: ORDER)).unshift(OlsTerm::NODE_RECENTLY_SELECTED.dup)
    end

    def represent(tree)
      Entities::OlsTermEntity.represent(tree, serializable: true).as_json
    end

    # Drops +id+ from every node unless +ids+ is true.
    def prune(nodes, ids)
      return nodes if ids

      nodes.map do |node|
        node = node.except('id', :id)
        children = node['children'] || node[:children]
        children.present? ? node.merge('children' => prune(children, ids)).except(:children) : node
      end
    end
  end
end
