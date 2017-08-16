# frozen_string_literal: true

# desc: Helper methods for GrapeAPI::ReportAPI
module ReportHelpers
  extend Grape::API::Helpers

  params :export_params do
    requires :columns, types: [Hash, Array[String]]
    requires :exportType, type: Integer
    requires :uiState, type: Hash do
      requires :sample, type: Hash do
        requires :checkedIds, type: Array
        requires :uncheckedIds, type: Array
        requires :checkedAll, type: Boolean
      end
      requires :reaction, type: Hash do
        requires :checkedIds, type: Array
        requires :uncheckedIds, type: Array
        requires :checkedAll, type: Boolean
      end
      requires :wellplate, type: Hash do
        requires :checkedIds, type: Array
        requires :uncheckedIds, type: Array
        requires :checkedAll, type: Boolean
      end
      requires :currentCollection, type: Integer
      requires :isSync, type: Boolean
    end
    # requires :columns, type: Array
  end

  # desc: connect to actual DB
  # def db_connect
  #   ActiveRecord::Base.establish_connection
  # end

  # def db_query(sql)
  #   db_connect.connection.query(sql)
  # end

  # desc: returns a ActiveRecord::Result
  def db_exec_query(sql)
    ActiveRecord::Base.connection.exec_query(sql)
  end

  # desc: return a PG::Result
  # def db_execute(sql)
  #   db_connect.connection.execute(sql)
  # end

  # desc: return  ActiveRecord::Result of smiles from reaction samples
  def db_exec_query_reaction_smiles(c_id, ids, all = false, u_ids = user_ids)
    sql = reaction_smiles_sql(c_id, ids, all, u_ids)
    db_exec_query(sql)
  end

  # desc: return JSON parsed result of AR::Result of smiles from react samples
  def reaction_smiles_hash(c_id, ids, all = false, u_ids = user_ids)
    result = db_exec_query_reaction_smiles(
      c_id, ids, all, u_ids
    ).first.fetch('result', nil)
    JSON.parse(result) if result
  end

  def reaction_smiles_sql(c_id, ids, checkedAll = false, u_ids = user_ids)
    r_ids = [ids].flatten.join(',')
    u_ids = [u_ids].flatten.join(',')
    if checkedAll && c_id
      all_ids = Collection.find_by(id: c_id)&.reactions&.pluck(:id) || []
      order = 'r_id asc'
      selection = (all_ids - ids).join(',')
    else
      order = "position(','||r_id::text||',' in '(,#{r_ids},)')"
      selection = r_ids
    end
    return '' if selection.empty?
    <<~SQL
      select json_object_agg(r_id, smiles_json) as result from (
      select r_id, json_object_agg(stype, smiles_arr) as smiles_json from (
        select r_id, array_agg( smiles) as smiles_arr, coalesce(s_type) as stype
        from (
          select s_id
          , case
            when s.is_top_secret then '*'
            when (shared_sync is false) or
              (shared_sync is true and dl_s > 0) or
              (shared_sync isnull and dl_s > 0) then m.cano_smiles
            else '*' end as smiles
          , case
            when rsm.type = 'ReactionsStartingMaterialSample' then 0
            when rsm.type = 'ReactionsReactantSample' then 1
            when rsm.type = 'ReactionsSolventSample' then 2
            when rsm.type = 'ReactionsProductSample' then 3 end as s_type
          , rsm.reaction_id as r_id
          -- , pl, dl_s , co_id, scu_id
          from (
            select s.id as s_id, s.molecule_id
            , s.is_top_secret -- as ts
            -- , min(co.id) as co_id, min(scu.id) as scu_id
            , bool_and(co.is_shared) as shared_sync
            , max(GREATEST(co.permission_level, scu.permission_level)) as pl
            , max(GREATEST(co.sample_detail_level,scu.sample_detail_level)) dl_s
            from samples s
            inner join collections_samples c_s on s.id = c_s.sample_id
            left join collections co on (
              co.id = c_s.collection_id and co.user_id in (#{u_ids})
            )
            left join collections sco on (
              sco.id = c_s.collection_id and sco.user_id not in (#{u_ids})
            )
            left join sync_collections_users scu on (
              sco.id = scu.collection_id and scu.user_id in (#{u_ids})
            )
            where s.deleted_at isnull and c_s.deleted_at isnull
              and (co.id is not null or scu.id is not null)
            group by s_id
          ) as s
        -- reactions_samples
        left join reactions_samples rsm on (
          rsm.sample_id = s_id and rsm.deleted_at isnull
        )
        -- molecules
        inner join molecules m on s.molecule_id = m.id
        where rsm.reaction_id in (#{selection})
        ) group_1
        group by r_id, s_type
      ) group_0 group by r_id order by #{order}
      ) group_
    SQL
  end

  # desc: SM>>P
  def r_smiles_0(v)
    (v['0'] || []).join('.') + '>>' + (v['3'] || []).join('.')
  end

  # desc: SM.R>>P
  def r_smiles_1(v)
    ((v['0'] || []) + (v['1'] || [])).join('.') \
    + '>>' + (v['3'] || []).join('.')
  end

  # desc: SM.R.S>>P
  def r_smiles_2(v)
    ((v['0'] || []) + (v['1'] || []) + (v['2'] || [])).join('.') \
    + '>>' + (v['3'] || []).join('.')
  end

  # desc: SM>R>P
  def r_smiles_3(v)
    (v['0'] || []).join('.') + '>' \
    + (v['1'] || []).join('.') + '>' \
    + (v['3'] || []).join('.')
  end

  # desc: SM>R.S>P
  def r_smiles_4(v)
    (v['0'] || []).join('.') + '>' \
    + ((v['1'] || []) + (v['2'] || [])).join('.') + '>' \
    + (v['3'] || []).join('.')
  end

  # desc: SM>R>S>P
  def r_smiles_5(v)
    (v['0'] || []).join('.') + '>' + (v['1'] || []).join('.') \
    + '>' + (v['2'] || []).join('.') + '>' + (v['3'] || []).join('.')
  end

  # desc: SM , R , S ,P
  def r_smiles_6(v)
    (v['0'] || []).join('.') + ' , ' + (v['1'] || []).join('.') + ' , ' \
    + (v['2'] || []).join('.') + ' , ' + (v['3'] || []).join('.')
  end

  def build_sql(table, columns, c_id, ids, checkedAll = false)
    return unless %i[sample reaction wellplate].include?(table)
    send("build_sql_#{table}_sample", columns, c_id, ids, checkedAll)
  end

  # desc: sql to view sample info (#columns)
  # for given sample list (#s_ids) and a user (or u + groups) (#u_ids).
  # use to generate sql view given user id(s) wellplate ids and selected columns
  # to be used in excel report.
  # each sample row has info:
  # - about being owned-by, shared-to, or sync-to user
  # - max permission_level sample
  #   from collections sync_colls assigned to user
  # - selected columns from samples, molecules table
  #
  def build_sql_sample_sample(columns, c_id, ids, checkedAll = false)
    s_ids = [ids].flatten.join(',')
    u_ids = [user_ids].flatten.join(',')
    return if columns.empty? || u_ids.empty?
    return if !checkedAll && s_ids.empty?

    if checkedAll
      return unless c_id
      collection_join = " inner join collections_samples c_s on s_id = c_s.sample_id and c_s.collection_id = #{c_id} "
      order = 's_id asc'
      selection = s_ids.empty? && '' || "s.id not in (#{s_ids}) and"
    else
      order = "position(','||s_id::text||',' in '(,#{s_ids},)')"
      selection = "s.id in (#{s_ids}) and"
    end

    <<~SQL
      select
      s_id, ts, co_id, scu_id, shared_sync, pl, dl_s
      , res.residue_type
      , #{columns}
      from (
        select
          s.id as s_id
          , s.is_top_secret as ts
          , min(co.id) as co_id
          , min(scu.id) as scu_id
          , bool_and(co.is_shared) as shared_sync
          , max(GREATEST(co.permission_level, scu.permission_level)) as pl
          , max(GREATEST(co.sample_detail_level,scu.sample_detail_level)) dl_s
        from samples s
        inner join collections_samples c_s on s.id = c_s.sample_id
        left join collections co on (co.id = c_s.collection_id and co.user_id in (#{u_ids}))
        left join collections sco on (sco.id = c_s.collection_id and sco.user_id not in (#{u_ids}))
        left join sync_collections_users scu on (sco.id = scu.collection_id and scu.user_id in (#{u_ids}))
        where #{selection} s.deleted_at isnull and c_s.deleted_at isnull
          and (co.id is not null or scu.id is not null)
        group by s_id
      ) as s_dl
      inner join samples s on s_dl.s_id = s.id #{collection_join}
      left join molecules m on s.molecule_id = m.id
      left join molecule_names mn on s.molecule_name_id = mn.id
      left join residues res on res.sample_id = s.id
      order by #{order};
    SQL
  end

  # desc: sql to view sample info (#columns) and asso well(plate)s info
  # for given wellplate or list (#wp_ids) and a user (or u + groups) (#u_ids).
  # use to generate sql view given user id(s) wellplate ids and selected columns
  # to be used in excel report.
  # each sample row has info:
  # - about being owned-by, shared-to, or sync-to user
  # - max permission_level sample and wellplate detail level
  #   from collections sync_colls assigned to user
  # - selected columns from samples, molecules, wells, and wellplates table
  #
  # 's_dl': table of s.id, collection dl info(, and wellp info for ordering)
  # co_id => own or shared coll if not null
  # scu_id => sync_coll if not null
  # shared_sync == false => sample in at least 1 own collection
  # shared_sync == true => sample in at least 1 shared collection, no own coll
  # shared_sync == null => sample in at least 1 sync_coll, no shared, no own
  # 'co.id is not null or scu.id is not null' : validate associations with user
  def build_sql_wellplate_sample(columns, c_id, ids, checkedAll = false)
    wp_ids = [ids].flatten.join(',')
    u_ids = [user_ids].flatten.join(',')
    return if columns.empty? || u_ids.empty?
    return if !checkedAll && wp_ids.empty?

    if checkedAll
      return unless c_id
      collection_join = " inner join collections_samples c_s on s_id = c_s.sample_id and c_s.collection_id = #{c_id} "
      order = 'wp_id asc'
      selection = wp_ids.empty? && '' || "w.wellplate_id not in (#{wp_ids}) and"
    else
      order = "position(','||wp_id::text||',' in '(,#{wp_ids},)')"
      selection = "w.wellplate_id in (#{wp_ids}) and"
    end

    <<~SQL
      select
      s_id, ts, co_id, scu_id, shared_sync, pl, dl_s
      , dl_wp
      , res.residue_type
      , #{columns}
      from (
        select
          s.id as s_id
          , s.is_top_secret as ts
          , min(co.id) as co_id
          , min(scu.id) as scu_id
          , bool_and(co.is_shared) as shared_sync
          , max(GREATEST(co.permission_level, scu.permission_level)) as pl
          , max(GREATEST(co.sample_detail_level,scu.sample_detail_level)) dl_s
          , max(GREATEST(co.wellplate_detail_level,scu.wellplate_detail_level)) dl_wp
          , (array_agg(w.wellplate_id)) [1] as wp_id
          , (array_agg(w.position_x)) [1] as "wx"
          , (array_agg(w.position_y)) [1] as "wy"
        from samples s
        inner join wells w on s.id = w.sample_id
        inner join collections_samples c_s on s.id = c_s.sample_id
        left join collections co on (co.id = c_s.collection_id and co.user_id in (#{u_ids}))
        left join collections sco on (sco.id = c_s.collection_id and sco.user_id not in (#{u_ids}))
        left join sync_collections_users scu on (sco.id = scu.collection_id and scu.user_id in (#{u_ids}))
        where #{selection} s.deleted_at isnull and c_s.deleted_at isnull
          and (co.id is not null or scu.id is not null)
        group by s_id
      ) as s_dl
      inner join samples s on s_dl.s_id = s.id #{collection_join}
      inner join wells w on s.id = w.sample_id
      inner join wellplates wp on w.wellplate_id = wp.id
      left join molecules m on s.molecule_id = m.id
      left join molecule_names mn on s.molecule_name_id = mn.id
      left join residues res on res.sample_id = s.id
      order by #{order}, "wy" asc,"wx" asc;
    SQL
  end

  def build_sql_reaction_sample(columns, c_id, ids, checkedAll = false)
    r_ids = [ids].flatten.join(',')
    u_ids = [user_ids].flatten.join(',')
    return if columns.empty? || u_ids.empty?
    return if !checkedAll && r_ids.empty?

    if checkedAll
      return unless c_id
      collection_join = " inner join collections_samples c_s on s_id = c_s.sample_id and c_s.collection_id = #{c_id} "
      order = 'r_id asc'
      selection = r_ids.empty? && '' || "r_s.reaction_id not in (#{r_ids}) and"
    else
      order = "position(','||r_id::text||',' in '(,#{r_ids},)')"
      selection = "r_s.reaction_id in (#{r_ids}) and"
    end

    <<~SQL
      select
      s_id, ts, co_id, scu_id, shared_sync, pl, dl_s
      , dl_r
      , res.residue_type
      -- , r_s.type as "type"
      -- , r_s.position
      , #{columns}
      , case
        when r_s.type = 'ReactionsStartingMaterialSample' then '1 starting mat'
        when r_s.type = 'ReactionsReactantSample' then '2 reactant'
        when r_s.type = 'ReactionsSolventSample' then '3 solvent'
        when r_s.type = 'ReactionsProductSample' then '4 product' end as "type"
      from (
        select
          s.id as s_id
          , s.is_top_secret as ts
          , min(co.id) as co_id
          , min(scu.id) as scu_id
          , bool_and(co.is_shared) as shared_sync
          , max(GREATEST(co.permission_level, scu.permission_level)) as pl
          , max(GREATEST(co.sample_detail_level,scu.sample_detail_level)) dl_s
          , max(GREATEST(co.reaction_detail_level,scu.reaction_detail_level)) dl_r
          , (array_agg(r_s.reaction_id)) [1] as r_id
        from samples s
        inner join reactions_samples r_s on s.id = r_s.sample_id
        inner join collections_samples c_s on s.id = c_s.sample_id
        left join collections co on (co.id = c_s.collection_id and co.user_id in (#{u_ids}))
        left join collections sco on (sco.id = c_s.collection_id and sco.user_id not in (#{u_ids}))
        left join sync_collections_users scu on (sco.id = scu.collection_id and scu.user_id in (#{u_ids}))
        where #{selection} s.deleted_at isnull and c_s.deleted_at isnull
          and (co.id is not null or scu.id is not null)
        group by s_id
      ) as s_dl
      inner join samples s on s_dl.s_id = s.id #{collection_join}
      inner join reactions_samples r_s on s.id = r_s.sample_id
      inner join reactions r on r_s.reaction_id = r.id
      left join molecules m on s.molecule_id = m.id
      left join molecule_names mn on s.molecule_name_id = mn.id
      left join residues res on res.sample_id = s.id
      order by #{order}, "type" asc, r_s.position asc;
    SQL
  end

  # desc: returns hash of alllowed tables and associated columns
  # to be queried for export.
  # { table_name:
  #     column_name: ['abbr.column_name', 'alt column_name', min_detail_level]
  #   ...
  EXP_MAP_ATTR =
    # commented out lines are blacklisted attributes
    {
      sample: {
        external_label: ['s.external_label', '"sample external label"', 0],
        name: ['s."name"', '"sample name"', 0],
        target_amount_value: ['s.target_amount_value', '"target amount"', 0],
        target_amount_unit: ['s.target_amount_unit', '"target unit"', 0],
        real_amount_value: ['s.real_amount_value', '"real amount"', 0],
        real_amount_unit: ['s.real_amount_unit', '"real unit"', 0],
        description: ['s.description', nil, 0],
        molfile: ["encode(s.molfile, 'escape')", 'molfile', 1],
        purity: ['s.purity', nil, 0],
        solvent: ['s.solvent', nil, 0],
        # impurities: ['s.impurities', nil, 0],
        location: ['s.location', nil, 0],
        is_top_secret: ['s.is_top_secret', '"secret"', 10],
        # ancestry: ['s.ancestry', nil, 10],
        short_label: ['s.short_label', '"short label"', 0],
        imported_readout: ['s.imported_readout', '"sample readout"', 10],
        sample_svg_file: ['s.sample_svg_file', 'image', 1],
        molecule_svg_file: ['m.molecule_svg_file', 'm_image', 1],
        identifier: ['s.identifier', nil, 1],
        density: ['s.density', nil, 0],
        melting_point: ['s.melting_point', '"melting pt"', 0],
        boiling_point: ['s.boiling_point', '"boiling pt"', 0],
        created_at: ['s.created_at', nil, 0],
        updated_at: ['s.updated_at', nil, 0],
        # deleted_at: ['wp.deleted_at', nil, 10],
        molecule_name: ['mn."name"', '"molecule name"', 1]
      },
      molecule: {
        cano_smiles: ['m.cano_smiles', '"canonical smiles"', 10],
        sum_formular: ['m.sum_formular', '"sum formula"', 10],
        inchistring: ['m.inchistring', 'inchistring', 10],
        molecular_weight: ['m.molecular_weight', '"MW"', 0],
        inchikey: ['m.inchikey', '"InChI"', 10]
      },
      wellplate: {
        name: ['wp."name"', '"wellplate name"', 10],
        size: ['wp.size', nil, 10],
        description: ['wp.description', '"wp description"', 10],
        created_at: ['wp.created_at', '"wp created at"', 10],
        updated_at: ['wp.updated_at', '"wp updated at"', 10],
        # deleted_at: ['wp.deleted_at', nil],
        # well:
        # id: ['w.id', nil, 10],
        # sample_id: ['w.sample_id', nil, 10],
        # wellplate_id: ['w.wellplate_id', nil, 10],
        position_x: ['w.position_x', '"well x"', 10],
        position_y: ['w.position_y', '"well y"', 10],
        # created_at: ['w.created_at', nil, 10],
        # updated_at: ['w.updated_at', nil, 10],
        readout: ['w.readout', '"well readout"', 10],
        additive: ['w.additive', nil, 10]
        # deleted_at: ['w.deleted_at', nil, 10],
      },
      reaction: {
        # id: ['r.id', nil, 10],
        name: ['r."name"', '"r name"', 10],
        # created_at: ['r.created', nil, 10],
        # updated_at: ['r.updated', nil, 10],
        # description: ['r.description', nil, 10],
        # timestamp_start: ['r.timestamp', nil, 10],
        # timestamp_stop: ['r.timestamp', nil, 10],
        # observation: ['r.observation', nil, 10],
        # purification: ['r.purification', nil, 10],
        # dangerous_products: ['r.dangerous', nil, 10],
        # tlc_solvents: ['r.tlc_solvents', nil, 10],
        # tlc_description: ['r.tlc_description', nil, 10],
        # rf_value: ['r.rf_value', nil, 10],
        # temperature: ['r.temperature', nil, 10],
        # status: ['r.status', nil, 10],
        # reaction_svg_file: ['r.reaction', nil, 10],
        # solvent: ['r.solvent', nil, 10],
        # deleted_at: ['r.deleted', nil, 10],
        short_label: ['r.short_label', '"r short label"', 10],
        # created_by: ['r.created', ni, 10l]
        # reactions_sample:
        equivalent: ['r_s.equivalent', '"r eq"', 10],
        reference: ['r_s.reference', '"r ref"', 10]
      }

    }.freeze

  # desc: concatenate columns to be queried
  def build_column_query(sel, attrs = EXP_MAP_ATTR)
    selection = []
    attrs.keys.each do |table|
      sel.symbolize_keys.fetch(table, []).each do |col|
        if (s = attrs[table][col.to_sym])
          selection << (s[1] && s[0] + ' as ' + s[1] || s[0])
        end
      end
    end
    selection.join(', ')
  end

  def filter_column_selection(type, columns = params[:columns])
    case type.to_sym
    when :sample
      columns.slice(:sample, :molecule)
    when :reaction
      columns.slice(:sample, :molecule, :reaction)
    when :wellplate
      columns.slice(:sample, :molecule, :wellplate)
    else
      {}
    end
  end

  def force_molfile_selection
    sample_params = params[:columns][:sample]
    if !sample_params || !sample_params.include?(:molfile)
      params[:columns][:sample] = (sample_params || []) + [:molfile]
    end
  end

  DEFAULT_COLUMNS_WELLPLATE = {
    sample: %i[
      sample_svg_file
      molecule_svg_file
      external_label
      name
      target_amount_value
      target_amount_unit
      real_amount_value
      real_amount_unit
      purity
      solvent
      short_label
      molecule_name
    ],
    molecule: %i[
      cano_smiles
      sum_formular
      inchistring
      molecular_weight
    ],
    wellplate: %i[
      name
      position_x
      position_y
      readout
    ]
  }.freeze

  DEFAULT_COLUMNS_REACTION = {
    reaction: %i[
      name
      short_label
      equivalent
      reference
      type
    ],
    sample: %i[
      sample_svg_file
      molecule_svg_file
      external_label
      name
      short_label
      target_amount_value
      target_amount_unit
      real_amount_value
      real_amount_unit
      purity
      solvent
      molecule_name
    ],
    molecule: %i[
      cano_smiles
      sum_formular
      inchistring
      molecular_weight
    ]
  }.freeze

  def default_columns_reaction
    DEFAULT_COLUMNS_REACTION
  end
  def default_columns_wellplate
    DEFAULT_COLUMNS_WELLPLATE
  end
end
