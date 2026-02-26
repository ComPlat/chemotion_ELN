# frozen_string_literal: true

# desc: Helper methods for GrapeAPI::ReportAPI
module ReportHelpers
  extend Grape::API::Helpers

  params :export_params do
    requires :columns, type: Hash do
      optional :sample, type: Array[String]
      optional :reaction, type: Array[String]
      optional :wellplate, type: Array[String]
      optional :sample_analyses, type: Array[String]
    end
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
    ).first&.fetch('result', nil)
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
            inner join collections_samples c_s on s.id = c_s.sample_id and c_s.deleted_at is null
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

  def generate_sheet(table, result, columns_params, export, type)
    case type
    when :analyses
      sheet_name = :"#{table}_analyses"
      export.generate_analyses_sheet_with_samples(sheet_name, result, columns_params)
    when :chemicals
      sheet_name = "#{table}_chemicals"
      format_result = Export::ExportChemicals.format_chemical_results(result)
      export.generate_sheet_with_samples(sheet_name, format_result, columns_params)
    when :components
      sheet_name = :"#{table}_components"
      export.generate_components_sheet_with_samples(sheet_name, result, columns_params)
      if columns_params.include?('composition_table')
        Rails.logger.info("Generating composition table for components sheet, #{columns_params}")
        sheet_name = "#{table}_composition_table"
        export.generate_composition_table_components_sheet_with_samples(sheet_name, result)
      end
    else
      export.generate_sheet_with_samples(table, result)
    end
  end

  def build_sql_query(table, current_user, sql_params, type)
    tables = %i[sample reaction wellplate]
    filter_parameter = if tables.include?(table) && type.nil?
                         table
                       else
                         :"#{table}_#{type}"
                       end
    type ||= :sample
    filter_selections = filter_column_selection(filter_parameter)
    column_query = build_column_query(filter_selections, current_user.id)
    send("build_sql_#{table}_#{type}", column_query, sql_params[:c_id], sql_params[:ids], sql_params[:checked_all])
  end

  def generate_sheets_for_tables(tables, table_params, export, columns_params = nil, type = nil)
    tables.each do |table|
      next unless (p_t = table_params[:ui_state][table])

      checked_all = p_t[:checkedAll]

      ids = checked_all ? p_t[:uncheckedIds] : p_t[:checkedIds]
      next unless checked_all || ids.present?

      sql_params = {
        c_id: table_params[:c_id], ids: ids, checked_all: checked_all
      }
      sql_query = build_sql_query(table, current_user, sql_params, type)
      next unless sql_query

      result = db_exec_query(sql_query)
      generate_sheet(table, result, columns_params, export, type)
    end
  end

  def sample_details_subquery(u_ids, selection)
    # Extract sample details subquery
    <<~SQL.squish
      select
        s.id as s_id
        , s.is_top_secret as ts
        , min(co.id) as co_id
        , min(scu.id) as scu_id
        , bool_and(co.is_shared) as shared_sync
        , max(GREATEST(co.permission_level, scu.permission_level)) as pl
        , max(GREATEST(co.sample_detail_level,scu.sample_detail_level)) dl_s
      from samples s
      inner join collections_samples c_s on s.id = c_s.sample_id and c_s.deleted_at is null
      left join collections co on (co.id = c_s.collection_id and co.user_id in (#{u_ids}))
      left join collections sco on (sco.id = c_s.collection_id and sco.user_id not in (#{u_ids}))
      left join sync_collections_users scu on (sco.id = scu.collection_id and scu.user_id in (#{u_ids}))
      where #{selection} s.deleted_at isnull and c_s.deleted_at isnull
        and (co.id is not null or scu.id is not null)
      group by s_id
    SQL
  end

  def build_sql_sample_sample(columns, c_id, ids, checkedAll = false)
    s_ids = [ids].flatten.join(',')
    u_ids = [user_ids].flatten.join(',')
    return if columns.empty? || u_ids.empty?
    return if !checkedAll && s_ids.empty?

    if checkedAll
      return unless c_id

      collection_join = " inner join collections_samples c_s on s_id = c_s.sample_id and c_s.deleted_at is null and c_s.collection_id = #{c_id} "
      order = 's_id asc'
      selection = (s_ids.empty? && '') || "s.id not in (#{s_ids}) and"
    else
      order = "position(','||s_id::text||',' in '(,#{s_ids},)')"
      selection = "s.id in (#{s_ids}) and"
    end

    rest_of_selections = if columns.is_a?(Array)
                           columns.join(', ')
                         else
                           columns
                         end
    s_subquery = sample_details_subquery(u_ids, selection)

    <<~SQL.squish
      select
      s_id, ts, co_id, scu_id, shared_sync, pl, dl_s
      , res.residue_type, s.molfile_version, s.decoupled, s.molecular_mass as "molecular mass (decoupled)", s.sum_formula as "sum formula (decoupled)"
      , s.stereo->>'abs' as "stereo_abs", s.stereo->>'rel' as "stereo_rel"
      , cl.id as "sample uuid"
      , #{rest_of_selections}
      from (#{s_subquery}) as s_dl
      inner join samples s on s_dl.s_id = s.id #{collection_join}
      left join molecules m on s.molecule_id = m.id
      left join molecule_names mn on s.molecule_name_id = mn.id
      left join residues res on res.sample_id = s.id
      left join code_logs cl on cl.source = 'sample' and cl.source_id = s.id
      order by #{order}
    SQL
  end

  def chemical_query(chemical_columns, c_id, ids, checked_all)
    s_ids = [ids].flatten.join(',')
    return '' if !checked_all && s_ids.empty?

    if checked_all
      return '' unless c_id

      collection_condition = "INNER JOIN collections_samples cs ON c.sample_id = cs.sample_id AND cs.deleted_at IS NULL AND cs.collection_id = #{c_id}"
      order = 'c.sample_id ASC'
      selection = if s_ids.empty?
                    ''
                  else
                    "AND c.sample_id NOT IN (#{s_ids})"
                  end
    else
      collection_condition = ''
      order = "position(','||c.sample_id::text||',' in '(,#{s_ids},)')"
      selection = "AND c.sample_id IN (#{s_ids})"
    end

    <<~SQL.squish
      SELECT c.sample_id AS chemical_sample_id, #{chemical_columns}
      FROM chemicals c
      #{collection_condition}
      WHERE c.deleted_at IS NULL #{selection}
      ORDER BY #{order}
    SQL
  end

  def build_sql_sample_chemicals(columns, c_id, ids, checked_all)
    sample_query = build_sql_sample_sample(columns[0], c_id, ids, checked_all)
    return nil if sample_query.blank?

    chemical_query_sql = chemical_query(columns[1].join(','), c_id, ids, checked_all)
    return sample_query if chemical_query_sql.blank?

    <<~SQL.squish
      SELECT sample_results.*, chemical_results.*
      FROM (#{sample_query}) AS sample_results
      LEFT JOIN (#{chemical_query_sql}) AS chemical_results
      ON sample_results.s_id = chemical_results.chemical_sample_id
    SQL
  end

  def build_sql_sample_components(columns, c_id, ids, checked_all)
    return if columns.blank? || columns[0].blank? || columns[1].blank?

    u_ids = [user_ids].flatten.join(',')
    return if u_ids.empty?

    # Use sample columns directly
    sample_sql = build_sample_columns(columns[0])

    # Use component columns directly
    component_columns = columns[1].join(', ')

    # Check if we need molecule properties
    needs_molecule_join = component_columns.include?('m.')

    if checked_all
      return unless c_id

      # For "All pages" - get all samples from the collection except excluded ones
      excluded_ids = [ids].flatten.join(',')
      collection_condition = "INNER JOIN collections_samples cs ON s.id = cs.sample_id AND cs.deleted_at IS NULL AND cs.collection_id = #{c_id}"
      where_condition = excluded_ids.empty? ? '' : "AND s.id NOT IN (#{excluded_ids})"
      order_clause = 's.id ASC'
    else
      # For specific sample selection
      sample_ids = [ids].flatten.join(',')
      return if sample_ids.empty?

      collection_condition = ''
      where_condition = "AND s.id IN (#{sample_ids})"
      order_clause = "position(','||s.id::text||',' in '(,#{sample_ids},)')"
    end

    <<~SQL.squish
      SELECT
        #{sample_sql},
        cl.id as "sample uuid",
        COALESCE(components.components, '[]') AS components
      FROM samples s
      #{collection_condition}
      LEFT JOIN molecules m on s.molecule_id = m.id
      LEFT JOIN molecule_names mn on s.molecule_name_id = mn.id
      LEFT JOIN residues res on res.sample_id = s.id
      LEFT JOIN code_logs cl on cl.source = 'sample' and cl.source_id = s.id
      LEFT JOIN LATERAL (
        SELECT json_agg(row_to_json(component_row)) AS components
        FROM (
          SELECT
            #{component_columns}
          FROM components comp
          #{needs_molecule_join ? "LEFT JOIN molecules m ON m.id = (comp.component_properties->>'molecule_id')::integer" : ''}
          WHERE comp.sample_id = s.id AND comp.deleted_at IS NULL
          ORDER BY comp.position
        ) AS component_row
      ) AS components ON TRUE
      WHERE s.deleted_at IS NULL #{where_condition}
      ORDER BY #{order_clause}
    SQL
  end

  def build_sample_columns(columns)
    columns.unshift('s.id as "id"') unless columns.any? { |col| col.include?('id as') }
    columns.join(', ')
  end

  def build_sql_sample_analyses(columns, c_id, ids, checkedAll = false)
    s_ids = [ids].flatten.join(',')
    u_ids = [user_ids].flatten.join(',')
    return if columns.empty? || u_ids.empty?
    return if !checkedAll && s_ids.empty?

    t = 's' # table samples
    cont_type = 'Sample' # containable_type
    if checkedAll
      return unless c_id

      collection_join = " inner join collections_samples c_s on s_id = c_s.sample_id and c_s.deleted_at is null and c_s.collection_id = #{c_id} "
      order = 's_id asc'
      selection = (s_ids.empty? && '') || "s.id not in (#{s_ids}) and"
    else
      order = "position(','||s_id::text||',' in '(,#{s_ids},)')"
      selection = "s.id in (#{s_ids}) and"
    end
    s_subquery = sample_details_subquery(u_ids, selection)

    <<~SQL.squish
      select
      s_id, ts, co_id, scu_id, shared_sync, pl, dl_s
      , #{columns}
      , cl.id as "sample uuid"
      , (select array_to_json(array_agg(row_to_json(analysis)))
        from (
        select  anac."name", anac.description
        , anac.extended_metadata->'kind' as "kind"
        , anac.extended_metadata->'content' as "content"
        , anac.extended_metadata->'status' as "status"
        , clg.id as uuid
        , (select array_to_json(array_agg(row_to_json(dataset)))
          from (
          select  datc."name" as "dataset name"
          , datc.description as "dataset description"
          , datc.extended_metadata->'instrument' as "instrument"
          , (
              select array_to_json(array_agg(row_to_json(attachment)))
              from (
                select att.filename, att.checksum
                from attachments att
                where att.attachable_id = datc.id and att.attachable_type = 'Container'
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
      from (#{s_subquery}) as s_dl
      inner join samples s on s_dl.s_id = s.id #{collection_join}
      left join code_logs cl on cl.source = 'sample' and cl.source_id = s.id
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

      collection_join = " inner join collections_samples c_s on s_id = c_s.sample_id and c_s.deleted_at is null and c_s.collection_id = #{c_id} "
      order = 'wp_id asc'
      selection = (wp_ids.empty? && '') || "w.wellplate_id not in (#{wp_ids}) and"
    else
      order = "position(','||wp_id::text||',' in '(,#{wp_ids},)')"
      selection = "w.wellplate_id in (#{wp_ids}) and"
    end

    <<~SQL
      select
      s_id, ts, co_id, scu_id, shared_sync, pl, dl_s
      , dl_wp
      , res.residue_type, s.molfile_version, s.decoupled, s.molecular_mass as "molecular mass (decoupled)", s.sum_formula as "sum formula (decoupled)"
      , s.stereo->>'abs' as "stereo_abs", s.stereo->>'rel' as "stereo_rel"
      , cl.id as "sample uuid"
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
        inner join collections_samples c_s on s.id = c_s.sample_id and c_s.deleted_at is null
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
      left join code_logs cl on cl.source = 'sample' and cl.source_id = s.id
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

      collection_join = " inner join collections_samples c_s on s_id = c_s.sample_id and c_s.deleted_at is null and c_s.collection_id = #{c_id} "
      order = 'r_id asc'
      selection = (r_ids.empty? && '') || "r_s.reaction_id not in (#{r_ids}) and"
    else
      order = "position(','||r_id::text||',' in '(,#{r_ids},)')"
      selection = "r_s.reaction_id in (#{r_ids}) and"
    end

    <<~SQL
      select
      s_id, ts, co_id, scu_id, shared_sync, pl, dl_s
      , dl_r
      , res.residue_type, s.molfile_version, s.decoupled, s.molecular_mass as "molecular mass (decoupled)", s.sum_formula as "sum formula (decoupled)"
      , s.stereo->>'abs' as "stereo_abs", s.stereo->>'rel' as "stereo_rel"
      , cl.id as "sample uuid"
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
        inner join collections_samples c_s on s.id = c_s.sample_id and c_s.deleted_at is null
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
      left join code_logs cl on cl.source = 'sample' and cl.source_id = s.id
      order by #{order}, "type" asc, r_s.position asc;
    SQL
  end

  # desc: returns hash of allowed tables and associated columns
  # to be queried for export.
  # { table_name:
  #     column_name: ['abbr.column_name', 'alt column_name', min_detail_level]
  #   ...
  EXP_MAP_ATTR =
    # commented out lines are blacklisted attributes
    {
      sample: {
        external_label: ['s."external_label"', '"sample external label"', 0],
        name: ['s."name"', '"sample name"', 0],
        cas: ['s.xref', '"cas"', 0],
        target_amount_value: ['s.target_amount_value', '"target amount"', 0],
        target_amount_unit: ['s.target_amount_unit', '"target unit"', 0],
        real_amount_value: ['s.real_amount_value', '"real amount"', 0],
        real_amount_unit: ['s.real_amount_unit', '"real unit"', 0],
        description: ['s.description', '"description"', 0],
        molfile: ["encode(s.molfile, 'escape')", 'molfile', 1],
        purity: ['s.purity', '"purity"', 0],
        solvent: ['s.solvent', '"solvent"', 0],
        # impurities: ['s.impurities', nil, 0],
        location: ['s.location', '"location"', 0],
        is_top_secret: ['s.is_top_secret', '"secret"', 10],
        # ancestry: ['s.ancestry', nil, 10],
        short_label: ['s.short_label', '"short label"', 0],
        imported_readout: ['s.imported_readout', '"sample readout"', 10],
        sample_svg_file: ['s.sample_svg_file', 'image', 1],
        molecule_svg_file: ['m.molecule_svg_file', 'm_image', 1],
        identifier: ['s.identifier', nil, 1],
        density: ['s.density', '"density"', 0],
        melting_point: ['s.melting_point', '"melting pt"', 0],
        boiling_point: ['s.boiling_point', '"boiling pt"', 0],
        created_at: ['s.created_at', '"created at"', 0],
        updated_at: ['s.updated_at', '"updated_at"', 0],
        # deleted_at: ['wp.deleted_at', nil, 10],
        molecule_name: ['mn."name"', '"molecule name"', 1],
        molarity_value: ['s."molarity_value"', '"molarity_value"', 0],
        molarity_unit: ['s."molarity_unit"', '"molarity_unit"', 0],
        dry_solvent: ['s."dry_solvent"', '"dry_solvent"', 0],
        flash_point: ['s."flash_point"', '"flash point"', 0],
        refractive_index: ['s."refractive_index"', '"refractive index"', 0],
        inventory_label: ['s."inventory_label"', '"inventory label"', 0],
        solubility: ['s."solubility"', '"solubility"', 0],
        color: ['s."color"', '"color"', 0],
        form: ['s."form"', '"form"', 0],
        height: ['s."height"', '"height"', 0],
        width: ['s."width"', '"width"', 0],
        length: ['s."length"', '"length"', 0],
        storage_condition: ['s."storage_condition"', '"storage condition"', 0],
        state: ['s."state"', '"state"', 0],
      },
      sample_id: {
        external_label: ['s.external_label', '"sample external label"', 0],
        name: ['s."name"', '"sample name"', 0],
        short_label: ['s.short_label', '"short label"', 0],
        sample_type: ['s."sample_type"', '"sample type"', 0],
        # molecule_name: ['mn."name"', '"molecule name"', 1]
      },
      molecule: {
        cano_smiles: ['m.cano_smiles', '"canonical smiles"', 10],
        sum_formular: ['m.sum_formular', '"sum formula"', 10],
        inchistring: ['m.inchistring', 'inchistring', 10],
        molecular_weight: ['m.molecular_weight', '"MW"', 0],
        inchikey: ['m.inchikey', '"InChI"', 10],
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
        readouts: ['w.readouts', '"well readouts"', 10],
        additive: ['w.additive', nil, 10],
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
        reference: ['r_s.reference', '"r ref"', 10],
        conversion_rate: ['r_s.conversion_rate', '"r conversion rate"', 10],
      },
      analysis: {
        name: ['anac."name"', '"name"', 10],
        description: ['anac.description', '"description"', 10],
        kind: ['anac.extended_metadata->\'kind\'', '"kind"', 10],
        content: ['anac.extended_metadata->\'content\'', '"content"', 10],
        status: ['anac.extended_metadata->\'status\'', '"status"', 10],
      },
      dataset: {
        name: ['datc."name"', '"dataset name"', 10],
        description: ['datc.description', '"dataset description"', 10],
        instrument: ['datc.extended_metadata->\'instrument\'', '"instrument"', 10],
      },
      attachment: {
        filename: ['att.filename', '"filename"', 10],
        checksum: ['att.checksum', '"checksum"', 10],
      },
    }.freeze

  def custom_column_query(table, col, selection, user_id, attrs)
    column_map = {
      # Use samples table alias `s.id` for functions that operate on sample IDs.
      # This works across all export queries, including components exports
      # where `s_id` is not selected.
      'user_labels' => "labels_by_user_sample(#{user_id}, s.id) as user_labels",
      'literature' => "literatures_by_element('Sample', s.id) as literatures",
      'cas' => "s.xref->>'cas' as cas",
      'inventory_label' => "s.xref->>'inventory_label' as \"inventory label\"",
      'refractive_index' => "s.xref->>'refractive_index' as refractive_index",
      'flash_point' => "s.xref->>'flash_point' as flash_point",
      'solubility' => "s.xref->>'solubility' as solubility",
      'form' => "s.xref->>'form' as form",
    }

    if column_map[col]
      selection << column_map[col]
    elsif (s = attrs[table][col.to_sym])
      selection << "#{s[1] && s[0]} as #{s[1] || s[0]}"
    end
  end

  def build_column_query(sel, user_id = 0, attrs = EXP_MAP_ATTR)
    selection = []
    # 'name' is required so the export can filter for HierarchicalMaterial components
    composition_table_properties = %w[name source molar_mass molecule_id weight_ratio_exp template_category].freeze
    attrs.each_key do |table|
      sel.symbolize_keys.fetch(table, []).each do |col|
        custom_column_query(table, col, selection, user_id, attrs)
      end
    end

    selection = Export::ExportChemicals.build_chemical_column_query(selection, sel) if sel[:chemicals].present?

    if sel[:components].present?
      if sel[:components].include?('composition_table')
        composition_table_properties.each do |field|
          sel[:components] << field unless sel[:components].include?(field)
        end
      end
      return Export::ExportComponents.build_component_column_query(selection, sel)
    end

    sel[:chemicals].present? ? selection : selection.join(',')
  end

  def filter_column_selection(table, columns = params[:columns])
    case table.to_sym
    when :sample
      columns.slice(:sample, :molecule)
    when :reaction
      columns.slice(:sample, :molecule, :reaction)
    when :wellplate
      columns.slice(:sample, :molecule, :wellplate)
    when :sample_analyses
      # FIXME: slice analyses + process properly
      columns.slice(:analyses).merge(sample_id: params[:columns][:sample])
    # TODO: reaction analyses data
    # when :reaction_analyses
    #  columns.slice(:analysis).merge(reaction_id: params[:columns][:reaction])
    when :sample_chemicals
      columns.slice(:chemicals, :sample, :molecule)
    when :sample_components
      columns.slice(:components, :sample, :molecule)
    else
      {}
    end
  end

  def force_molfile_selection
    sample_params = params[:columns][:sample]
    return unless sample_params.nil? || sample_params.exclude?(:molfile)

    params[:columns][:sample] = (sample_params || []) + [:molfile]
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
      readouts
    ],
  }.freeze

  DEFAULT_COLUMNS_REACTION = {
    reaction: %i[
      name
      short_label
      equivalent
      reference
      type
      conversion_rate
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
    ],
  }.freeze

  def default_columns_reaction
    DEFAULT_COLUMNS_REACTION
  end

  def default_columns_wellplate
    DEFAULT_COLUMNS_WELLPLATE
  end
end
