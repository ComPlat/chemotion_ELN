module Export
  class ExportJson
    attr_accessor :collection_id
    attr_reader :data

    def initialize(**arg)
      @collection_id = arg[:collection_id]
      @data = { 'reactions' => {}, 'samples' => {}, 'analysis' => {} }
    end

    def export
      query
      prepare_data
    end

    def to_json
      @data.to_json
    end

    def to_file(file_name)
      file_name += '.json' if File.extname(file_name) != '.json'
      File.write(file_name, to_json)
    end

    private
    def query
      @data['reactions'] = db_exec_query(reaction_sql)
      @data['samples'] = db_exec_query(sample_sql)
      @data['analyses'] = db_exec_query(analyses_sql)
      @data
    end

    def prepare_data
      reactions_data
      samples_data
      analyses_data
    end

    def analyses_data
      h = {}
      @data['analyses'].each do |e|
        h[e['uuid']] = e['analyses'] && JSON.parse(e['analyses']) || []
      end
      @data['analyses'] = h
    end

    def samples_data
      @data['samples'].each do |el|
        [
          'reaction_sample',
          'residues_attributes',
          'elemental_compositions_attributes'
        ].each do |column|
          el[column] = el[column] && JSON.parse(el[column])
        end
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
      @data['reactions'].each do |el|
        %w(description temperature observation).each do |column|
          el[column] = JSON.parse(YAML.load(el[column]).to_json) if el[column]
        end
        if (dp = el['dangerous_products']).is_a?(String)
          el['dangerous_products'] = dp.gsub(/"|\{|\}/, '').split(',')
        end
        if (pu = el['purification']).is_a?(String)
          el['purification'] = pu.gsub(/"|\{|\}/, '').split(',')
        end
      end
    end

    def db_connect
      ActiveRecord::Base.establish_connection
    end

    def db_exec_query(sql)
      db_connect.connection.exec_query(sql)
    end

    def reaction_sql(c_id = collection_id)
      <<-SQL
      select r."name", r.created_at, r.updated_at, r.description, r."role"
        , r.timestamp_start, r.timestamp_stop, r.observation, r.purification
        , r.dangerous_products, r.tlc_solvents, r.tlc_description, r.origin
        , r.rf_value, r.temperature, r.status, r.solvent, r.short_label
        --, r.created_by, r.reaction_svg_file, r.deleted_at
        , cl.id as uuid
      from reactions r
      inner join collections_reactions cr on cr.reaction_id = r.id and cr.deleted_at isnull
      inner join code_logs cl on cl."source" = 'reaction' and cl.source_id = r.id
      where cr.collection_id = #{c_id};
      SQL
    end

    def sample_sql(c_id = collection_id)
      <<-SQL
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
      where cs.collection_id = #{c_id}
      order by r_uuid asc;
      SQL
    end

    def analyses_sql(c_id = collection_id)
      <<-SQL
      select cl.id as uuid
      , (select array_to_json(array_agg(row_to_json(analysis)))
        from (
        select anac.id, anac.description, anac.extended_metadata, clg.id
        , (select array_to_json(array_agg(row_to_json(attachment)))
           from (
           select att.filename, att.identifier, att.checksum
           from attachments att
           where att.container_id = anac.id) attachment ) as attachments
         from containers cont
         inner join container_hierarchies ch on cont.id = ch.ancestor_id and ch.generations = 3
         inner join containers anac on anac.id = ch.descendant_id
         left join code_logs clg on clg."source" = 'container' and clg.source_id = anac.id
         where cont.containable_type = 'Sample'and cont.containable_id = s.id
        ) analysis
      ) as analyses
      from samples s
      inner join code_logs cl on cl."source" = 'sample' and cl.source_id = s.id
      inner join collections_samples cs on cs.sample_id = s.id and cs.deleted_at isnull
      where cs.collection_id = #{c_id};
      SQL
    end
  end
end
