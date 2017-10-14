module Export
  class ExportJson
    attr_accessor :collection_id, :sample_ids, :reaction_ids
    attr_reader :data

    def initialize(**args)
      @collection_id = args[:collection_id]
      @sample_ids = args[:sample_ids]
      @reaction_ids = args[:reaction_ids]
      s_ids = []
      if @reaction_ids.is_a?(Array)
        [
          ReactionsSolventSample, ReactionsProductSample,
          ReactionsReactantSample,  ReactionsStartingMaterialSample
        ].each do |material|
          s_ids += material.where(reaction_id: reaction_ids).pluck(:sample_id)
        end
        s_ids.compact!
      end
      unless s_ids.empty?
        @sample_ids ||= []
        @sample_ids += s_ids
      end
      @data = { 'reactions' => {}, 'samples' => {}, 'analysis' => {} }
    end

    def export
      query
      prepare_data
      self
    end

    def to_json
      @data.to_json
    end

    def to_file(file_name)
      file_name += '.json' if File.extname(file_name) != '.json'
      File.write(file_name, to_json)
    end

    #private
    def query
      @data['reactions'] = db_exec_query(reaction_sql)
      @data['samples'] = db_exec_query(sample_sql)
      @data['analyses'] = {}
      @data['reaction_analyses'] = db_exec_query(analyses_sql('reaction'))
      @data['sample_analyses'] = db_exec_query(analyses_sql('sample'))
      @data['attachments'] = db_exec_query(attachments_sql)
      @data
    end

    def prepare_data
      reactions_data
      samples_data
      analyses_data('reaction')
      analyses_data('sample')
      attachments_data
    end

    def attachments_data
      @data['attachments'] = JSON.parse(@data['attachments'][0]['ids'] || '[]')
    end

    def analyses_data(type)
      a = @data[type + '_analyses'][0].delete(type + '_analyses') || '{}'
      @data['analyses'].merge(JSON.parse a)
    end

    def samples_data
      @data['samples'] = JSON.parse(@data['samples'][0]['samples'] || '{}')
      @data['samples'].each_value do |el|
      #   [
      #     'reaction_sample',
      #     'residues_attributes',
      #     'elemental_compositions_attributes'
      #   ].each do |column|
      #     el[column] = el[column] && JSON.parse(el[column])
      #   end
        svg_file = if !el['sample_svg_file'].blank?
                     File.join('samples', el['sample_svg_file'])
                   elsif !el['molecule_svg_file'].blank?
                     File.join('molecules', el['molecule_svg_file'])
                   end
        svg_path = svg_file && Rails.root.join(
          'public', 'images', svg_file
        )
        svg = File.read(svg_path) if File.exist?(svg_path)
        el['sample_svg_file'] = svg || nil
      end
    end

    def reactions_data
      @data['reactions'] = JSON.parse(@data['reactions'][0]['reactions'] || '{}')
      @data['reactions'].each_value do |el|
        %w(description observation).each do |column|
          el[column] = JSON.parse(YAML.load(el[column]).to_json) if el[column]
        end
        # %w(dangerous_products purification).each do |column|
        #   el[column] = JSON.parse(el[column]) if el[column]
        # end
      end
    end

    def db_exec_query(sql)
      ActiveRecord::Base.connection.exec_query(sql)
    end

    def ids_sql(arr, t, c = 'id')
      return nil unless arr.is_a?(Array)
      " and #{t}.#{c} in (#{arr.join(',')})"
    end

    def c_id
      @collection_id
    end

    def reaction_sql
      <<-SQL
      select json_object_agg(dump.uuid, row_to_json(dump)) as reactions from(
      select r."name", r.created_at, r.updated_at, r.description, r."role"
        , r.timestamp_start, r.timestamp_stop, r.observation
        , array_to_json(r.purification) as purification
        , array_to_json(r.dangerous_products) as dangerous_products
        , r.tlc_solvents, r.tlc_description
        , r.rf_value, r.temperature, r.status, r.solvent, r.short_label
        --, r.created_by, r.reaction_svg_file, r.deleted_at
        , cl.id as uuid, clo.id as origin_uuid --, r.origin
      from reactions r
      inner join collections_reactions cr on cr.reaction_id = r.id and cr.deleted_at isnull
      inner join code_logs cl on cl."source" = 'reaction' and cl.source_id = r.id
      left join code_logs clo on cl."source" = 'reaction' and clo.source_id = (r.origin->>'id')::int
      where cr.collection_id = #{c_id} #{ids_sql(reaction_ids, 'r')}) dump;
      SQL
    end

    def sample_sql
      <<-SQL
      select json_object_agg(dump.uuid, row_to_json(dump)) as samples from(
      select
        -- , s.ancestry, s.user_id, s.created_by, s.molfile, s.molecule_id
        -- ,s.xref,s.fingerprint_id, s.deleted_at
        s.id, s."name", encode(s.molfile,'escape') as molfile
        , s.target_amount_value, s.target_amount_unit
        , s.real_amount_value, s.real_amount_unit
        , s.molarity_value, s.molarity_unit
        , s.created_at, s.updated_at, s.description
        , s.purity, s.solvent, s.impurities, s.location, s.is_top_secret
        , s.external_label, s.short_label
        , s.imported_readout, s.sample_svg_file, s.identifier
        , s.density, s.melting_point, s.boiling_point
        , m.inchikey, m.molecule_svg_file
        , cl.id as uuid
        , cl_r.id as r_uuid
        , array_to_json(array[rsm.id::boolean, rs.id::boolean,rr.id::boolean,rp.id::boolean]) as reaction_sample
        , coalesce (rsm.reference, rs.reference, rr.reference, rp.reference) as r_reference
        , coalesce(rsm.equivalent, rs.equivalent, rr.equivalent, rp.equivalent) as r_equivalent
        , r.created_at as r_created_at
        , (select array_to_json(array_agg(row_to_json(ecd)))
             from (select ec.composition_type, ec.loading, ec."data" from elemental_compositions ec where s.id = ec.sample_id) ecd) as elemental_compositions_attributes
        , (select array_to_json(array_agg(row_to_json(red)))
            from (select re.custom_info,'residue_type', re.residue_type from residues re where s.id = re.sample_id) red) as residues_attributes
      from samples s
      inner join molecules m on s.molecule_id = m.id
      inner join collections_samples cs on cs.sample_id = s.id and cs.deleted_at isnull
      inner join code_logs cl on cl."source" = 'sample' and cl.source_id = s.id
      left join reactions_starting_material_samples rsm on (rsm.sample_id = s.id and rsm.deleted_at isnull)
      left join reactions_solvent_samples rs on (rs.sample_id = s.id and rs.deleted_at isnull)
      left join reactions_reactant_samples rr on rr.sample_id = s.id and rr.deleted_at isnull
      left join reactions_product_samples rp on rp.sample_id = s.id and rp.deleted_at isnull
      left join reactions r on r.id = coalesce (rsm.reaction_id, rs.reaction_id, rr.reaction_id, rp.reaction_id)
      left join code_logs cl_r on cl_r."source" = 'reaction' and cl_r.source_id = r.id
      where cs.collection_id = #{c_id} #{ids_sql(sample_ids, 's')}
      order by r_uuid asc) dump;
      SQL
    end


    def analyses_sql(type)
      return unless %w(reaction sample).include?(type)
      cont_type = type.classify
      cl_source = type
      table = type + 's'
      t = type[0]
      ids = ids_sql(send("#{type}_ids"), t)

      <<-SQL
      select json_object_agg(uuid, analyses) as #{type}_analyses from(
      select cl.id as uuid
      , (select array_to_json(array_agg(row_to_json(analysis)))
        from (
        select anac.id, anac."name", anac.description, anac.extended_metadata, clg.id as uuid
        , (select array_to_json(array_agg(row_to_json(dataset)))
          from (
          select datc.id, datc."name", datc.description, datc.extended_metadata
          , (
              select array_to_json(array_agg(row_to_json(attachment)))
              from (
                select att.filename, att.identifier, att.checksum
                from attachments att
                where att.container_id = datc.id
              ) attachment
            ) as attachments
          from  containers datc
          inner join container_hierarchies chd on datc.id = chd.descendant_id and anac.id = chd.ancestor_id and chd.generations = 1
          ) dataset
        ) as datasets
        from containers cont
        inner join container_hierarchies ch on cont.id = ch.ancestor_id and ch.generations = 2
        inner join containers anac on anac.id = ch.descendant_id
        left join code_logs clg on clg."source" = 'container' and clg.source_id = anac.id
        where cont.containable_type = '#{cont_type}' and cont.containable_id = #{t}.id
        ) analysis
      ) as analyses
      from #{table} #{t}
      inner join code_logs cl on cl."source" = '#{cl_source}' and cl.source_id = #{t}.id
      inner join collections_samples cs on cs.sample_id = #{t}.id and cs.deleted_at isnull
      where cs.collection_id = #{c_id} #{ids}) dump;
      SQL
    end

    def attachments_sql
      r_selec = "(cr.collection_id = #{c_id} #{ids_sql(reaction_ids, 'cr', 'reaction_id')})"
      s_selec = "(cs.collection_id = #{c_id} #{ids_sql(sample_ids, 'cs', 'sample_id')})"
      <<-SQL
      select array_to_json(array_agg(att.id)) as ids
      from attachments att
      inner join containers dc on dc.id = att.container_id
      inner join container_hierarchies ch on dc.id = ch.descendant_id and ch.generations = 3
      inner join containers rootc on rootc.id = ch.ancestor_id
      left join collections_samples cs on cs.sample_id = rootc.containable_id and rootc.containable_type = 'Sample' and cs.deleted_at isnull
      left join collections_reactions cr on cr.reaction_id = rootc.containable_id and rootc.containable_type = 'Reaction' and cr.deleted_at isnull
      where #{s_selec} or #{r_selec};
      SQL
    end
  end
end
