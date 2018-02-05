# frozen_string_literal: true

# desc: Helper methods for GrapeAPI::ReportAPI
module ReportHelpers
  extend Grape::API::Helpers

  params :export_params do
    requires :columns, type: Array[String]
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
    ;
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
end
