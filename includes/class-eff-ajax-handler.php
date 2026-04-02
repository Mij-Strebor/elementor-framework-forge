<?php
/**
 * EFF Ajax Handler — AJAX Endpoint Registration & Processing
 *
 * All AJAX endpoints are registered here, each protected with nonce
 * verification and capability checks before any processing occurs.
 *
 * @package ElementorFrameworkForge
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class EFF_Ajax_Handler {

	/**
	 * Register all wp_ajax_{action} hooks.
	 */
	public function register_handlers(): void {
		$actions = array(
			// v1.0.0 endpoints
			'eff_save_file',
			'eff_load_file',
			'eff_sync_from_elementor',
			'eff_save_user_theme',
			'eff_get_config',
			'eff_save_config',
			'eff_save_settings',
			'eff_get_settings',
			'eff_get_usage_counts',
			// Project management endpoints
			'eff_list_projects',
			'eff_list_backups',
			'eff_delete_project',
			// Phase 2 — Colors endpoints
			'eff_save_category',
			'eff_delete_category',
			'eff_reorder_categories',
			'eff_save_color',
			'eff_delete_color',
			'eff_generate_children',
			'eff_save_baseline',
			'eff_get_baseline',
			'eff_commit_to_elementor',
			// Elementor V3 Import
			'eff_sync_v3_global_colors',
		);

		foreach ( $actions as $action ) {
			add_action( 'wp_ajax_' . $action, array( $this, 'ajax_' . $action ) );
		}
	}

	// -----------------------------------------------------------------------
	// ENDPOINT: Save file
	// -----------------------------------------------------------------------

	public function ajax_eff_save_file(): void {
		$this->verify_request();

		$project_name = $this->post_param( 'project_name' );

		$data_raw = isset( $_POST['data'] ) ? wp_unslash( $_POST['data'] ) : '';

		if ( empty( $project_name ) ) {
			wp_send_json_error( array( 'message' => __( 'Project name is required.', 'elementor-framework-forge' ) ) );
		}

		$decoded = $this->safe_json_decode( $data_raw, __( 'Invalid data format.', 'elementor-framework-forge' ) );

		$slug  = EFF_Data_Store::sanitize_project_slug( $project_name );
		$dir   = EFF_Data_Store::get_project_dir( $slug );
		$fname = EFF_Data_Store::generate_backup_filename( $slug );
		$file  = $dir . $fname;

		$json = wp_json_encode( $decoded, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES );
		if ( false === file_put_contents( $file, $json ) ) {
			wp_send_json_error( array( 'message' => __( 'Could not write file. Check directory permissions.', 'elementor-framework-forge' ) ) );
		}

		EFF_Data_Store::prune_backups( $dir, (int) EFF_Settings::get( 'max_backups' ) );

		$relative = $slug . '/' . $fname;
		wp_send_json_success( array(
			'message'  => __( 'File saved successfully.', 'elementor-framework-forge' ),
			'filename' => $relative,
		) );
	}

	// -----------------------------------------------------------------------
	// ENDPOINT: Load file
	// -----------------------------------------------------------------------

	public function ajax_eff_load_file(): void {
		$this->verify_request();

		$raw = $this->post_param( 'filename' );

		if ( empty( $raw ) ) {
			wp_send_json_error( array( 'message' => __( 'Filename is required.', 'elementor-framework-forge' ) ) );
		}

		$resolved = $this->resolve_file( $raw );
		$file     = $resolved['absolute'];
		$filename = $resolved['relative'];
		$dir      = EFF_Data_Store::get_wp_storage_dir();

		if ( ! file_exists( $file ) ) {
			// Backward compat: old flat path — try newest backup in slug subdir.
			if ( strpos( $raw, '/' ) === false ) {
				$slug    = EFF_Data_Store::sanitize_project_slug( preg_replace( '/\.eff\.json$/i', '', $raw ) );
				$backups = EFF_Data_Store::list_project_backups( $dir, $slug );
				if ( ! empty( $backups ) ) {
					$resolved = $this->resolve_file( $backups[0]['filename'] );
					$file     = $resolved['absolute'];
					$filename = $resolved['relative'];
				}
			}

			if ( ! file_exists( $file ) ) {
				// Still not found → return a fresh empty project (create-on-load).
				$project_name = isset( $_POST['project_name'] )
					? sanitize_text_field( wp_unslash( $_POST['project_name'] ) )
					: preg_replace( '/\.eff(?:\.json)?$/i', '', basename( $filename ) );
				$project_name = preg_replace( '/\.eff$/', '', $project_name );

				$store = new EFF_Data_Store();
				$data  = $store->new_project( $project_name );

				wp_send_json_success( array(
					'data'     => $data,
					'counts'   => array( 'variables' => 0, 'classes' => 0, 'components' => 0 ),
					'filename' => $filename,
					'created'  => true,
				) );
				return;
			}
		}

		$store = new EFF_Data_Store();
		if ( ! $store->load_from_file( $file ) ) {
			wp_send_json_error( array( 'message' => __( 'Could not read or parse file.', 'elementor-framework-forge' ) ) );
		}

		wp_send_json_success( array(
			'data'     => $store->get_all_data(),
			'counts'   => $store->get_counts(),
			'filename' => $filename,
		) );
	}

	// -----------------------------------------------------------------------
	// ENDPOINT: Sync from Elementor CSS
	// -----------------------------------------------------------------------

	public function ajax_eff_sync_from_elementor(): void {
		$this->verify_request();

		$parser   = new EFF_CSS_Parser();
		$css_file = null;

		// Optional manual override — user-supplied path validated against the uploads/elementor/css/ dir.
		$manual_path = $this->post_param( 'css_file_path' );

		if ( $manual_path ) {
			$upload_dir   = wp_upload_dir();
			$allowed_base = wp_normalize_path( $upload_dir['basedir'] . '/elementor/css/' );
			$candidate    = wp_normalize_path( $manual_path );

			// Reject anything outside the allowed directory or that is not a .css file.
			if (
				0 === strpos( $candidate, $allowed_base ) &&
				'.css' === substr( $candidate, -4 ) &&
				file_exists( $candidate )
			) {
				$css_file = $candidate;
			} else {
				wp_send_json_error( array(
					'message' => __( 'The supplied path is not valid. It must be an existing .css file inside wp-content/uploads/elementor/css/.', 'elementor-framework-forge' ),
				) );
			}
		}

		if ( ! $css_file ) {
			$css_file = $parser->find_kit_css_file();
		}

		if ( ! $css_file ) {
			$upload_dir  = wp_upload_dir();
			$css_dir     = $upload_dir['basedir'] . '/elementor/css/';
			$kit_id      = EFF_CSS_Parser::get_active_kit_id();
			$expected    = $kit_id ? $css_dir . 'post-' . $kit_id . '.css' : $css_dir . 'post-?.css';
			wp_send_json_error( array(
				'message'       => __( 'Elementor kit CSS file not found.', 'elementor-framework-forge' ),
				'hint'          => __( 'Open any page in Elementor editor and click Update/Save to regenerate kit CSS.', 'elementor-framework-forge' ),
				'expected_file' => $expected,
			) );
		}

		$variables = $parser->parse_file( $css_file );

		wp_send_json_success( array(
			'variables' => $variables,
			'count'     => count( $variables ),
			'source'    => basename( $css_file ),
			/* translators: %d: number of variables found */
			'message'   => sprintf( __( 'Found %d Elementor v4 variable(s).', 'elementor-framework-forge' ), count( $variables ) ),
		) );
	}

	// -----------------------------------------------------------------------
	// ENDPOINT: Save user theme preference
	// -----------------------------------------------------------------------

	public function ajax_eff_save_user_theme(): void {
		$this->verify_request();

		$theme = $this->post_param( 'theme', 'light' );

		$theme   = in_array( $theme, array( 'light', 'dark' ), true ) ? $theme : 'light';
		$user_id = get_current_user_id();

		update_user_meta( $user_id, EFF_USER_META_THEME, $theme );

		wp_send_json_success( array( 'theme' => $theme ) );
	}

	// -----------------------------------------------------------------------
	// ENDPOINT: Get project config
	// -----------------------------------------------------------------------

	public function ajax_eff_get_config(): void {
		$this->verify_request();

		// Saved config takes precedence over defaults file.
		$saved = get_option( 'eff_project_config', array() );

		if ( ! empty( $saved ) ) {
			wp_send_json_success( array( 'config' => $saved ) );
			return;
		}

		// Fall back to defaults JSON.
		$defaults_file = EFF_PLUGIN_DIR . 'data/eff-defaults.json';
		$config        = array();

		if ( file_exists( $defaults_file ) ) {
			$decoded = json_decode( file_get_contents( $defaults_file ), true );
			if ( JSON_ERROR_NONE === json_last_error() ) {
				$config = $decoded;
			}
		}

		wp_send_json_success( array( 'config' => $config ) );
	}

	// -----------------------------------------------------------------------
	// ENDPOINT: Save project config
	// -----------------------------------------------------------------------

	public function ajax_eff_save_config(): void {
		$this->verify_request();

		$config_raw = isset( $_POST['config'] ) ? wp_unslash( $_POST['config'] ) : '';
		$config     = $this->safe_json_decode( $config_raw, __( 'Invalid config format.', 'elementor-framework-forge' ) );

		update_option( 'eff_project_config', $config );

		wp_send_json_success( array( 'message' => __( 'Configuration saved.', 'elementor-framework-forge' ) ) );
	}

	// -----------------------------------------------------------------------
	// ENDPOINT: Save plugin settings
	// -----------------------------------------------------------------------

	public function ajax_eff_save_settings(): void {
		$this->verify_request();

		$settings_raw = isset( $_POST['settings'] ) ? wp_unslash( $_POST['settings'] ) : '';
		$settings     = $this->safe_json_decode( $settings_raw, __( 'Invalid settings format.', 'elementor-framework-forge' ) );

		EFF_Settings::set( $settings );

		wp_send_json_success( array( 'message' => __( 'Settings saved.', 'elementor-framework-forge' ) ) );
	}

	// -----------------------------------------------------------------------
	// ENDPOINT: Get variable usage counts
	// -----------------------------------------------------------------------

	public function ajax_eff_get_usage_counts(): void {
		$this->verify_request();

		$names_raw = isset( $_POST['variable_names'] ) ? wp_unslash( $_POST['variable_names'] ) : '[]';
		$names     = $this->safe_json_decode( $names_raw, __( 'Invalid variable names format.', 'elementor-framework-forge' ) );

		// Sanitize: allow only valid CSS custom property names (--identifier)
		$names = array_values( array_filter(
			array_map( 'sanitize_text_field', $names ),
			function ( string $n ): bool {
				return $this->is_valid_css_var( $n );
			}
		) );

		$counts = EFF_Usage_Scanner::scan( $names );

		wp_send_json_success( array(
			'counts'     => $counts,
			'scanned'    => count( $names ),
		) );
	}

	// -----------------------------------------------------------------------
	// ENDPOINT: Get plugin settings
	// -----------------------------------------------------------------------

	public function ajax_eff_get_settings(): void {
		$this->verify_request();
		wp_send_json_success( array( 'settings' => EFF_Settings::get() ) );
	}

	// -----------------------------------------------------------------------
	// ENDPOINT: List projects
	// -----------------------------------------------------------------------

	public function ajax_eff_list_projects(): void {
		$this->verify_request();

		$dir      = EFF_Data_Store::get_wp_storage_dir();
		$projects = EFF_Data_Store::list_projects_v2( $dir );

		wp_send_json_success( array( 'projects' => $projects ) );
	}

	// -----------------------------------------------------------------------
	// ENDPOINT: Delete project
	// -----------------------------------------------------------------------

	// -----------------------------------------------------------------------
	// ENDPOINT: List backups for a project
	// -----------------------------------------------------------------------

	public function ajax_eff_list_backups(): void {
		$this->verify_request();

		$slug    = $this->post_param( 'project_slug' );
		$slug    = EFF_Data_Store::sanitize_project_slug( $slug );
		$dir     = EFF_Data_Store::get_wp_storage_dir();
		$backups = EFF_Data_Store::list_project_backups( $dir, $slug );

		wp_send_json_success( array( 'backups' => $backups ) );
	}

	// -----------------------------------------------------------------------
	// ENDPOINT: Delete project (single backup)
	// -----------------------------------------------------------------------

	public function ajax_eff_delete_project(): void {
		$this->verify_request();

		$raw = $this->post_param( 'filename' );

		if ( empty( $raw ) ) {
			wp_send_json_error( array( 'message' => __( 'Filename is required.', 'elementor-framework-forge' ) ) );
		}

		$resolved = $this->resolve_file( $raw );
		$file     = $resolved['absolute'];
		$filename = $resolved['relative'];

		if ( ! file_exists( $file ) ) {
			wp_send_json_error( array( 'message' => __( 'File not found.', 'elementor-framework-forge' ) ) );
		}

		if ( ! unlink( $file ) ) {
			wp_send_json_error( array( 'message' => __( 'Could not delete file. Check permissions.', 'elementor-framework-forge' ) ) );
		}

		// Clean up stored baseline.
		EFF_Data_Store::delete_baseline( $filename );

		// Remove project subdirectory if now empty.
		$project_dir = dirname( $file );
		if ( is_dir( $project_dir ) && empty( glob( $project_dir . '/*.eff.json' ) ) ) {
			@rmdir( $project_dir ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
		}

		wp_send_json_success( array( 'message' => __( 'Backup deleted.', 'elementor-framework-forge' ) ) );
	}

	// -----------------------------------------------------------------------
	// PHASE 2 ENDPOINTS — Colors category and variable management
	// -----------------------------------------------------------------------

	/**
	 * Add or update a category in the .eff.json file.
	 *
	 * POST params: filename, subgroup (optional, defaults to 'Colors'),
	 *              category (JSON: {id?, name, order?, locked?})
	 */
	public function ajax_eff_save_category(): void {
		$subgroup     = $this->get_subgroup_param();
		$category_raw = isset( $_POST['category'] ) ? wp_unslash( $_POST['category'] ) : '';
		$category     = $this->safe_json_decode( $category_raw, __( 'Invalid category data.', 'elementor-framework-forge' ) );

		$name = isset( $category['name'] ) ? sanitize_text_field( $category['name'] ) : '';
		if ( empty( $name ) ) {
			wp_send_json_error( array( 'message' => __( 'Category name is required.', 'elementor-framework-forge' ) ) );
		}

		$this->with_store( function ( $store ) use ( $subgroup, $category, $name ) {
			if ( ! empty( $category['id'] ) ) {
				if ( ! $store->update_category_for_subgroup( $subgroup, $category['id'], array( 'name' => $name ) ) ) {
					throw new \Exception( __( 'Category not found.', 'elementor-framework-forge' ) );
				}
				$id = $category['id'];
			} else {
				$id = $store->add_category_for_subgroup( $subgroup, array( 'name' => $name ) );
			}

			return array(
				'id'         => $id,
				'categories' => $store->get_categories_for_subgroup( $subgroup ),
				/* translators: %s: category name */
				'message'    => sprintf( __( 'Category "%s" saved.', 'elementor-framework-forge' ), $name ),
			);
		} );
	}

	/**
	 * Delete a category from the .eff.json file.
	 *
	 * POST params: filename, subgroup (optional, defaults to 'Colors'), category_id
	 */
	public function ajax_eff_delete_category(): void {
		$this->verify_request();
		$subgroup    = $this->get_subgroup_param();
		$category_id = $this->post_param( 'category_id' );

		if ( empty( $category_id ) ) {
			wp_send_json_error( array( 'message' => __( 'Category ID is required.', 'elementor-framework-forge' ) ) );
		}

		$this->with_store( function ( $store ) use ( $subgroup, $category_id ) {
			if ( ! $store->delete_category_for_subgroup( $subgroup, $category_id ) ) {
				throw new \Exception( __( 'Category not found or cannot be deleted.', 'elementor-framework-forge' ) );
			}
			return array(
				'categories' => $store->get_categories_for_subgroup( $subgroup ),
				'message'    => __( 'Category deleted.', 'elementor-framework-forge' ),
			);
		} );
	}

	/**
	 * Reorder categories in the .eff.json file.
	 *
	 * POST params: filename, subgroup (optional, defaults to 'Colors'),
	 *              ordered_ids (JSON array of category UUIDs in desired order)
	 */
	public function ajax_eff_reorder_categories(): void {
		$this->verify_request();
		$subgroup    = $this->get_subgroup_param();
		$ids_raw     = isset( $_POST['ordered_ids'] ) ? wp_unslash( $_POST['ordered_ids'] ) : '[]';
		$ordered_ids = $this->safe_json_decode( $ids_raw, __( 'Invalid ordered IDs format.', 'elementor-framework-forge' ) );

		// Sanitize: each ID must be a non-empty string.
		$ordered_ids = array_values( array_filter(
			array_map( 'sanitize_text_field', $ordered_ids ),
			static function ( string $id ): bool {
				return ! empty( $id );
			}
		) );

		$this->with_store( function ( $store ) use ( $subgroup, $ordered_ids ) {
			$store->reorder_categories_for_subgroup( $subgroup, $ordered_ids );
			return array(
				'categories' => $store->get_categories_for_subgroup( $subgroup ),
				'message'    => __( 'Categories reordered.', 'elementor-framework-forge' ),
			);
		} );
	}

	/**
	 * Add or update a color variable in the .eff.json file.
	 *
	 * POST params: filename, variable (JSON — full variable object or partial with `id`)
	 */
	public function ajax_eff_save_color(): void {
		$this->verify_request();
		$variable_raw = isset( $_POST['variable'] ) ? wp_unslash( $_POST['variable'] ) : '';
		$variable     = $this->safe_json_decode( $variable_raw, __( 'Invalid variable data.', 'elementor-framework-forge' ) );

		$this->with_store( function ( $store ) use ( $variable ) {
			if ( ! empty( $variable['id'] ) ) {
				// Update existing variable.
				$allowed_fields = array(
					'name', 'value', 'original_value', 'format', 'category', 'category_id',
					'order', 'status', 'pending_rename_from', 'type', 'subgroup', 'group',
				);
				$update = array();
				foreach ( $allowed_fields as $field ) {
					if ( array_key_exists( $field, $variable ) ) {
						$update[ $field ] = is_string( $variable[ $field ] )
							? sanitize_text_field( $variable[ $field ] )
							: $variable[ $field ];
					}
				}
				// pending_rename_from may be null — preserve as-is.
				if ( array_key_exists( 'pending_rename_from', $variable ) ) {
					$update['pending_rename_from'] = is_null( $variable['pending_rename_from'] )
						? null
						: sanitize_text_field( $variable['pending_rename_from'] );
				}

				if ( ! $store->update_variable( $variable['id'], $update ) ) {
					throw new \Exception( __( 'Variable not found.', 'elementor-framework-forge' ) );
				}
				$id = $variable['id'];
			} else {
				// Add new variable.
				$name = isset( $variable['name'] ) ? sanitize_text_field( $variable['name'] ) : '';
				if ( empty( $name ) || ! $this->is_valid_css_var( $name ) ) {
					throw new \Exception( __( 'Valid CSS custom property name required (e.g., --my-color).', 'elementor-framework-forge' ) );
				}

				$id = $store->add_variable( array(
					'name'        => $name,
					'value'       => isset( $variable['value'] )       ? sanitize_text_field( $variable['value'] )       : '',
					'type'        => isset( $variable['type'] )        ? sanitize_text_field( $variable['type'] )        : 'color',
					'subgroup'    => isset( $variable['subgroup'] )    ? sanitize_text_field( $variable['subgroup'] )    : 'Colors',
					'category'    => isset( $variable['category'] )    ? sanitize_text_field( $variable['category'] )    : '',
					'category_id' => isset( $variable['category_id'] ) ? sanitize_text_field( $variable['category_id'] ) : '',
					'format'      => isset( $variable['format'] )      ? sanitize_text_field( $variable['format'] )      : 'HEX',
					'status'      => 'new',
					'source'      => 'user-defined',
				) );
			}

			return array(
				'id'      => $id,
				'data'    => $store->get_all_data(),
				'counts'  => $store->get_counts(),
				'message' => __( 'Color variable saved.', 'elementor-framework-forge' ),
			);
		} );
	}

	/**
	 * Delete a color variable from the .eff.json file.
	 *
	 * POST params: filename, variable_id, delete_children (optional, '1' to delete children)
	 */
	public function ajax_eff_delete_color(): void {
		$variable_id     = $this->post_param( 'variable_id' );
		$delete_children = isset( $_POST['delete_children'] )
			&& $_POST['delete_children'] !== '0'
			&& $_POST['delete_children'] !== '';

		if ( empty( $variable_id ) ) {
			wp_send_json_error( array( 'message' => __( 'Variable ID is required.', 'elementor-framework-forge' ) ) );
		}

		$this->with_store( function ( $store ) use ( $variable_id, $delete_children ) {
			if ( ! $store->delete_variable( $variable_id, $delete_children ) ) {
				throw new \Exception( __( 'Variable not found.', 'elementor-framework-forge' ) );
			}
			return array(
				'data'    => $store->get_all_data(),
				'counts'  => $store->get_counts(),
				'message' => __( 'Color variable deleted.', 'elementor-framework-forge' ),
			);
		} );
	}

	/**
	 * Generate tint/shade/transparency child variables for a parent color variable.
	 *
	 * POST params: filename, parent_id, tints (0–10), shades (0–10), transparencies (0|1)
	 *
	 * Child variable naming (spec §15.7 — EFF-Spec-Colors):
	 *   Tints:          --name-{step*10}     (e.g., --primary-10, --primary-20)
	 *   Shades:         --name-plus-{step*10} (e.g., --primary-plus-10; '+' encoded as '-plus-')
	 *   Transparencies: --name{step*10}       (e.g., --primary10, --primary20; 9 fixed steps)
	 */
	public function ajax_eff_generate_children(): void {
		$this->verify_request();
		$parent_id   = $this->post_param( 'parent_id' );
		$tint_steps  = max( 0, min( 10, isset( $_POST['tints'] )   ? (int) $_POST['tints']   : 0 ) );
		$shade_steps = max( 0, min( 10, isset( $_POST['shades'] )  ? (int) $_POST['shades']  : 0 ) );
		$trans_on    = isset( $_POST['transparencies'] ) && $_POST['transparencies'] !== '0' && $_POST['transparencies'] !== '';

		if ( empty( $parent_id ) ) {
			wp_send_json_error( array( 'message' => __( 'Parent variable ID is required.', 'elementor-framework-forge' ) ) );
		}

		$this->with_store( function ( $store ) use ( $parent_id, $tint_steps, $shade_steps, $trans_on ) {
			// Find parent variable.
			$parent = null;
			foreach ( $store->get_variables() as $var ) {
				if ( $var['id'] === $parent_id ) {
					$parent = $var;
					break;
				}
			}
			if ( ! $parent ) {
				throw new \Exception( __( 'Parent variable not found.', 'elementor-framework-forge' ) );
			}

			// Remove existing children of this parent (regenerate).
			foreach ( $store->get_variables() as $var ) {
				if ( isset( $var['parent_id'] ) && $var['parent_id'] === $parent_id ) {
					$store->delete_variable( $var['id'] );
				}
			}

			// Parse parent hex to H, S, L.
			$hex = ltrim( $parent['value'], '#' );
			if ( strlen( $hex ) !== 6 ) {
				throw new \Exception( __( 'Parent variable must have a 6-digit hex value to generate children.', 'elementor-framework-forge' ) );
			}

			list( $h, $s, $l ) = $this->hex_to_hsl( $hex );
			$base_name = preg_replace( '/^--/', '', $parent['name'] );
			$new_ids   = array();

			// Generate tints: each step i of N shifts lightness equally toward 100% (white).
			// Naming: --name-{i*10} e.g. --primary-10, --primary-20 … --primary-30 for N=3.
			if ( $tint_steps > 0 ) {
				for ( $i = 1; $i <= $tint_steps; $i++ ) {
					$tint_l    = min( 98.0, $l + ( 100.0 - $l ) * ( $i / $tint_steps ) );
					$new_ids[] = $store->add_variable( array(
						'name'        => '--' . $base_name . '-' . ( $i * 10 ),
						'value'       => $this->hsl_to_hex( $h, $s, $tint_l ),
						'type'        => 'color',
						'subgroup'    => $parent['subgroup'] ?? 'Colors',
						'category'    => $parent['category'] ?? '',
						'category_id' => $parent['category_id'] ?? '',
						'format'      => $parent['format'] ?? 'HEX',
						'status'      => 'new',
						'source'      => 'user-defined',
						'parent_id'   => $parent_id,
					) );
				}
			}

			// Generate shades: each step i of N shifts lightness equally toward 0% (black).
			// Naming: --name-plus-{i*10} ('+' encoded as '-plus-') e.g. --primary-plus-10.
			if ( $shade_steps > 0 ) {
				for ( $i = 1; $i <= $shade_steps; $i++ ) {
					$shade_l   = max( 2.0, $l - $l * ( $i / $shade_steps ) );
					$new_ids[] = $store->add_variable( array(
						'name'        => '--' . $base_name . '-plus-' . ( $i * 10 ),
						'value'       => $this->hsl_to_hex( $h, $s, $shade_l ),
						'type'        => 'color',
						'subgroup'    => $parent['subgroup'] ?? 'Colors',
						'category'    => $parent['category'] ?? '',
						'category_id' => $parent['category_id'] ?? '',
						'format'      => $parent['format'] ?? 'HEX',
						'status'      => 'new',
						'source'      => 'user-defined',
						'parent_id'   => $parent_id,
					) );
				}
			}

			// Generate transparencies: 9 fixed steps, alpha = step/10 (0.1 to 0.9).
			// Naming: --name{step*10} (no separator) e.g. --primary10, --primary20 … --primary90.
			if ( $trans_on ) {
				for ( $i = 1; $i <= 9; $i++ ) {
					$alpha_hex = str_pad( strtoupper( dechex( (int) round( $i * 10 / 100 * 255 ) ) ), 2, '0', STR_PAD_LEFT );
					$new_ids[] = $store->add_variable( array(
						'name'        => '--' . $base_name . ( $i * 10 ),
						'value'       => '#' . $hex . $alpha_hex,
						'type'        => 'color',
						'subgroup'    => $parent['subgroup'] ?? 'Colors',
						'category'    => $parent['category'] ?? '',
						'category_id' => $parent['category_id'] ?? '',
						'format'      => 'HEXA',
						'status'      => 'new',
						'source'      => 'user-defined',
						'parent_id'   => $parent_id,
					) );
				}
			}

			return array(
				'new_ids' => $new_ids,
				'data'    => $store->get_all_data(),
				'counts'  => $store->get_counts(),
				/* translators: %d: number of child variables generated */
				'message' => sprintf( __( 'Generated %d child variables.', 'elementor-framework-forge' ), count( $new_ids ) ),
			);
		} );
	}

	/**
	 * Save the Elementor baseline snapshot for a .eff.json file.
	 *
	 * POST params: filename, variables (JSON array of {name, value})
	 */
	public function ajax_eff_save_baseline(): void {
		$this->verify_request();

		$filename      = $this->get_filename_param();
		$variables_raw = isset( $_POST['variables'] ) ? wp_unslash( $_POST['variables'] ) : '[]';
		$variables     = $this->safe_json_decode( $variables_raw, __( 'Invalid variables format.', 'elementor-framework-forge' ) );

		// Sanitize: allow only valid CSS custom property entries.
		$sanitized = array();
		foreach ( $variables as $v ) {
			if ( ! is_array( $v ) || ! isset( $v['name'] ) || ! $this->is_valid_css_var( $v['name'] ) ) {
				continue;
			}
			$sanitized[] = array(
				'name'  => sanitize_text_field( $v['name'] ),
				'value' => isset( $v['value'] ) ? sanitize_text_field( $v['value'] ) : '',
			);
		}

		EFF_Data_Store::save_baseline( $filename, $sanitized );

		wp_send_json_success( array(
			'count'   => count( $sanitized ),
			'message' => __( 'Baseline saved.', 'elementor-framework-forge' ),
		) );
	}

	/**
	 * Retrieve the Elementor baseline snapshot for a .eff.json file.
	 *
	 * POST params: filename
	 */
	public function ajax_eff_get_baseline(): void {
		$this->verify_request();

		$filename  = $this->get_filename_param();
		$variables = EFF_Data_Store::get_baseline( $filename );

		wp_send_json_success( array(
			'variables' => $variables,
			'count'     => count( $variables ),
		) );
	}

	/**
	 * Commit EFF color variable values back to Elementor's kit CSS file.
	 *
	 * Reads the Elementor kit CSS, replaces matching variable values in the
	 * last `:root` block (the Elementor v4 atomic block), writes the file back,
	 * triggers Elementor CSS regeneration, and updates the baseline.
	 *
	 * POST params: filename, variables (JSON array of {name, value} to commit)
	 */
	// Intentional Phase 5 write-back exception — see EFF CLAUDE.md Critical Rule #1.
	public function ajax_eff_commit_to_elementor(): void {
		$this->verify_request();

		$filename      = $this->get_filename_param();
		$variables_raw = isset( $_POST['variables'] ) ? wp_unslash( $_POST['variables'] ) : '[]';
		$variables     = $this->safe_json_decode( $variables_raw, __( 'Invalid variables format.', 'elementor-framework-forge' ) );

		// Locate the Elementor kit CSS file.
		$parser   = new EFF_CSS_Parser();
		$css_file = $parser->find_kit_css_file();

		if ( ! $css_file ) {
			wp_send_json_error( array(
				'message' => __( 'Elementor kit CSS file not found. Regenerate CSS from Elementor → Tools → Regenerate Files.', 'elementor-framework-forge' ),
			) );
		}

		if ( ! is_writable( $css_file ) ) {
			wp_send_json_error( array(
				/* translators: %s: absolute file path */
				'message' => sprintf( __( 'Kit CSS file is not writable: %s', 'elementor-framework-forge' ), esc_html( $css_file ) ),
			) );
		}

		$css = file_get_contents( $css_file );
		if ( false === $css ) {
			wp_send_json_error( array( 'message' => __( 'Could not read kit CSS file.', 'elementor-framework-forge' ) ) );
		}

		$committed = array();
		$skipped   = array();

		foreach ( $variables as $v ) {
			if ( ! is_array( $v ) || ! isset( $v['name'] ) || ! $this->is_valid_css_var( $v['name'] ) ) {
				continue;
			}

			$name  = sanitize_text_field( $v['name'] );
			$value = isset( $v['value'] ) ? sanitize_text_field( $v['value'] ) : '';

			// Replace value in the CSS: target `--name: anything;` pattern.
			$pattern     = '/' . preg_quote( $name, '/' ) . '\s*:\s*[^;]+;/';
			$replacement = $name . ': ' . $value . ';';
			$new_css     = preg_replace( $pattern, $replacement, $css, -1, $count );

			if ( $count > 0 ) {
				$css         = $new_css;
				$committed[] = $name;
			} else {
				$skipped[] = $name;
			}
		}

		// Insert pass — add newly-created variables not yet in the CSS.
		if ( ! empty( $skipped ) ) {
			$insert_block    = '';
			$newly_committed = array();
			foreach ( $skipped as $name ) {
				foreach ( $variables as $v ) {
					if ( isset( $v['name'] ) && $v['name'] === $name ) {
						$val           = sanitize_text_field( $v['value'] ?? '' );
						$insert_block .= "\n  " . $name . ': ' . $val . ';';
						$newly_committed[] = $name;
						break;
					}
				}
			}
			if ( $insert_block ) {
				// Find the user-defined :root block (the one that contains no --e-global- / system vars).
				// If found, insert before its closing }. If not found, append a new :root block.
				$user_root_close = $this->find_user_root_close_pos( $css );
				if ( false !== $user_root_close ) {
					$css = substr( $css, 0, $user_root_close )
						. $insert_block . "\n"
						. substr( $css, $user_root_close );
				} else {
					// No user-variables :root block exists — append one.
					$css .= "\n\n/* EFF user-defined variables */\n:root {" . $insert_block . "\n}\n";
				}
				foreach ( $newly_committed as $n ) {
					$committed[] = $n;
				}
				$skipped = array_values( array_diff( $skipped, $newly_committed ) );
			}
		}

		if ( ! empty( $committed ) ) {
			if ( false === file_put_contents( $css_file, $css ) ) {
				wp_send_json_error( array( 'message' => __( 'Could not write kit CSS file. Check file permissions.', 'elementor-framework-forge' ) ) );
			}
		}

		// NOTE: We intentionally do NOT call do_action('elementor/css-file/clear-cache') here.
		// Doing so causes Elementor to regenerate CSS from its database, which would overwrite
		// the variables EFF just inserted. The CSS file is the source of truth for EFF variables.

		// Update the baseline to reflect the committed values.
		$baseline_vars = array();
		foreach ( $committed as $name ) {
			foreach ( $variables as $v ) {
				if ( isset( $v['name'] ) && $v['name'] === $name ) {
					$baseline_vars[] = array(
						'name'  => $name,
						'value' => sanitize_text_field( $v['value'] ?? '' ),
					);
					break;
				}
			}
		}
		if ( ! empty( $baseline_vars ) ) {
			// Merge into existing baseline.
			$existing  = EFF_Data_Store::get_baseline( $filename );
			$index     = array();
			foreach ( $existing as $bv ) {
				$index[ $bv['name'] ] = $bv['value'];
			}
			foreach ( $baseline_vars as $bv ) {
				$index[ $bv['name'] ] = $bv['value'];
			}
			$merged = array();
			foreach ( $index as $n => $val ) {
				$merged[] = array( 'name' => $n, 'value' => $val );
			}
			EFF_Data_Store::save_baseline( $filename, $merged );
		}

		wp_send_json_success( array(
			'committed' => $committed,
			'skipped'   => $skipped,
			/* translators: %d: number of variables committed */
			'message'   => sprintf( __( '%d variable(s) committed to Elementor.', 'elementor-framework-forge' ), count( $committed ) ),
		) );
	}

	// -----------------------------------------------------------------------
	// PHASE 2 PRIVATE HELPERS
	// -----------------------------------------------------------------------

	/**
	 * Find the closing-brace position of the user-defined :root block in a CSS string.
	 *
	 * Scans all :root { ... } blocks and returns the position of the closing `}` for
	 * the LAST block that contains no system/Elementor variables (i.e., the block that
	 * is safe to insert user-defined custom properties into).
	 *
	 * @param string $css Raw CSS content.
	 * @return int|false Position of `}` in $css, or false if no suitable block found.
	 */
	private function find_user_root_close_pos( string $css ) {
		$system_prefixes = EFF_CSS_Parser::SYSTEM_PREFIXES;

		// Find all :root block positions and their content.
		$offset = 0;
		$best   = false; // position of } in the best (last) user-variables block

		while ( ( $root_pos = strpos( $css, ':root', $offset ) ) !== false ) {
			$open_pos = strpos( $css, '{', $root_pos );
			if ( false === $open_pos ) { break; }

			$close_pos = strpos( $css, '}', $open_pos );
			if ( false === $close_pos ) { break; }

			$block_content = substr( $css, $open_pos + 1, $close_pos - $open_pos - 1 );

			// Check if the block has any system variables.
			$has_system = false;
			foreach ( $system_prefixes as $prefix ) {
				if ( strpos( $block_content, $prefix ) !== false ) {
					$has_system = true;
					break;
				}
			}

			if ( ! $has_system ) {
				$best = $close_pos; // track last user-variables block
			}

			$offset = $close_pos + 1;
		}

		return $best;
	}

	/**
	 * Get and validate the `subgroup` POST parameter for category endpoints.
	 *
	 * Returns 'Colors' as the default for backward compatibility.
	 *
	 * @return string One of 'Colors', 'Fonts', 'Numbers'.
	 */
	private function get_subgroup_param(): string {
		$subgroup = $this->post_param( 'subgroup', 'Colors' );

		$allowed = array( 'Colors', 'Fonts', 'Numbers' );
		return in_array( $subgroup, $allowed, true ) ? $subgroup : 'Colors';
	}

	/**
	 * Get and validate the `filename` POST parameter, resolved to an absolute path.
	 *
	 * Sends a JSON error and dies if missing or empty.
	 *
	 * @return string Resolved relative path (new or legacy format).
	 */
	private function get_filename_param(): string {
		$raw = $this->post_param( 'filename' );

		if ( empty( $raw ) ) {
			wp_send_json_error( array( 'message' => __( 'Filename is required.', 'elementor-framework-forge' ) ) );
		}

		$resolved = $this->resolve_file( $raw );
		return $resolved['relative'];
	}

	/**
	 * Load a .eff.json file into a new EFF_Data_Store instance.
	 *
	 * Sends a JSON error and dies if the file cannot be read.
	 *
	 * @param string $filename Relative path (slug/file.eff.json or legacy file.eff.json).
	 * @return EFF_Data_Store Loaded store.
	 */
	private function load_store( string $filename ): EFF_Data_Store {
		$dir   = EFF_Data_Store::get_wp_storage_dir();
		$file  = $dir . $filename;
		$store = new EFF_Data_Store();

		if ( file_exists( $file ) && ! $store->load_from_file( $file ) ) {
			wp_send_json_error( array( 'message' => __( 'Could not read or parse EFF file.', 'elementor-framework-forge' ) ) );
		}

		return $store;
	}

	/**
	 * Save a data store to its .eff.json file.
	 *
	 * Sends a JSON error and dies if the file cannot be written.
	 *
	 * @param EFF_Data_Store $store    Store to save.
	 * @param string         $filename Relative path (slug/file.eff.json or legacy file.eff.json).
	 */
	private function save_store( EFF_Data_Store $store, string $filename ): void {
		$dir  = EFF_Data_Store::get_wp_storage_dir();
		$file = $dir . $filename;

		if ( ! $store->save_to_file( $file ) ) {
			wp_send_json_error( array( 'message' => __( 'Could not write EFF file. Check directory permissions.', 'elementor-framework-forge' ) ) );
		}
	}

	/**
	 * Verify the request, load the store, run $callback, save, and send JSON success.
	 *
	 * The callback receives the EFF_Data_Store instance and must return the array
	 * to pass to wp_send_json_success(). Throw an \Exception to send an error instead.
	 *
	 * @param callable $callback function( EFF_Data_Store $store ): array
	 */
	private function with_store( callable $callback ): void {
		$this->verify_request();
		$filename = $this->get_filename_param();
		$store    = $this->load_store( $filename );
		try {
			$result = $callback( $store );
			$this->save_store( $store, $filename );
			wp_send_json_success( $result );
		} catch ( \Exception $e ) {
			wp_send_json_error( array( 'message' => $e->getMessage() ) );
		}
	}

	/**
	 * Convert a 6-digit hex color string to an [H, S, L] array.
	 *
	 * @param string $hex 6 hex chars without '#'.
	 * @return float[] [hue (0–360), saturation (0–100), lightness (0–100)]
	 */
	private function hex_to_hsl( string $hex ): array {
		$r = hexdec( substr( $hex, 0, 2 ) ) / 255.0;
		$g = hexdec( substr( $hex, 2, 2 ) ) / 255.0;
		$b = hexdec( substr( $hex, 4, 2 ) ) / 255.0;

		$max   = max( $r, $g, $b );
		$min   = min( $r, $g, $b );
		$delta = $max - $min;
		$l     = ( $max + $min ) / 2.0;

		if ( $delta < 0.0001 ) {
			return array( 0.0, 0.0, $l * 100.0 );
		}

		$s = $delta / ( 1.0 - abs( 2.0 * $l - 1.0 ) );

		if ( $max === $r ) {
			$h = fmod( ( $g - $b ) / $delta, 6.0 );
		} elseif ( $max === $g ) {
			$h = ( $b - $r ) / $delta + 2.0;
		} else {
			$h = ( $r - $g ) / $delta + 4.0;
		}

		$h = fmod( $h * 60.0 + 360.0, 360.0 );

		return array( $h, $s * 100.0, $l * 100.0 );
	}

	/**
	 * Convert H, S, L values to a 6-digit hex color string (with '#').
	 *
	 * @param float $h Hue (0–360).
	 * @param float $s Saturation (0–100).
	 * @param float $l Lightness (0–100).
	 * @return string Hex color with '#' prefix.
	 */
	private function hsl_to_hex( float $h, float $s, float $l ): string {
		$s /= 100.0;
		$l /= 100.0;

		$c = ( 1.0 - abs( 2.0 * $l - 1.0 ) ) * $s;
		$x = $c * ( 1.0 - abs( fmod( $h / 60.0, 2.0 ) - 1.0 ) );
		$m = $l - $c / 2.0;

		if ( $h < 60 ) {
			list( $r1, $g1, $b1 ) = array( $c, $x, 0.0 );
		} elseif ( $h < 120 ) {
			list( $r1, $g1, $b1 ) = array( $x, $c, 0.0 );
		} elseif ( $h < 180 ) {
			list( $r1, $g1, $b1 ) = array( 0.0, $c, $x );
		} elseif ( $h < 240 ) {
			list( $r1, $g1, $b1 ) = array( 0.0, $x, $c );
		} elseif ( $h < 300 ) {
			list( $r1, $g1, $b1 ) = array( $x, 0.0, $c );
		} else {
			list( $r1, $g1, $b1 ) = array( $c, 0.0, $x );
		}

		$r = (int) round( ( $r1 + $m ) * 255 );
		$g = (int) round( ( $g1 + $m ) * 255 );
		$b = (int) round( ( $b1 + $m ) * 255 );

		return sprintf( '#%02x%02x%02x', $r, $g, $b );
	}

	// -----------------------------------------------------------------------
	// PRIVATE HELPERS — REQUEST, DECODING & VALIDATION
	// -----------------------------------------------------------------------

	private const CSS_VAR_PATTERN = '/^--[\w-]+$/';

	/**
	 * Decode a JSON string and send an error response if decoding fails.
	 *
	 * @param string $raw           Raw JSON string (already unslashed).
	 * @param string $error_message Error message for the JSON error response.
	 * @return array Decoded associative array.
	 */
	private function safe_json_decode( string $raw, string $error_message ): array {
		$decoded = json_decode( $raw, true );
		if ( JSON_ERROR_NONE !== json_last_error() || ! is_array( $decoded ) ) {
			wp_send_json_error( array( 'message' => $error_message ) );
		}
		return $decoded;
	}

	/**
	 * Get a sanitized string value from $_POST.
	 *
	 * @param string $key     POST parameter name.
	 * @param string $default Default value if the key is absent.
	 * @return string Sanitized value.
	 */
	private function post_param( string $key, string $default = '' ): string {
		return isset( $_POST[ $key ] )
			? sanitize_text_field( wp_unslash( $_POST[ $key ] ) )
			: $default;
	}

	/**
	 * Check whether a string is a valid CSS custom property name.
	 *
	 * @param string $name String to test.
	 * @return bool True if the name matches --identifier syntax.
	 */
	private function is_valid_css_var( string $name ): bool {
		return preg_match( self::CSS_VAR_PATTERN, $name ) === 1;
	}

	// -----------------------------------------------------------------------
	// FILE PATH RESOLUTION
	// -----------------------------------------------------------------------

	/**
	 * Resolve a raw filename POST param to an absolute path.
	 *
	 * Handles new subdirectory format (slug/slug_YYYY-MM-DD_HH-II-SS.eff.json)
	 * and old flat format (slug.eff.json) for backward compat.
	 * Exits with JSON error on invalid input.
	 *
	 * @param string $raw Raw filename value from POST.
	 * @return array { absolute: string, relative: string }
	 */
	private function resolve_file( string $raw ): array {
		$dir = EFF_Data_Store::get_wp_storage_dir();

		if ( strpos( $raw, '/' ) !== false ) {
			// New subdirectory format — validate, prevent path traversal.
			$rel = ltrim( $raw, '/' );
			if ( strpos( $rel, '..' ) !== false ) {
				wp_send_json_error( array( 'message' => __( 'Invalid path.', 'elementor-framework-forge' ) ) );
			}
			$abs  = $dir . $rel;
			// Only use realpath if the directory already exists; if it doesn't,
			// the caller's file_exists() check will handle it gracefully.
			$real = realpath( dirname( $abs ) );
			if ( $real ) {
				$base = rtrim( realpath( $dir ) ?: $dir, DIRECTORY_SEPARATOR );
				if ( strpos( $real, $base ) !== 0 ) {
					wp_send_json_error( array( 'message' => __( 'Invalid path.', 'elementor-framework-forge' ) ) );
				}
			}
			return array( 'absolute' => $abs, 'relative' => $rel );
		}

		// Old flat format — backward compat.
		$filename = EFF_Data_Store::sanitize_filename( $raw );
		return array( 'absolute' => $dir . $filename, 'relative' => $filename );
	}

	// -----------------------------------------------------------------------
	// SHARED GUARD
	// -----------------------------------------------------------------------

	/**
	 * Verify nonce and capability. Sends JSON error and dies on failure.
	 */
	private function verify_request(): void {
		if ( ! check_ajax_referer( EFF_NONCE_ACTION, 'nonce', false ) ) {
			wp_send_json_error(
				array( 'message' => __( 'Security check failed.', 'elementor-framework-forge' ) ),
				403
			);
		}

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error(
				array( 'message' => __( 'Insufficient permissions.', 'elementor-framework-forge' ) ),
				403
			);
		}
	}

	// -----------------------------------------------------------------------
	// ENDPOINT: Sync V3 Global Colors
	// -----------------------------------------------------------------------

	/**
	 * Read Elementor V3 Global Colors from the active kit post meta and return
	 * them as an array of { name, value } objects for import into EFF.
	 *
	 * V3 Global Colors are stored in `_elementor_page_settings` → `system_colors`
	 * and `custom_colors` as arrays of { _id, title, color } objects.
	 * The CSS variable name is derived as `--e-global-color-{_id}`.
	 */
	public function ajax_eff_sync_v3_global_colors(): void {
		$this->verify_request();

		$kit_id = EFF_CSS_Parser::get_active_kit_id();
		if ( ! $kit_id ) {
			wp_send_json_error( array(
				'message' => __( 'No active Elementor kit found.', 'elementor-framework-forge' ),
			) );
		}

		$settings = get_post_meta( $kit_id, '_elementor_page_settings', true );
		if ( ! is_array( $settings ) ) {
			wp_send_json_error( array(
				'message' => __( 'Could not read Elementor kit settings. Make sure the kit has been saved at least once.', 'elementor-framework-forge' ),
			) );
		}

		$color_groups = array();
		if ( ! empty( $settings['system_colors'] ) && is_array( $settings['system_colors'] ) ) {
			$color_groups[] = $settings['system_colors'];
		}
		if ( ! empty( $settings['custom_colors'] ) && is_array( $settings['custom_colors'] ) ) {
			$color_groups[] = $settings['custom_colors'];
		}

		$imported = array();
		foreach ( $color_groups as $group ) {
			foreach ( $group as $color ) {
				if ( empty( $color['_id'] ) || empty( $color['color'] ) ) {
					continue;
				}
				$var_name = '--e-global-color-' . sanitize_key( $color['_id'] );
				$value    = sanitize_text_field( $color['color'] );
				// Ensure value starts with '#' for bare hex values (Elementor stores
				// them without the leading hash in older kit data).
				if ( preg_match( '/^[0-9a-fA-F]{3,8}$/', $value ) ) {
					$value = '#' . $value;
				}
				$imported[] = array(
					'name'  => $var_name,
					'value' => $value,
					'title' => isset( $color['title'] ) ? sanitize_text_field( $color['title'] ) : '',
				);
			}
		}

		wp_send_json_success( array(
			'imported' => $imported,
			'count'    => count( $imported ),
		) );
	}
}
