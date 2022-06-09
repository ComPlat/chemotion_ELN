SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: hstore; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS hstore WITH SCHEMA public;


--
-- Name: EXTENSION hstore; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION hstore IS 'data type for storing sets of (key, value) pairs';


--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: collection_shared_names(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.collection_shared_names(user_id integer, collection_id integer) RETURNS json
    LANGUAGE sql
    AS $_$
 select array_to_json(array_agg(row_to_json(result))) from (
 SELECT sync_collections_users.id, users.type,users.first_name || chr(32) || users.last_name as name,sync_collections_users.permission_level,
 sync_collections_users.reaction_detail_level,sync_collections_users.sample_detail_level,sync_collections_users.screen_detail_level,sync_collections_users.wellplate_detail_level
 FROM sync_collections_users
 INNER JOIN users ON users.id = sync_collections_users.user_id AND users.deleted_at IS NULL
 WHERE sync_collections_users.shared_by_id = $1 and sync_collections_users.collection_id = $2
 group by  sync_collections_users.id,users.type,users.name_abbreviation,users.first_name,users.last_name,sync_collections_users.permission_level
 ) as result
 $_$;


--
-- Name: detail_level_for_sample(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.detail_level_for_sample(in_user_id integer, in_sample_id integer) RETURNS TABLE(detail_level_sample integer, detail_level_wellplate integer)
    LANGUAGE plpgsql
    AS $$
declare
  i_detail_level_wellplate integer default 0;
  i_detail_level_sample integer default 0;
begin
  select max(all_cols.sample_detail_level), max(all_cols.wellplate_detail_level)
  into i_detail_level_sample, i_detail_level_wellplate
  from
  (
    select v_sams_cols.cols_sample_detail_level sample_detail_level, v_sams_cols.cols_wellplate_detail_level wellplate_detail_level
      from v_samples_collections v_sams_cols
      where v_sams_cols.sams_id = in_sample_id
      and v_sams_cols.cols_user_id in (select user_ids(in_user_id))
    union
    select sync_cols.sample_detail_level sample_detail_level, sync_cols.wellplate_detail_level wellplate_detail_level
      from sync_collections_users sync_cols
      inner join collections cols on cols.id = sync_cols.collection_id and cols.deleted_at is null
      where sync_cols.collection_id in
      (
        select v_sams_cols.cols_id
        from v_samples_collections v_sams_cols
        where v_sams_cols.sams_id = in_sample_id
      )
      and sync_cols.user_id in (select user_ids(in_user_id))
  ) all_cols;

    return query select coalesce(i_detail_level_sample,0) detail_level_sample, coalesce(i_detail_level_wellplate,0) detail_level_wellplate;
end;$$;


--
-- Name: generate_notifications(integer, integer, integer, integer[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_notifications(in_channel_id integer, in_message_id integer, in_user_id integer, in_user_ids integer[]) RETURNS integer
    LANGUAGE plpgsql
    AS $$
declare
  i_channel_type int4;
  a_userids int4[];
  u int4;
begin
	select channel_type into i_channel_type
	from channels where id = in_channel_id;

  case i_channel_type
	when 9 then
	  insert into notifications (message_id, user_id, created_at,updated_at)
	  (select in_message_id, id, now(),now() from users where deleted_at is null and type='Person');
	when 5,8 then
	  if (in_user_ids is not null) then
	  a_userids = in_user_ids;
	  end if;
	  FOREACH u IN ARRAY a_userids
	  loop
		  insert into notifications (message_id, user_id, created_at,updated_at)
		  (select distinct in_message_id, id, now(),now() from users where type='Person' and id in (select group_user_ids(u))
		   and not exists (select id from notifications where message_id = in_message_id and user_id = users.id));
 	  end loop;
	end case;
	return in_message_id;
end;$$;


--
-- Name: generate_users_matrix(integer[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_users_matrix(in_user_ids integer[]) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
begin
	if in_user_ids is null then
    update users u set matrix = (
	    select coalesce(sum(2^mx.id),0) from (
		    select distinct m1.* from matrices m1, users u1
				left join users_groups ug1 on ug1.user_id = u1.id
		      where u.id = u1.id and ((m1.enabled = true) or ((u1.id = any(m1.include_ids)) or (u1.id = ug1.user_id and ug1.group_id = any(m1.include_ids))))
	      except
		    select distinct m2.* from matrices m2, users u2
				left join users_groups ug2 on ug2.user_id = u2.id
		      where u.id = u2.id and ((u2.id = any(m2.exclude_ids)) or (u2.id = ug2.user_id and ug2.group_id = any(m2.exclude_ids)))
	    ) mx
    );
	else
		  update users u set matrix = (
		  	select coalesce(sum(2^mx.id),0) from (
			   select distinct m1.* from matrices m1, users u1
				 left join users_groups ug1 on ug1.user_id = u1.id
			     where u.id = u1.id and ((m1.enabled = true) or ((u1.id = any(m1.include_ids)) or (u1.id = ug1.user_id and ug1.group_id = any(m1.include_ids))))
			   except
			   select distinct m2.* from matrices m2, users u2
				 left join users_groups ug2 on ug2.user_id = u2.id
			     where u.id = u2.id and ((u2.id = any(m2.exclude_ids)) or (u2.id = ug2.user_id and ug2.group_id = any(m2.exclude_ids)))
			  ) mx
		  ) where ((in_user_ids) @> array[u.id]) or (u.id in (select ug3.user_id from users_groups ug3 where (in_user_ids) @> array[ug3.group_id]));
	end if;
  return true;
end
$$;


--
-- Name: group_user_ids(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.group_user_ids(group_id integer) RETURNS TABLE(user_ids integer)
    LANGUAGE sql
    AS $_$
       select id from users where type='Person' and id= $1
       union
       select user_id from users_groups where group_id = $1
$_$;


--
-- Name: labels_by_user_sample(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.labels_by_user_sample(user_id integer, sample_id integer) RETURNS TABLE(labels text)
    LANGUAGE sql
    AS $_$
   select string_agg(title::text, ', ') as labels from (select title from user_labels ul where ul.id in (
     select d.list
     from element_tags et, lateral (
       select value::integer as list
       from jsonb_array_elements_text(et.taggable_data  -> 'user_labels')
     ) d
     where et.taggable_id = $2 and et.taggable_type = 'Sample'
   ) and (ul.access_level = 1 or (ul.access_level = 0 and ul.user_id = $1)) order by title  ) uls
 $_$;


--
-- Name: literatures_by_element(text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.literatures_by_element(element_type text, element_id integer) RETURNS TABLE(literatures text)
    LANGUAGE sql
    AS $_$
   select string_agg(l2.id::text, ',') as literatures from literals l , literatures l2 
   where l.literature_id = l2.id 
   and l.element_type = $1 and l.element_id = $2
 $_$;


--
-- Name: logidze_capture_exception(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.logidze_capture_exception(error_data jsonb) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
  -- version: 1
BEGIN
  -- Feel free to change this function to change Logidze behavior on exception.
  --
  -- Return `false` to raise exception or `true` to commit record changes.
  --
  -- `error_data` contains:
  --   - returned_sqlstate
  --   - message_text
  --   - pg_exception_detail
  --   - pg_exception_hint
  --   - pg_exception_context
  --   - schema_name
  --   - table_name
  -- Learn more about available keys:
  -- https://www.postgresql.org/docs/9.6/plpgsql-control-structures.html#PLPGSQL-EXCEPTION-DIAGNOSTICS-VALUES
  --

  return false;
END;
$$;


--
-- Name: logidze_compact_history(jsonb, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.logidze_compact_history(log_data jsonb, cutoff integer DEFAULT 1) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
  -- version: 1
  DECLARE
    merged jsonb;
  BEGIN
    LOOP
      merged := jsonb_build_object(
        'ts',
        log_data#>'{h,1,ts}',
        'v',
        log_data#>'{h,1,v}',
        'c',
        (log_data#>'{h,0,c}') || (log_data#>'{h,1,c}')
      );

      IF (log_data#>'{h,1}' ? 'm') THEN
        merged := jsonb_set(merged, ARRAY['m'], log_data#>'{h,1,m}');
      END IF;

      log_data := jsonb_set(
        log_data,
        '{h}',
        jsonb_set(
          log_data->'h',
          '{1}',
          merged
        ) - 0
      );

      cutoff := cutoff - 1;

      EXIT WHEN cutoff <= 0;
    END LOOP;

    return log_data;
  END;
$$;


--
-- Name: logidze_filter_keys(jsonb, text[], boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.logidze_filter_keys(obj jsonb, keys text[], include_columns boolean DEFAULT false) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
  -- version: 1
  DECLARE
    res jsonb;
    key text;
  BEGIN
    res := '{}';

    IF include_columns THEN
      FOREACH key IN ARRAY keys
      LOOP
        IF obj ? key THEN
          res = jsonb_insert(res, ARRAY[key], obj->key);
        END IF;
      END LOOP;
    ELSE
      res = obj;
      FOREACH key IN ARRAY keys
      LOOP
        res = res - key;
      END LOOP;
    END IF;

    RETURN res;
  END;
$$;


--
-- Name: logidze_logger(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.logidze_logger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
  -- version: 2
  DECLARE
    changes jsonb;
    version jsonb;
    snapshot jsonb;
    new_v integer;
    size integer;
    history_limit integer;
    debounce_time integer;
    current_version integer;
    k text;
    iterator integer;
    item record;
    columns text[];
    include_columns boolean;
    ts timestamp with time zone;
    ts_column text;
    err_sqlstate text;
    err_message text;
    err_detail text;
    err_hint text;
    err_context text;
    err_table_name text;
    err_schema_name text;
    err_jsonb jsonb;
    err_captured boolean;
  BEGIN
    ts_column := NULLIF(TG_ARGV[1], 'null');
    columns := NULLIF(TG_ARGV[2], 'null');
    include_columns := NULLIF(TG_ARGV[3], 'null');

    IF TG_OP = 'INSERT' THEN
      IF columns IS NOT NULL THEN
        snapshot = logidze_snapshot(to_jsonb(NEW.*), ts_column, columns, include_columns);
      ELSE
        snapshot = logidze_snapshot(to_jsonb(NEW.*), ts_column);
      END IF;

      IF snapshot#>>'{h, -1, c}' != '{}' THEN
        NEW.log_data := snapshot;
      END IF;

    ELSIF TG_OP = 'UPDATE' THEN

      IF OLD.log_data is NULL OR OLD.log_data = '{}'::jsonb THEN
        IF columns IS NOT NULL THEN
          snapshot = logidze_snapshot(to_jsonb(NEW.*), ts_column, columns, include_columns);
        ELSE
          snapshot = logidze_snapshot(to_jsonb(NEW.*), ts_column);
        END IF;

        IF snapshot#>>'{h, -1, c}' != '{}' THEN
          NEW.log_data := snapshot;
        END IF;
        RETURN NEW;
      END IF;

      history_limit := NULLIF(TG_ARGV[0], 'null');
      debounce_time := NULLIF(TG_ARGV[4], 'null');

      current_version := (NEW.log_data->>'v')::int;

      IF ts_column IS NULL THEN
        ts := statement_timestamp();
      ELSE
        ts := (to_jsonb(NEW.*)->>ts_column)::timestamp with time zone;
        IF ts IS NULL OR ts = (to_jsonb(OLD.*)->>ts_column)::timestamp with time zone THEN
          ts := statement_timestamp();
        END IF;
      END IF;

      IF NEW = OLD THEN
        RETURN NEW;
      END IF;

      IF current_version < (NEW.log_data#>>'{h,-1,v}')::int THEN
        iterator := 0;
        FOR item in SELECT * FROM jsonb_array_elements(NEW.log_data->'h')
        LOOP
          IF (item.value->>'v')::int > current_version THEN
            NEW.log_data := jsonb_set(
              NEW.log_data,
              '{h}',
              (NEW.log_data->'h') - iterator
            );
          END IF;
          iterator := iterator + 1;
        END LOOP;
      END IF;

      changes := '{}';

      IF (coalesce(current_setting('logidze.full_snapshot', true), '') = 'on') THEN
        BEGIN
          changes = hstore_to_jsonb_loose(hstore(NEW.*));
        EXCEPTION
          WHEN NUMERIC_VALUE_OUT_OF_RANGE THEN
            changes = row_to_json(NEW.*)::jsonb;
            FOR k IN (SELECT key FROM jsonb_each(changes))
            LOOP
              IF jsonb_typeof(changes->k) = 'object' THEN
                changes = jsonb_set(changes, ARRAY[k], to_jsonb(changes->>k));
              END IF;
            END LOOP;
        END;
      ELSE
        BEGIN
          changes = hstore_to_jsonb_loose(
                hstore(NEW.*) - hstore(OLD.*)
            );
        EXCEPTION
          WHEN NUMERIC_VALUE_OUT_OF_RANGE THEN
            changes = (SELECT
              COALESCE(json_object_agg(key, value), '{}')::jsonb
              FROM
              jsonb_each(row_to_json(NEW.*)::jsonb)
              WHERE NOT jsonb_build_object(key, value) <@ row_to_json(OLD.*)::jsonb);
            FOR k IN (SELECT key FROM jsonb_each(changes))
            LOOP
              IF jsonb_typeof(changes->k) = 'object' THEN
                changes = jsonb_set(changes, ARRAY[k], to_jsonb(changes->>k));
              END IF;
            END LOOP;
        END;
      END IF;

      changes = changes - 'log_data';

      IF columns IS NOT NULL THEN
        changes = logidze_filter_keys(changes, columns, include_columns);
      END IF;

      IF changes = '{}' THEN
        RETURN NEW;
      END IF;

      new_v := (NEW.log_data#>>'{h,-1,v}')::int + 1;

      size := jsonb_array_length(NEW.log_data->'h');
      version := logidze_version(new_v, changes, ts);

      IF (
        debounce_time IS NOT NULL AND
        (version->>'ts')::bigint - (NEW.log_data#>'{h,-1,ts}')::text::bigint <= debounce_time
      ) THEN
        -- merge new version with the previous one
        new_v := (NEW.log_data#>>'{h,-1,v}')::int;
        version := logidze_version(new_v, (NEW.log_data#>'{h,-1,c}')::jsonb || changes, ts);
        -- remove the previous version from log
        NEW.log_data := jsonb_set(
          NEW.log_data,
          '{h}',
          (NEW.log_data->'h') - (size - 1)
        );
      END IF;

      NEW.log_data := jsonb_set(
        NEW.log_data,
        ARRAY['h', size::text],
        version,
        true
      );

      NEW.log_data := jsonb_set(
        NEW.log_data,
        '{v}',
        to_jsonb(new_v)
      );

      IF history_limit IS NOT NULL AND history_limit <= size THEN
        NEW.log_data := logidze_compact_history(NEW.log_data, size - history_limit + 1);
      END IF;
    END IF;

    return NEW;
  EXCEPTION
    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS err_sqlstate = RETURNED_SQLSTATE,
                              err_message = MESSAGE_TEXT,
                              err_detail = PG_EXCEPTION_DETAIL,
                              err_hint = PG_EXCEPTION_HINT,
                              err_context = PG_EXCEPTION_CONTEXT,
                              err_schema_name = SCHEMA_NAME,
                              err_table_name = TABLE_NAME;
      err_jsonb := jsonb_build_object(
        'returned_sqlstate', err_sqlstate,
        'message_text', err_message,
        'pg_exception_detail', err_detail,
        'pg_exception_hint', err_hint,
        'pg_exception_context', err_context,
        'schema_name', err_schema_name,
        'table_name', err_table_name
      );
      err_captured = logidze_capture_exception(err_jsonb);
      IF err_captured THEN
        return NEW;
      ELSE
        RAISE;
      END IF;
  END;
$$;


--
-- Name: logidze_snapshot(jsonb, text, text[], boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.logidze_snapshot(item jsonb, ts_column text DEFAULT NULL::text, columns text[] DEFAULT NULL::text[], include_columns boolean DEFAULT false) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
  -- version: 3
  DECLARE
    ts timestamp with time zone;
    k text;
  BEGIN
    item = item - 'log_data';
    IF ts_column IS NULL THEN
      ts := statement_timestamp();
    ELSE
      ts := coalesce((item->>ts_column)::timestamp with time zone, statement_timestamp());
    END IF;

    IF columns IS NOT NULL THEN
      item := logidze_filter_keys(item, columns, include_columns);
    END IF;

    FOR k IN (SELECT key FROM jsonb_each(item))
    LOOP
      IF jsonb_typeof(item->k) = 'object' THEN
         item := jsonb_set(item, ARRAY[k], to_jsonb(item->>k));
      END IF;
    END LOOP;

    return json_build_object(
      'v', 1,
      'h', jsonb_build_array(
              logidze_version(1, item, ts)
            )
      );
  END;
$$;


--
-- Name: logidze_version(bigint, jsonb, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.logidze_version(v bigint, data jsonb, ts timestamp with time zone) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
  -- version: 2
  DECLARE
    buf jsonb;
  BEGIN
    data = data - 'log_data';
    buf := jsonb_build_object(
              'ts',
              (extract(epoch from ts) * 1000)::bigint,
              'v',
              v,
              'c',
              data
              );
    IF coalesce(current_setting('logidze.meta', true), '') <> '' THEN
      buf := jsonb_insert(buf, '{m}', current_setting('logidze.meta')::jsonb);
    END IF;
    RETURN buf;
  END;
$$;


--
-- Name: shared_user_as_json(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.shared_user_as_json(in_user_id integer, in_current_user_id integer) RETURNS json
    LANGUAGE plpgsql
    AS $_$
   begin
    if (in_user_id = in_current_user_id) then
      return null;
    else
      return (select row_to_json(result) from (
      select users.id, users.name_abbreviation as initials ,users.type,users.first_name || chr(32) || users.last_name as name
      from users where id = $1
      ) as result);
    end if;
    end;
 $_$;


--
-- Name: update_users_matrix(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_users_matrix() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
	if (TG_OP='INSERT') then
    PERFORM generate_users_matrix(null);
	end if;

	if (TG_OP='UPDATE') then
	  if new.enabled <> old.enabled or new.deleted_at <> new.deleted_at then
      PERFORM generate_users_matrix(null);
	  elsif new.include_ids <> old.include_ids then
      PERFORM generate_users_matrix(new.include_ids || old.include_ids);
    elsif new.exclude_ids <> old.exclude_ids then
      PERFORM generate_users_matrix(new.exclude_ids || old.exclude_ids);
	  end if;
	end if;
  return new;
end
$$;


--
-- Name: user_as_json(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.user_as_json(user_id integer) RETURNS json
    LANGUAGE sql
    AS $_$
   select row_to_json(result) from (
     select users.id, users.name_abbreviation as initials ,users.type,users.first_name || chr(32) || users.last_name as name
     from users where id = $1
   ) as result
 $_$;


--
-- Name: user_ids(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.user_ids(user_id integer) RETURNS TABLE(user_ids integer)
    LANGUAGE sql
    AS $_$
    select $1 as id
    union
    (select users.id from users inner join users_groups ON users.id = users_groups.group_id WHERE users.deleted_at IS null
   and users.type in ('Group') and users_groups.user_id = $1)
  $_$;


--
-- Name: user_instrument(integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.user_instrument(user_id integer, sc text) RETURNS TABLE(instrument text)
    LANGUAGE sql
    AS $_$
   select distinct extended_metadata -> 'instrument' as instrument from containers c
   where c.container_type='dataset' and c.id in
   (select ch.descendant_id from containers sc,container_hierarchies ch, samples s, users u
   where sc.containable_type in ('Sample','Reaction') and ch.ancestor_id=sc.id and sc.containable_id=s.id
   and s.created_by = u.id and u.id = $1 and ch.generations=3 group by descendant_id)
   and upper(extended_metadata -> 'instrument') like upper($2 || '%')
   order by extended_metadata -> 'instrument' limit 10
 $_$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: affiliations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.affiliations (
    id integer NOT NULL,
    company character varying,
    country character varying,
    organization character varying,
    department character varying,
    "group" character varying,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    "from" date,
    "to" date,
    domain character varying,
    cat character varying
);


--
-- Name: affiliations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.affiliations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: affiliations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.affiliations_id_seq OWNED BY public.affiliations.id;


--
-- Name: analyses_experiments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.analyses_experiments (
    id integer NOT NULL,
    sample_id integer,
    holder_id integer,
    status character varying,
    devices_analysis_id integer NOT NULL,
    devices_sample_id integer NOT NULL,
    sample_analysis_id character varying NOT NULL,
    solvent character varying,
    experiment character varying,
    priority boolean,
    on_day boolean,
    number_of_scans integer,
    sweep_width integer,
    "time" character varying,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: analyses_experiments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.analyses_experiments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: analyses_experiments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.analyses_experiments_id_seq OWNED BY public.analyses_experiments.id;


--
-- Name: ar_internal_metadata; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ar_internal_metadata (
    key character varying NOT NULL,
    value character varying,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attachments (
    id integer NOT NULL,
    attachable_id integer,
    filename character varying,
    identifier uuid DEFAULT public.uuid_generate_v4(),
    checksum character varying,
    storage character varying(20) DEFAULT 'tmp'::character varying,
    created_by integer NOT NULL,
    created_for integer,
    version character varying,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    content_type character varying,
    bucket character varying,
    key character varying(500),
    thumb boolean DEFAULT false,
    folder character varying,
    attachable_type character varying,
    aasm_state character varying,
    filesize bigint,
    attachment_data jsonb,
    is_editing boolean DEFAULT false,
    log_data jsonb
);


--
-- Name: attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.attachments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.attachments_id_seq OWNED BY public.attachments.id;


--
-- Name: authentication_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.authentication_keys (
    id integer NOT NULL,
    token character varying NOT NULL,
    user_id integer,
    ip inet,
    role character varying,
    fqdn character varying,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: authentication_keys_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.authentication_keys_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: authentication_keys_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.authentication_keys_id_seq OWNED BY public.authentication_keys.id;


--
-- Name: channels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.channels (
    id integer NOT NULL,
    subject character varying,
    msg_template jsonb,
    channel_type integer DEFAULT 0,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: channels_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.channels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: channels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.channels_id_seq OWNED BY public.channels.id;


--
-- Name: code_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.code_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    source character varying,
    source_id integer,
    value character varying(40),
    deleted_at timestamp without time zone,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: collections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.collections (
    id integer NOT NULL,
    user_id integer NOT NULL,
    ancestry character varying,
    label text NOT NULL,
    shared_by_id integer,
    is_shared boolean DEFAULT false,
    permission_level integer DEFAULT 0,
    sample_detail_level integer DEFAULT 10,
    reaction_detail_level integer DEFAULT 10,
    wellplate_detail_level integer DEFAULT 10,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    "position" integer,
    screen_detail_level integer DEFAULT 10,
    is_locked boolean DEFAULT false,
    deleted_at timestamp without time zone,
    is_synchronized boolean DEFAULT false NOT NULL,
    researchplan_detail_level integer DEFAULT 10,
    element_detail_level integer DEFAULT 10
);


--
-- Name: collections_elements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.collections_elements (
    id integer NOT NULL,
    collection_id integer,
    element_id integer,
    element_type character varying,
    deleted_at timestamp without time zone
);


--
-- Name: collections_elements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.collections_elements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: collections_elements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.collections_elements_id_seq OWNED BY public.collections_elements.id;


--
-- Name: collections_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.collections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: collections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.collections_id_seq OWNED BY public.collections.id;


--
-- Name: collections_reactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.collections_reactions (
    id integer NOT NULL,
    collection_id integer,
    reaction_id integer,
    deleted_at timestamp without time zone
);


--
-- Name: collections_reactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.collections_reactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: collections_reactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.collections_reactions_id_seq OWNED BY public.collections_reactions.id;


--
-- Name: collections_research_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.collections_research_plans (
    id integer NOT NULL,
    collection_id integer,
    research_plan_id integer,
    deleted_at timestamp without time zone
);


--
-- Name: collections_research_plans_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.collections_research_plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: collections_research_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.collections_research_plans_id_seq OWNED BY public.collections_research_plans.id;


--
-- Name: collections_samples; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.collections_samples (
    id integer NOT NULL,
    collection_id integer,
    sample_id integer,
    deleted_at timestamp without time zone
);


--
-- Name: collections_samples_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.collections_samples_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: collections_samples_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.collections_samples_id_seq OWNED BY public.collections_samples.id;


--
-- Name: collections_screens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.collections_screens (
    id integer NOT NULL,
    collection_id integer,
    screen_id integer,
    deleted_at timestamp without time zone
);


--
-- Name: collections_screens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.collections_screens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: collections_screens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.collections_screens_id_seq OWNED BY public.collections_screens.id;


--
-- Name: collections_wellplates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.collections_wellplates (
    id integer NOT NULL,
    collection_id integer,
    wellplate_id integer,
    deleted_at timestamp without time zone
);


--
-- Name: collections_wellplates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.collections_wellplates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: collections_wellplates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.collections_wellplates_id_seq OWNED BY public.collections_wellplates.id;


--
-- Name: collector_errors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.collector_errors (
    id integer NOT NULL,
    error_code character varying,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: collector_errors_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.collector_errors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: collector_errors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.collector_errors_id_seq OWNED BY public.collector_errors.id;


--
-- Name: computed_props; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.computed_props (
    id integer NOT NULL,
    molecule_id integer,
    max_potential double precision DEFAULT 0.0,
    min_potential double precision DEFAULT 0.0,
    mean_potential double precision DEFAULT 0.0,
    lumo double precision DEFAULT 0.0,
    homo double precision DEFAULT 0.0,
    ip double precision DEFAULT 0.0,
    ea double precision DEFAULT 0.0,
    dipol_debye double precision DEFAULT 0.0,
    status integer DEFAULT 0,
    data jsonb,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    mean_abs_potential double precision DEFAULT 0.0,
    creator integer DEFAULT 0,
    sample_id integer DEFAULT 0,
    tddft jsonb DEFAULT '{}'::jsonb,
    task_id character varying,
    deleted_at timestamp without time zone
);


--
-- Name: computed_props_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.computed_props_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: computed_props_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.computed_props_id_seq OWNED BY public.computed_props.id;


--
-- Name: container_hierarchies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.container_hierarchies (
    ancestor_id integer NOT NULL,
    descendant_id integer NOT NULL,
    generations integer NOT NULL
);


--
-- Name: containers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.containers (
    id integer NOT NULL,
    ancestry character varying,
    containable_id integer,
    containable_type character varying,
    name character varying,
    container_type character varying,
    description text,
    extended_metadata public.hstore DEFAULT ''::public.hstore,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    parent_id integer
);


--
-- Name: containers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.containers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: containers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.containers_id_seq OWNED BY public.containers.id;


--
-- Name: dataset_klasses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dataset_klasses (
    id integer NOT NULL,
    ols_term_id character varying NOT NULL,
    label character varying NOT NULL,
    "desc" character varying,
    properties_template jsonb DEFAULT '{"layers": {}, "select_options": {}}'::jsonb NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    place integer DEFAULT 100 NOT NULL,
    created_by integer NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone,
    deleted_at timestamp without time zone,
    uuid character varying,
    properties_release jsonb DEFAULT '{}'::jsonb,
    released_at timestamp without time zone
);


--
-- Name: dataset_klasses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dataset_klasses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dataset_klasses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dataset_klasses_id_seq OWNED BY public.dataset_klasses.id;


--
-- Name: dataset_klasses_revisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dataset_klasses_revisions (
    id integer NOT NULL,
    dataset_klass_id integer,
    uuid character varying,
    properties_release jsonb DEFAULT '{}'::jsonb,
    released_at timestamp without time zone,
    released_by integer,
    created_by integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    deleted_at timestamp without time zone
);


--
-- Name: dataset_klasses_revisions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dataset_klasses_revisions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dataset_klasses_revisions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dataset_klasses_revisions_id_seq OWNED BY public.dataset_klasses_revisions.id;


--
-- Name: datasets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.datasets (
    id integer NOT NULL,
    dataset_klass_id integer,
    element_type character varying,
    element_id integer,
    properties jsonb,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone,
    uuid character varying,
    klass_uuid character varying,
    deleted_at timestamp without time zone
);


--
-- Name: datasets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.datasets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: datasets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.datasets_id_seq OWNED BY public.datasets.id;


--
-- Name: datasets_revisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.datasets_revisions (
    id integer NOT NULL,
    dataset_id integer,
    uuid character varying,
    klass_uuid character varying,
    properties jsonb DEFAULT '{}'::jsonb,
    created_by integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    deleted_at timestamp without time zone
);


--
-- Name: datasets_revisions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.datasets_revisions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: datasets_revisions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.datasets_revisions_id_seq OWNED BY public.datasets_revisions.id;


--
-- Name: delayed_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delayed_jobs (
    id integer NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    handler text NOT NULL,
    last_error text,
    run_at timestamp without time zone,
    locked_at timestamp without time zone,
    failed_at timestamp without time zone,
    locked_by character varying,
    queue character varying,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    cron character varying
);


--
-- Name: delayed_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.delayed_jobs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: delayed_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.delayed_jobs_id_seq OWNED BY public.delayed_jobs.id;


--
-- Name: device_metadata; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.device_metadata (
    id integer NOT NULL,
    device_id integer,
    doi character varying,
    url character varying,
    landing_page character varying,
    name character varying,
    type character varying,
    description character varying,
    publisher character varying,
    publication_year integer,
    manufacturers jsonb,
    owners jsonb,
    dates jsonb,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    deleted_at timestamp without time zone,
    doi_sequence integer,
    data_cite_prefix character varying,
    data_cite_created_at timestamp without time zone,
    data_cite_updated_at timestamp without time zone,
    data_cite_version integer,
    data_cite_last_response jsonb DEFAULT '{}'::jsonb,
    data_cite_state character varying DEFAULT 'draft'::character varying,
    data_cite_creator_name character varying
);


--
-- Name: device_metadata_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.device_metadata_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: device_metadata_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.device_metadata_id_seq OWNED BY public.device_metadata.id;


--
-- Name: element_klasses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.element_klasses (
    id integer NOT NULL,
    name character varying,
    label character varying,
    "desc" character varying,
    icon_name character varying,
    is_active boolean DEFAULT true NOT NULL,
    klass_prefix character varying DEFAULT 'E'::character varying NOT NULL,
    is_generic boolean DEFAULT true NOT NULL,
    place integer DEFAULT 100 NOT NULL,
    properties_template jsonb,
    created_by integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    deleted_at timestamp without time zone,
    uuid character varying,
    properties_release jsonb DEFAULT '{}'::jsonb,
    released_at timestamp without time zone
);


--
-- Name: element_klasses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.element_klasses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: element_klasses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.element_klasses_id_seq OWNED BY public.element_klasses.id;


--
-- Name: element_klasses_revisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.element_klasses_revisions (
    id integer NOT NULL,
    element_klass_id integer,
    uuid character varying,
    properties_release jsonb DEFAULT '{}'::jsonb,
    released_at timestamp without time zone,
    released_by integer,
    created_by integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    deleted_at timestamp without time zone
);


--
-- Name: element_klasses_revisions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.element_klasses_revisions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: element_klasses_revisions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.element_klasses_revisions_id_seq OWNED BY public.element_klasses_revisions.id;


--
-- Name: element_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.element_tags (
    id integer NOT NULL,
    taggable_type character varying,
    taggable_id integer,
    taggable_data jsonb,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: element_tags_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.element_tags_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: element_tags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.element_tags_id_seq OWNED BY public.element_tags.id;


--
-- Name: elemental_compositions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.elemental_compositions (
    id integer NOT NULL,
    sample_id integer NOT NULL,
    composition_type character varying NOT NULL,
    data public.hstore DEFAULT ''::public.hstore NOT NULL,
    loading double precision,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: elemental_compositions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.elemental_compositions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: elemental_compositions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.elemental_compositions_id_seq OWNED BY public.elemental_compositions.id;


--
-- Name: elements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.elements (
    id integer NOT NULL,
    name character varying,
    element_klass_id integer,
    short_label character varying,
    properties jsonb,
    created_by integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    deleted_at timestamp without time zone,
    uuid character varying,
    klass_uuid character varying
);


--
-- Name: elements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.elements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: elements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.elements_id_seq OWNED BY public.elements.id;


--
-- Name: elements_revisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.elements_revisions (
    id integer NOT NULL,
    element_id integer,
    uuid character varying,
    klass_uuid character varying,
    name character varying,
    properties jsonb DEFAULT '{}'::jsonb,
    created_by integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    deleted_at timestamp without time zone
);


--
-- Name: elements_revisions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.elements_revisions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: elements_revisions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.elements_revisions_id_seq OWNED BY public.elements_revisions.id;


--
-- Name: elements_samples; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.elements_samples (
    id integer NOT NULL,
    element_id integer,
    sample_id integer,
    created_by integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    deleted_at timestamp without time zone
);


--
-- Name: elements_samples_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.elements_samples_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: elements_samples_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.elements_samples_id_seq OWNED BY public.elements_samples.id;


--
-- Name: experiments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.experiments (
    id integer NOT NULL,
    type character varying(20),
    name character varying,
    description text,
    status character varying(20),
    parameter jsonb,
    user_id integer,
    device_id integer,
    container_id integer,
    experimentable_id integer,
    experimentable_type character varying,
    ancestry character varying,
    parent_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: experiments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.experiments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: experiments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.experiments_id_seq OWNED BY public.experiments.id;


--
-- Name: fingerprints; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fingerprints (
    id integer NOT NULL,
    fp0 bit(64),
    fp1 bit(64),
    fp2 bit(64),
    fp3 bit(64),
    fp4 bit(64),
    fp5 bit(64),
    fp6 bit(64),
    fp7 bit(64),
    fp8 bit(64),
    fp9 bit(64),
    fp10 bit(64),
    fp11 bit(64),
    fp12 bit(64),
    fp13 bit(64),
    fp14 bit(64),
    fp15 bit(64),
    num_set_bits smallint,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    deleted_at time without time zone
);


--
-- Name: fingerprints_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fingerprints_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fingerprints_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fingerprints_id_seq OWNED BY public.fingerprints.id;


--
-- Name: ketcherails_amino_acids; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ketcherails_amino_acids (
    id integer NOT NULL,
    moderated_by integer,
    suggested_by integer,
    name character varying NOT NULL,
    molfile text NOT NULL,
    aid integer DEFAULT 1 NOT NULL,
    aid2 integer DEFAULT 1 NOT NULL,
    bid integer DEFAULT 1 NOT NULL,
    icon_path character varying,
    sprite_class character varying,
    status character varying,
    notes text,
    approved_at timestamp without time zone,
    rejected_at timestamp without time zone,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    icon_file_name character varying,
    icon_content_type character varying,
    icon_file_size integer,
    icon_updated_at timestamp without time zone
);


--
-- Name: ketcherails_amino_acids_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ketcherails_amino_acids_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ketcherails_amino_acids_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ketcherails_amino_acids_id_seq OWNED BY public.ketcherails_amino_acids.id;


--
-- Name: ketcherails_atom_abbreviations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ketcherails_atom_abbreviations (
    id integer NOT NULL,
    moderated_by integer,
    suggested_by integer,
    name character varying NOT NULL,
    molfile text NOT NULL,
    aid integer DEFAULT 1 NOT NULL,
    bid integer DEFAULT 1 NOT NULL,
    icon_path character varying,
    sprite_class character varying,
    status character varying,
    notes text,
    approved_at timestamp without time zone,
    rejected_at timestamp without time zone,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    icon_file_name character varying,
    icon_content_type character varying,
    icon_file_size integer,
    icon_updated_at timestamp without time zone,
    rtl_name character varying
);


--
-- Name: ketcherails_atom_abbreviations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ketcherails_atom_abbreviations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ketcherails_atom_abbreviations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ketcherails_atom_abbreviations_id_seq OWNED BY public.ketcherails_atom_abbreviations.id;


--
-- Name: ketcherails_common_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ketcherails_common_templates (
    id integer NOT NULL,
    moderated_by integer,
    suggested_by integer,
    name character varying NOT NULL,
    molfile text NOT NULL,
    icon_path character varying,
    sprite_class character varying,
    notes text,
    approved_at timestamp without time zone,
    rejected_at timestamp without time zone,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    template_category_id integer,
    status character varying,
    icon_file_name character varying,
    icon_content_type character varying,
    icon_file_size integer,
    icon_updated_at timestamp without time zone
);


--
-- Name: ketcherails_common_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ketcherails_common_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ketcherails_common_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ketcherails_common_templates_id_seq OWNED BY public.ketcherails_common_templates.id;


--
-- Name: ketcherails_custom_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ketcherails_custom_templates (
    id integer NOT NULL,
    user_id integer NOT NULL,
    name character varying NOT NULL,
    molfile text NOT NULL,
    icon_path character varying,
    sprite_class character varying,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: ketcherails_custom_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ketcherails_custom_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ketcherails_custom_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ketcherails_custom_templates_id_seq OWNED BY public.ketcherails_custom_templates.id;


--
-- Name: ketcherails_template_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ketcherails_template_categories (
    id integer NOT NULL,
    name character varying NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    icon_file_name character varying,
    icon_content_type character varying,
    icon_file_size integer,
    icon_updated_at timestamp without time zone,
    sprite_class character varying
);


--
-- Name: ketcherails_template_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ketcherails_template_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ketcherails_template_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ketcherails_template_categories_id_seq OWNED BY public.ketcherails_template_categories.id;


--
-- Name: literals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.literals (
    id integer NOT NULL,
    literature_id integer,
    element_id integer,
    element_type character varying(40),
    category character varying(40),
    user_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    litype character varying
);


--
-- Name: literatures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.literatures (
    id integer NOT NULL,
    title character varying,
    url character varying,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    deleted_at timestamp without time zone,
    refs jsonb,
    doi character varying,
    isbn character varying
);


--
-- Name: reactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reactions (
    id integer NOT NULL,
    name character varying,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    description text,
    timestamp_start character varying,
    timestamp_stop character varying,
    observation text,
    purification character varying[] DEFAULT '{}'::character varying[],
    dangerous_products character varying[] DEFAULT '{}'::character varying[],
    tlc_solvents character varying,
    tlc_description text,
    rf_value character varying,
    temperature jsonb DEFAULT '{"data": [], "userText": "", "valueUnit": "°C"}'::jsonb,
    status character varying,
    reaction_svg_file character varying,
    solvent character varying,
    deleted_at timestamp without time zone,
    short_label character varying,
    created_by integer,
    role character varying,
    origin jsonb,
    rinchi_string text,
    rinchi_long_key text,
    rinchi_short_key character varying,
    rinchi_web_key character varying,
    duration character varying,
    rxno character varying,
    conditions character varying
);


--
-- Name: samples; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.samples (
    id integer NOT NULL,
    name character varying,
    target_amount_value double precision DEFAULT 0.0,
    target_amount_unit character varying DEFAULT 'g'::character varying,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    description text DEFAULT ''::text,
    molecule_id integer,
    molfile bytea,
    purity double precision DEFAULT 1.0,
    deprecated_solvent character varying DEFAULT ''::character varying,
    impurities character varying DEFAULT ''::character varying,
    location character varying DEFAULT ''::character varying,
    is_top_secret boolean DEFAULT false,
    ancestry character varying,
    external_label character varying DEFAULT ''::character varying,
    created_by integer,
    short_label character varying,
    real_amount_value double precision,
    real_amount_unit character varying,
    imported_readout character varying,
    deleted_at timestamp without time zone,
    sample_svg_file character varying,
    user_id integer,
    identifier character varying,
    density double precision DEFAULT 0.0,
    melting_point numrange,
    boiling_point numrange,
    fingerprint_id integer,
    xref jsonb DEFAULT '{}'::jsonb,
    molarity_value double precision DEFAULT 0.0,
    molarity_unit character varying DEFAULT 'M'::character varying,
    molecule_name_id integer,
    molfile_version character varying(20),
    stereo jsonb,
    metrics character varying DEFAULT 'mmm'::character varying,
    decoupled boolean DEFAULT false NOT NULL,
    molecular_mass double precision,
    sum_formula character varying,
    solvent jsonb
);


--
-- Name: literal_groups; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.literal_groups AS
 SELECT lits.element_type,
    lits.element_id,
    lits.literature_id,
    lits.category,
    lits.count,
    literatures.title,
    literatures.doi,
    literatures.url,
    literatures.refs,
    COALESCE(reactions.short_label, samples.short_label) AS short_label,
    COALESCE(reactions.name, samples.name) AS name,
    samples.external_label,
    COALESCE(reactions.updated_at, samples.updated_at) AS element_updated_at
   FROM (((( SELECT literals.element_type,
            literals.element_id,
            literals.literature_id,
            literals.category,
            count(*) AS count
           FROM public.literals
          GROUP BY literals.element_type, literals.element_id, literals.literature_id, literals.category) lits
     JOIN public.literatures ON ((lits.literature_id = literatures.id)))
     LEFT JOIN public.samples ON ((((lits.element_type)::text = 'Sample'::text) AND (lits.element_id = samples.id))))
     LEFT JOIN public.reactions ON ((((lits.element_type)::text = 'Reaction'::text) AND (lits.element_id = reactions.id))));


--
-- Name: literals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.literals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: literals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.literals_id_seq OWNED BY public.literals.id;


--
-- Name: literatures_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.literatures_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: literatures_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.literatures_id_seq OWNED BY public.literatures.id;


--
-- Name: matrices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.matrices (
    id integer NOT NULL,
    name character varying NOT NULL,
    enabled boolean DEFAULT false,
    label character varying,
    include_ids integer[] DEFAULT '{}'::integer[],
    exclude_ids integer[] DEFAULT '{}'::integer[],
    configs jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    deleted_at timestamp without time zone
);


--
-- Name: matrices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.matrices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: matrices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.matrices_id_seq OWNED BY public.matrices.id;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id integer NOT NULL,
    channel_id integer,
    content jsonb NOT NULL,
    created_by integer NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- Name: molecule_names; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.molecule_names (
    id integer NOT NULL,
    molecule_id integer,
    user_id integer,
    description text,
    name character varying NOT NULL,
    deleted_at timestamp without time zone,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: molecule_names_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.molecule_names_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: molecule_names_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.molecule_names_id_seq OWNED BY public.molecule_names.id;


--
-- Name: molecules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.molecules (
    id integer NOT NULL,
    inchikey character varying,
    inchistring character varying,
    density double precision DEFAULT 0.0,
    molecular_weight double precision,
    molfile bytea,
    melting_point double precision,
    boiling_point double precision,
    sum_formular character varying,
    names character varying[] DEFAULT '{}'::character varying[],
    iupac_name character varying,
    molecule_svg_file character varying,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    deleted_at timestamp without time zone,
    is_partial boolean DEFAULT false NOT NULL,
    exact_molecular_weight double precision,
    cano_smiles character varying,
    cas text,
    molfile_version character varying(20)
);


--
-- Name: molecules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.molecules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: molecules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.molecules_id_seq OWNED BY public.molecules.id;


--
-- Name: nmr_sim_nmr_simulations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nmr_sim_nmr_simulations (
    id integer NOT NULL,
    molecule_id integer,
    path_1h text,
    path_13c text,
    source text,
    deleted_at timestamp without time zone,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: nmr_sim_nmr_simulations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nmr_sim_nmr_simulations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nmr_sim_nmr_simulations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nmr_sim_nmr_simulations_id_seq OWNED BY public.nmr_sim_nmr_simulations.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    message_id integer,
    user_id integer,
    is_ack integer DEFAULT 0,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying DEFAULT ''::character varying NOT NULL,
    encrypted_password character varying DEFAULT ''::character varying NOT NULL,
    reset_password_token character varying,
    reset_password_sent_at timestamp without time zone,
    remember_created_at timestamp without time zone,
    sign_in_count integer DEFAULT 0 NOT NULL,
    current_sign_in_at timestamp without time zone,
    last_sign_in_at timestamp without time zone,
    current_sign_in_ip inet,
    last_sign_in_ip inet,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    name character varying,
    first_name character varying NOT NULL,
    last_name character varying NOT NULL,
    deleted_at timestamp without time zone,
    counters public.hstore DEFAULT '"samples"=>"0", "reactions"=>"0", "wellplates"=>"0"'::public.hstore NOT NULL,
    name_abbreviation character varying(12),
    type character varying DEFAULT 'Person'::character varying,
    reaction_name_prefix character varying(3) DEFAULT 'R'::character varying,
    confirmation_token character varying,
    confirmed_at timestamp without time zone,
    confirmation_sent_at timestamp without time zone,
    unconfirmed_email character varying,
    layout public.hstore DEFAULT '"sample"=>"1", "screen"=>"4", "reaction"=>"2", "wellplate"=>"3", "research_plan"=>"5"'::public.hstore NOT NULL,
    selected_device_id integer,
    failed_attempts integer DEFAULT 0 NOT NULL,
    unlock_token character varying,
    locked_at timestamp without time zone,
    account_active boolean,
    matrix integer DEFAULT 0,
    omniauth_provider character varying,
    omniauth_uid character varying
);


--
-- Name: notify_messages; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.notify_messages AS
 SELECT notifications.id,
    messages.id AS message_id,
    channels.subject,
    messages.content,
    notifications.created_at,
    notifications.updated_at,
    users.id AS sender_id,
    (((users.first_name)::text || chr(32)) || (users.last_name)::text) AS sender_name,
    channels.channel_type,
    notifications.user_id AS receiver_id,
    notifications.is_ack
   FROM public.messages,
    public.notifications,
    public.channels,
    public.users
  WHERE ((channels.id = messages.channel_id) AND (messages.id = notifications.message_id) AND (users.id = messages.created_by));


--
-- Name: ols_terms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ols_terms (
    id integer NOT NULL,
    owl_name character varying,
    term_id character varying,
    ancestry character varying,
    ancestry_term_id character varying,
    label character varying,
    synonym character varying,
    synonyms jsonb,
    "desc" character varying,
    metadata jsonb,
    is_enabled boolean DEFAULT true,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: ols_terms_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ols_terms_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ols_terms_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ols_terms_id_seq OWNED BY public.ols_terms.id;


--
-- Name: pg_search_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pg_search_documents (
    id integer NOT NULL,
    content text,
    searchable_type character varying,
    searchable_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: pg_search_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pg_search_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pg_search_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pg_search_documents_id_seq OWNED BY public.pg_search_documents.id;


--
-- Name: predictions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.predictions (
    id integer NOT NULL,
    predictable_type character varying,
    predictable_id integer,
    decision jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: predictions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.predictions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: predictions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.predictions_id_seq OWNED BY public.predictions.id;


--
-- Name: private_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.private_notes (
    id bigint NOT NULL,
    content character varying,
    created_by integer NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    noteable_id integer,
    noteable_type character varying
);


--
-- Name: private_notes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.private_notes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: private_notes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.private_notes_id_seq OWNED BY public.private_notes.id;


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id integer NOT NULL,
    show_external_name boolean DEFAULT false,
    user_id integer NOT NULL,
    deleted_at timestamp without time zone,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    curation integer DEFAULT 2
);


--
-- Name: profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.profiles_id_seq OWNED BY public.profiles.id;


--
-- Name: reactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reactions_id_seq OWNED BY public.reactions.id;


--
-- Name: reactions_samples; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reactions_samples (
    id integer NOT NULL,
    reaction_id integer,
    sample_id integer,
    reference boolean,
    equivalent double precision,
    "position" integer,
    type character varying,
    deleted_at timestamp without time zone,
    waste boolean DEFAULT false,
    coefficient double precision DEFAULT 1.0,
    show_label boolean DEFAULT false NOT NULL
);


--
-- Name: reactions_samples_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reactions_samples_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reactions_samples_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reactions_samples_id_seq OWNED BY public.reactions_samples.id;


--
-- Name: report_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_templates (
    id integer NOT NULL,
    name character varying NOT NULL,
    report_type character varying NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    attachment_id integer
);


--
-- Name: report_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.report_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: report_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.report_templates_id_seq OWNED BY public.report_templates.id;


--
-- Name: reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports (
    id integer NOT NULL,
    author_id integer,
    file_name character varying,
    file_description text,
    configs text,
    sample_settings text,
    reaction_settings text,
    objects text,
    img_format character varying,
    file_path character varying,
    generated_at timestamp without time zone,
    deleted_at timestamp without time zone,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    template character varying DEFAULT 'standard'::character varying,
    mol_serials text DEFAULT '--- []
'::text,
    si_reaction_settings text DEFAULT '---
Name: true
CAS: true
Formula: true
Smiles: true
InCHI: true
Molecular Mass: true
Exact Mass: true
EA: true
'::text,
    prd_atts text DEFAULT '--- []
'::text,
    report_templates_id integer
);


--
-- Name: reports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reports_id_seq OWNED BY public.reports.id;


--
-- Name: reports_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports_users (
    id integer NOT NULL,
    user_id integer,
    report_id integer,
    downloaded_at timestamp without time zone,
    deleted_at timestamp without time zone,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: reports_users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reports_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reports_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reports_users_id_seq OWNED BY public.reports_users.id;


--
-- Name: research_plan_metadata; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.research_plan_metadata (
    id integer NOT NULL,
    research_plan_id integer,
    doi character varying,
    url character varying,
    landing_page character varying,
    title character varying,
    type character varying,
    publisher character varying,
    publication_year integer,
    dates jsonb,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    deleted_at timestamp without time zone,
    data_cite_prefix character varying,
    data_cite_created_at timestamp without time zone,
    data_cite_updated_at timestamp without time zone,
    data_cite_version integer,
    data_cite_last_response jsonb DEFAULT '{}'::jsonb,
    data_cite_state character varying DEFAULT 'draft'::character varying,
    data_cite_creator_name character varying,
    description jsonb,
    creator text,
    affiliation text,
    contributor text,
    language character varying,
    rights text,
    format character varying,
    version character varying,
    geo_location jsonb,
    funding_reference jsonb,
    subject text,
    alternate_identifier jsonb,
    related_identifier jsonb
);


--
-- Name: research_plan_metadata_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.research_plan_metadata_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: research_plan_metadata_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.research_plan_metadata_id_seq OWNED BY public.research_plan_metadata.id;


--
-- Name: research_plan_table_schemas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.research_plan_table_schemas (
    id integer NOT NULL,
    name character varying,
    value jsonb,
    created_by integer NOT NULL,
    deleted_at timestamp without time zone,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: research_plan_table_schemas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.research_plan_table_schemas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: research_plan_table_schemas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.research_plan_table_schemas_id_seq OWNED BY public.research_plan_table_schemas.id;


--
-- Name: research_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.research_plans (
    id integer NOT NULL,
    name character varying NOT NULL,
    created_by integer NOT NULL,
    deleted_at timestamp without time zone,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    body jsonb
);


--
-- Name: research_plans_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.research_plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: research_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.research_plans_id_seq OWNED BY public.research_plans.id;


--
-- Name: residues; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.residues (
    id integer NOT NULL,
    sample_id integer,
    residue_type character varying,
    custom_info public.hstore,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: residues_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.residues_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: residues_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.residues_id_seq OWNED BY public.residues.id;


--
-- Name: samples_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.samples_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: samples_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.samples_id_seq OWNED BY public.samples.id;


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version character varying NOT NULL
);


--
-- Name: scifinder_n_credentials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scifinder_n_credentials (
    id bigint NOT NULL,
    access_token character varying NOT NULL,
    refresh_token character varying,
    expires_at timestamp without time zone NOT NULL,
    created_by integer NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: scifinder_n_credentials_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.scifinder_n_credentials_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: scifinder_n_credentials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.scifinder_n_credentials_id_seq OWNED BY public.scifinder_n_credentials.id;


--
-- Name: screens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.screens (
    id integer NOT NULL,
    description character varying,
    name character varying,
    result character varying,
    collaborator character varying,
    conditions character varying,
    requirements character varying,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    deleted_at timestamp without time zone
);


--
-- Name: screens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.screens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: screens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.screens_id_seq OWNED BY public.screens.id;


--
-- Name: screens_wellplates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.screens_wellplates (
    id integer NOT NULL,
    screen_id integer,
    wellplate_id integer,
    deleted_at timestamp without time zone
);


--
-- Name: screens_wellplates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.screens_wellplates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: screens_wellplates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.screens_wellplates_id_seq OWNED BY public.screens_wellplates.id;


--
-- Name: segment_klasses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.segment_klasses (
    id integer NOT NULL,
    element_klass_id integer,
    label character varying NOT NULL,
    "desc" character varying,
    properties_template jsonb,
    is_active boolean DEFAULT true NOT NULL,
    place integer DEFAULT 100 NOT NULL,
    created_by integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    deleted_at timestamp without time zone,
    uuid character varying,
    properties_release jsonb DEFAULT '{}'::jsonb,
    released_at timestamp without time zone
);


--
-- Name: segment_klasses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.segment_klasses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: segment_klasses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.segment_klasses_id_seq OWNED BY public.segment_klasses.id;


--
-- Name: segment_klasses_revisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.segment_klasses_revisions (
    id integer NOT NULL,
    segment_klass_id integer,
    uuid character varying,
    properties_release jsonb DEFAULT '{}'::jsonb,
    released_at timestamp without time zone,
    released_by integer,
    created_by integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    deleted_at timestamp without time zone
);


--
-- Name: segment_klasses_revisions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.segment_klasses_revisions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: segment_klasses_revisions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.segment_klasses_revisions_id_seq OWNED BY public.segment_klasses_revisions.id;


--
-- Name: segments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.segments (
    id integer NOT NULL,
    segment_klass_id integer,
    element_type character varying,
    element_id integer,
    properties jsonb,
    created_by integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    deleted_at timestamp without time zone,
    uuid character varying,
    klass_uuid character varying
);


--
-- Name: segments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.segments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: segments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.segments_id_seq OWNED BY public.segments.id;


--
-- Name: segments_revisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.segments_revisions (
    id integer NOT NULL,
    segment_id integer,
    uuid character varying,
    klass_uuid character varying,
    properties jsonb DEFAULT '{}'::jsonb,
    created_by integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    deleted_at timestamp without time zone
);


--
-- Name: segments_revisions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.segments_revisions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: segments_revisions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.segments_revisions_id_seq OWNED BY public.segments_revisions.id;


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id integer NOT NULL,
    channel_id integer,
    user_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subscriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subscriptions_id_seq OWNED BY public.subscriptions.id;


--
-- Name: sync_collections_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sync_collections_users (
    id integer NOT NULL,
    user_id integer,
    collection_id integer,
    shared_by_id integer,
    permission_level integer DEFAULT 0,
    sample_detail_level integer DEFAULT 0,
    reaction_detail_level integer DEFAULT 0,
    wellplate_detail_level integer DEFAULT 0,
    screen_detail_level integer DEFAULT 0,
    fake_ancestry character varying,
    researchplan_detail_level integer DEFAULT 10,
    label character varying,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    element_detail_level integer DEFAULT 10
);


--
-- Name: sync_collections_users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sync_collections_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sync_collections_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sync_collections_users_id_seq OWNED BY public.sync_collections_users.id;


--
-- Name: text_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.text_templates (
    id integer NOT NULL,
    type character varying,
    user_id integer NOT NULL,
    name character varying,
    data jsonb DEFAULT '{}'::jsonb,
    deleted_at timestamp without time zone,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: text_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.text_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: text_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.text_templates_id_seq OWNED BY public.text_templates.id;


--
-- Name: user_affiliations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_affiliations (
    id integer NOT NULL,
    user_id integer,
    affiliation_id integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    deleted_at timestamp without time zone,
    "from" date,
    "to" date,
    main boolean
);


--
-- Name: user_affiliations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_affiliations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_affiliations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_affiliations_id_seq OWNED BY public.user_affiliations.id;


--
-- Name: user_labels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_labels (
    id integer NOT NULL,
    user_id integer,
    title character varying NOT NULL,
    description character varying,
    color character varying NOT NULL,
    access_level integer DEFAULT 0,
    "position" integer DEFAULT 10,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    deleted_at timestamp without time zone
);


--
-- Name: user_labels_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_labels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_labels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_labels_id_seq OWNED BY public.user_labels.id;


--
-- Name: users_admins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users_admins (
    id integer NOT NULL,
    user_id integer,
    admin_id integer
);


--
-- Name: users_admins_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_admins_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_admins_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_admins_id_seq OWNED BY public.users_admins.id;


--
-- Name: users_devices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users_devices (
    id integer NOT NULL,
    user_id integer,
    device_id integer
);


--
-- Name: users_devices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_devices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_devices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_devices_id_seq OWNED BY public.users_devices.id;


--
-- Name: users_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users_groups (
    id integer NOT NULL,
    user_id integer,
    group_id integer
);


--
-- Name: users_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_groups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_groups_id_seq OWNED BY public.users_groups.id;


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: v_samples_collections; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_samples_collections AS
 SELECT cols.id AS cols_id,
    cols.user_id AS cols_user_id,
    cols.sample_detail_level AS cols_sample_detail_level,
    cols.wellplate_detail_level AS cols_wellplate_detail_level,
    cols.shared_by_id AS cols_shared_by_id,
    cols.is_shared AS cols_is_shared,
    samples.id AS sams_id,
    samples.name AS sams_name
   FROM ((public.collections cols
     JOIN public.collections_samples col_samples ON (((col_samples.collection_id = cols.id) AND (col_samples.deleted_at IS NULL))))
     JOIN public.samples ON (((samples.id = col_samples.sample_id) AND (samples.deleted_at IS NULL))))
  WHERE (cols.deleted_at IS NULL);


--
-- Name: wellplates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wellplates (
    id integer NOT NULL,
    name character varying,
    size integer,
    description character varying,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    deleted_at timestamp without time zone
);


--
-- Name: wellplates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.wellplates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: wellplates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.wellplates_id_seq OWNED BY public.wellplates.id;


--
-- Name: wells; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wells (
    id integer NOT NULL,
    sample_id integer,
    wellplate_id integer NOT NULL,
    position_x integer,
    position_y integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    readout character varying,
    additive character varying,
    deleted_at timestamp without time zone,
    label character varying DEFAULT 'Molecular structure'::character varying NOT NULL,
    color_code character varying
);


--
-- Name: wells_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.wells_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: wells_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.wells_id_seq OWNED BY public.wells.id;


--
-- Name: affiliations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliations ALTER COLUMN id SET DEFAULT nextval('public.affiliations_id_seq'::regclass);


--
-- Name: analyses_experiments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analyses_experiments ALTER COLUMN id SET DEFAULT nextval('public.analyses_experiments_id_seq'::regclass);


--
-- Name: attachments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachments ALTER COLUMN id SET DEFAULT nextval('public.attachments_id_seq'::regclass);


--
-- Name: authentication_keys id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.authentication_keys ALTER COLUMN id SET DEFAULT nextval('public.authentication_keys_id_seq'::regclass);


--
-- Name: channels id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channels ALTER COLUMN id SET DEFAULT nextval('public.channels_id_seq'::regclass);


--
-- Name: collections id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collections ALTER COLUMN id SET DEFAULT nextval('public.collections_id_seq'::regclass);


--
-- Name: collections_elements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collections_elements ALTER COLUMN id SET DEFAULT nextval('public.collections_elements_id_seq'::regclass);


--
-- Name: collections_reactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collections_reactions ALTER COLUMN id SET DEFAULT nextval('public.collections_reactions_id_seq'::regclass);


--
-- Name: collections_research_plans id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collections_research_plans ALTER COLUMN id SET DEFAULT nextval('public.collections_research_plans_id_seq'::regclass);


--
-- Name: collections_samples id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collections_samples ALTER COLUMN id SET DEFAULT nextval('public.collections_samples_id_seq'::regclass);


--
-- Name: collections_screens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collections_screens ALTER COLUMN id SET DEFAULT nextval('public.collections_screens_id_seq'::regclass);


--
-- Name: collections_wellplates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collections_wellplates ALTER COLUMN id SET DEFAULT nextval('public.collections_wellplates_id_seq'::regclass);


--
-- Name: collector_errors id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collector_errors ALTER COLUMN id SET DEFAULT nextval('public.collector_errors_id_seq'::regclass);


--
-- Name: computed_props id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.computed_props ALTER COLUMN id SET DEFAULT nextval('public.computed_props_id_seq'::regclass);


--
-- Name: containers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.containers ALTER COLUMN id SET DEFAULT nextval('public.containers_id_seq'::regclass);


--
-- Name: dataset_klasses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dataset_klasses ALTER COLUMN id SET DEFAULT nextval('public.dataset_klasses_id_seq'::regclass);


--
-- Name: dataset_klasses_revisions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dataset_klasses_revisions ALTER COLUMN id SET DEFAULT nextval('public.dataset_klasses_revisions_id_seq'::regclass);


--
-- Name: datasets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.datasets ALTER COLUMN id SET DEFAULT nextval('public.datasets_id_seq'::regclass);


--
-- Name: datasets_revisions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.datasets_revisions ALTER COLUMN id SET DEFAULT nextval('public.datasets_revisions_id_seq'::regclass);


--
-- Name: delayed_jobs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delayed_jobs ALTER COLUMN id SET DEFAULT nextval('public.delayed_jobs_id_seq'::regclass);


--
-- Name: device_metadata id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_metadata ALTER COLUMN id SET DEFAULT nextval('public.device_metadata_id_seq'::regclass);


--
-- Name: element_klasses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.element_klasses ALTER COLUMN id SET DEFAULT nextval('public.element_klasses_id_seq'::regclass);


--
-- Name: element_klasses_revisions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.element_klasses_revisions ALTER COLUMN id SET DEFAULT nextval('public.element_klasses_revisions_id_seq'::regclass);


--
-- Name: element_tags id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.element_tags ALTER COLUMN id SET DEFAULT nextval('public.element_tags_id_seq'::regclass);


--
-- Name: elemental_compositions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elemental_compositions ALTER COLUMN id SET DEFAULT nextval('public.elemental_compositions_id_seq'::regclass);


--
-- Name: elements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elements ALTER COLUMN id SET DEFAULT nextval('public.elements_id_seq'::regclass);


--
-- Name: elements_revisions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elements_revisions ALTER COLUMN id SET DEFAULT nextval('public.elements_revisions_id_seq'::regclass);


--
-- Name: elements_samples id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elements_samples ALTER COLUMN id SET DEFAULT nextval('public.elements_samples_id_seq'::regclass);


--
-- Name: experiments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.experiments ALTER COLUMN id SET DEFAULT nextval('public.experiments_id_seq'::regclass);


--
-- Name: fingerprints id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fingerprints ALTER COLUMN id SET DEFAULT nextval('public.fingerprints_id_seq'::regclass);


--
-- Name: ketcherails_amino_acids id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ketcherails_amino_acids ALTER COLUMN id SET DEFAULT nextval('public.ketcherails_amino_acids_id_seq'::regclass);


--
-- Name: ketcherails_atom_abbreviations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ketcherails_atom_abbreviations ALTER COLUMN id SET DEFAULT nextval('public.ketcherails_atom_abbreviations_id_seq'::regclass);


--
-- Name: ketcherails_common_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ketcherails_common_templates ALTER COLUMN id SET DEFAULT nextval('public.ketcherails_common_templates_id_seq'::regclass);


--
-- Name: ketcherails_custom_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ketcherails_custom_templates ALTER COLUMN id SET DEFAULT nextval('public.ketcherails_custom_templates_id_seq'::regclass);


--
-- Name: ketcherails_template_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ketcherails_template_categories ALTER COLUMN id SET DEFAULT nextval('public.ketcherails_template_categories_id_seq'::regclass);


--
-- Name: literals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.literals ALTER COLUMN id SET DEFAULT nextval('public.literals_id_seq'::regclass);


--
-- Name: literatures id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.literatures ALTER COLUMN id SET DEFAULT nextval('public.literatures_id_seq'::regclass);


--
-- Name: matrices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matrices ALTER COLUMN id SET DEFAULT nextval('public.matrices_id_seq'::regclass);


--
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- Name: molecule_names id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.molecule_names ALTER COLUMN id SET DEFAULT nextval('public.molecule_names_id_seq'::regclass);


--
-- Name: molecules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.molecules ALTER COLUMN id SET DEFAULT nextval('public.molecules_id_seq'::regclass);


--
-- Name: nmr_sim_nmr_simulations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nmr_sim_nmr_simulations ALTER COLUMN id SET DEFAULT nextval('public.nmr_sim_nmr_simulations_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: ols_terms id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ols_terms ALTER COLUMN id SET DEFAULT nextval('public.ols_terms_id_seq'::regclass);


--
-- Name: pg_search_documents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pg_search_documents ALTER COLUMN id SET DEFAULT nextval('public.pg_search_documents_id_seq'::regclass);


--
-- Name: predictions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.predictions ALTER COLUMN id SET DEFAULT nextval('public.predictions_id_seq'::regclass);


--
-- Name: private_notes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.private_notes ALTER COLUMN id SET DEFAULT nextval('public.private_notes_id_seq'::regclass);


--
-- Name: profiles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles ALTER COLUMN id SET DEFAULT nextval('public.profiles_id_seq'::regclass);


--
-- Name: reactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reactions ALTER COLUMN id SET DEFAULT nextval('public.reactions_id_seq'::regclass);


--
-- Name: reactions_samples id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reactions_samples ALTER COLUMN id SET DEFAULT nextval('public.reactions_samples_id_seq'::regclass);


--
-- Name: report_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_templates ALTER COLUMN id SET DEFAULT nextval('public.report_templates_id_seq'::regclass);


--
-- Name: reports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports ALTER COLUMN id SET DEFAULT nextval('public.reports_id_seq'::regclass);


--
-- Name: reports_users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_users ALTER COLUMN id SET DEFAULT nextval('public.reports_users_id_seq'::regclass);


--
-- Name: research_plan_metadata id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_plan_metadata ALTER COLUMN id SET DEFAULT nextval('public.research_plan_metadata_id_seq'::regclass);


--
-- Name: research_plan_table_schemas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_plan_table_schemas ALTER COLUMN id SET DEFAULT nextval('public.research_plan_table_schemas_id_seq'::regclass);


--
-- Name: research_plans id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_plans ALTER COLUMN id SET DEFAULT nextval('public.research_plans_id_seq'::regclass);


--
-- Name: residues id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.residues ALTER COLUMN id SET DEFAULT nextval('public.residues_id_seq'::regclass);


--
-- Name: samples id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.samples ALTER COLUMN id SET DEFAULT nextval('public.samples_id_seq'::regclass);


--
-- Name: scifinder_n_credentials id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scifinder_n_credentials ALTER COLUMN id SET DEFAULT nextval('public.scifinder_n_credentials_id_seq'::regclass);


--
-- Name: screens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screens ALTER COLUMN id SET DEFAULT nextval('public.screens_id_seq'::regclass);


--
-- Name: screens_wellplates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screens_wellplates ALTER COLUMN id SET DEFAULT nextval('public.screens_wellplates_id_seq'::regclass);


--
-- Name: segment_klasses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.segment_klasses ALTER COLUMN id SET DEFAULT nextval('public.segment_klasses_id_seq'::regclass);


--
-- Name: segment_klasses_revisions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.segment_klasses_revisions ALTER COLUMN id SET DEFAULT nextval('public.segment_klasses_revisions_id_seq'::regclass);


--
-- Name: segments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.segments ALTER COLUMN id SET DEFAULT nextval('public.segments_id_seq'::regclass);


--
-- Name: segments_revisions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.segments_revisions ALTER COLUMN id SET DEFAULT nextval('public.segments_revisions_id_seq'::regclass);


--
-- Name: subscriptions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions ALTER COLUMN id SET DEFAULT nextval('public.subscriptions_id_seq'::regclass);


--
-- Name: sync_collections_users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_collections_users ALTER COLUMN id SET DEFAULT nextval('public.sync_collections_users_id_seq'::regclass);


--
-- Name: text_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.text_templates ALTER COLUMN id SET DEFAULT nextval('public.text_templates_id_seq'::regclass);


--
-- Name: user_affiliations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_affiliations ALTER COLUMN id SET DEFAULT nextval('public.user_affiliations_id_seq'::regclass);


--
-- Name: user_labels id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_labels ALTER COLUMN id SET DEFAULT nextval('public.user_labels_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: users_admins id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_admins ALTER COLUMN id SET DEFAULT nextval('public.users_admins_id_seq'::regclass);


--
-- Name: users_devices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_devices ALTER COLUMN id SET DEFAULT nextval('public.users_devices_id_seq'::regclass);


--
-- Name: users_groups id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_groups ALTER COLUMN id SET DEFAULT nextval('public.users_groups_id_seq'::regclass);


--
-- Name: wellplates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wellplates ALTER COLUMN id SET DEFAULT nextval('public.wellplates_id_seq'::regclass);


--
-- Name: wells id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wells ALTER COLUMN id SET DEFAULT nextval('public.wells_id_seq'::regclass);


--
-- Name: affiliations affiliations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliations
    ADD CONSTRAINT affiliations_pkey PRIMARY KEY (id);


--
-- Name: analyses_experiments analyses_experiments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analyses_experiments
    ADD CONSTRAINT analyses_experiments_pkey PRIMARY KEY (id);


--
-- Name: ar_internal_metadata ar_internal_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ar_internal_metadata
    ADD CONSTRAINT ar_internal_metadata_pkey PRIMARY KEY (key);


--
-- Name: attachments attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_pkey PRIMARY KEY (id);


--
-- Name: authentication_keys authentication_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.authentication_keys
    ADD CONSTRAINT authentication_keys_pkey PRIMARY KEY (id);


--
-- Name: channels channels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channels
    ADD CONSTRAINT channels_pkey PRIMARY KEY (id);


--
-- Name: code_logs code_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.code_logs
    ADD CONSTRAINT code_logs_pkey PRIMARY KEY (id);


--
-- Name: collections_elements collections_elements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collections_elements
    ADD CONSTRAINT collections_elements_pkey PRIMARY KEY (id);


--
-- Name: collections collections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collections
    ADD CONSTRAINT collections_pkey PRIMARY KEY (id);


--
-- Name: collections_reactions collections_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collections_reactions
    ADD CONSTRAINT collections_reactions_pkey PRIMARY KEY (id);


--
-- Name: collections_research_plans collections_research_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collections_research_plans
    ADD CONSTRAINT collections_research_plans_pkey PRIMARY KEY (id);


--
-- Name: collections_samples collections_samples_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collections_samples
    ADD CONSTRAINT collections_samples_pkey PRIMARY KEY (id);


--
-- Name: collections_screens collections_screens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collections_screens
    ADD CONSTRAINT collections_screens_pkey PRIMARY KEY (id);


--
-- Name: collections_wellplates collections_wellplates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collections_wellplates
    ADD CONSTRAINT collections_wellplates_pkey PRIMARY KEY (id);


--
-- Name: collector_errors collector_errors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collector_errors
    ADD CONSTRAINT collector_errors_pkey PRIMARY KEY (id);


--
-- Name: computed_props computed_props_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.computed_props
    ADD CONSTRAINT computed_props_pkey PRIMARY KEY (id);


--
-- Name: containers containers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.containers
    ADD CONSTRAINT containers_pkey PRIMARY KEY (id);


--
-- Name: dataset_klasses dataset_klasses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dataset_klasses
    ADD CONSTRAINT dataset_klasses_pkey PRIMARY KEY (id);


--
-- Name: dataset_klasses_revisions dataset_klasses_revisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dataset_klasses_revisions
    ADD CONSTRAINT dataset_klasses_revisions_pkey PRIMARY KEY (id);


--
-- Name: datasets datasets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.datasets
    ADD CONSTRAINT datasets_pkey PRIMARY KEY (id);


--
-- Name: datasets_revisions datasets_revisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.datasets_revisions
    ADD CONSTRAINT datasets_revisions_pkey PRIMARY KEY (id);


--
-- Name: delayed_jobs delayed_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delayed_jobs
    ADD CONSTRAINT delayed_jobs_pkey PRIMARY KEY (id);


--
-- Name: device_metadata device_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_metadata
    ADD CONSTRAINT device_metadata_pkey PRIMARY KEY (id);


--
-- Name: element_klasses element_klasses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.element_klasses
    ADD CONSTRAINT element_klasses_pkey PRIMARY KEY (id);


--
-- Name: element_klasses_revisions element_klasses_revisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.element_klasses_revisions
    ADD CONSTRAINT element_klasses_revisions_pkey PRIMARY KEY (id);


--
-- Name: element_tags element_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.element_tags
    ADD CONSTRAINT element_tags_pkey PRIMARY KEY (id);


--
-- Name: elemental_compositions elemental_compositions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elemental_compositions
    ADD CONSTRAINT elemental_compositions_pkey PRIMARY KEY (id);


--
-- Name: elements elements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elements
    ADD CONSTRAINT elements_pkey PRIMARY KEY (id);


--
-- Name: elements_revisions elements_revisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elements_revisions
    ADD CONSTRAINT elements_revisions_pkey PRIMARY KEY (id);


--
-- Name: elements_samples elements_samples_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elements_samples
    ADD CONSTRAINT elements_samples_pkey PRIMARY KEY (id);


--
-- Name: experiments experiments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.experiments
    ADD CONSTRAINT experiments_pkey PRIMARY KEY (id);


--
-- Name: fingerprints fingerprints_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fingerprints
    ADD CONSTRAINT fingerprints_pkey PRIMARY KEY (id);


--
-- Name: ketcherails_amino_acids ketcherails_amino_acids_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ketcherails_amino_acids
    ADD CONSTRAINT ketcherails_amino_acids_pkey PRIMARY KEY (id);


--
-- Name: ketcherails_atom_abbreviations ketcherails_atom_abbreviations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ketcherails_atom_abbreviations
    ADD CONSTRAINT ketcherails_atom_abbreviations_pkey PRIMARY KEY (id);


--
-- Name: ketcherails_common_templates ketcherails_common_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ketcherails_common_templates
    ADD CONSTRAINT ketcherails_common_templates_pkey PRIMARY KEY (id);


--
-- Name: ketcherails_custom_templates ketcherails_custom_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ketcherails_custom_templates
    ADD CONSTRAINT ketcherails_custom_templates_pkey PRIMARY KEY (id);


--
-- Name: ketcherails_template_categories ketcherails_template_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ketcherails_template_categories
    ADD CONSTRAINT ketcherails_template_categories_pkey PRIMARY KEY (id);


--
-- Name: literals literals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.literals
    ADD CONSTRAINT literals_pkey PRIMARY KEY (id);


--
-- Name: literatures literatures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.literatures
    ADD CONSTRAINT literatures_pkey PRIMARY KEY (id);


--
-- Name: matrices matrices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matrices
    ADD CONSTRAINT matrices_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: molecule_names molecule_names_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.molecule_names
    ADD CONSTRAINT molecule_names_pkey PRIMARY KEY (id);


--
-- Name: molecules molecules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.molecules
    ADD CONSTRAINT molecules_pkey PRIMARY KEY (id);


--
-- Name: nmr_sim_nmr_simulations nmr_sim_nmr_simulations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nmr_sim_nmr_simulations
    ADD CONSTRAINT nmr_sim_nmr_simulations_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: ols_terms ols_terms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ols_terms
    ADD CONSTRAINT ols_terms_pkey PRIMARY KEY (id);


--
-- Name: pg_search_documents pg_search_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pg_search_documents
    ADD CONSTRAINT pg_search_documents_pkey PRIMARY KEY (id);


--
-- Name: predictions predictions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.predictions
    ADD CONSTRAINT predictions_pkey PRIMARY KEY (id);


--
-- Name: private_notes private_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.private_notes
    ADD CONSTRAINT private_notes_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: reactions reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reactions
    ADD CONSTRAINT reactions_pkey PRIMARY KEY (id);


--
-- Name: reactions_samples reactions_samples_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reactions_samples
    ADD CONSTRAINT reactions_samples_pkey PRIMARY KEY (id);


--
-- Name: report_templates report_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_templates
    ADD CONSTRAINT report_templates_pkey PRIMARY KEY (id);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: reports_users reports_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports_users
    ADD CONSTRAINT reports_users_pkey PRIMARY KEY (id);


--
-- Name: research_plan_metadata research_plan_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_plan_metadata
    ADD CONSTRAINT research_plan_metadata_pkey PRIMARY KEY (id);


--
-- Name: research_plan_table_schemas research_plan_table_schemas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_plan_table_schemas
    ADD CONSTRAINT research_plan_table_schemas_pkey PRIMARY KEY (id);


--
-- Name: research_plans research_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_plans
    ADD CONSTRAINT research_plans_pkey PRIMARY KEY (id);


--
-- Name: residues residues_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.residues
    ADD CONSTRAINT residues_pkey PRIMARY KEY (id);


--
-- Name: samples samples_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.samples
    ADD CONSTRAINT samples_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: scifinder_n_credentials scifinder_n_credentials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scifinder_n_credentials
    ADD CONSTRAINT scifinder_n_credentials_pkey PRIMARY KEY (id);


--
-- Name: screens screens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screens
    ADD CONSTRAINT screens_pkey PRIMARY KEY (id);


--
-- Name: screens_wellplates screens_wellplates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screens_wellplates
    ADD CONSTRAINT screens_wellplates_pkey PRIMARY KEY (id);


--
-- Name: segment_klasses segment_klasses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.segment_klasses
    ADD CONSTRAINT segment_klasses_pkey PRIMARY KEY (id);


--
-- Name: segment_klasses_revisions segment_klasses_revisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.segment_klasses_revisions
    ADD CONSTRAINT segment_klasses_revisions_pkey PRIMARY KEY (id);


--
-- Name: segments segments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.segments
    ADD CONSTRAINT segments_pkey PRIMARY KEY (id);


--
-- Name: segments_revisions segments_revisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.segments_revisions
    ADD CONSTRAINT segments_revisions_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: sync_collections_users sync_collections_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_collections_users
    ADD CONSTRAINT sync_collections_users_pkey PRIMARY KEY (id);


--
-- Name: text_templates text_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.text_templates
    ADD CONSTRAINT text_templates_pkey PRIMARY KEY (id);


--
-- Name: user_affiliations user_affiliations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_affiliations
    ADD CONSTRAINT user_affiliations_pkey PRIMARY KEY (id);


--
-- Name: user_labels user_labels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_labels
    ADD CONSTRAINT user_labels_pkey PRIMARY KEY (id);


--
-- Name: users_admins users_admins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_admins
    ADD CONSTRAINT users_admins_pkey PRIMARY KEY (id);


--
-- Name: users_devices users_devices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_devices
    ADD CONSTRAINT users_devices_pkey PRIMARY KEY (id);


--
-- Name: users_groups users_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_groups
    ADD CONSTRAINT users_groups_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: wellplates wellplates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wellplates
    ADD CONSTRAINT wellplates_pkey PRIMARY KEY (id);


--
-- Name: wells wells_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wells
    ADD CONSTRAINT wells_pkey PRIMARY KEY (id);


--
-- Name: container_anc_desc_udx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX container_anc_desc_udx ON public.container_hierarchies USING btree (ancestor_id, descendant_id, generations);


--
-- Name: container_desc_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX container_desc_idx ON public.container_hierarchies USING btree (descendant_id);


--
-- Name: delayed_jobs_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX delayed_jobs_priority ON public.delayed_jobs USING btree (priority, run_at);


--
-- Name: index_attachments_on_attachable_type_and_attachable_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_attachments_on_attachable_type_and_attachable_id ON public.attachments USING btree (attachable_type, attachable_id);


--
-- Name: index_attachments_on_identifier; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_attachments_on_identifier ON public.attachments USING btree (identifier);


--
-- Name: index_authentication_keys_on_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_authentication_keys_on_user_id ON public.authentication_keys USING btree (user_id);


--
-- Name: index_code_logs_on_source_and_source_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_code_logs_on_source_and_source_id ON public.code_logs USING btree (source, source_id);


--
-- Name: index_collections_elements_on_collection_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_collections_elements_on_collection_id ON public.collections_elements USING btree (collection_id);


--
-- Name: index_collections_elements_on_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_collections_elements_on_deleted_at ON public.collections_elements USING btree (deleted_at);


--
-- Name: index_collections_elements_on_element_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_collections_elements_on_element_id ON public.collections_elements USING btree (element_id);


--
-- Name: index_collections_elements_on_element_id_and_collection_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_collections_elements_on_element_id_and_collection_id ON public.collections_elements USING btree (element_id, collection_id);


--
-- Name: index_collections_on_ancestry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_collections_on_ancestry ON public.collections USING btree (ancestry);


--
-- Name: index_collections_on_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_collections_on_deleted_at ON public.collections USING btree (deleted_at);


--
-- Name: index_collections_on_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_collections_on_user_id ON public.collections USING btree (user_id);


--
-- Name: index_collections_reactions_on_collection_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_collections_reactions_on_collection_id ON public.collections_reactions USING btree (collection_id);


--
-- Name: index_collections_reactions_on_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_collections_reactions_on_deleted_at ON public.collections_reactions USING btree (deleted_at);


--
-- Name: index_collections_reactions_on_reaction_id_and_collection_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_collections_reactions_on_reaction_id_and_collection_id ON public.collections_reactions USING btree (reaction_id, collection_id);


--
-- Name: index_collections_research_plans_on_rplan_id_and_coll_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_collections_research_plans_on_rplan_id_and_coll_id ON public.collections_research_plans USING btree (research_plan_id, collection_id);


--
-- Name: index_collections_samples_on_collection_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_collections_samples_on_collection_id ON public.collections_samples USING btree (collection_id);


--
-- Name: index_collections_samples_on_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_collections_samples_on_deleted_at ON public.collections_samples USING btree (deleted_at);


--
-- Name: index_collections_samples_on_sample_id_and_collection_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_collections_samples_on_sample_id_and_collection_id ON public.collections_samples USING btree (sample_id, collection_id);


--
-- Name: index_collections_screens_on_collection_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_collections_screens_on_collection_id ON public.collections_screens USING btree (collection_id);


--
-- Name: index_collections_screens_on_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_collections_screens_on_deleted_at ON public.collections_screens USING btree (deleted_at);


--
-- Name: index_collections_screens_on_screen_id_and_collection_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_collections_screens_on_screen_id_and_collection_id ON public.collections_screens USING btree (screen_id, collection_id);


--
-- Name: index_collections_wellplates_on_collection_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_collections_wellplates_on_collection_id ON public.collections_wellplates USING btree (collection_id);


--
-- Name: index_collections_wellplates_on_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_collections_wellplates_on_deleted_at ON public.collections_wellplates USING btree (deleted_at);


--
-- Name: index_collections_wellplates_on_wellplate_id_and_collection_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_collections_wellplates_on_wellplate_id_and_collection_id ON public.collections_wellplates USING btree (wellplate_id, collection_id);


--
-- Name: index_computed_props_on_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_computed_props_on_deleted_at ON public.computed_props USING btree (deleted_at);


--
-- Name: index_containers_on_containable; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_containers_on_containable ON public.containers USING btree (containable_type, containable_id);


--
-- Name: index_dataset_klasses_revisions_on_dataset_klass_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_dataset_klasses_revisions_on_dataset_klass_id ON public.dataset_klasses_revisions USING btree (dataset_klass_id);


--
-- Name: index_datasets_revisions_on_dataset_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_datasets_revisions_on_dataset_id ON public.datasets_revisions USING btree (dataset_id);


--
-- Name: index_device_metadata_on_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_device_metadata_on_deleted_at ON public.device_metadata USING btree (deleted_at);


--
-- Name: index_device_metadata_on_device_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_device_metadata_on_device_id ON public.device_metadata USING btree (device_id);


--
-- Name: index_element_klasses_revisions_on_element_klass_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_element_klasses_revisions_on_element_klass_id ON public.element_klasses_revisions USING btree (element_klass_id);


--
-- Name: index_element_tags_on_taggable_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_element_tags_on_taggable_id ON public.element_tags USING btree (taggable_id);


--
-- Name: index_elemental_compositions_on_sample_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_elemental_compositions_on_sample_id ON public.elemental_compositions USING btree (sample_id);


--
-- Name: index_elements_revisions_on_element_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_elements_revisions_on_element_id ON public.elements_revisions USING btree (element_id);


--
-- Name: index_elements_samples_on_element_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_elements_samples_on_element_id ON public.elements_samples USING btree (element_id);


--
-- Name: index_elements_samples_on_sample_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_elements_samples_on_sample_id ON public.elements_samples USING btree (sample_id);


--
-- Name: index_ketcherails_amino_acids_on_moderated_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_ketcherails_amino_acids_on_moderated_by ON public.ketcherails_amino_acids USING btree (moderated_by);


--
-- Name: index_ketcherails_amino_acids_on_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_ketcherails_amino_acids_on_name ON public.ketcherails_amino_acids USING btree (name);


--
-- Name: index_ketcherails_amino_acids_on_suggested_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_ketcherails_amino_acids_on_suggested_by ON public.ketcherails_amino_acids USING btree (suggested_by);


--
-- Name: index_ketcherails_atom_abbreviations_on_moderated_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_ketcherails_atom_abbreviations_on_moderated_by ON public.ketcherails_atom_abbreviations USING btree (moderated_by);


--
-- Name: index_ketcherails_atom_abbreviations_on_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_ketcherails_atom_abbreviations_on_name ON public.ketcherails_atom_abbreviations USING btree (name);


--
-- Name: index_ketcherails_atom_abbreviations_on_suggested_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_ketcherails_atom_abbreviations_on_suggested_by ON public.ketcherails_atom_abbreviations USING btree (suggested_by);


--
-- Name: index_ketcherails_common_templates_on_moderated_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_ketcherails_common_templates_on_moderated_by ON public.ketcherails_common_templates USING btree (moderated_by);


--
-- Name: index_ketcherails_common_templates_on_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_ketcherails_common_templates_on_name ON public.ketcherails_common_templates USING btree (name);


--
-- Name: index_ketcherails_common_templates_on_suggested_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_ketcherails_common_templates_on_suggested_by ON public.ketcherails_common_templates USING btree (suggested_by);


--
-- Name: index_ketcherails_custom_templates_on_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_ketcherails_custom_templates_on_user_id ON public.ketcherails_custom_templates USING btree (user_id);


--
-- Name: index_literatures_on_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_literatures_on_deleted_at ON public.literatures USING btree (deleted_at);


--
-- Name: index_matrices_on_name; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_matrices_on_name ON public.matrices USING btree (name);


--
-- Name: index_molecule_names_on_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_molecule_names_on_deleted_at ON public.molecule_names USING btree (deleted_at);


--
-- Name: index_molecule_names_on_molecule_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_molecule_names_on_molecule_id ON public.molecule_names USING btree (molecule_id);


--
-- Name: index_molecule_names_on_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_molecule_names_on_name ON public.molecule_names USING btree (name);


--
-- Name: index_molecule_names_on_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_molecule_names_on_user_id ON public.molecule_names USING btree (user_id);


--
-- Name: index_molecule_names_on_user_id_and_molecule_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_molecule_names_on_user_id_and_molecule_id ON public.molecule_names USING btree (user_id, molecule_id);


--
-- Name: index_molecules_on_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_molecules_on_deleted_at ON public.molecules USING btree (deleted_at);


--
-- Name: index_molecules_on_inchikey_and_is_partial; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_molecules_on_inchikey_and_is_partial ON public.molecules USING btree (inchikey, is_partial);


--
-- Name: index_nmr_sim_nmr_simulations_on_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_nmr_sim_nmr_simulations_on_deleted_at ON public.nmr_sim_nmr_simulations USING btree (deleted_at);


--
-- Name: index_nmr_sim_nmr_simulations_on_molecule_id_and_source; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_nmr_sim_nmr_simulations_on_molecule_id_and_source ON public.nmr_sim_nmr_simulations USING btree (molecule_id, source);


--
-- Name: index_notifications_on_message_id_and_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_notifications_on_message_id_and_user_id ON public.notifications USING btree (message_id, user_id);


--
-- Name: index_ols_terms_on_ancestry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_ols_terms_on_ancestry ON public.ols_terms USING btree (ancestry);


--
-- Name: index_ols_terms_on_owl_name_and_term_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_ols_terms_on_owl_name_and_term_id ON public.ols_terms USING btree (owl_name, term_id);


--
-- Name: index_on_element_literature; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_on_element_literature ON public.literals USING btree (element_type, element_id, literature_id, category);


--
-- Name: index_on_literature; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_on_literature ON public.literals USING btree (literature_id, element_type, element_id);


--
-- Name: index_pg_search_documents_on_searchable_type_and_searchable_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_pg_search_documents_on_searchable_type_and_searchable_id ON public.pg_search_documents USING btree (searchable_type, searchable_id);


--
-- Name: index_predefined_template; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_predefined_template ON public.text_templates USING btree (name) WHERE ((type)::text = 'PredefinedTextTemplate'::text);


--
-- Name: index_predictions_on_decision; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_predictions_on_decision ON public.predictions USING gin (decision);


--
-- Name: index_predictions_on_predictable_type_and_predictable_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_predictions_on_predictable_type_and_predictable_id ON public.predictions USING btree (predictable_type, predictable_id);


--
-- Name: index_private_note_on_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_private_note_on_user ON public.private_notes USING btree (created_by);


--
-- Name: index_private_notes_on_noteable_type_and_noteable_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_private_notes_on_noteable_type_and_noteable_id ON public.private_notes USING btree (noteable_type, noteable_id);


--
-- Name: index_profiles_on_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_profiles_on_deleted_at ON public.profiles USING btree (deleted_at);


--
-- Name: index_profiles_on_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_profiles_on_user_id ON public.profiles USING btree (user_id);


--
-- Name: index_reactions_on_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_reactions_on_deleted_at ON public.reactions USING btree (deleted_at);


--
-- Name: index_reactions_on_rinchi_web_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_reactions_on_rinchi_web_key ON public.reactions USING btree (rinchi_web_key);


--
-- Name: index_reactions_on_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_reactions_on_role ON public.reactions USING btree (role);


--
-- Name: index_reactions_samples_on_reaction_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_reactions_samples_on_reaction_id ON public.reactions_samples USING btree (reaction_id);


--
-- Name: index_reactions_samples_on_sample_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_reactions_samples_on_sample_id ON public.reactions_samples USING btree (sample_id);


--
-- Name: index_report_templates_on_attachment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_report_templates_on_attachment_id ON public.report_templates USING btree (attachment_id);


--
-- Name: index_reports_on_author_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_reports_on_author_id ON public.reports USING btree (author_id);


--
-- Name: index_reports_on_file_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_reports_on_file_name ON public.reports USING btree (file_name);


--
-- Name: index_reports_on_report_templates_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_reports_on_report_templates_id ON public.reports USING btree (report_templates_id);


--
-- Name: index_reports_users_on_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_reports_users_on_deleted_at ON public.reports_users USING btree (deleted_at);


--
-- Name: index_reports_users_on_report_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_reports_users_on_report_id ON public.reports_users USING btree (report_id);


--
-- Name: index_reports_users_on_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_reports_users_on_user_id ON public.reports_users USING btree (user_id);


--
-- Name: index_research_plan_metadata_on_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_research_plan_metadata_on_deleted_at ON public.research_plan_metadata USING btree (deleted_at);


--
-- Name: index_research_plan_metadata_on_research_plan_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_research_plan_metadata_on_research_plan_id ON public.research_plan_metadata USING btree (research_plan_id);


--
-- Name: index_residues_on_sample_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_residues_on_sample_id ON public.residues USING btree (sample_id);


--
-- Name: index_samples_on_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_samples_on_deleted_at ON public.samples USING btree (deleted_at);


--
-- Name: index_samples_on_identifier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_samples_on_identifier ON public.samples USING btree (identifier);


--
-- Name: index_samples_on_molecule_name_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_samples_on_molecule_name_id ON public.samples USING btree (molecule_name_id);


--
-- Name: index_samples_on_sample_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_samples_on_sample_id ON public.samples USING btree (molecule_id);


--
-- Name: index_samples_on_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_samples_on_user_id ON public.samples USING btree (user_id);


--
-- Name: index_screens_on_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_screens_on_deleted_at ON public.screens USING btree (deleted_at);


--
-- Name: index_screens_wellplates_on_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_screens_wellplates_on_deleted_at ON public.screens_wellplates USING btree (deleted_at);


--
-- Name: index_screens_wellplates_on_screen_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_screens_wellplates_on_screen_id ON public.screens_wellplates USING btree (screen_id);


--
-- Name: index_screens_wellplates_on_wellplate_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_screens_wellplates_on_wellplate_id ON public.screens_wellplates USING btree (wellplate_id);


--
-- Name: index_segment_klasses_revisions_on_segment_klass_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_segment_klasses_revisions_on_segment_klass_id ON public.segment_klasses_revisions USING btree (segment_klass_id);


--
-- Name: index_segments_revisions_on_segment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_segments_revisions_on_segment_id ON public.segments_revisions USING btree (segment_id);


--
-- Name: index_subscriptions_on_channel_id_and_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_subscriptions_on_channel_id_and_user_id ON public.subscriptions USING btree (channel_id, user_id);


--
-- Name: index_sync_collections_users_on_collection_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_sync_collections_users_on_collection_id ON public.sync_collections_users USING btree (collection_id);


--
-- Name: index_sync_collections_users_on_shared_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_sync_collections_users_on_shared_by_id ON public.sync_collections_users USING btree (shared_by_id, user_id, fake_ancestry);


--
-- Name: index_sync_collections_users_on_user_id_and_fake_ancestry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_sync_collections_users_on_user_id_and_fake_ancestry ON public.sync_collections_users USING btree (user_id, fake_ancestry);


--
-- Name: index_text_templates_on_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_text_templates_on_deleted_at ON public.text_templates USING btree (deleted_at);


--
-- Name: index_text_templates_on_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_text_templates_on_user_id ON public.text_templates USING btree (user_id);


--
-- Name: index_users_admins_on_admin_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_users_admins_on_admin_id ON public.users_admins USING btree (admin_id);


--
-- Name: index_users_admins_on_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_users_admins_on_user_id ON public.users_admins USING btree (user_id);


--
-- Name: index_users_groups_on_group_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_users_groups_on_group_id ON public.users_groups USING btree (group_id);


--
-- Name: index_users_groups_on_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_users_groups_on_user_id ON public.users_groups USING btree (user_id);


--
-- Name: index_users_on_confirmation_token; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_users_on_confirmation_token ON public.users USING btree (confirmation_token);


--
-- Name: index_users_on_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_users_on_deleted_at ON public.users USING btree (deleted_at);


--
-- Name: index_users_on_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_users_on_email ON public.users USING btree (email);


--
-- Name: index_users_on_name_abbreviation; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_users_on_name_abbreviation ON public.users USING btree (name_abbreviation) WHERE (name_abbreviation IS NOT NULL);


--
-- Name: index_users_on_reset_password_token; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_users_on_reset_password_token ON public.users USING btree (reset_password_token);


--
-- Name: index_users_on_unlock_token; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_users_on_unlock_token ON public.users USING btree (unlock_token);


--
-- Name: index_wellplates_on_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_wellplates_on_deleted_at ON public.wellplates USING btree (deleted_at);


--
-- Name: index_wells_on_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_wells_on_deleted_at ON public.wells USING btree (deleted_at);


--
-- Name: index_wells_on_sample_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_wells_on_sample_id ON public.wells USING btree (sample_id);


--
-- Name: index_wells_on_wellplate_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_wells_on_wellplate_id ON public.wells USING btree (wellplate_id);


--
-- Name: uni_scifinder_n_credentials; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uni_scifinder_n_credentials ON public.scifinder_n_credentials USING btree (created_by);


--
-- Name: attachments logidze_on_attachments; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER logidze_on_attachments BEFORE INSERT OR UPDATE ON public.attachments FOR EACH ROW WHEN ((COALESCE(current_setting('logidze.disabled'::text, true), ''::text) <> 'on'::text)) EXECUTE FUNCTION public.logidze_logger('null', 'updated_at', '{attachment_data}', 'true');


--
-- Name: matrices update_users_matrix_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_users_matrix_trg AFTER INSERT OR UPDATE ON public.matrices FOR EACH ROW EXECUTE FUNCTION public.update_users_matrix();


--
-- Name: literals fk_rails_a065c2905f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.literals
    ADD CONSTRAINT fk_rails_a065c2905f FOREIGN KEY (literature_id) REFERENCES public.literatures(id);


--
-- Name: report_templates fk_rails_b549b8ae9d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_templates
    ADD CONSTRAINT fk_rails_b549b8ae9d FOREIGN KEY (attachment_id) REFERENCES public.attachments(id);


--
-- PostgreSQL database dump complete
--

SET search_path TO "$user", public;

INSERT INTO "schema_migrations" (version) VALUES
('20150618114948'),
('20150728120436'),
('20150817085601'),
('20150817200859'),
('20150818100730'),
('20150825144929'),
('20150828072626'),
('20150831071333'),
('20150916161541'),
('20150917124536'),
('20150918115918'),
('20150928075813'),
('20150928130831'),
('20150929123358'),
('20151002083208'),
('20151004084416'),
('20151005145922'),
('20151005151021'),
('20151005195648'),
('20151006123344'),
('20151007231740'),
('20151009130555'),
('20151009135514'),
('20151012083428'),
('20151012130019'),
('20151015161007'),
('20151021100740'),
('20151023135011'),
('20151027111518'),
('20151027164552'),
('20151109131413'),
('20151111140555'),
('20151118090203'),
('20151127145354'),
('20151203092316'),
('20151204112634'),
('20151207170817'),
('20160126113426'),
('20160316083518'),
('20160404115858'),
('20160411112619'),
('20160413144919'),
('20160414070925'),
('20160428115515'),
('20160429072510'),
('20160518121815'),
('20160524102833'),
('20160623081843'),
('20160627102544'),
('20160627110544'),
('20160627115254'),
('20160630100818'),
('20160715160520'),
('20160718071541'),
('20160719113538'),
('20160719130259'),
('20160719152553'),
('20160720092012'),
('20160720111523'),
('20160725120549'),
('20160725135743'),
('20160725142712'),
('20160726162453'),
('20160727160203'),
('20160729105554'),
('20160809122557'),
('20160815080243'),
('20160822115224'),
('20160823110331'),
('20160825120422'),
('20160901142139'),
('20160920091519'),
('20160920105050'),
('20160926113940'),
('20161004121244'),
('20161024083139'),
('20161109141353'),
('20161201152821'),
('20161207084424'),
('20161212154142'),
('20161214131916'),
('20161215133014'),
('20161221125649'),
('20161221130945'),
('20161221143217'),
('20170103155405'),
('20170103155423'),
('20170104085233'),
('20170105094838'),
('20170111100223'),
('20170113154425'),
('20170123094157'),
('20170125112946'),
('20170201113437'),
('20170201123538'),
('20170202075710'),
('20170202080000'),
('20170209094545'),
('20170210102655'),
('20170215133510'),
('20170221164718'),
('20170307101429'),
('20170320084528'),
('20170322135348'),
('20170327091111'),
('20170329121122'),
('20170329121123'),
('20170331121124'),
('20170405152400'),
('20170405152500'),
('20170405152501'),
('20170411104507'),
('20170414012345'),
('20170509084420'),
('20170509085000'),
('20170512110856'),
('20170524130531'),
('20170620133722'),
('20170629121125'),
('20170705081238'),
('20170801141124'),
('20170802080219'),
('20170809123558'),
('20170816134224'),
('20170816135217'),
('20170821154142'),
('20170828104739'),
('20170901112025'),
('20170905071218'),
('20170906105933'),
('20170908105401'),
('20170914092558'),
('20170914130439'),
('20170928075547'),
('20170928124229'),
('20171004132647'),
('20171014184604'),
('20171019102800'),
('20171121171212'),
('20171220140635'),
('20180115110710'),
('20180205132254'),
('20180226130228'),
('20180226130229'),
('20180312095413'),
('20180510101010'),
('20180516151737'),
('20180518053658'),
('20180524103806'),
('20180529123358'),
('20180618052835'),
('20180620144623'),
('20180620144710'),
('20180704131215'),
('20180709180000'),
('20180723124200'),
('20180723140300'),
('20180726152200'),
('20180801110000'),
('20180801120000'),
('20180801130000'),
('20180802164000'),
('20180802170000'),
('20180807153900'),
('20180812115719'),
('20180814131055'),
('20180814141400'),
('20180815144035'),
('20180816161600'),
('20180827140000'),
('20180831084640'),
('20180831125901'),
('20180903134741'),
('20180918085000'),
('20180918120000'),
('20180921140800'),
('20180925165000'),
('20181009155001'),
('20181029081414'),
('20181105103800'),
('20181122140000'),
('20181122145822'),
('20181128110000'),
('20181206075723'),
('20181207091112'),
('20181207100526'),
('20190110083400'),
('20190204152500'),
('20190206100500'),
('20190307113259'),
('20190320145415'),
('20190508084000'),
('20190514080856'),
('20190604100811'),
('20190617144801'),
('20190617153000'),
('20190618153000'),
('20190619135600'),
('20190619153000'),
('20190708112047'),
('20190712090136'),
('20190716092051'),
('20190722090944'),
('20190724100000'),
('20190731120000'),
('20190812124349'),
('20190828111502'),
('20191128100001'),
('20200117115709'),
('20200212100002'),
('20200306100001'),
('20200513100000'),
('20200702091855'),
('20200710114058'),
('20200715094007'),
('20200819093220'),
('20200819131000'),
('20200820102805'),
('20200820160020'),
('20200824143243'),
('20200824143253'),
('20200824153242'),
('20200827133000'),
('20200827144816'),
('20200911075633'),
('20200917155839'),
('20200928115156'),
('20201023170550'),
('20201027130000'),
('20201109012155'),
('20201123234035'),
('20201126081805'),
('20201127071139'),
('20201130121311'),
('20201201051854'),
('20201209222212'),
('20201214090807'),
('20201216153122'),
('20201217172428'),
('20210108230206'),
('20210216132619'),
('20210217164124'),
('20210222154608'),
('20210225075410'),
('20210303140000'),
('20210312160000'),
('20210316132500'),
('20210316132800'),
('20210316133000'),
('20210318133000'),
('20210416075103'),
('20210429141415'),
('20210527172347'),
('20210604232803'),
('20210605105020'),
('20210605125007'),
('20210610000001'),
('20210610105014'),
('20210614115000'),
('20210617132532'),
('20210621145002'),
('20210621155000'),
('20210714082826'),
('20210816094212'),
('20210816113952'),
('20210825082859'),
('20210916091017'),
('20210920171211'),
('20210921114420'),
('20210921114428'),
('20210924095106'),
('20211105091019'),
('20211111112219'),
('20211115222715'),
('20211117235010'),
('20211118112711'),
('20211122142906'),
('20211206144812'),
('20220114085300'),
('20220116164546'),
('20220207134748'),
('20220210074909'),
('20220210201552'),
('20220210220638'),
('20220214100000'),
('20220216133756'),
('20220217161840'),
('20220309182512');


