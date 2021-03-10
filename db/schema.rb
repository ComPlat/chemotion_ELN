# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# Note that this schema.rb definition is the authoritative source for your
# database schema. If you need to create the application database on another
# system, you should be using db:schema:load, not running all the migrations
# from scratch. The latter is a flawed and unsustainable approach (the more migrations
# you'll amass, the slower it'll run and the greater likelihood for issues).
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema.define(version: 2021_02_17_164124) do

  # These are extensions that must be enabled in order to support this database
  enable_extension "hstore"
  enable_extension "pg_trgm"
  enable_extension "plpgsql"
  enable_extension "uuid-ossp"

  create_table "affiliations", id: :serial, force: :cascade do |t|
    t.string "company"
    t.string "country"
    t.string "organization"
    t.string "department"
    t.string "group"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.date "from"
    t.date "to"
    t.string "domain"
    t.string "cat"
  end

  create_table "analyses_experiments", id: :serial, force: :cascade do |t|
    t.integer "sample_id"
    t.integer "holder_id"
    t.string "status"
    t.integer "devices_analysis_id", null: false
    t.integer "devices_sample_id", null: false
    t.string "sample_analysis_id", null: false
    t.string "solvent"
    t.string "experiment"
    t.boolean "priority"
    t.boolean "on_day"
    t.integer "number_of_scans"
    t.integer "sweep_width"
    t.string "time"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "attachments", id: :serial, force: :cascade do |t|
    t.integer "attachable_id"
    t.string "filename"
    t.uuid "identifier", default: -> { "uuid_generate_v4()" }
    t.string "checksum"
    t.string "storage", limit: 20, default: "tmp"
    t.integer "created_by", null: false
    t.integer "created_for"
    t.integer "version", default: 0
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "content_type"
    t.string "bucket"
    t.string "key", limit: 500
    t.boolean "thumb", default: false
    t.string "folder"
    t.string "attachable_type"
    t.string "aasm_state"
    t.integer "filesize"
    t.index ["attachable_type", "attachable_id"], name: "index_attachments_on_attachable_type_and_attachable_id"
    t.index ["identifier"], name: "index_attachments_on_identifier", unique: true
  end

  create_table "authentication_keys", id: :serial, force: :cascade do |t|
    t.string "token", null: false
    t.integer "user_id"
    t.inet "ip"
    t.string "role"
    t.string "fqdn"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.index ["user_id"], name: "index_authentication_keys_on_user_id"
  end

  create_table "channels", id: :serial, force: :cascade do |t|
    t.string "subject"
    t.jsonb "msg_template"
    t.integer "channel_type", default: 0
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "code_logs", id: :uuid, default: -> { "uuid_generate_v4()" }, force: :cascade do |t|
    t.string "source"
    t.integer "source_id"
    t.string "value", limit: 40
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["source", "source_id"], name: "index_code_logs_on_source_and_source_id"
  end

  create_table "collections", id: :serial, force: :cascade do |t|
    t.integer "user_id", null: false
    t.string "ancestry"
    t.text "label", null: false
    t.integer "shared_by_id"
    t.boolean "is_shared", default: false
    t.integer "permission_level", default: 0
    t.integer "sample_detail_level", default: 10
    t.integer "reaction_detail_level", default: 10
    t.integer "wellplate_detail_level", default: 10
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "position"
    t.integer "screen_detail_level", default: 10
    t.boolean "is_locked", default: false
    t.datetime "deleted_at"
    t.boolean "is_synchronized", default: false, null: false
    t.integer "researchplan_detail_level", default: 10
    t.index ["ancestry"], name: "index_collections_on_ancestry"
    t.index ["deleted_at"], name: "index_collections_on_deleted_at"
    t.index ["user_id"], name: "index_collections_on_user_id"
  end

  create_table "collections_reactions", id: :serial, force: :cascade do |t|
    t.integer "collection_id"
    t.integer "reaction_id"
    t.datetime "deleted_at"
    t.index ["collection_id"], name: "index_collections_reactions_on_collection_id"
    t.index ["deleted_at"], name: "index_collections_reactions_on_deleted_at"
    t.index ["reaction_id", "collection_id"], name: "index_collections_reactions_on_reaction_id_and_collection_id", unique: true
  end

  create_table "collections_research_plans", id: :serial, force: :cascade do |t|
    t.integer "collection_id"
    t.integer "research_plan_id"
    t.datetime "deleted_at"
    t.index ["research_plan_id", "collection_id"], name: "index_collections_research_plans_on_rplan_id_and_coll_id", unique: true
  end

  create_table "collections_samples", id: :serial, force: :cascade do |t|
    t.integer "collection_id"
    t.integer "sample_id"
    t.datetime "deleted_at"
    t.index ["collection_id"], name: "index_collections_samples_on_collection_id"
    t.index ["deleted_at"], name: "index_collections_samples_on_deleted_at"
    t.index ["sample_id", "collection_id"], name: "index_collections_samples_on_sample_id_and_collection_id", unique: true
  end

  create_table "collections_screens", id: :serial, force: :cascade do |t|
    t.integer "collection_id"
    t.integer "screen_id"
    t.datetime "deleted_at"
    t.index ["collection_id"], name: "index_collections_screens_on_collection_id"
    t.index ["deleted_at"], name: "index_collections_screens_on_deleted_at"
    t.index ["screen_id", "collection_id"], name: "index_collections_screens_on_screen_id_and_collection_id", unique: true
  end

  create_table "collections_wellplates", id: :serial, force: :cascade do |t|
    t.integer "collection_id"
    t.integer "wellplate_id"
    t.datetime "deleted_at"
    t.index ["collection_id"], name: "index_collections_wellplates_on_collection_id"
    t.index ["deleted_at"], name: "index_collections_wellplates_on_deleted_at"
    t.index ["wellplate_id", "collection_id"], name: "index_collections_wellplates_on_wellplate_id_and_collection_id", unique: true
  end

  create_table "collector_errors", id: :serial, force: :cascade do |t|
    t.string "error_code"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "computed_props", id: :serial, force: :cascade do |t|
    t.integer "molecule_id"
    t.float "max_potential", default: 0.0
    t.float "min_potential", default: 0.0
    t.float "mean_potential", default: 0.0
    t.float "lumo", default: 0.0
    t.float "homo", default: 0.0
    t.float "ip", default: 0.0
    t.float "ea", default: 0.0
    t.float "dipol_debye", default: 0.0
    t.integer "status", default: 0
    t.jsonb "data"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.float "mean_abs_potential", default: 0.0
    t.integer "creator", default: 0
    t.integer "sample_id", default: 0
    t.jsonb "tddft", default: "{}"
    t.string "task_id"
    t.datetime "deleted_at"
    t.index ["deleted_at"], name: "index_computed_props_on_deleted_at"
  end

  create_table "container_hierarchies", id: false, force: :cascade do |t|
    t.integer "ancestor_id", null: false
    t.integer "descendant_id", null: false
    t.integer "generations", null: false
    t.index ["ancestor_id", "descendant_id", "generations"], name: "container_anc_desc_udx", unique: true
    t.index ["descendant_id"], name: "container_desc_idx"
  end

  create_table "containers", id: :serial, force: :cascade do |t|
    t.string "ancestry"
    t.integer "containable_id"
    t.string "containable_type"
    t.string "name"
    t.string "container_type"
    t.text "description"
    t.hstore "extended_metadata", default: {}
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "parent_id"
    t.index ["containable_type", "containable_id"], name: "index_containers_on_containable"
  end

  create_table "delayed_jobs", id: :serial, force: :cascade do |t|
    t.integer "priority", default: 0, null: false
    t.integer "attempts", default: 0, null: false
    t.text "handler", null: false
    t.text "last_error"
    t.datetime "run_at"
    t.datetime "locked_at"
    t.datetime "failed_at"
    t.string "locked_by"
    t.string "queue"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.string "cron"
    t.index ["priority", "run_at"], name: "delayed_jobs_priority"
  end

  create_table "element_tags", id: :serial, force: :cascade do |t|
    t.string "taggable_type"
    t.integer "taggable_id"
    t.jsonb "taggable_data"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.index ["taggable_id"], name: "index_element_tags_on_taggable_id"
  end

  create_table "elemental_compositions", id: :serial, force: :cascade do |t|
    t.integer "sample_id", null: false
    t.string "composition_type", null: false
    t.hstore "data", default: {}, null: false
    t.float "loading"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.index ["sample_id"], name: "index_elemental_compositions_on_sample_id"
  end

  create_table "experiments", id: :serial, force: :cascade do |t|
    t.string "type", limit: 20
    t.string "name"
    t.text "description"
    t.string "status", limit: 20
    t.jsonb "parameter"
    t.integer "user_id"
    t.integer "device_id"
    t.integer "container_id"
    t.integer "experimentable_id"
    t.string "experimentable_type"
    t.string "ancestry"
    t.integer "parent_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "fingerprints", id: :serial, force: :cascade do |t|
    t.bit "fp0", limit: 64
    t.bit "fp1", limit: 64
    t.bit "fp2", limit: 64
    t.bit "fp3", limit: 64
    t.bit "fp4", limit: 64
    t.bit "fp5", limit: 64
    t.bit "fp6", limit: 64
    t.bit "fp7", limit: 64
    t.bit "fp8", limit: 64
    t.bit "fp9", limit: 64
    t.bit "fp10", limit: 64
    t.bit "fp11", limit: 64
    t.bit "fp12", limit: 64
    t.bit "fp13", limit: 64
    t.bit "fp14", limit: 64
    t.bit "fp15", limit: 64
    t.integer "num_set_bits", limit: 2
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.time "deleted_at"
  end

  create_table "ketcherails_amino_acids", id: :serial, force: :cascade do |t|
    t.integer "moderated_by"
    t.integer "suggested_by"
    t.string "name", null: false
    t.text "molfile", null: false
    t.integer "aid", default: 1, null: false
    t.integer "aid2", default: 1, null: false
    t.integer "bid", default: 1, null: false
    t.string "icon_path"
    t.string "sprite_class"
    t.string "status"
    t.text "notes"
    t.datetime "approved_at"
    t.datetime "rejected_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "icon_file_name"
    t.string "icon_content_type"
    t.integer "icon_file_size"
    t.datetime "icon_updated_at"
    t.index ["moderated_by"], name: "index_ketcherails_amino_acids_on_moderated_by"
    t.index ["name"], name: "index_ketcherails_amino_acids_on_name"
    t.index ["suggested_by"], name: "index_ketcherails_amino_acids_on_suggested_by"
  end

  create_table "ketcherails_atom_abbreviations", id: :serial, force: :cascade do |t|
    t.integer "moderated_by"
    t.integer "suggested_by"
    t.string "name", null: false
    t.text "molfile", null: false
    t.integer "aid", default: 1, null: false
    t.integer "bid", default: 1, null: false
    t.string "icon_path"
    t.string "sprite_class"
    t.string "status"
    t.text "notes"
    t.datetime "approved_at"
    t.datetime "rejected_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "icon_file_name"
    t.string "icon_content_type"
    t.integer "icon_file_size"
    t.datetime "icon_updated_at"
    t.string "rtl_name"
    t.index ["moderated_by"], name: "index_ketcherails_atom_abbreviations_on_moderated_by"
    t.index ["name"], name: "index_ketcherails_atom_abbreviations_on_name"
    t.index ["suggested_by"], name: "index_ketcherails_atom_abbreviations_on_suggested_by"
  end

  create_table "ketcherails_common_templates", id: :serial, force: :cascade do |t|
    t.integer "moderated_by"
    t.integer "suggested_by"
    t.string "name", null: false
    t.text "molfile", null: false
    t.string "icon_path"
    t.string "sprite_class"
    t.text "notes"
    t.datetime "approved_at"
    t.datetime "rejected_at"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.integer "template_category_id"
    t.string "status"
    t.string "icon_file_name"
    t.string "icon_content_type"
    t.integer "icon_file_size"
    t.datetime "icon_updated_at"
    t.index ["moderated_by"], name: "index_ketcherails_common_templates_on_moderated_by"
    t.index ["name"], name: "index_ketcherails_common_templates_on_name"
    t.index ["suggested_by"], name: "index_ketcherails_common_templates_on_suggested_by"
  end

  create_table "ketcherails_custom_templates", id: :serial, force: :cascade do |t|
    t.integer "user_id", null: false
    t.string "name", null: false
    t.text "molfile", null: false
    t.string "icon_path"
    t.string "sprite_class"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.index ["user_id"], name: "index_ketcherails_custom_templates_on_user_id"
  end

  create_table "ketcherails_template_categories", id: :serial, force: :cascade do |t|
    t.string "name", null: false
    t.datetime "created_at"
    t.datetime "updated_at"
    t.string "icon_file_name"
    t.string "icon_content_type"
    t.integer "icon_file_size"
    t.datetime "icon_updated_at"
    t.string "sprite_class"
  end

  create_table "literals", id: :serial, force: :cascade do |t|
    t.integer "literature_id"
    t.integer "element_id"
    t.string "element_type", limit: 40
    t.string "category", limit: 40
    t.integer "user_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "litype"
    t.index ["element_type", "element_id", "literature_id", "category"], name: "index_on_element_literature"
    t.index ["literature_id", "element_type", "element_id"], name: "index_on_literature"
  end

  create_table "literatures", id: :serial, force: :cascade do |t|
    t.string "title"
    t.string "url"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.datetime "deleted_at"
    t.jsonb "refs"
    t.string "doi"
    t.string "isbn"
    t.index ["deleted_at"], name: "index_literatures_on_deleted_at"
  end

  create_table "matrices", id: :serial, force: :cascade do |t|
    t.string "name", null: false
    t.boolean "enabled", default: false
    t.string "label"
    t.integer "include_ids", default: [], array: true
    t.integer "exclude_ids", default: [], array: true
    t.jsonb "configs", default: "{}", null: false
    t.datetime "created_at"
    t.datetime "updated_at"
    t.datetime "deleted_at"
    t.index ["name"], name: "index_matrices_on_name", unique: true
  end

  create_table "messages", id: :serial, force: :cascade do |t|
    t.integer "channel_id"
    t.jsonb "content", null: false
    t.integer "created_by", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "molecule_names", id: :serial, force: :cascade do |t|
    t.integer "molecule_id"
    t.integer "user_id"
    t.text "description"
    t.string "name", null: false
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["deleted_at"], name: "index_molecule_names_on_deleted_at"
    t.index ["molecule_id"], name: "index_molecule_names_on_molecule_id"
    t.index ["name"], name: "index_molecule_names_on_name"
    t.index ["user_id", "molecule_id"], name: "index_molecule_names_on_user_id_and_molecule_id"
    t.index ["user_id"], name: "index_molecule_names_on_user_id"
  end

  create_table "molecules", id: :serial, force: :cascade do |t|
    t.string "inchikey"
    t.string "inchistring"
    t.float "density", default: 0.0
    t.float "molecular_weight"
    t.binary "molfile"
    t.float "melting_point"
    t.float "boiling_point"
    t.string "sum_formular"
    t.string "names", default: [], array: true
    t.string "iupac_name"
    t.string "molecule_svg_file"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.datetime "deleted_at"
    t.boolean "is_partial", default: false, null: false
    t.float "exact_molecular_weight"
    t.string "cano_smiles"
    t.text "cas"
    t.string "molfile_version", limit: 20
    t.index ["deleted_at"], name: "index_molecules_on_deleted_at"
    t.index ["inchikey", "is_partial"], name: "index_molecules_on_inchikey_and_is_partial", unique: true
  end

  create_table "notifications", id: :serial, force: :cascade do |t|
    t.integer "message_id"
    t.integer "user_id"
    t.integer "is_ack", default: 0
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["message_id", "user_id"], name: "index_notifications_on_message_id_and_user_id", unique: true
  end

  create_table "ols_terms", id: :serial, force: :cascade do |t|
    t.string "owl_name"
    t.string "term_id"
    t.string "ancestry"
    t.string "ancestry_term_id"
    t.string "label"
    t.string "synonym"
    t.jsonb "synonyms"
    t.string "desc"
    t.jsonb "metadata"
    t.boolean "is_enabled", default: true
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["ancestry"], name: "index_ols_terms_on_ancestry"
    t.index ["owl_name", "term_id"], name: "index_ols_terms_on_owl_name_and_term_id", unique: true
  end

  create_table "pg_search_documents", id: :serial, force: :cascade do |t|
    t.text "content"
    t.string "searchable_type"
    t.integer "searchable_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["searchable_type", "searchable_id"], name: "index_pg_search_documents_on_searchable_type_and_searchable_id"
  end

  create_table "predictions", id: :serial, force: :cascade do |t|
    t.string "predictable_type"
    t.integer "predictable_id"
    t.jsonb "decision", default: "{}", null: false
    t.datetime "created_at"
    t.datetime "updated_at"
    t.index ["decision"], name: "index_predictions_on_decision", using: :gin
    t.index ["predictable_type", "predictable_id"], name: "index_predictions_on_predictable_type_and_predictable_id"
  end

  create_table "profiles", id: :serial, force: :cascade do |t|
    t.boolean "show_external_name", default: false
    t.integer "user_id", null: false
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.jsonb "data", default: {}, null: false
    t.integer "curation", default: 2
    t.index ["deleted_at"], name: "index_profiles_on_deleted_at"
    t.index ["user_id"], name: "index_profiles_on_user_id"
  end

  create_table "reactions", id: :serial, force: :cascade do |t|
    t.string "name"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.text "description"
    t.string "timestamp_start"
    t.string "timestamp_stop"
    t.text "observation"
    t.string "purification", default: [], array: true
    t.string "dangerous_products", default: [], array: true
    t.string "tlc_solvents"
    t.text "tlc_description"
    t.string "rf_value"
    t.jsonb "temperature", default: "{\"valueUnit\": \"°C\",\"userText\": \"\", \"data\": []}"
    t.string "status"
    t.string "reaction_svg_file"
    t.string "solvent"
    t.datetime "deleted_at"
    t.string "short_label"
    t.integer "created_by"
    t.string "role"
    t.jsonb "origin"
    t.text "rinchi_string"
    t.text "rinchi_long_key"
    t.string "rinchi_short_key"
    t.string "rinchi_web_key"
    t.string "duration"
    t.string "rxno"
    t.string "conditions"
    t.index ["deleted_at"], name: "index_reactions_on_deleted_at"
    t.index ["rinchi_web_key"], name: "index_reactions_on_rinchi_web_key"
    t.index ["role"], name: "index_reactions_on_role"
  end

  create_table "reactions_samples", id: :serial, force: :cascade do |t|
    t.integer "reaction_id"
    t.integer "sample_id"
    t.boolean "reference"
    t.float "equivalent"
    t.integer "position"
    t.string "type"
    t.datetime "deleted_at"
    t.boolean "waste", default: false
    t.float "coefficient", default: 1.0
    t.index ["reaction_id"], name: "index_reactions_samples_on_reaction_id"
    t.index ["sample_id"], name: "index_reactions_samples_on_sample_id"
  end

  create_table "reports", id: :serial, force: :cascade do |t|
    t.integer "author_id"
    t.string "file_name"
    t.text "file_description"
    t.text "configs"
    t.text "sample_settings"
    t.text "reaction_settings"
    t.text "objects"
    t.string "img_format"
    t.string "file_path"
    t.datetime "generated_at"
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "template", default: "standard"
    t.text "mol_serials", default: [], array: true
    t.text "si_reaction_settings", default: "{\"Name\"=>true, \"CAS\"=>true, \"Formula\"=>true, \"Smiles\"=>true, \"InCHI\"=>true, \"Molecular Mass\"=>true, \"Exact Mass\"=>true, \"EA\"=>true}"
    t.text "prd_atts", default: [], array: true
    t.index ["author_id"], name: "index_reports_on_author_id"
    t.index ["file_name"], name: "index_reports_on_file_name"
  end

  create_table "reports_users", id: :serial, force: :cascade do |t|
    t.integer "user_id"
    t.integer "report_id"
    t.datetime "downloaded_at"
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["deleted_at"], name: "index_reports_users_on_deleted_at"
    t.index ["report_id"], name: "index_reports_users_on_report_id"
    t.index ["user_id"], name: "index_reports_users_on_user_id"
  end

  create_table "research_plan_table_schemas", id: :serial, force: :cascade do |t|
    t.string "name"
    t.jsonb "value"
    t.integer "created_by", null: false
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "research_plans", id: :serial, force: :cascade do |t|
    t.string "name", null: false
    t.integer "created_by", null: false
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.jsonb "body"
  end

  create_table "residues", id: :serial, force: :cascade do |t|
    t.integer "sample_id"
    t.string "residue_type"
    t.hstore "custom_info"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["sample_id"], name: "index_residues_on_sample_id"
  end

  create_table "samples", id: :serial, force: :cascade do |t|
    t.string "name"
    t.float "target_amount_value", default: 0.0
    t.string "target_amount_unit", default: "g"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.text "description", default: ""
    t.integer "molecule_id"
    t.binary "molfile"
    t.float "purity", default: 1.0
    t.string "solvent", default: ""
    t.string "impurities", default: ""
    t.string "location", default: ""
    t.boolean "is_top_secret", default: false
    t.string "ancestry"
    t.string "external_label", default: ""
    t.integer "created_by"
    t.string "short_label"
    t.float "real_amount_value"
    t.string "real_amount_unit"
    t.string "imported_readout"
    t.datetime "deleted_at"
    t.string "sample_svg_file"
    t.integer "user_id"
    t.string "identifier"
    t.float "density", default: 0.0
    t.numrange "melting_point"
    t.numrange "boiling_point"
    t.integer "fingerprint_id"
    t.jsonb "xref", default: "{}"
    t.float "molarity_value", default: 0.0
    t.string "molarity_unit", default: "M"
    t.integer "molecule_name_id"
    t.string "molfile_version", limit: 20
    t.jsonb "stereo"
    t.string "metrics", default: "mmm"
    t.index ["deleted_at"], name: "index_samples_on_deleted_at"
    t.index ["identifier"], name: "index_samples_on_identifier"
    t.index ["molecule_id"], name: "index_samples_on_sample_id"
    t.index ["molecule_name_id"], name: "index_samples_on_molecule_name_id"
    t.index ["user_id"], name: "index_samples_on_user_id"
  end

  create_table "screens", id: :serial, force: :cascade do |t|
    t.string "description"
    t.string "name"
    t.string "result"
    t.string "collaborator"
    t.string "conditions"
    t.string "requirements"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.datetime "deleted_at"
    t.index ["deleted_at"], name: "index_screens_on_deleted_at"
  end

  create_table "screens_wellplates", id: :serial, force: :cascade do |t|
    t.integer "screen_id"
    t.integer "wellplate_id"
    t.datetime "deleted_at"
    t.index ["deleted_at"], name: "index_screens_wellplates_on_deleted_at"
    t.index ["screen_id"], name: "index_screens_wellplates_on_screen_id"
    t.index ["wellplate_id"], name: "index_screens_wellplates_on_wellplate_id"
  end

  create_table "subscriptions", id: :serial, force: :cascade do |t|
    t.integer "channel_id"
    t.integer "user_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["channel_id", "user_id"], name: "index_subscriptions_on_channel_id_and_user_id", unique: true
  end

  create_table "sync_collections_users", id: :serial, force: :cascade do |t|
    t.integer "user_id"
    t.integer "collection_id"
    t.integer "shared_by_id"
    t.integer "permission_level", default: 0
    t.integer "sample_detail_level", default: 0
    t.integer "reaction_detail_level", default: 0
    t.integer "wellplate_detail_level", default: 0
    t.integer "screen_detail_level", default: 0
    t.string "fake_ancestry"
    t.integer "researchplan_detail_level", default: 10
    t.string "label"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.index ["collection_id"], name: "index_sync_collections_users_on_collection_id"
    t.index ["shared_by_id", "user_id", "fake_ancestry"], name: "index_sync_collections_users_on_shared_by_id"
    t.index ["user_id", "fake_ancestry"], name: "index_sync_collections_users_on_user_id_and_fake_ancestry"
  end

  create_table "user_affiliations", id: :serial, force: :cascade do |t|
    t.integer "user_id"
    t.integer "affiliation_id"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.datetime "deleted_at"
    t.date "from"
    t.date "to"
    t.boolean "main"
  end

  create_table "user_labels", id: :serial, force: :cascade do |t|
    t.integer "user_id"
    t.string "title", null: false
    t.string "description"
    t.string "color", null: false
    t.integer "access_level", default: 0
    t.integer "position", default: 10
    t.datetime "created_at"
    t.datetime "updated_at"
    t.datetime "deleted_at"
  end

  create_table "users", id: :serial, force: :cascade do |t|
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.string "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.integer "sign_in_count", default: 0, null: false
    t.datetime "current_sign_in_at"
    t.datetime "last_sign_in_at"
    t.inet "current_sign_in_ip"
    t.inet "last_sign_in_ip"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "name"
    t.string "first_name", null: false
    t.string "last_name", null: false
    t.datetime "deleted_at"
    t.hstore "counters", default: {"samples"=>"0", "reactions"=>"0", "wellplates"=>"0"}, null: false
    t.string "name_abbreviation", limit: 12
    t.string "type", default: "Person"
    t.string "reaction_name_prefix", limit: 3, default: "R"
    t.string "confirmation_token"
    t.datetime "confirmed_at"
    t.datetime "confirmation_sent_at"
    t.string "unconfirmed_email"
    t.hstore "layout", default: {"sample"=>"1", "screen"=>"4", "reaction"=>"2", "wellplate"=>"3", "research_plan"=>"5"}, null: false
    t.integer "selected_device_id"
    t.integer "failed_attempts", default: 0, null: false
    t.string "unlock_token"
    t.datetime "locked_at"
    t.boolean "account_active"
    t.integer "matrix", default: 0
    t.index ["confirmation_token"], name: "index_users_on_confirmation_token", unique: true
    t.index ["deleted_at"], name: "index_users_on_deleted_at"
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["name_abbreviation"], name: "index_users_on_name_abbreviation", unique: true, where: "(name_abbreviation IS NOT NULL)"
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
    t.index ["unlock_token"], name: "index_users_on_unlock_token", unique: true
  end

  create_table "users_admins", id: :serial, force: :cascade do |t|
    t.integer "user_id"
    t.integer "admin_id"
    t.index ["admin_id"], name: "index_users_admins_on_admin_id"
    t.index ["user_id"], name: "index_users_admins_on_user_id"
  end

  create_table "users_devices", id: :serial, force: :cascade do |t|
    t.integer "user_id"
    t.integer "device_id"
  end

  create_table "users_groups", id: :serial, force: :cascade do |t|
    t.integer "user_id"
    t.integer "group_id"
    t.index ["group_id"], name: "index_users_groups_on_group_id"
    t.index ["user_id"], name: "index_users_groups_on_user_id"
  end

  create_table "wellplates", id: :serial, force: :cascade do |t|
    t.string "name"
    t.integer "size"
    t.string "description"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.datetime "deleted_at"
    t.index ["deleted_at"], name: "index_wellplates_on_deleted_at"
  end

  create_table "wells", id: :serial, force: :cascade do |t|
    t.integer "sample_id"
    t.integer "wellplate_id", null: false
    t.integer "position_x"
    t.integer "position_y"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "readout"
    t.string "additive"
    t.datetime "deleted_at"
    t.index ["deleted_at"], name: "index_wells_on_deleted_at"
    t.index ["sample_id"], name: "index_wells_on_sample_id"
    t.index ["wellplate_id"], name: "index_wells_on_wellplate_id"
  end

  add_foreign_key "literals", "literatures"

  create_function :user_instrument, sql_definition: <<-SQL
      CREATE OR REPLACE FUNCTION public.user_instrument(user_id integer, sc text)
       RETURNS TABLE(instrument text)
       LANGUAGE sql
      AS $function$
         select distinct extended_metadata -> 'instrument' as instrument from containers c
         where c.container_type='dataset' and c.id in
         (select ch.descendant_id from containers sc,container_hierarchies ch, samples s, users u
         where sc.containable_type in ('Sample','Reaction') and ch.ancestor_id=sc.id and sc.containable_id=s.id
         and s.created_by = u.id and u.id = $1 and ch.generations=3 group by descendant_id)
         and upper(extended_metadata -> 'instrument') like upper($2 || '%')
         order by extended_metadata -> 'instrument' limit 10
       $function$
  SQL
  create_function :collection_shared_names, sql_definition: <<-SQL
      CREATE OR REPLACE FUNCTION public.collection_shared_names(user_id integer, collection_id integer)
       RETURNS json
       LANGUAGE sql
      AS $function$
       select array_to_json(array_agg(row_to_json(result))) from (
       SELECT sync_collections_users.id, users.type,users.first_name || chr(32) || users.last_name as name,sync_collections_users.permission_level,
       sync_collections_users.reaction_detail_level,sync_collections_users.sample_detail_level,sync_collections_users.screen_detail_level,sync_collections_users.wellplate_detail_level
       FROM sync_collections_users
       INNER JOIN users ON users.id = sync_collections_users.user_id AND users.deleted_at IS NULL
       WHERE sync_collections_users.shared_by_id = $1 and sync_collections_users.collection_id = $2
       group by  sync_collections_users.id,users.type,users.name_abbreviation,users.first_name,users.last_name,sync_collections_users.permission_level
       ) as result
       $function$
  SQL
  create_function :user_ids, sql_definition: <<-SQL
      CREATE OR REPLACE FUNCTION public.user_ids(user_id integer)
       RETURNS TABLE(user_ids integer)
       LANGUAGE sql
      AS $function$
          select $1 as id
          union
          (select users.id from users inner join users_groups ON users.id = users_groups.group_id WHERE users.deleted_at IS null
         and users.type in ('Group') and users_groups.user_id = $1)
        $function$
  SQL
  create_function :user_as_json, sql_definition: <<-SQL
      CREATE OR REPLACE FUNCTION public.user_as_json(user_id integer)
       RETURNS json
       LANGUAGE sql
      AS $function$
         select row_to_json(result) from (
           select users.id, users.name_abbreviation as initials ,users.type,users.first_name || chr(32) || users.last_name as name
           from users where id = $1
         ) as result
       $function$
  SQL
  create_function :shared_user_as_json, sql_definition: <<-SQL
      CREATE OR REPLACE FUNCTION public.shared_user_as_json(in_user_id integer, in_current_user_id integer)
       RETURNS json
       LANGUAGE plpgsql
      AS $function$
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
       $function$
  SQL
  create_function :detail_level_for_sample, sql_definition: <<-SQL
      CREATE OR REPLACE FUNCTION public.detail_level_for_sample(in_user_id integer, in_sample_id integer)
       RETURNS TABLE(detail_level_sample integer, detail_level_wellplate integer)
       LANGUAGE plpgsql
      AS $function$
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
      end;$function$
  SQL
  create_function :group_user_ids, sql_definition: <<-SQL
      CREATE OR REPLACE FUNCTION public.group_user_ids(group_id integer)
       RETURNS TABLE(user_ids integer)
       LANGUAGE sql
      AS $function$
             select id from users where type='Person' and id= $1
             union
             select user_id from users_groups where group_id = $1
      $function$
  SQL
  create_function :generate_notifications, sql_definition: <<-SQL
      CREATE OR REPLACE FUNCTION public.generate_notifications(in_channel_id integer, in_message_id integer, in_user_id integer, in_user_ids integer[])
       RETURNS integer
       LANGUAGE plpgsql
      AS $function$
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
      end;$function$
  SQL
  create_function :labels_by_user_sample, sql_definition: <<-SQL
      CREATE OR REPLACE FUNCTION public.labels_by_user_sample(user_id integer, sample_id integer)
       RETURNS TABLE(labels text)
       LANGUAGE sql
      AS $function$
         select string_agg(title::text, ', ') as labels from (select title from user_labels ul where ul.id in (
           select d.list
           from element_tags et, lateral (
             select value::integer as list
             from jsonb_array_elements_text(et.taggable_data  -> 'user_labels')
           ) d
           where et.taggable_id = $2 and et.taggable_type = 'Sample'
         ) and (ul.access_level = 1 or (ul.access_level = 0 and ul.user_id = $1)) order by title  ) uls
       $function$
  SQL
  create_function :generate_users_matrix, sql_definition: <<-SQL
      CREATE OR REPLACE FUNCTION public.generate_users_matrix(in_user_ids integer[])
       RETURNS boolean
       LANGUAGE plpgsql
      AS $function$
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
      $function$
  SQL
  create_function :update_users_matrix, sql_definition: <<-SQL
      CREATE OR REPLACE FUNCTION public.update_users_matrix()
       RETURNS trigger
       LANGUAGE plpgsql
      AS $function$
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
      $function$
  SQL

  create_trigger :update_users_matrix_trg, sql_definition: <<-SQL
      CREATE TRIGGER update_users_matrix_trg AFTER INSERT OR UPDATE ON public.matrices FOR EACH ROW EXECUTE FUNCTION update_users_matrix()
  SQL

  create_view "v_samples_collections", sql_definition: <<-SQL
      SELECT cols.id AS cols_id,
      cols.user_id AS cols_user_id,
      cols.sample_detail_level AS cols_sample_detail_level,
      cols.wellplate_detail_level AS cols_wellplate_detail_level,
      cols.shared_by_id AS cols_shared_by_id,
      cols.is_shared AS cols_is_shared,
      samples.id AS sams_id,
      samples.name AS sams_name
     FROM ((collections cols
       JOIN collections_samples col_samples ON (((col_samples.collection_id = cols.id) AND (col_samples.deleted_at IS NULL))))
       JOIN samples ON (((samples.id = col_samples.sample_id) AND (samples.deleted_at IS NULL))))
    WHERE (cols.deleted_at IS NULL);
  SQL
  create_view "literal_groups", sql_definition: <<-SQL
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
             FROM literals
            GROUP BY literals.element_type, literals.element_id, literals.literature_id, literals.category) lits
       JOIN literatures ON ((lits.literature_id = literatures.id)))
       LEFT JOIN samples ON ((((lits.element_type)::text = 'Sample'::text) AND (lits.element_id = samples.id))))
       LEFT JOIN reactions ON ((((lits.element_type)::text = 'Reaction'::text) AND (lits.element_id = reactions.id))));
  SQL
  create_view "notify_messages", sql_definition: <<-SQL
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
     FROM messages,
      notifications,
      channels,
      users
    WHERE ((channels.id = messages.channel_id) AND (messages.id = notifications.message_id) AND (users.id = messages.created_by));
  SQL
end
