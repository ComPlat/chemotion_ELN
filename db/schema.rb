# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema.define(version: 202501151333346) do

  # These are extensions that must be enabled in order to support this database
  enable_extension "hstore"
  enable_extension "pg_trgm"
  enable_extension "pgcrypto"
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
    t.string "version", default: "/", null: false, collation: "C"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "content_type"
    t.string "bucket"
    t.string "key", limit: 500
    t.boolean "thumb", default: false
    t.string "folder"
    t.string "attachable_type"
    t.string "aasm_state"
    t.bigint "filesize"
    t.jsonb "attachment_data"
    t.integer "con_state"
    t.jsonb "log_data"
    t.datetime "deleted_at"
    t.string "created_by_type"
    t.index ["attachable_type", "attachable_id"], name: "index_attachments_on_attachable_type_and_attachable_id"
    t.index ["identifier"], name: "index_attachments_on_identifier", unique: true
    t.index ["version"], name: "index_attachments_on_version", opclass: :varchar_pattern_ops, where: "(deleted_at IS NULL)"
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

  create_table "calendar_entries", force: :cascade do |t|
    t.string "title"
    t.string "description"
    t.datetime "start_time"
    t.datetime "end_time"
    t.string "kind"
    t.integer "created_by", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "eventable_type"
    t.bigint "eventable_id"
    t.index ["created_by"], name: "index_calendar_entries_on_created_by"
    t.index ["eventable_type", "eventable_id"], name: "index_calendar_entries_on_eventable_type_and_eventable_id"
  end

  create_table "calendar_entry_notifications", force: :cascade do |t|
    t.bigint "user_id"
    t.bigint "calendar_entry_id"
    t.integer "status", default: 0
    t.datetime "created_at", precision: 6, null: false
    t.datetime "updated_at", precision: 6, null: false
    t.index ["calendar_entry_id"], name: "index_calendar_entry_notifications_on_calendar_entry_id"
    t.index ["user_id"], name: "index_calendar_entry_notifications_on_user_id"
  end

  create_table "cellline_materials", force: :cascade do |t|
    t.string "name"
    t.string "source"
    t.string "cell_type"
    t.jsonb "organism"
    t.jsonb "tissue"
    t.jsonb "disease"
    t.string "growth_medium"
    t.string "biosafety_level"
    t.string "variant"
    t.string "mutation"
    t.float "optimal_growth_temp"
    t.string "cryo_pres_medium"
    t.string "gender"
    t.string "description"
    t.datetime "deleted_at"
    t.datetime "created_at", precision: 6, null: false
    t.datetime "updated_at", precision: 6, null: false
    t.integer "created_by"
    t.index ["name", "source"], name: "index_cellline_materials_on_name_and_source", unique: true
  end

  create_table "cellline_samples", force: :cascade do |t|
    t.bigint "cellline_material_id"
    t.bigint "cellline_sample_id"
    t.bigint "amount"
    t.string "unit"
    t.integer "passage"
    t.string "contamination"
    t.string "name"
    t.string "description"
    t.bigint "user_id"
    t.datetime "deleted_at"
    t.datetime "created_at", precision: 6, null: false
    t.datetime "updated_at", precision: 6, null: false
    t.string "short_label"
    t.string "ancestry", default: "/", null: false, collation: "C"
    t.index ["ancestry"], name: "index_cellline_samples_on_ancestry", opclass: :varchar_pattern_ops, where: "(deleted_at IS NULL)"
  end

  create_table "channels", id: :serial, force: :cascade do |t|
    t.string "subject"
    t.jsonb "msg_template"
    t.integer "channel_type", default: 0
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "chemicals", force: :cascade do |t|
    t.integer "sample_id"
    t.text "cas"
    t.jsonb "chemical_data"
    t.datetime "updated_at"
    t.datetime "deleted_at"
    t.jsonb "log_data"
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
    t.string "ancestry", default: "/", null: false, collation: "C"
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
    t.integer "element_detail_level", default: 10
    t.jsonb "tabs_segment", default: {}
    t.integer "celllinesample_detail_level", default: 10
    t.bigint "inventory_id"
    t.integer "devicedescription_detail_level", default: 10
    t.integer "sequencebasedmacromoleculesample_detail_level", default: 10
    t.index ["ancestry"], name: "index_collections_on_ancestry", opclass: :varchar_pattern_ops, where: "(deleted_at IS NULL)"
    t.index ["deleted_at"], name: "index_collections_on_deleted_at"
    t.index ["inventory_id"], name: "index_collections_on_inventory_id"
    t.index ["user_id"], name: "index_collections_on_user_id"
  end

  create_table "collections_celllines", force: :cascade do |t|
    t.integer "collection_id"
    t.integer "cellline_sample_id"
    t.datetime "deleted_at"
    t.index ["cellline_sample_id", "collection_id"], name: "index_collections_celllines_on_cellsample_id_and_coll_id", unique: true
    t.index ["collection_id"], name: "index_collections_celllines_on_collection_id"
    t.index ["deleted_at"], name: "index_collections_celllines_on_deleted_at"
  end

  create_table "collections_device_descriptions", force: :cascade do |t|
    t.integer "collection_id"
    t.integer "device_description_id"
    t.datetime "deleted_at"
    t.index ["collection_id"], name: "index_collections_device_descriptions_on_collection_id"
    t.index ["deleted_at"], name: "index_collections_device_descriptions_on_deleted_at"
    t.index ["device_description_id", "collection_id"], name: "index_on_device_description_and_collection", unique: true
  end

  create_table "collections_elements", id: :serial, force: :cascade do |t|
    t.integer "collection_id"
    t.integer "element_id"
    t.string "element_type"
    t.datetime "deleted_at"
    t.index ["collection_id"], name: "index_collections_elements_on_collection_id"
    t.index ["deleted_at"], name: "index_collections_elements_on_deleted_at"
    t.index ["element_id", "collection_id"], name: "index_collections_elements_on_element_id_and_collection_id", unique: true
    t.index ["element_id"], name: "index_collections_elements_on_element_id"
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
    t.index ["collection_id"], name: "index_collections_research_plans_on_collection_id"
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

  create_table "collections_sequence_based_macromolecule_samples", force: :cascade do |t|
    t.bigint "collection_id"
    t.bigint "sequence_based_macromolecule_sample_id"
    t.datetime "deleted_at"
    t.datetime "created_at", precision: 6, null: false
    t.datetime "updated_at", precision: 6, null: false
    t.index ["collection_id", "sequence_based_macromolecule_sample_id"], name: "idx_collections_sbmm_sample_unique_joins", unique: true
    t.index ["collection_id"], name: "idx_collections_sbmm_sample_collection"
    t.index ["deleted_at"], name: "idx_collections_sbmm_sample_deleted_at"
    t.index ["sequence_based_macromolecule_sample_id"], name: "idx_collections_sbmm_sample_sample"
  end

  create_table "collections_vessels", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.bigint "collection_id"
    t.uuid "vessel_id"
    t.datetime "created_at", precision: 6, null: false
    t.datetime "updated_at", precision: 6, null: false
    t.datetime "deleted_at"
    t.index ["collection_id"], name: "index_collections_vessels_on_collection_id"
    t.index ["deleted_at"], name: "index_collections_vessels_on_deleted_at"
    t.index ["vessel_id", "collection_id"], name: "index_collections_vessels_on_vessel_id_and_collection_id", unique: true
    t.index ["vessel_id"], name: "index_collections_vessels_on_vessel_id"
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

  create_table "comments", force: :cascade do |t|
    t.string "content"
    t.integer "created_by", null: false
    t.string "section"
    t.string "status", default: "Pending"
    t.string "submitter"
    t.string "resolver_name"
    t.integer "commentable_id"
    t.string "commentable_type"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["commentable_type", "commentable_id"], name: "index_comments_on_commentable_type_and_commentable_id"
    t.index ["created_by"], name: "index_comments_on_user"
    t.index ["section"], name: "index_comments_on_section"
  end

  create_table "components", force: :cascade do |t|
    t.bigint "sample_id", null: false
    t.string "name"
    t.integer "position"
    t.jsonb "component_properties"
    t.datetime "created_at", precision: 6, null: false
    t.datetime "updated_at", precision: 6, null: false
    t.index ["sample_id"], name: "index_components_on_sample_id"
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
    t.jsonb "tddft", default: {}
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
    t.datetime "deleted_at"
    t.text "plain_text_content"
    t.jsonb "log_data"
    t.index ["containable_type", "containable_id"], name: "index_containers_on_containable"
    t.index ["parent_id"], name: "index_containers_on_parent_id", where: "(deleted_at IS NULL)"
  end

  create_table "dataset_klasses", id: :serial, force: :cascade do |t|
    t.string "ols_term_id", null: false
    t.string "label", null: false
    t.string "desc"
    t.jsonb "properties_template", default: {"layers"=>{}, "select_options"=>{}}, null: false
    t.boolean "is_active", default: false, null: false
    t.integer "place", default: 100, null: false
    t.integer "created_by", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at"
    t.datetime "deleted_at"
    t.string "uuid"
    t.jsonb "properties_release", default: {}
    t.datetime "released_at"
    t.string "identifier"
    t.datetime "sync_time"
    t.integer "updated_by"
    t.integer "released_by"
    t.integer "sync_by"
    t.jsonb "admin_ids", default: {}
    t.jsonb "user_ids", default: {}
    t.string "version"
  end

  create_table "dataset_klasses_revisions", id: :serial, force: :cascade do |t|
    t.integer "dataset_klass_id"
    t.string "uuid"
    t.jsonb "properties_release", default: {}
    t.datetime "released_at"
    t.integer "released_by"
    t.integer "created_by"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.datetime "deleted_at"
    t.string "version"
    t.index ["dataset_klass_id"], name: "index_dataset_klasses_revisions_on_dataset_klass_id"
  end

  create_table "datasets", id: :serial, force: :cascade do |t|
    t.integer "dataset_klass_id"
    t.string "element_type"
    t.integer "element_id"
    t.jsonb "properties"
    t.datetime "created_at", null: false
    t.datetime "updated_at"
    t.string "uuid"
    t.string "klass_uuid"
    t.datetime "deleted_at"
    t.jsonb "properties_release"
  end

  create_table "datasets_revisions", id: :serial, force: :cascade do |t|
    t.integer "dataset_id"
    t.string "uuid"
    t.string "klass_uuid"
    t.jsonb "properties", default: {}
    t.integer "created_by"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.datetime "deleted_at"
    t.jsonb "properties_release"
    t.index ["dataset_id"], name: "index_datasets_revisions_on_dataset_id"
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

  create_table "device_descriptions", force: :cascade do |t|
    t.string "access_comments"
    t.string "access_options"
    t.string "ancestry", default: "/", null: false, collation: "C"
    t.string "application_name"
    t.string "application_version"
    t.string "building"
    t.jsonb "contact_for_maintenance"
    t.jsonb "consumables_needed_for_maintenance"
    t.integer "created_by"
    t.datetime "deleted_at"
    t.text "description"
    t.text "description_for_methods_part"
    t.integer "device_id"
    t.string "device_type"
    t.string "device_type_detail"
    t.string "general_tags", default: [], null: false, array: true
    t.boolean "helpers_uploaded", default: false
    t.string "infrastructure_assignment"
    t.string "institute"
    t.string "maintenance_contract_available"
    t.string "maintenance_scheduling"
    t.text "measures_after_full_shut_down"
    t.text "measures_after_short_shut_down"
    t.text "measures_to_plan_offline_period"
    t.string "name"
    t.string "operation_mode"
    t.jsonb "operators"
    t.jsonb "ontologies"
    t.jsonb "planned_maintenance"
    t.text "policies_and_user_information"
    t.text "restart_after_planned_offline_period"
    t.string "room"
    t.string "serial_number"
    t.jsonb "setup_descriptions"
    t.string "size"
    t.string "short_label"
    t.jsonb "unexpected_maintenance"
    t.string "university_campus"
    t.string "vendor_id"
    t.string "vendor_url"
    t.text "version_characterization"
    t.string "version_doi"
    t.string "version_doi_url"
    t.string "version_identifier_type"
    t.datetime "version_installation_start_date"
    t.datetime "version_installation_end_date"
    t.string "version_number"
    t.string "weight"
    t.string "weight_unit"
    t.string "vendor_device_name"
    t.string "vendor_device_id"
    t.string "vendor_company_name"
    t.datetime "created_at", precision: 6, null: false
    t.datetime "updated_at", precision: 6, null: false
    t.jsonb "log_data"
    t.index ["ancestry"], name: "index_device_descriptions_on_ancestry", opclass: :varchar_pattern_ops, where: "(deleted_at IS NULL)"
    t.index ["device_id"], name: "index_device_descriptions_on_device_id"
  end

  create_table "device_metadata", id: :serial, force: :cascade do |t|
    t.integer "device_id"
    t.string "doi"
    t.string "url"
    t.string "landing_page"
    t.string "name"
    t.string "type"
    t.string "description"
    t.string "publisher"
    t.integer "publication_year"
    t.jsonb "manufacturers"
    t.jsonb "owners"
    t.jsonb "dates"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.datetime "deleted_at"
    t.integer "doi_sequence"
    t.string "data_cite_prefix"
    t.datetime "data_cite_created_at"
    t.datetime "data_cite_updated_at"
    t.integer "data_cite_version"
    t.jsonb "data_cite_last_response", default: {}
    t.string "data_cite_state", default: "draft"
    t.string "data_cite_creator_name"
    t.index ["deleted_at"], name: "index_device_metadata_on_deleted_at"
    t.index ["device_id"], name: "index_device_metadata_on_device_id"
  end

  create_table "devices", force: :cascade do |t|
    t.string "name"
    t.string "name_abbreviation"
    t.string "first_name"
    t.string "last_name"
    t.string "email"
    t.string "serial_number"
    t.string "verification_status", default: "none"
    t.boolean "account_active", default: false
    t.boolean "visibility", default: false
    t.datetime "deleted_at"
    t.datetime "created_at", precision: 6, null: false
    t.datetime "updated_at", precision: 6, null: false
    t.string "datacollector_method"
    t.string "datacollector_dir"
    t.string "datacollector_host"
    t.string "datacollector_user"
    t.string "datacollector_authentication"
    t.string "datacollector_number_of_files"
    t.string "datacollector_key_name"
    t.boolean "datacollector_user_level_selected", default: false
    t.string "novnc_token"
    t.string "novnc_target"
    t.string "novnc_password"
    t.index ["deleted_at"], name: "index_devices_on_deleted_at"
    t.index ["email"], name: "index_devices_on_email", unique: true
    t.index ["name_abbreviation"], name: "index_devices_on_name_abbreviation", unique: true, where: "(name_abbreviation IS NOT NULL)"
  end

  create_table "element_klasses", id: :serial, force: :cascade do |t|
    t.string "name"
    t.string "label"
    t.string "desc"
    t.string "icon_name"
    t.boolean "is_active", default: true, null: false
    t.string "klass_prefix", default: "E", null: false
    t.boolean "is_generic", default: true, null: false
    t.integer "place", default: 100, null: false
    t.jsonb "properties_template"
    t.integer "created_by"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.datetime "deleted_at"
    t.string "uuid"
    t.jsonb "properties_release", default: {}
    t.datetime "released_at"
    t.string "identifier"
    t.datetime "sync_time"
    t.integer "updated_by"
    t.integer "released_by"
    t.integer "sync_by"
    t.jsonb "admin_ids", default: {}
    t.jsonb "user_ids", default: {}
    t.string "version"
  end

  create_table "element_klasses_revisions", id: :serial, force: :cascade do |t|
    t.integer "element_klass_id"
    t.string "uuid"
    t.jsonb "properties_release", default: {}
    t.datetime "released_at"
    t.integer "released_by"
    t.integer "created_by"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.datetime "deleted_at"
    t.string "version"
    t.index ["element_klass_id"], name: "index_element_klasses_revisions_on_element_klass_id"
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
    t.jsonb "log_data"
    t.index ["sample_id"], name: "index_elemental_compositions_on_sample_id"
  end

  create_table "elements", id: :serial, force: :cascade do |t|
    t.string "name"
    t.integer "element_klass_id"
    t.string "short_label"
    t.jsonb "properties"
    t.integer "created_by"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.datetime "deleted_at"
    t.string "uuid"
    t.string "klass_uuid"
    t.jsonb "properties_release"
    t.string "ancestry"
  end

  create_table "elements_elements", force: :cascade do |t|
    t.integer "element_id"
    t.integer "parent_id"
    t.integer "created_by"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.datetime "deleted_at"
    t.index ["element_id"], name: "index_elements_elements_on_element_id"
    t.index ["parent_id"], name: "index_elements_elements_on_parent_id"
  end

  create_table "elements_revisions", id: :serial, force: :cascade do |t|
    t.integer "element_id"
    t.string "uuid"
    t.string "klass_uuid"
    t.string "name"
    t.jsonb "properties", default: {}
    t.integer "created_by"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.datetime "deleted_at"
    t.jsonb "properties_release"
    t.index ["element_id"], name: "index_elements_revisions_on_element_id"
  end

  create_table "elements_samples", id: :serial, force: :cascade do |t|
    t.integer "element_id"
    t.integer "sample_id"
    t.integer "created_by"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.datetime "deleted_at"
    t.index ["element_id"], name: "index_elements_samples_on_element_id"
    t.index ["sample_id"], name: "index_elements_samples_on_sample_id"
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

  create_table "inventories", force: :cascade do |t|
    t.string "prefix"
    t.string "name"
    t.integer "counter", default: 0
    t.datetime "created_at", precision: 6, null: false
    t.datetime "updated_at", precision: 6, null: false
    t.index ["prefix"], name: "index_inventories_on_prefix", unique: true
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

  create_table "layer_tracks", force: :cascade do |t|
    t.string "identifier", null: false
    t.string "name"
    t.string "label"
    t.string "description"
    t.jsonb "properties", default: {}
    t.integer "created_by"
    t.datetime "created_at"
    t.integer "updated_by"
    t.datetime "updated_at"
    t.integer "deleted_by"
    t.datetime "deleted_at"
  end

  create_table "layers", force: :cascade do |t|
    t.string "name", null: false
    t.string "label"
    t.string "description"
    t.jsonb "properties", default: {}, null: false
    t.string "identifier", null: false
    t.integer "created_by", null: false
    t.datetime "created_at", null: false
    t.integer "updated_by"
    t.datetime "updated_at"
    t.integer "deleted_by"
    t.datetime "deleted_at"
    t.index ["identifier"], name: "index_layers_on_identifier", unique: true
    t.index ["label"], name: "index_layers_on_label"
    t.index ["name"], name: "index_layers_on_name"
    t.index ["properties"], name: "index_layers_on_properties", using: :gin
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
    t.jsonb "configs", default: {}, null: false
    t.datetime "created_at"
    t.datetime "updated_at"
    t.datetime "deleted_at"
    t.index ["name"], name: "index_matrices_on_name", unique: true
  end

  create_table "measurements", force: :cascade do |t|
    t.string "description", null: false
    t.decimal "value", null: false
    t.string "unit", null: false
    t.datetime "deleted_at"
    t.bigint "well_id"
    t.bigint "sample_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "source_type"
    t.bigint "source_id"
    t.index ["deleted_at"], name: "index_measurements_on_deleted_at"
    t.index ["sample_id"], name: "index_measurements_on_sample_id"
    t.index ["source_type", "source_id"], name: "index_measurements_on_source_type_and_source_id"
    t.index ["well_id"], name: "index_measurements_on_well_id"
  end

  create_table "messages", id: :serial, force: :cascade do |t|
    t.integer "channel_id"
    t.jsonb "content", null: false
    t.integer "created_by", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "metadata", force: :cascade do |t|
    t.integer "collection_id"
    t.jsonb "metadata"
    t.datetime "deleted_at"
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
    t.index ["inchikey", "sum_formular", "is_partial"], name: "index_molecules_on_formula_and_inchikey_and_is_partial", unique: true
  end

  create_table "nmr_sim_nmr_simulations", id: :serial, force: :cascade do |t|
    t.integer "molecule_id"
    t.text "path_1h"
    t.text "path_13c"
    t.text "source"
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["deleted_at"], name: "index_nmr_sim_nmr_simulations_on_deleted_at"
    t.index ["molecule_id", "source"], name: "index_nmr_sim_nmr_simulations_on_molecule_id_and_source", unique: true
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
    t.string "ancestry", default: "/", null: false, collation: "C"
    t.string "ancestry_term_id"
    t.string "label"
    t.string "synonym"
    t.jsonb "synonyms"
    t.string "desc"
    t.jsonb "metadata"
    t.boolean "is_enabled", default: true
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["ancestry"], name: "index_ols_terms_on_ancestry", opclass: :varchar_pattern_ops
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

  create_table "post_translational_modifications", force: :cascade do |t|
    t.boolean "phosphorylation_enabled", default: false, null: false
    t.boolean "phosphorylation_ser_enabled", default: false, null: false
    t.string "phosphorylation_ser_details", default: ""
    t.boolean "phosphorylation_thr_enabled", default: false, null: false
    t.string "phosphorylation_thr_details", default: ""
    t.boolean "phosphorylation_tyr_enabled", default: false, null: false
    t.string "phosphorylation_tyr_details", default: ""
    t.boolean "glycosylation_enabled", default: false, null: false
    t.boolean "glycosylation_n_linked_asn_enabled", default: false, null: false
    t.string "glycosylation_n_linked_asn_details", default: ""
    t.boolean "glycosylation_o_linked_lys_enabled", default: false, null: false
    t.string "glycosylation_o_linked_lys_details", default: ""
    t.boolean "glycosylation_o_linked_ser_enabled", default: false, null: false
    t.string "glycosylation_o_linked_ser_details", default: ""
    t.boolean "glycosylation_o_linked_thr_enabled", default: false, null: false
    t.string "glycosylation_o_linked_thr_details", default: ""
    t.boolean "acetylation_enabled", default: false, null: false
    t.float "acetylation_lysin_number"
    t.boolean "hydroxylation_enabled", default: false, null: false
    t.boolean "hydroxylation_lys_enabled", default: false, null: false
    t.string "hydroxylation_lys_details", default: "t"
    t.boolean "hydroxylation_pro_enabled", default: false, null: false
    t.string "hydroxylation_pro_details", default: "t"
    t.boolean "methylation_enabled", default: false, null: false
    t.boolean "methylation_arg_enabled", default: false, null: false
    t.string "methylation_arg_details", default: ""
    t.boolean "methylation_glu_enabled", default: false, null: false
    t.string "methylation_glu_details", default: ""
    t.boolean "methylation_lys_enabled", default: false, null: false
    t.string "methylation_lys_details", default: ""
    t.boolean "other_modifications_enabled", default: false, null: false
    t.string "other_modifications_details", default: ""
    t.datetime "deleted_at"
    t.datetime "created_at", precision: 6, null: false
    t.datetime "updated_at", precision: 6, null: false
    t.index ["deleted_at"], name: "idx_sbmm_ptm_deleted_at"
  end

  create_table "predictions", id: :serial, force: :cascade do |t|
    t.string "predictable_type"
    t.integer "predictable_id"
    t.jsonb "decision", default: {}, null: false
    t.datetime "created_at"
    t.datetime "updated_at"
    t.index ["decision"], name: "index_predictions_on_decision", using: :gin
    t.index ["predictable_type", "predictable_id"], name: "index_predictions_on_predictable_type_and_predictable_id"
  end

  create_table "private_notes", force: :cascade do |t|
    t.string "content"
    t.integer "created_by", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "noteable_id"
    t.string "noteable_type"
    t.index ["created_by"], name: "index_private_note_on_user"
    t.index ["noteable_type", "noteable_id"], name: "index_private_notes_on_noteable_type_and_noteable_id"
  end

  create_table "profiles", id: :serial, force: :cascade do |t|
    t.boolean "show_external_name", default: false
    t.integer "user_id", null: false
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.jsonb "data", default: {}, null: false
    t.integer "curation", default: 2
    t.boolean "show_sample_name", default: false
    t.boolean "show_sample_short_label", default: false
    t.index ["deleted_at"], name: "index_profiles_on_deleted_at"
    t.index ["user_id"], name: "index_profiles_on_user_id"
  end

  create_table "protein_sequence_modifications", force: :cascade do |t|
    t.boolean "modification_n_terminal", default: false, null: false
    t.string "modification_n_terminal_details", default: ""
    t.boolean "modification_c_terminal", default: false, null: false
    t.string "modification_c_terminal_details", default: ""
    t.boolean "modification_insertion", default: false, null: false
    t.string "modification_insertion_details", default: ""
    t.boolean "modification_deletion", default: false, null: false
    t.string "modification_deletion_details", default: ""
    t.boolean "modification_mutation", default: false, null: false
    t.string "modification_mutation_details", default: ""
    t.boolean "modification_other", default: false, null: false
    t.string "modification_other_details", default: ""
    t.datetime "deleted_at"
    t.datetime "created_at", precision: 6, null: false
    t.datetime "updated_at", precision: 6, null: false
    t.index ["deleted_at"], name: "idx_sbmm_psm_deleted_at"
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
    t.jsonb "temperature", default: {"data"=>[], "userText"=>"", "valueUnit"=>"°C"}
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
    t.jsonb "variations", default: {}
    t.text "plain_text_description"
    t.text "plain_text_observation"
    t.boolean "gaseous", default: false
    t.jsonb "vessel_size", default: {"unit"=>"ml", "amount"=>nil}
    t.jsonb "log_data"
    t.index ["deleted_at"], name: "index_reactions_on_deleted_at"
    t.index ["rinchi_short_key"], name: "index_reactions_on_rinchi_short_key", order: :desc
    t.index ["rinchi_web_key"], name: "index_reactions_on_rinchi_web_key"
    t.index ["role"], name: "index_reactions_on_role"
    t.index ["rxno"], name: "index_reactions_on_rxno", order: :desc
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
    t.boolean "show_label", default: false, null: false
    t.integer "gas_type", default: 0
    t.jsonb "gas_phase_data", default: {"time"=>{"unit"=>"h", "value"=>nil}, "temperature"=>{"unit"=>"°C", "value"=>nil}, "turnover_number"=>nil, "part_per_million"=>nil, "turnover_frequency"=>{"unit"=>"TON/h", "value"=>nil}}
    t.float "conversion_rate"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.jsonb "log_data"
    t.index ["reaction_id"], name: "index_reactions_samples_on_reaction_id"
    t.index ["sample_id"], name: "index_reactions_samples_on_sample_id"
  end

  create_table "report_templates", id: :serial, force: :cascade do |t|
    t.string "name", null: false
    t.string "report_type", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "attachment_id"
    t.index ["attachment_id"], name: "index_report_templates_on_attachment_id"
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
    t.text "mol_serials", default: "--- []\n"
    t.text "si_reaction_settings", default: "---\nName: true\nCAS: true\nFormula: true\nSmiles: true\nInCHI: true\nMolecular Mass: true\nExact Mass: true\nEA: true\n"
    t.text "prd_atts", default: "--- []\n"
    t.integer "report_templates_id"
    t.index ["author_id"], name: "index_reports_on_author_id"
    t.index ["file_name"], name: "index_reports_on_file_name"
    t.index ["report_templates_id"], name: "index_reports_on_report_templates_id"
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

  create_table "research_plan_metadata", id: :serial, force: :cascade do |t|
    t.integer "research_plan_id"
    t.string "doi"
    t.string "url"
    t.string "landing_page"
    t.string "title"
    t.string "type"
    t.string "publisher"
    t.integer "publication_year"
    t.jsonb "dates"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.datetime "deleted_at"
    t.string "data_cite_prefix"
    t.datetime "data_cite_created_at"
    t.datetime "data_cite_updated_at"
    t.integer "data_cite_version"
    t.jsonb "data_cite_last_response", default: {}
    t.string "data_cite_state", default: "draft"
    t.string "data_cite_creator_name"
    t.jsonb "description"
    t.text "creator"
    t.text "affiliation"
    t.text "contributor"
    t.string "language"
    t.text "rights"
    t.string "format"
    t.string "version"
    t.jsonb "geo_location"
    t.jsonb "funding_reference"
    t.text "subject"
    t.jsonb "alternate_identifier"
    t.jsonb "related_identifier"
    t.jsonb "log_data"
    t.index ["deleted_at"], name: "index_research_plan_metadata_on_deleted_at"
    t.index ["research_plan_id"], name: "index_research_plan_metadata_on_research_plan_id"
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
    t.jsonb "log_data"
  end

  create_table "research_plans_screens", force: :cascade do |t|
    t.bigint "screen_id", null: false
    t.bigint "research_plan_id", null: false
    t.datetime "created_at"
    t.datetime "updated_at"
    t.datetime "deleted_at"
    t.index ["research_plan_id"], name: "index_research_plans_screens_on_research_plan_id"
    t.index ["screen_id"], name: "index_research_plans_screens_on_screen_id"
  end

  create_table "research_plans_wellplates", force: :cascade do |t|
    t.bigint "research_plan_id", null: false
    t.bigint "wellplate_id", null: false
    t.datetime "created_at"
    t.datetime "updated_at"
    t.datetime "deleted_at"
    t.jsonb "log_data"
    t.index ["research_plan_id"], name: "index_research_plans_wellplates_on_research_plan_id"
    t.index ["wellplate_id"], name: "index_research_plans_wellplates_on_wellplate_id"
  end

  create_table "residues", id: :serial, force: :cascade do |t|
    t.integer "sample_id"
    t.string "residue_type"
    t.hstore "custom_info"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.jsonb "log_data"
    t.index ["sample_id"], name: "index_residues_on_sample_id"
  end

  create_table "sample_tasks", force: :cascade do |t|
    t.float "result_value"
    t.string "result_unit", default: "g", null: false
    t.string "description"
    t.bigint "creator_id", null: false
    t.bigint "sample_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "required_scan_results", default: 1, null: false
    t.index ["creator_id"], name: "index_sample_tasks_on_creator_id"
    t.index ["sample_id"], name: "index_sample_tasks_on_sample_id"
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
    t.string "deprecated_solvent", default: ""
    t.string "impurities", default: ""
    t.string "location", default: ""
    t.boolean "is_top_secret", default: false
    t.string "ancestry", default: "/", null: false, collation: "C"
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
    t.jsonb "xref", default: {}
    t.float "molarity_value", default: 0.0
    t.string "molarity_unit", default: "M"
    t.integer "molecule_name_id"
    t.string "molfile_version", limit: 20
    t.jsonb "stereo"
    t.string "metrics", default: "mmm"
    t.boolean "decoupled", default: false, null: false
    t.float "molecular_mass"
    t.string "sum_formula"
    t.jsonb "solvent"
    t.boolean "dry_solvent", default: false
    t.boolean "inventory_sample", default: false
    t.jsonb "log_data"
    t.string "sample_type", default: "Micromolecule"
    t.jsonb "sample_details"
    t.index ["ancestry"], name: "index_samples_on_ancestry", opclass: :varchar_pattern_ops, where: "(deleted_at IS NULL)"
    t.index ["deleted_at"], name: "index_samples_on_deleted_at"
    t.index ["identifier"], name: "index_samples_on_identifier"
    t.index ["inventory_sample"], name: "index_samples_on_inventory_sample"
    t.index ["molecule_id"], name: "index_samples_on_sample_id"
    t.index ["molecule_name_id"], name: "index_samples_on_molecule_name_id"
    t.index ["user_id"], name: "index_samples_on_user_id"
  end

  create_table "scan_results", force: :cascade do |t|
    t.float "measurement_value", null: false
    t.string "measurement_unit", default: "g", null: false
    t.string "title"
    t.integer "position", default: 0, null: false
    t.bigint "sample_task_id"
    t.datetime "created_at", precision: 6, null: false
    t.datetime "updated_at", precision: 6, null: false
    t.index ["sample_task_id"], name: "index_scan_results_on_sample_task_id"
  end

  create_table "scifinder_n_credentials", force: :cascade do |t|
    t.string "access_token", null: false
    t.string "refresh_token"
    t.datetime "expires_at", null: false
    t.integer "created_by", null: false
    t.datetime "updated_at", null: false
    t.index ["created_by"], name: "uni_scifinder_n_credentials", unique: true
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
    t.jsonb "component_graph_data", default: {}
    t.text "plain_text_description"
    t.jsonb "log_data"
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

  create_table "segment_klasses", id: :serial, force: :cascade do |t|
    t.integer "element_klass_id"
    t.string "label", null: false
    t.string "desc"
    t.jsonb "properties_template"
    t.boolean "is_active", default: true, null: false
    t.integer "place", default: 100, null: false
    t.integer "created_by"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.datetime "deleted_at"
    t.string "uuid"
    t.jsonb "properties_release", default: {}
    t.datetime "released_at"
    t.string "identifier"
    t.datetime "sync_time"
    t.integer "updated_by"
    t.integer "released_by"
    t.integer "sync_by"
    t.jsonb "admin_ids", default: {}
    t.jsonb "user_ids", default: {}
    t.string "version"
  end

  create_table "segment_klasses_revisions", id: :serial, force: :cascade do |t|
    t.integer "segment_klass_id"
    t.string "uuid"
    t.jsonb "properties_release", default: {}
    t.datetime "released_at"
    t.integer "released_by"
    t.integer "created_by"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.datetime "deleted_at"
    t.string "version"
    t.index ["segment_klass_id"], name: "index_segment_klasses_revisions_on_segment_klass_id"
  end

  create_table "segments", id: :serial, force: :cascade do |t|
    t.integer "segment_klass_id"
    t.string "element_type"
    t.integer "element_id"
    t.jsonb "properties"
    t.integer "created_by"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.datetime "deleted_at"
    t.string "uuid"
    t.string "klass_uuid"
    t.jsonb "properties_release"
  end

  create_table "segments_revisions", id: :serial, force: :cascade do |t|
    t.integer "segment_id"
    t.string "uuid"
    t.string "klass_uuid"
    t.jsonb "properties", default: {}
    t.integer "created_by"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.datetime "deleted_at"
    t.jsonb "properties_release"
    t.index ["segment_id"], name: "index_segments_revisions_on_segment_id"
  end

  create_table "sequence_based_macromolecule_samples", force: :cascade do |t|
    t.string "name", null: false
    t.datetime "deleted_at"
    t.string "external_label"
    t.string "short_label", null: false
    t.string "function_or_application"
    t.float "concentration_value"
    t.string "concentration_unit", default: "ng/L", null: false
    t.float "molarity_value"
    t.string "molarity_unit", default: "mol/L", null: false
    t.float "activity_per_volume_value"
    t.string "activity_per_volume_unit", default: "U/L", null: false
    t.float "activity_per_mass_value"
    t.string "activity_per_mass_unit", default: "U/g", null: false
    t.float "volume_as_used_value"
    t.string "volume_as_used_unit", default: "L", null: false
    t.float "amount_as_used_mol_value"
    t.string "amount_as_used_mol_unit", default: "mol", null: false
    t.float "amount_as_used_mass_value"
    t.string "amount_as_used_mass_unit", default: "g", null: false
    t.float "activity_value"
    t.string "activity_unit", default: "U", null: false
    t.bigint "sequence_based_macromolecule_id"
    t.bigint "user_id"
    t.datetime "created_at", precision: 6, null: false
    t.datetime "updated_at", precision: 6, null: false
    t.string "ancestry", default: "/", null: false, collation: "C"
    t.string "heterologous_expression", default: "unknown", null: false
    t.string "organism", default: ""
    t.string "taxon_id", default: ""
    t.string "strain", default: ""
    t.string "tissue", default: ""
    t.string "localisation", default: ""
    t.string "obtained_by", default: ""
    t.string "supplier", default: ""
    t.string "formulation", default: ""
    t.float "purity"
    t.string "purity_detection", default: ""
    t.string "purification_method", default: ""
    t.index ["ancestry"], name: "idx_sbmm_samples_ancestry", opclass: :varchar_pattern_ops, where: "(deleted_at IS NULL)"
    t.index ["deleted_at"], name: "idx_sbmm_samples_deleted_at"
    t.index ["sequence_based_macromolecule_id"], name: "idx_sbmm_samples_sbmm"
    t.index ["user_id"], name: "idx_sbmm_samples_user"
  end

  create_table "sequence_based_macromolecules", force: :cascade do |t|
    t.jsonb "uniprot_source"
    t.bigint "parent_id"
    t.string "sbmm_type", null: false
    t.string "sbmm_subtype"
    t.string "uniprot_derivation", null: false
    t.string "primary_accession"
    t.string "accessions", array: true
    t.string "ec_numbers", array: true
    t.string "pdb_doi"
    t.string "systematic_name"
    t.string "short_name", null: false
    t.float "molecular_weight"
    t.string "sequence", null: false
    t.string "link_uniprot"
    t.string "link_pdb"
    t.bigint "protein_sequence_modification_id"
    t.string "heterologous_expression", default: "unknown", null: false
    t.string "organism", default: ""
    t.string "taxon_id", default: ""
    t.string "strain", default: ""
    t.string "tissue", default: ""
    t.string "localisation", default: ""
    t.string "protein_source_details_comments", default: ""
    t.string "protein_source_details_expression_system", default: ""
    t.string "own_identifier", default: ""
    t.string "other_identifier", default: ""
    t.bigint "post_translational_modification_id"
    t.datetime "deleted_at"
    t.datetime "created_at", precision: 6, null: false
    t.datetime "updated_at", precision: 6, null: false
    t.index ["accessions"], name: "idx_sbmm_accessions"
    t.index ["deleted_at"], name: "idx_sbmm_deleted_at"
    t.index ["ec_numbers"], name: "idx_sbmm_ec_numbers"
    t.index ["parent_id"], name: "idx_sbmm_parent"
    t.index ["pdb_doi"], name: "idx_sbmm_pdb_doi"
    t.index ["post_translational_modification_id"], name: "idx_sbmm_ptm_id"
    t.index ["primary_accession"], name: "idx_sbmm_primary_accession"
    t.index ["protein_sequence_modification_id"], name: "idx_sbmm_psm_id"
    t.index ["sequence"], name: "idx_sbmm_sequence"
    t.index ["short_name"], name: "idx_sbmm_short_name"
    t.index ["systematic_name"], name: "idx_sbmm_systematic_name"
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
    t.integer "element_detail_level", default: 10
    t.integer "celllinesample_detail_level", default: 10
    t.integer "devicedescription_detail_level", default: 10
    t.integer "sequencebasedmacromoleculesample_detail_level", default: 10
    t.index ["collection_id"], name: "index_sync_collections_users_on_collection_id"
    t.index ["shared_by_id", "user_id", "fake_ancestry"], name: "index_sync_collections_users_on_shared_by_id"
    t.index ["user_id", "fake_ancestry"], name: "index_sync_collections_users_on_user_id_and_fake_ancestry"
  end

  create_table "text_templates", id: :serial, force: :cascade do |t|
    t.string "type"
    t.integer "user_id", null: false
    t.string "name"
    t.jsonb "data", default: {}
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["deleted_at"], name: "index_text_templates_on_deleted_at"
    t.index ["name"], name: "index_predefined_template", unique: true, where: "((type)::text = 'PredefinedTextTemplate'::text)"
    t.index ["user_id"], name: "index_text_templates_on_user_id"
  end

  create_table "third_party_apps", force: :cascade do |t|
    t.string "url"
    t.string "name", limit: 100, null: false
    t.string "file_types", limit: 100
    t.datetime "created_at", precision: 6, null: false
    t.datetime "updated_at", precision: 6, null: false
    t.index ["name"], name: "index_third_party_apps_on_name", unique: true
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
    t.jsonb "providers"
    t.bigint "used_space", default: 0
    t.bigint "allocated_space", default: 0
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

  create_table "vessel_templates", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "name"
    t.string "details"
    t.string "material_details"
    t.string "material_type"
    t.string "vessel_type"
    t.float "volume_amount"
    t.string "volume_unit"
    t.datetime "created_at", precision: 6, null: false
    t.datetime "updated_at", precision: 6, null: false
    t.datetime "deleted_at"
    t.float "weight_amount"
    t.string "weight_unit"
    t.index ["deleted_at"], name: "index_vessel_templates_on_deleted_at"
    t.index ["name"], name: "index_vessel_templates_on_name", unique: true
  end

  create_table "vessels", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "vessel_template_id"
    t.bigint "user_id"
    t.string "name"
    t.string "description"
    t.string "short_label"
    t.datetime "created_at", precision: 6, null: false
    t.datetime "updated_at", precision: 6, null: false
    t.datetime "deleted_at"
    t.string "bar_code"
    t.string "qr_code"
    t.float "weight_amount"
    t.string "weight_unit"
    t.index ["deleted_at"], name: "index_vessels_on_deleted_at"
    t.index ["user_id"], name: "index_vessels_on_user_id"
    t.index ["vessel_template_id"], name: "index_vessels_on_vessel_template_id"
  end

  create_table "vocabularies", force: :cascade do |t|
    t.string "identifier"
    t.string "name"
    t.string "label"
    t.string "field_type"
    t.string "description"
    t.integer "opid", default: 0
    t.string "term_id"
    t.string "source"
    t.string "source_id"
    t.string "layer_id"
    t.string "field_id"
    t.jsonb "properties", default: {}
    t.integer "created_by"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.datetime "deleted_at"
  end

  create_table "wellplates", id: :serial, force: :cascade do |t|
    t.string "name"
    t.string "description"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.datetime "deleted_at"
    t.string "short_label"
    t.jsonb "readout_titles", default: ["Readout"]
    t.text "plain_text_description"
    t.integer "width", default: 12
    t.integer "height", default: 8
    t.jsonb "log_data"
    t.index ["deleted_at"], name: "index_wellplates_on_deleted_at"
  end

  create_table "wells", id: :serial, force: :cascade do |t|
    t.integer "sample_id"
    t.integer "wellplate_id", null: false
    t.integer "position_x"
    t.integer "position_y"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "additive"
    t.datetime "deleted_at"
    t.jsonb "readouts", default: [{"unit"=>"", "value"=>""}]
    t.string "label", default: "Molecular structure", null: false
    t.string "color_code"
    t.jsonb "log_data"
    t.index ["deleted_at"], name: "index_wells_on_deleted_at"
    t.index ["sample_id"], name: "index_wells_on_sample_id"
    t.index ["wellplate_id"], name: "index_wells_on_wellplate_id"
  end

  add_foreign_key "collections", "inventories"
  add_foreign_key "collections_sequence_based_macromolecule_samples", "collections"
  add_foreign_key "collections_sequence_based_macromolecule_samples", "sequence_based_macromolecule_samples"
  add_foreign_key "components", "samples"
  add_foreign_key "layer_tracks", "layers", column: "identifier", primary_key: "identifier"
  add_foreign_key "literals", "literatures"
  add_foreign_key "report_templates", "attachments"
  add_foreign_key "sample_tasks", "samples"
  add_foreign_key "sample_tasks", "users", column: "creator_id"
  add_foreign_key "sequence_based_macromolecule_samples", "sequence_based_macromolecules"
  add_foreign_key "sequence_based_macromolecule_samples", "users"
  create_function :user_instrument, sql_definition: <<-'SQL'
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
  create_function :collection_shared_names, sql_definition: <<-'SQL'
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
  create_function :user_ids, sql_definition: <<-'SQL'
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
  create_function :user_as_json, sql_definition: <<-'SQL'
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
  create_function :shared_user_as_json, sql_definition: <<-'SQL'
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
  create_function :detail_level_for_sample, sql_definition: <<-'SQL'
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
  create_function :group_user_ids, sql_definition: <<-'SQL'
      CREATE OR REPLACE FUNCTION public.group_user_ids(group_id integer)
       RETURNS TABLE(user_ids integer)
       LANGUAGE sql
      AS $function$
             select id from users where type='Person' and id= $1
             union
             select user_id from users_groups where group_id = $1
      $function$
  SQL
  create_function :generate_notifications, sql_definition: <<-'SQL'
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
  create_function :labels_by_user_sample, sql_definition: <<-'SQL'
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
  create_function :generate_users_matrix, sql_definition: <<-'SQL'
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
  create_function :update_users_matrix, sql_definition: <<-'SQL'
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
  create_function :literatures_by_element, sql_definition: <<-'SQL'
      CREATE OR REPLACE FUNCTION public.literatures_by_element(element_type text, element_id integer)
       RETURNS TABLE(literatures text)
       LANGUAGE sql
      AS $function$
         select string_agg(l2.id::text, ',') as literatures from literals l , literatures l2 
         where l.literature_id = l2.id 
         and l.element_type = $1 and l.element_id = $2
       $function$
  SQL
  create_function :lab_record_layers_changes, sql_definition: <<-'SQL'
      CREATE OR REPLACE FUNCTION public.lab_record_layers_changes()
       RETURNS trigger
       LANGUAGE plpgsql
      AS $function$
      BEGIN
          BEGIN
              INSERT INTO layer_tracks (name, label, description, properties, identifier, created_by, created_at, updated_by, updated_at, deleted_by, deleted_at)
              VALUES (OLD.name, OLD.label, OLD.description, OLD.properties, OLD.identifier, OLD.created_by, OLD.created_at, OLD.updated_by, OLD.updated_at, OLD.deleted_by, OLD.deleted_at);
          EXCEPTION
              WHEN OTHERS THEN
                  -- Ensure the main operation still completes successfully
          END;
          RETURN NEW;
      END;
      $function$
  SQL
  create_function :calculate_dataset_space, sql_definition: <<-'SQL'
      CREATE OR REPLACE FUNCTION public.calculate_dataset_space(cid integer)
       RETURNS bigint
       LANGUAGE plpgsql
      AS $function$
      declare
          used_space bigint default 0;
      begin
          select sum((attachment_data->'metadata'->'size')::bigint) into used_space
          from attachments
          where attachable_type = 'Container' and attachable_id = cid
              and attachable_id in (select id from containers where container_type = 'dataset');
          return COALESCE(used_space,0);
      end;$function$
  SQL
  create_function :calculate_element_space, sql_definition: <<-'SQL'
      CREATE OR REPLACE FUNCTION public.calculate_element_space(el_id integer, el_type text)
       RETURNS bigint
       LANGUAGE plpgsql
      AS $function$
      declare
          used_space_attachments bigint default 0;
          used_space_datasets bigint default 0;
          used_space bigint default 0;
      begin
          select sum((attachment_data->'metadata'->'size')::bigint) into used_space_attachments
          from attachments
          where attachable_type = el_type and attachable_id = el_id;
          used_space = COALESCE(used_space_attachments, 0);

          select sum(calculate_dataset_space(descendant_id)) into used_space_datasets
          from container_hierarchies where ancestor_id = (select id from containers where containable_id = el_id and containable_type = el_type);
          used_space = used_space + COALESCE(used_space_datasets, 0);

          return COALESCE(used_space, 0);
      end;$function$
  SQL
  create_function :calculate_collection_space, sql_definition: <<-'SQL'
      CREATE OR REPLACE FUNCTION public.calculate_collection_space(collectionid integer)
       RETURNS bigint
       LANGUAGE plpgsql
      AS $function$
      declare
          used_space bigint default 0;
          element_types text[] := array['Sample', 'Reaction', 'Wellplate', 'Screen', 'ResearchPlan'];
          element_table text;
          element_space bigint;
      begin
          foreach element_table in array element_types loop
              execute format('select sum(calculate_element_space(id, $1)) from collections_%s where collection_id = $2', lower(element_table))
              into element_space
              using element_table, collectionId;
              used_space := used_space + coalesce(element_space, 0);
          end loop;
          return coalesce(used_space, 0);
      end;
      $function$
  SQL
  create_function :calculate_used_space, sql_definition: <<-'SQL'
      CREATE OR REPLACE FUNCTION public.calculate_used_space(userid integer)
       RETURNS bigint
       LANGUAGE plpgsql
      AS $function$
      declare
          used_space_samples bigint default 0;
          used_space_reactions bigint default 0;
          used_space_wellplates bigint default 0;
          used_space_screens bigint default 0;
          used_space_research_plans bigint default 0;
          used_space_reports bigint default 0;
          used_space_inbox bigint default 0;
          used_space bigint default 0;
      begin
          select sum(calculate_element_space(s.sample_id, 'Sample')) into used_space_samples from (
              select distinct sample_id
              from collections_samples
              where collection_id in (select id from collections where user_id = userId)
          ) s;
          used_space = COALESCE(used_space_samples,0);
          
          select sum(calculate_element_space(r.reaction_id, 'Reaction')) into used_space_reactions from (
              select distinct reaction_id
              from collections_reactions
              where collection_id in (select id from collections where user_id = userId)
          ) r;
          used_space = used_space + COALESCE(used_space_reactions,0);

          select sum(calculate_element_space(wp.wellplate_id, 'Wellplate')) into used_space_wellplates from (
              select distinct wellplate_id
              from collections_wellplates
              where collection_id in (select id from collections where user_id = userId)
          ) wp;
          used_space = used_space + COALESCE(used_space_wellplates,0);

          select sum(calculate_element_space(wp.screen_id, 'Screen')) into used_space_screens from (
              select distinct screen_id
              from collections_screens
              where collection_id in (select id from collections where user_id = userId)
          ) wp;
          used_space = used_space + COALESCE(used_space_screens,0);

          select sum(calculate_element_space(rp.research_plan_id, 'ResearchPlan')) into used_space_research_plans from (
              select distinct research_plan_id
              from collections_research_plans
              where collection_id in (select id from collections where user_id = userId)
          ) rp;
          used_space = used_space + COALESCE(used_space_research_plans,0);

          select sum(calculate_element_space(id, 'Report')) into used_space_reports
          from reports
          where author_id = userId;
          used_space = used_space + COALESCE(used_space_reports,0);

          select sum((attachment_data->'metadata'->'size')::bigint) into used_space_inbox
          from attachments
          where attachable_type = 'Container'
              and attachable_id is null and created_for = userId;
              -- attachable_id is missing (why?), if this is a bug (and was fixed) change statement to
              -- and attachable_id = (select id from containers where containable_type='User' and containable_id=UserID);
          used_space = used_space + COALESCE(used_space_inbox,0);

          return COALESCE(used_space,0);
      end;$function$
  SQL
  create_function :logidze_version, sql_definition: <<-'SQL'
      CREATE OR REPLACE FUNCTION public.logidze_version(v bigint, data jsonb, ts timestamp with time zone)
       RETURNS jsonb
       LANGUAGE plpgsql
      AS $function$
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
      $function$
  SQL
  create_function :logidze_filter_keys, sql_definition: <<-'SQL'
      CREATE OR REPLACE FUNCTION public.logidze_filter_keys(obj jsonb, keys text[], include_columns boolean DEFAULT false)
       RETURNS jsonb
       LANGUAGE plpgsql
      AS $function$
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
      $function$
  SQL
  create_function :logidze_compact_history, sql_definition: <<-'SQL'
      CREATE OR REPLACE FUNCTION public.logidze_compact_history(log_data jsonb, cutoff integer DEFAULT 1)
       RETURNS jsonb
       LANGUAGE plpgsql
      AS $function$
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
      $function$
  SQL
  create_function :logidze_capture_exception, sql_definition: <<-'SQL'
      CREATE OR REPLACE FUNCTION public.logidze_capture_exception(error_data jsonb)
       RETURNS boolean
       LANGUAGE plpgsql
      AS $function$
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
      $function$
  SQL
  create_function :logidze_snapshot, sql_definition: <<-'SQL'
      CREATE OR REPLACE FUNCTION public.logidze_snapshot(item jsonb, ts_column text DEFAULT NULL::text, columns text[] DEFAULT NULL::text[], include_columns boolean DEFAULT false)
       RETURNS jsonb
       LANGUAGE plpgsql
      AS $function$
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
      $function$
  SQL
  create_function :logidze_logger, sql_definition: <<-'SQL'
      CREATE OR REPLACE FUNCTION public.logidze_logger()
       RETURNS trigger
       LANGUAGE plpgsql
      AS $function$
        -- version: 3
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
              WITH
                new_kv AS (
                  SELECT key, value FROM jsonb_each(row_to_json(NEW)::jsonb)
                ),
                old_kv AS (
                  SELECT key, value FROM jsonb_each(row_to_json(OLD)::jsonb)
                ),
                all_keys AS (
                  SELECT key FROM new_kv
                  UNION
                  SELECT key FROM old_kv
                )
              SELECT COALESCE(jsonb_object_agg(key, value), '{}'::jsonb)
              INTO changes
              FROM (
                SELECT
                  k.key,
                  CASE
                    WHEN n.value IS NULL THEN
                      -- key missing in NEW → mark deleted
                      to_jsonb('deleted'::text)
                    WHEN o.value IS NULL THEN
                      -- key missing in OLD → addition
                      n.value
                    WHEN n.value <> o.value THEN
                      -- key present in both but different → changed
                      n.value
                    ELSE
                      -- identical → exclude by returning NULL (will be filtered out)
                      NULL
                  END AS value
                FROM all_keys k
                LEFT JOIN new_kv n ON k.key = n.key
                LEFT JOIN old_kv o ON k.key = o.key
              ) t
              WHERE value IS NOT NULL;

              FOR k IN SELECT key FROM jsonb_each(changes)
                LOOP
                  IF jsonb_typeof(changes->k) = 'object' THEN
                    changes := jsonb_set(
                      changes,
                      ARRAY[k],
                      jsonb_diff(
                        row_to_json(OLD)::jsonb -> k,
                        row_to_json(NEW)::jsonb -> k
                      )
                    );
                  END IF;
                END LOOP;
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
      $function$
  SQL
  create_function :logidze_create_trigger_on_table, sql_definition: <<-'SQL'
      CREATE OR REPLACE FUNCTION public.logidze_create_trigger_on_table(table_name text, trigger_name text, timestamp_column text)
       RETURNS void
       LANGUAGE plpgsql
      AS $function$
      BEGIN
          -- CREATE TRIGGER logidze_on_{table_name}
          -- Parameters: history_size_limit (integer), timestamp_column (text), filtered_columns (text[]),
          -- include_columns (boolean), debounce_time_ms (integer)
          EXECUTE format( '
              CREATE TRIGGER %I
              BEFORE UPDATE OR INSERT ON %I
              FOR EACH ROW
              WHEN (coalesce(current_setting(''logidze.disabled'', true), '''') <> ''on'')
              EXECUTE PROCEDURE logidze_logger(null, %L)', trigger_name, table_name, timestamp_column);
      END;
      $function$
  SQL
  create_function :jsonb_diff, sql_definition: <<-'SQL'
      CREATE OR REPLACE FUNCTION public.jsonb_diff(old jsonb, new jsonb)
       RETURNS jsonb
       LANGUAGE plpgsql
      AS $function$
      DECLARE
        result jsonb := '{}'::jsonb;
        v RECORD;
        nested_diff jsonb;
        new_length int;
        old_length int;
      BEGIN
        -- If old is NULL, return the new object as the full difference
        IF old IS NULL OR jsonb_typeof(old) = 'null' THEN
          RETURN new;
        END IF;

        -- If new is NULL, return an empty JSON
        IF new IS NULL OR jsonb_typeof(new) = 'null' THEN
          RETURN '{}'::jsonb;
        END IF;

        -- Handle top-level arrays
        IF jsonb_typeof(old) = 'array' AND jsonb_typeof(new) = 'array' THEN
          IF result = '{}' THEN
            result := '[]';
          END IF;

          -- If arrays are equal, return an empty JSON
          IF old = new THEN
            RETURN '[]'::jsonb;
          ELSE
            -- Return the new array as the diff
            -- Get array lengths
            new_length := JSONB_ARRAY_LENGTH(new);
            old_length := JSONB_ARRAY_LENGTH(old);

            -- Loop through the array using an index
            FOR i IN 0..new_length-1 LOOP
              IF i <= old_length THEN
                IF jsonb_typeof(new[i]) IN ('object','array') AND jsonb_typeof(old[i]) IN ('object','array') THEN
                  nested_diff := jsonb_diff(old[i], new[i]);
                  IF nested_diff <> '{}'::jsonb THEN
                    result := result || nested_diff;
                  END IF;
                ELSIF new[i] IS DISTINCT FROM old[i] THEN
                  result := result || new[i];
                END IF;
              ELSE
                RETURN new[i];
              END IF;
            END LOOP;
            RETURN result;
          END IF;
        END IF;

        -- If types differ (object vs. array), return the full new value
        IF jsonb_typeof(old) <> jsonb_typeof(new) THEN
          RETURN new;
        END IF;

        -- Iterate through each key-value pair in new
        FOR v IN SELECT * FROM jsonb_each(new) LOOP
          -- If the key is an object in both old and new, recurse
          IF jsonb_typeof(old -> v.key) = 'object' AND jsonb_typeof(new -> v.key) = 'object' THEN
            nested_diff := jsonb_diff(old -> v.key, new -> v.key);
            IF nested_diff <> '{}'::jsonb THEN
              result := result || jsonb_build_object(v.key, nested_diff);
            END IF;
          -- If values are different, add to the result
          ELSIF (old -> v.key) IS DISTINCT FROM v.value THEN
            result := result || jsonb_build_object(v.key, v.value);
          END IF;
        END LOOP;

        -- Iterate through each key-value pair in old
        FOR v in SELECT * from jsonb_each(old) LOOP
          -- If value was deleted
          IF new -> v.key IS NULL AND jsonb_typeof(v.value) = 'object' THEN
            -- Append to result with value 'deleted'
            result := result || jsonb_build_object(v.key, 'deleted');
          END IF;
        END LOOP;

        RETURN result;
      END;
      $function$
  SQL


  create_trigger :logidze_on_reactions, sql_definition: <<-SQL
      CREATE TRIGGER logidze_on_reactions BEFORE INSERT OR UPDATE ON public.reactions FOR EACH ROW WHEN ((COALESCE(current_setting('logidze.disabled'::text, true), ''::text) <> 'on'::text)) EXECUTE FUNCTION logidze_logger('null', 'updated_at')
  SQL
  create_trigger :logidze_on_samples, sql_definition: <<-SQL
      CREATE TRIGGER logidze_on_samples BEFORE INSERT OR UPDATE ON public.samples FOR EACH ROW WHEN ((COALESCE(current_setting('logidze.disabled'::text, true), ''::text) <> 'on'::text)) EXECUTE FUNCTION logidze_logger('null', 'updated_at')
  SQL
  create_trigger :logidze_on_wells, sql_definition: <<-SQL
      CREATE TRIGGER logidze_on_wells BEFORE INSERT OR UPDATE ON public.wells FOR EACH ROW WHEN ((COALESCE(current_setting('logidze.disabled'::text, true), ''::text) <> 'on'::text)) EXECUTE FUNCTION logidze_logger('null', 'updated_at')
  SQL
  create_trigger :logidze_on_wellplates, sql_definition: <<-SQL
      CREATE TRIGGER logidze_on_wellplates BEFORE INSERT OR UPDATE ON public.wellplates FOR EACH ROW WHEN ((COALESCE(current_setting('logidze.disabled'::text, true), ''::text) <> 'on'::text)) EXECUTE FUNCTION logidze_logger('null', 'updated_at')
  SQL
  create_trigger :logidze_on_screens, sql_definition: <<-SQL
      CREATE TRIGGER logidze_on_screens BEFORE INSERT OR UPDATE ON public.screens FOR EACH ROW WHEN ((COALESCE(current_setting('logidze.disabled'::text, true), ''::text) <> 'on'::text)) EXECUTE FUNCTION logidze_logger('null', 'updated_at')
  SQL
  create_trigger :logidze_on_residues, sql_definition: <<-SQL
      CREATE TRIGGER logidze_on_residues BEFORE INSERT OR UPDATE ON public.residues FOR EACH ROW WHEN ((COALESCE(current_setting('logidze.disabled'::text, true), ''::text) <> 'on'::text)) EXECUTE FUNCTION logidze_logger('null', 'updated_at')
  SQL
  create_trigger :logidze_on_elemental_compositions, sql_definition: <<-SQL
      CREATE TRIGGER logidze_on_elemental_compositions BEFORE INSERT OR UPDATE ON public.elemental_compositions FOR EACH ROW WHEN ((COALESCE(current_setting('logidze.disabled'::text, true), ''::text) <> 'on'::text)) EXECUTE FUNCTION logidze_logger('null', 'updated_at')
  SQL
  create_trigger :logidze_on_containers, sql_definition: <<-SQL
      CREATE TRIGGER logidze_on_containers BEFORE INSERT OR UPDATE ON public.containers FOR EACH ROW WHEN ((COALESCE(current_setting('logidze.disabled'::text, true), ''::text) <> 'on'::text)) EXECUTE FUNCTION logidze_logger('null', 'updated_at')
  SQL
  create_trigger :logidze_on_attachments, sql_definition: <<-SQL
      CREATE TRIGGER logidze_on_attachments BEFORE INSERT OR UPDATE ON public.attachments FOR EACH ROW WHEN ((COALESCE(current_setting('logidze.disabled'::text, true), ''::text) <> 'on'::text)) EXECUTE FUNCTION logidze_logger('null', 'updated_at')
  SQL
  create_trigger :logidze_on_research_plans, sql_definition: <<-SQL
      CREATE TRIGGER logidze_on_research_plans BEFORE INSERT OR UPDATE ON public.research_plans FOR EACH ROW WHEN ((COALESCE(current_setting('logidze.disabled'::text, true), ''::text) <> 'on'::text)) EXECUTE FUNCTION logidze_logger('null', 'updated_at')
  SQL
  create_trigger :logidze_on_reactions_samples, sql_definition: <<-SQL
      CREATE TRIGGER logidze_on_reactions_samples BEFORE INSERT OR UPDATE ON public.reactions_samples FOR EACH ROW WHEN ((COALESCE(current_setting('logidze.disabled'::text, true), ''::text) <> 'on'::text)) EXECUTE FUNCTION logidze_logger('null', 'updated_at')
  SQL
  create_trigger :update_users_matrix_trg, sql_definition: <<-SQL
      CREATE TRIGGER update_users_matrix_trg AFTER INSERT OR UPDATE ON public.matrices FOR EACH ROW EXECUTE FUNCTION update_users_matrix()
  SQL
  create_trigger :logidze_on_research_plan_metadata, sql_definition: <<-SQL
      CREATE TRIGGER logidze_on_research_plan_metadata BEFORE INSERT OR UPDATE ON public.research_plan_metadata FOR EACH ROW WHEN ((COALESCE(current_setting('logidze.disabled'::text, true), ''::text) <> 'on'::text)) EXECUTE FUNCTION logidze_logger('null', 'updated_at')
  SQL
  create_trigger :logidze_on_research_plans_wellplates, sql_definition: <<-SQL
      CREATE TRIGGER logidze_on_research_plans_wellplates BEFORE INSERT OR UPDATE ON public.research_plans_wellplates FOR EACH ROW WHEN ((COALESCE(current_setting('logidze.disabled'::text, true), ''::text) <> 'on'::text)) EXECUTE FUNCTION logidze_logger('null', 'updated_at')
  SQL
  create_trigger :logidze_on_chemicals, sql_definition: <<-SQL
      CREATE TRIGGER logidze_on_chemicals BEFORE INSERT OR UPDATE ON public.chemicals FOR EACH ROW WHEN ((COALESCE(current_setting('logidze.disabled'::text, true), ''::text) <> 'on'::text)) EXECUTE FUNCTION logidze_logger('null', 'updated_at')
  SQL
  create_trigger :logidze_on_device_descriptions, sql_definition: <<-SQL
      CREATE TRIGGER logidze_on_device_descriptions BEFORE INSERT OR UPDATE ON public.device_descriptions FOR EACH ROW WHEN ((COALESCE(current_setting('logidze.disabled'::text, true), ''::text) <> 'on'::text)) EXECUTE FUNCTION logidze_logger('null', 'updated_at')
  SQL
  create_trigger :lab_trg_layers_changes, sql_definition: <<-SQL
      CREATE TRIGGER lab_trg_layers_changes AFTER UPDATE ON public.layers FOR EACH ROW EXECUTE FUNCTION lab_record_layers_changes()
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
