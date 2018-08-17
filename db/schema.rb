# encoding: UTF-8
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

ActiveRecord::Schema.define(version: 20180812115719) do

  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"
  enable_extension "pg_trgm"
  enable_extension "hstore"
  enable_extension "uuid-ossp"

  create_table "affiliations", force: :cascade do |t|
    t.string   "company"
    t.string   "country"
    t.string   "organization"
    t.string   "department"
    t.string   "group"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.date     "from"
    t.date     "to"
    t.string   "domain"
    t.string   "cat"
  end

  create_table "analyses_experiments", force: :cascade do |t|
    t.integer  "sample_id"
    t.integer  "holder_id"
    t.string   "status"
    t.integer  "devices_analysis_id", null: false
    t.integer  "devices_sample_id",   null: false
    t.string   "sample_analysis_id",  null: false
    t.string   "solvent"
    t.string   "experiment"
    t.boolean  "priority"
    t.boolean  "on_day"
    t.integer  "number_of_scans"
    t.integer  "sweep_width"
    t.string   "time"
    t.datetime "created_at",          null: false
    t.datetime "updated_at",          null: false
  end

  create_table "attachments", force: :cascade do |t|
    t.integer  "attachable_id"
    t.string   "filename"
    t.uuid     "identifier",                  default: "uuid_generate_v4()"
    t.string   "checksum"
    t.string   "storage",         limit: 20,  default: "tmp"
    t.integer  "created_by",                                                 null: false
    t.integer  "created_for"
    t.integer  "version",                     default: 0
    t.datetime "created_at",                                                 null: false
    t.datetime "updated_at",                                                 null: false
    t.string   "content_type"
    t.string   "bucket"
    t.string   "key",             limit: 500
    t.boolean  "thumb",                       default: false
    t.string   "folder"
    t.string   "attachable_type"
  end

  add_index "attachments", ["attachable_type", "attachable_id"], name: "index_attachments_on_attachable_type_and_attachable_id", using: :btree
  add_index "attachments", ["identifier"], name: "index_attachments_on_identifier", unique: true, using: :btree

  create_table "authentication_keys", force: :cascade do |t|
    t.string   "token",      null: false
    t.integer  "user_id"
    t.inet     "ip"
    t.string   "role"
    t.string   "fqdn"
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  add_index "authentication_keys", ["user_id"], name: "index_authentication_keys_on_user_id", using: :btree

  create_table "code_logs", id: :uuid, default: "uuid_generate_v4()", force: :cascade do |t|
    t.string   "source"
    t.integer  "source_id"
    t.string   "value",      limit: 40
    t.datetime "deleted_at"
    t.datetime "created_at",            null: false
    t.datetime "updated_at",            null: false
  end

  add_index "code_logs", ["source", "source_id"], name: "index_code_logs_on_source_and_source_id", using: :btree

  create_table "collections", force: :cascade do |t|
    t.integer  "user_id",                                   null: false
    t.string   "ancestry"
    t.text     "label",                                     null: false
    t.integer  "shared_by_id"
    t.boolean  "is_shared",                 default: false
    t.integer  "permission_level",          default: 0
    t.integer  "sample_detail_level",       default: 10
    t.integer  "reaction_detail_level",     default: 10
    t.integer  "wellplate_detail_level",    default: 10
    t.datetime "created_at",                                null: false
    t.datetime "updated_at",                                null: false
    t.integer  "position"
    t.integer  "screen_detail_level",       default: 10
    t.boolean  "is_locked",                 default: false
    t.datetime "deleted_at"
    t.boolean  "is_synchronized",           default: false, null: false
    t.integer  "researchplan_detail_level", default: 10
  end

  add_index "collections", ["ancestry"], name: "index_collections_on_ancestry", using: :btree
  add_index "collections", ["deleted_at"], name: "index_collections_on_deleted_at", using: :btree
  add_index "collections", ["user_id"], name: "index_collections_on_user_id", using: :btree

  create_table "collections_reactions", force: :cascade do |t|
    t.integer  "collection_id"
    t.integer  "reaction_id"
    t.datetime "deleted_at"
  end

  add_index "collections_reactions", ["collection_id"], name: "index_collections_reactions_on_collection_id", using: :btree
  add_index "collections_reactions", ["deleted_at"], name: "index_collections_reactions_on_deleted_at", using: :btree
  add_index "collections_reactions", ["reaction_id", "collection_id"], name: "index_collections_reactions_on_reaction_id_and_collection_id", unique: true, using: :btree

  create_table "collections_research_plans", force: :cascade do |t|
    t.integer  "collection_id"
    t.integer  "research_plan_id"
    t.datetime "deleted_at"
  end

  add_index "collections_research_plans", ["research_plan_id", "collection_id"], name: "index_collections_research_plans_on_rplan_id_and_coll_id", unique: true, using: :btree

  create_table "collections_samples", force: :cascade do |t|
    t.integer  "collection_id"
    t.integer  "sample_id"
    t.datetime "deleted_at"
  end

  add_index "collections_samples", ["collection_id"], name: "index_collections_samples_on_collection_id", using: :btree
  add_index "collections_samples", ["deleted_at"], name: "index_collections_samples_on_deleted_at", using: :btree
  add_index "collections_samples", ["sample_id", "collection_id"], name: "index_collections_samples_on_sample_id_and_collection_id", unique: true, using: :btree

  create_table "collections_screens", force: :cascade do |t|
    t.integer  "collection_id"
    t.integer  "screen_id"
    t.datetime "deleted_at"
  end

  add_index "collections_screens", ["collection_id"], name: "index_collections_screens_on_collection_id", using: :btree
  add_index "collections_screens", ["deleted_at"], name: "index_collections_screens_on_deleted_at", using: :btree
  add_index "collections_screens", ["screen_id", "collection_id"], name: "index_collections_screens_on_screen_id_and_collection_id", unique: true, using: :btree

  create_table "collections_wellplates", force: :cascade do |t|
    t.integer  "collection_id"
    t.integer  "wellplate_id"
    t.datetime "deleted_at"
  end

  add_index "collections_wellplates", ["collection_id"], name: "index_collections_wellplates_on_collection_id", using: :btree
  add_index "collections_wellplates", ["deleted_at"], name: "index_collections_wellplates_on_deleted_at", using: :btree
  add_index "collections_wellplates", ["wellplate_id", "collection_id"], name: "index_collections_wellplates_on_wellplate_id_and_collection_id", unique: true, using: :btree

  create_table "collector_errors", force: :cascade do |t|
    t.string   "error_code"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "computed_props", force: :cascade do |t|
    t.integer  "molecule_id"
    t.float    "max_potential",      default: 0.0
    t.float    "min_potential",      default: 0.0
    t.float    "mean_potential",     default: 0.0
    t.float    "lumo",               default: 0.0
    t.float    "homo",               default: 0.0
    t.float    "ip",                 default: 0.0
    t.float    "ea",                 default: 0.0
    t.float    "dipol_debye",        default: 0.0
    t.integer  "status",             default: 0
    t.jsonb    "data"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.float    "mean_abs_potential", default: 0.0
  end

  create_table "container_hierarchies", id: false, force: :cascade do |t|
    t.integer "ancestor_id",   null: false
    t.integer "descendant_id", null: false
    t.integer "generations",   null: false
  end

  add_index "container_hierarchies", ["ancestor_id", "descendant_id", "generations"], name: "container_anc_desc_udx", unique: true, using: :btree
  add_index "container_hierarchies", ["descendant_id"], name: "container_desc_idx", using: :btree

  create_table "containers", force: :cascade do |t|
    t.string   "ancestry"
    t.integer  "containable_id"
    t.string   "containable_type"
    t.string   "name"
    t.string   "container_type"
    t.text     "description"
    t.hstore   "extended_metadata", default: {}
    t.datetime "created_at",                     null: false
    t.datetime "updated_at",                     null: false
    t.integer  "parent_id"
  end

  add_index "containers", ["containable_type", "containable_id"], name: "index_containers_on_containable", using: :btree

  create_table "delayed_jobs", force: :cascade do |t|
    t.integer  "priority",   default: 0, null: false
    t.integer  "attempts",   default: 0, null: false
    t.text     "handler",                null: false
    t.text     "last_error"
    t.datetime "run_at"
    t.datetime "locked_at"
    t.datetime "failed_at"
    t.string   "locked_by"
    t.string   "queue"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.string   "cron"
  end

  add_index "delayed_jobs", ["priority", "run_at"], name: "delayed_jobs_priority", using: :btree

  create_table "element_tags", force: :cascade do |t|
    t.string   "taggable_type"
    t.integer  "taggable_id"
    t.jsonb    "taggable_data"
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  add_index "element_tags", ["taggable_id"], name: "index_element_tags_on_taggable_id", using: :btree

  create_table "elemental_compositions", force: :cascade do |t|
    t.integer  "sample_id",                     null: false
    t.string   "composition_type",              null: false
    t.hstore   "data",             default: {}, null: false
    t.float    "loading"
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  add_index "elemental_compositions", ["sample_id"], name: "index_elemental_compositions_on_sample_id", using: :btree

  create_table "experiments", force: :cascade do |t|
    t.string   "type",                limit: 20
    t.string   "name"
    t.text     "description"
    t.string   "status",              limit: 20
    t.jsonb    "parameter"
    t.integer  "user_id"
    t.integer  "device_id"
    t.integer  "container_id"
    t.integer  "experimentable_id"
    t.string   "experimentable_type"
    t.string   "ancestry"
    t.integer  "parent_id"
    t.datetime "created_at",                     null: false
    t.datetime "updated_at",                     null: false
  end

  create_table "fingerprints", force: :cascade do |t|
    t.bit      "fp0",          limit: 64
    t.bit      "fp1",          limit: 64
    t.bit      "fp2",          limit: 64
    t.bit      "fp3",          limit: 64
    t.bit      "fp4",          limit: 64
    t.bit      "fp5",          limit: 64
    t.bit      "fp6",          limit: 64
    t.bit      "fp7",          limit: 64
    t.bit      "fp8",          limit: 64
    t.bit      "fp9",          limit: 64
    t.bit      "fp10",         limit: 64
    t.bit      "fp11",         limit: 64
    t.bit      "fp12",         limit: 64
    t.bit      "fp13",         limit: 64
    t.bit      "fp14",         limit: 64
    t.bit      "fp15",         limit: 64
    t.integer  "num_set_bits", limit: 2
    t.datetime "created_at",              null: false
    t.datetime "updated_at",              null: false
    t.time     "deleted_at"
  end

  create_table "ketcherails_amino_acids", force: :cascade do |t|
    t.integer  "moderated_by"
    t.integer  "suggested_by"
    t.string   "name",                          null: false
    t.text     "molfile",                       null: false
    t.integer  "aid",               default: 1, null: false
    t.integer  "aid2",              default: 1, null: false
    t.integer  "bid",               default: 1, null: false
    t.string   "icon_path"
    t.string   "sprite_class"
    t.string   "status"
    t.text     "notes"
    t.datetime "approved_at"
    t.datetime "rejected_at"
    t.datetime "created_at",                    null: false
    t.datetime "updated_at",                    null: false
    t.string   "icon_file_name"
    t.string   "icon_content_type"
    t.integer  "icon_file_size"
    t.datetime "icon_updated_at"
  end

  add_index "ketcherails_amino_acids", ["moderated_by"], name: "index_ketcherails_amino_acids_on_moderated_by", using: :btree
  add_index "ketcherails_amino_acids", ["name"], name: "index_ketcherails_amino_acids_on_name", using: :btree
  add_index "ketcherails_amino_acids", ["suggested_by"], name: "index_ketcherails_amino_acids_on_suggested_by", using: :btree

  create_table "ketcherails_atom_abbreviations", force: :cascade do |t|
    t.integer  "moderated_by"
    t.integer  "suggested_by"
    t.string   "name",                          null: false
    t.text     "molfile",                       null: false
    t.integer  "aid",               default: 1, null: false
    t.integer  "bid",               default: 1, null: false
    t.string   "icon_path"
    t.string   "sprite_class"
    t.string   "status"
    t.text     "notes"
    t.datetime "approved_at"
    t.datetime "rejected_at"
    t.datetime "created_at",                    null: false
    t.datetime "updated_at",                    null: false
    t.string   "icon_file_name"
    t.string   "icon_content_type"
    t.integer  "icon_file_size"
    t.datetime "icon_updated_at"
    t.string   "rtl_name"
  end

  add_index "ketcherails_atom_abbreviations", ["moderated_by"], name: "index_ketcherails_atom_abbreviations_on_moderated_by", using: :btree
  add_index "ketcherails_atom_abbreviations", ["name"], name: "index_ketcherails_atom_abbreviations_on_name", using: :btree
  add_index "ketcherails_atom_abbreviations", ["suggested_by"], name: "index_ketcherails_atom_abbreviations_on_suggested_by", using: :btree

  create_table "ketcherails_common_templates", force: :cascade do |t|
    t.integer  "moderated_by"
    t.integer  "suggested_by"
    t.string   "name",                 null: false
    t.text     "molfile",              null: false
    t.string   "icon_path"
    t.string   "sprite_class"
    t.text     "notes"
    t.datetime "approved_at"
    t.datetime "rejected_at"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.integer  "template_category_id"
    t.string   "status"
    t.string   "icon_file_name"
    t.string   "icon_content_type"
    t.integer  "icon_file_size"
    t.datetime "icon_updated_at"
  end

  add_index "ketcherails_common_templates", ["moderated_by"], name: "index_ketcherails_common_templates_on_moderated_by", using: :btree
  add_index "ketcherails_common_templates", ["name"], name: "index_ketcherails_common_templates_on_name", using: :btree
  add_index "ketcherails_common_templates", ["suggested_by"], name: "index_ketcherails_common_templates_on_suggested_by", using: :btree

  create_table "ketcherails_custom_templates", force: :cascade do |t|
    t.integer  "user_id",      null: false
    t.string   "name",         null: false
    t.text     "molfile",      null: false
    t.string   "icon_path"
    t.string   "sprite_class"
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  add_index "ketcherails_custom_templates", ["user_id"], name: "index_ketcherails_custom_templates_on_user_id", using: :btree

  create_table "ketcherails_template_categories", force: :cascade do |t|
    t.string   "name",              null: false
    t.datetime "created_at"
    t.datetime "updated_at"
    t.string   "icon_file_name"
    t.string   "icon_content_type"
    t.integer  "icon_file_size"
    t.datetime "icon_updated_at"
    t.string   "sprite_class"
  end

  create_table "literals", force: :cascade do |t|
    t.integer  "literature_id"
    t.integer  "element_id"
    t.string   "element_type",  limit: 40
    t.string   "category",      limit: 40
    t.integer  "user_id"
    t.datetime "created_at",               null: false
    t.datetime "updated_at",               null: false
  end

  add_index "literals", ["element_type", "element_id", "literature_id", "category"], name: "index_on_element_literature", unique: true, using: :btree
  add_index "literals", ["literature_id", "element_type", "element_id"], name: "index_on_literature", using: :btree

  create_table "literatures", force: :cascade do |t|
    t.string   "title"
    t.string   "url"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.datetime "deleted_at"
    t.jsonb    "refs"
    t.string   "doi"
  end

  add_index "literatures", ["deleted_at"], name: "index_literatures_on_deleted_at", using: :btree

  create_table "molecule_names", force: :cascade do |t|
    t.integer  "molecule_id"
    t.integer  "user_id"
    t.text     "description"
    t.string   "name",        null: false
    t.datetime "deleted_at"
    t.datetime "created_at",  null: false
    t.datetime "updated_at",  null: false
  end

  add_index "molecule_names", ["deleted_at"], name: "index_molecule_names_on_deleted_at", using: :btree
  add_index "molecule_names", ["molecule_id"], name: "index_molecule_names_on_molecule_id", using: :btree
  add_index "molecule_names", ["name"], name: "index_molecule_names_on_name", using: :btree
  add_index "molecule_names", ["user_id", "molecule_id"], name: "index_molecule_names_on_user_id_and_molecule_id", using: :btree
  add_index "molecule_names", ["user_id"], name: "index_molecule_names_on_user_id", using: :btree

  create_table "molecules", force: :cascade do |t|
    t.string   "inchikey"
    t.string   "inchistring"
    t.float    "density",                           default: 0.0
    t.float    "molecular_weight"
    t.binary   "molfile"
    t.float    "melting_point"
    t.float    "boiling_point"
    t.string   "sum_formular"
    t.string   "names",                             default: [],                 array: true
    t.string   "iupac_name"
    t.string   "molecule_svg_file"
    t.datetime "created_at",                                        null: false
    t.datetime "updated_at",                                        null: false
    t.datetime "deleted_at"
    t.boolean  "is_partial",                        default: false, null: false
    t.float    "exact_molecular_weight"
    t.string   "cano_smiles"
    t.text     "cas"
    t.string   "molfile_version",        limit: 20
  end

  add_index "molecules", ["deleted_at"], name: "index_molecules_on_deleted_at", using: :btree
  add_index "molecules", ["inchikey", "is_partial"], name: "index_molecules_on_inchikey_and_is_partial", unique: true, using: :btree

  create_table "pg_search_documents", force: :cascade do |t|
    t.text     "content"
    t.integer  "searchable_id"
    t.string   "searchable_type"
    t.datetime "created_at",      null: false
    t.datetime "updated_at",      null: false
  end

  add_index "pg_search_documents", ["searchable_type", "searchable_id"], name: "index_pg_search_documents_on_searchable_type_and_searchable_id", using: :btree

  create_table "profiles", force: :cascade do |t|
    t.boolean  "show_external_name", default: false
    t.integer  "user_id",                            null: false
    t.datetime "deleted_at"
    t.datetime "created_at",                         null: false
    t.datetime "updated_at",                         null: false
    t.jsonb    "data"
  end

  add_index "profiles", ["deleted_at"], name: "index_profiles_on_deleted_at", using: :btree
  add_index "profiles", ["user_id"], name: "index_profiles_on_user_id", using: :btree

  create_table "reactions", force: :cascade do |t|
    t.string   "name"
    t.datetime "created_at",                                                                   null: false
    t.datetime "updated_at",                                                                   null: false
    t.text     "description"
    t.string   "timestamp_start"
    t.string   "timestamp_stop"
    t.text     "observation"
    t.string   "purification",       default: [],                                                           array: true
    t.string   "dangerous_products", default: [],                                                           array: true
    t.string   "tlc_solvents"
    t.text     "tlc_description"
    t.string   "rf_value"
    t.jsonb    "temperature",        default: {"data"=>[], "userText"=>"", "valueUnit"=>"°C"}
    t.string   "status"
    t.string   "reaction_svg_file"
    t.string   "solvent"
    t.datetime "deleted_at"
    t.string   "short_label"
    t.integer  "created_by"
    t.string   "role"
    t.jsonb    "origin"
    t.text     "rinchi_string"
    t.text     "rinchi_long_key"
    t.string   "rinchi_short_key"
    t.string   "rinchi_web_key"
  end

  add_index "reactions", ["deleted_at"], name: "index_reactions_on_deleted_at", using: :btree
  add_index "reactions", ["rinchi_web_key"], name: "index_reactions_on_rinchi_web_key", using: :btree
  add_index "reactions", ["role"], name: "index_reactions_on_role", using: :btree

  create_table "reactions_samples", force: :cascade do |t|
    t.integer  "reaction_id"
    t.integer  "sample_id"
    t.boolean  "reference"
    t.float    "equivalent"
    t.integer  "position"
    t.string   "type"
    t.datetime "deleted_at"
    t.boolean  "waste",       default: false
    t.float    "coefficient", default: 1.0
  end

  add_index "reactions_samples", ["reaction_id"], name: "index_reactions_samples_on_reaction_id", using: :btree
  add_index "reactions_samples", ["sample_id"], name: "index_reactions_samples_on_sample_id", using: :btree

  create_table "reports", force: :cascade do |t|
    t.integer  "author_id"
    t.string   "file_name"
    t.text     "file_description"
    t.text     "configs"
    t.text     "sample_settings"
    t.text     "reaction_settings"
    t.text     "objects"
    t.string   "img_format"
    t.string   "file_path"
    t.datetime "generated_at"
    t.datetime "deleted_at"
    t.datetime "created_at",                                                                                                                                                        null: false
    t.datetime "updated_at",                                                                                                                                                        null: false
    t.string   "template",             default: "standard"
    t.text     "mol_serials",          default: "--- []\n"
    t.text     "si_reaction_settings", default: "---\n:Name: true\n:CAS: true\n:Formula: true\n:Smiles: true\n:InCHI: true\n:Molecular Mass: true\n:Exact Mass: true\n:EA: true\n"
    t.text     "prd_atts",             default: "--- []\n"
  end

  add_index "reports", ["author_id"], name: "index_reports_on_author_id", using: :btree
  add_index "reports", ["file_name"], name: "index_reports_on_file_name", using: :btree

  create_table "reports_users", force: :cascade do |t|
    t.integer  "user_id"
    t.integer  "report_id"
    t.datetime "downloaded_at"
    t.datetime "deleted_at"
    t.datetime "created_at",    null: false
    t.datetime "updated_at",    null: false
  end

  add_index "reports_users", ["deleted_at"], name: "index_reports_users_on_deleted_at", using: :btree
  add_index "reports_users", ["report_id"], name: "index_reports_users_on_report_id", using: :btree
  add_index "reports_users", ["user_id"], name: "index_reports_users_on_user_id", using: :btree

  create_table "research_plans", force: :cascade do |t|
    t.string   "name",        null: false
    t.text     "description"
    t.string   "sdf_file"
    t.string   "svg_file"
    t.integer  "created_by",  null: false
    t.datetime "deleted_at"
    t.datetime "created_at",  null: false
    t.datetime "updated_at",  null: false
  end

  create_table "residues", force: :cascade do |t|
    t.integer  "sample_id"
    t.string   "residue_type"
    t.hstore   "custom_info"
    t.datetime "created_at",   null: false
    t.datetime "updated_at",   null: false
  end

  add_index "residues", ["sample_id"], name: "index_residues_on_sample_id", using: :btree

  create_table "samples", force: :cascade do |t|
    t.string   "name"
    t.float    "target_amount_value",            default: 0.0
    t.string   "target_amount_unit",             default: "g"
    t.datetime "created_at",                                     null: false
    t.datetime "updated_at",                                     null: false
    t.text     "description",                    default: ""
    t.integer  "molecule_id"
    t.binary   "molfile"
    t.float    "purity",                         default: 1.0
    t.string   "solvent",                        default: ""
    t.string   "impurities",                     default: ""
    t.string   "location",                       default: ""
    t.boolean  "is_top_secret",                  default: false
    t.string   "ancestry"
    t.string   "external_label",                 default: ""
    t.integer  "created_by"
    t.string   "short_label"
    t.float    "real_amount_value"
    t.string   "real_amount_unit"
    t.string   "imported_readout"
    t.datetime "deleted_at"
    t.string   "sample_svg_file"
    t.integer  "user_id"
    t.string   "identifier"
    t.float    "density",                        default: 0.0
    t.float    "melting_point"
    t.float    "boiling_point"
    t.integer  "fingerprint_id"
    t.jsonb    "xref",                           default: {}
    t.float    "molarity_value",                 default: 0.0
    t.string   "molarity_unit",                  default: "M"
    t.integer  "molecule_name_id"
    t.string   "molfile_version",     limit: 20
    t.jsonb    "stereo"
  end

  add_index "samples", ["deleted_at"], name: "index_samples_on_deleted_at", using: :btree
  add_index "samples", ["identifier"], name: "index_samples_on_identifier", using: :btree
  add_index "samples", ["molecule_id"], name: "index_samples_on_sample_id", using: :btree
  add_index "samples", ["molecule_name_id"], name: "index_samples_on_molecule_name_id", using: :btree
  add_index "samples", ["user_id"], name: "index_samples_on_user_id", using: :btree

  create_table "screens", force: :cascade do |t|
    t.string   "description"
    t.string   "name"
    t.string   "result"
    t.string   "collaborator"
    t.string   "conditions"
    t.string   "requirements"
    t.datetime "created_at",   null: false
    t.datetime "updated_at",   null: false
    t.datetime "deleted_at"
  end

  add_index "screens", ["deleted_at"], name: "index_screens_on_deleted_at", using: :btree

  create_table "screens_wellplates", force: :cascade do |t|
    t.integer  "screen_id"
    t.integer  "wellplate_id"
    t.datetime "deleted_at"
  end

  add_index "screens_wellplates", ["deleted_at"], name: "index_screens_wellplates_on_deleted_at", using: :btree
  add_index "screens_wellplates", ["screen_id"], name: "index_screens_wellplates_on_screen_id", using: :btree
  add_index "screens_wellplates", ["wellplate_id"], name: "index_screens_wellplates_on_wellplate_id", using: :btree

  create_table "sync_collections_users", force: :cascade do |t|
    t.integer  "user_id"
    t.integer  "collection_id"
    t.integer  "shared_by_id"
    t.integer  "permission_level",          default: 0
    t.integer  "sample_detail_level",       default: 0
    t.integer  "reaction_detail_level",     default: 0
    t.integer  "wellplate_detail_level",    default: 0
    t.integer  "screen_detail_level",       default: 0
    t.string   "fake_ancestry"
    t.integer  "researchplan_detail_level", default: 10
    t.string   "label"
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  add_index "sync_collections_users", ["collection_id"], name: "index_sync_collections_users_on_collection_id", using: :btree
  add_index "sync_collections_users", ["shared_by_id", "user_id", "fake_ancestry"], name: "index_sync_collections_users_on_shared_by_id", using: :btree
  add_index "sync_collections_users", ["user_id", "fake_ancestry"], name: "index_sync_collections_users_on_user_id_and_fake_ancestry", using: :btree

  create_table "user_affiliations", force: :cascade do |t|
    t.integer  "user_id"
    t.integer  "affiliation_id"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.datetime "deleted_at"
    t.date     "from"
    t.date     "to"
    t.boolean  "main"
  end

  create_table "users", force: :cascade do |t|
    t.string   "email",                            default: "",                                                                                      null: false
    t.string   "encrypted_password",               default: "",                                                                                      null: false
    t.string   "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.integer  "sign_in_count",                    default: 0,                                                                                       null: false
    t.datetime "current_sign_in_at"
    t.datetime "last_sign_in_at"
    t.inet     "current_sign_in_ip"
    t.inet     "last_sign_in_ip"
    t.datetime "created_at",                                                                                                                         null: false
    t.datetime "updated_at",                                                                                                                         null: false
    t.string   "name"
    t.string   "first_name",                                                                                                                         null: false
    t.string   "last_name",                                                                                                                          null: false
    t.datetime "deleted_at"
    t.hstore   "counters",                         default: {"samples"=>"0", "reactions"=>"0", "wellplates"=>"0"},                                   null: false
    t.string   "name_abbreviation",      limit: 5
    t.string   "type",                             default: "Person"
    t.boolean  "is_templates_moderator",           default: false,                                                                                   null: false
    t.string   "reaction_name_prefix",   limit: 3, default: "R"
    t.string   "confirmation_token"
    t.datetime "confirmed_at"
    t.datetime "confirmation_sent_at"
    t.string   "unconfirmed_email"
    t.hstore   "layout",                           default: {"sample"=>"1", "screen"=>"4", "reaction"=>"2", "wellplate"=>"3", "research_plan"=>"5"}, null: false
    t.integer  "selected_device_id"
  end

  add_index "users", ["confirmation_token"], name: "index_users_on_confirmation_token", unique: true, using: :btree
  add_index "users", ["deleted_at"], name: "index_users_on_deleted_at", using: :btree
  add_index "users", ["email"], name: "index_users_on_email", unique: true, using: :btree
  add_index "users", ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true, using: :btree

  create_table "users_admins", force: :cascade do |t|
    t.integer "user_id"
    t.integer "admin_id"
  end

  add_index "users_admins", ["admin_id"], name: "index_users_admins_on_admin_id", using: :btree
  add_index "users_admins", ["user_id"], name: "index_users_admins_on_user_id", using: :btree

  create_table "users_devices", force: :cascade do |t|
    t.integer "user_id"
    t.integer "device_id"
  end

  create_table "users_groups", force: :cascade do |t|
    t.integer "user_id"
    t.integer "group_id"
  end

  add_index "users_groups", ["group_id"], name: "index_users_groups_on_group_id", using: :btree
  add_index "users_groups", ["user_id"], name: "index_users_groups_on_user_id", using: :btree

  create_table "wellplates", force: :cascade do |t|
    t.string   "name"
    t.integer  "size"
    t.string   "description"
    t.datetime "created_at",  null: false
    t.datetime "updated_at",  null: false
    t.datetime "deleted_at"
  end

  add_index "wellplates", ["deleted_at"], name: "index_wellplates_on_deleted_at", using: :btree

  create_table "wells", force: :cascade do |t|
    t.integer  "sample_id"
    t.integer  "wellplate_id", null: false
    t.integer  "position_x"
    t.integer  "position_y"
    t.datetime "created_at",   null: false
    t.datetime "updated_at",   null: false
    t.string   "readout"
    t.string   "additive"
    t.datetime "deleted_at"
  end

  add_index "wells", ["deleted_at"], name: "index_wells_on_deleted_at", using: :btree
  add_index "wells", ["sample_id"], name: "index_wells_on_sample_id", using: :btree
  add_index "wells", ["wellplate_id"], name: "index_wells_on_wellplate_id", using: :btree

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

  create_view "v_samples_collections",  sql_definition: <<-SQL
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

end
