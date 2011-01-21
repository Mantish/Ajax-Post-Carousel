<?php
/*
Plugin Name: Ajax Post Carousel
Plugin URI: http://codigoweb.co/wordpress-plugin-ajax-post-carousel/
Description: Widget that displays posts as a carousel using jQuery for animations. The widget only preloads a few posts and Ajax is used to load more as the carousel advances (this is very useful when you have hundreds of posts).
Version: 0.3.2
Author: Mantish - 8manos < plugins@8manos.com >
Author URI: http://codigoweb.co
*/

//error_reporting(E_ALL);

//admin menu
//add_action('admin_menu', array('Ajax_Post_Carousel', 'admin_actions'));
//js and css
add_action('template_redirect', array('Ajax_Post_Carousel', 'add_scripts'));
//register widget
add_action("widgets_init", array('Ajax_Post_Carousel', 'register'));
//register shortcode
add_shortcode('apc-carousel', array('Ajax_Post_Carousel', 'shortcode'));
//AJAX
add_action( 'wp_ajax_nopriv_ajax_apc_get_posts', array('Ajax_Post_Carousel', 'ajax_apc_get_posts') );
add_action( 'wp_ajax_ajax_apc_get_posts', array('Ajax_Post_Carousel', 'ajax_apc_get_posts') );

class Ajax_Post_Carousel extends WP_Widget{
	function Ajax_Post_Carousel() {
		$widget_ops = array('classname' => 'apc_widget', 'description' => 'Widget that displays posts as a carousel using jQuery for animations.');
		$control_ops = array( 'id_base' => 'ajax-post-carousel' );
		$this->WP_Widget( 'ajax-post-carousel', 'Ajax Post Carousel', $widget_ops, $control_ops );
	}
	
	function show_carousel($random=0, $visible_posts=3, $init_posts=9, $show_title=0, $show_excerpt=0, $loop=0, $post_type='post', $category='all', $tax_filter=''){
		$output =
		'<div class="apc_out_container">
			<div class="apc_arrow apc_prev apc_inactive">&larr;</div>
			<div class="apc_visible_container">
				<ul class="apc_list">';
		//array for get_posts function
		$get_posts_args = array();
		
		//array of requested taxonomies, to be used in count function
		$taxonomies_for_count = array();
		if ($tax_filter){
			//get the taxonomies requested by the user
			$tax_filter_array = explode("&", $tax_filter);
			foreach ($tax_filter_array as $tax){
				$tax_slug = strtok($tax, '=');
				$term = strtok('=');
				
				$get_posts_args[$tax_slug] = $term;
				$taxonomies_for_count[] = $term;
			}
		}
			
		//if post type and category, then added to the args of get_post function 
		if ($post_type == 'all'){
			$get_posts_args['post_type'] = 'any';
		}else{
			$get_posts_args['post_type'] = $post_type;
		}
		if ($category != 'all'){
			$get_posts_args['category_name'] = $category;
		}				
		
		//before random, have to get total posts
		$total_posts = self::__apc_count_posts($post_type, $category, $taxonomies_for_count);
		
		if ( $random ){
			$offset = mt_rand(0, $total_posts - 1);
		}else{
			$offset = 0;
		}
		$get_posts_args['numberposts'] = $init_posts;
		$get_posts_args['offset'] = $offset;
		
		//print_r($get_posts_args);
		$posts = get_posts($get_posts_args);
		$output .= self::__display_items($posts, $show_title, $show_excerpt);
		
		//when the offset is to high and only a few posts (less than init_posts) are displayed, we have to get some more
		$new_offset = $offset + $init_posts;
		if ( $new_offset > $total_posts && $offset > 0 ){
			//shows all the posts needed to complete the init_posts number, but shouldn't repeat the ones already shown
			$get_posts_args['numberposts'] = min($new_offset - $total_posts, $offset);
			$get_posts_args['offset'] = 0;
			$posts = get_posts($get_posts_args);
			$output .= self::__display_items($posts, $show_title, $show_excerpt);
		}
		$output .=
			'</ul>
		</div>
		<div class="apc_arrow apc_next apc_inactive">&rarr;</div>
		<input type="hidden" value="'.$visible_posts.','.$init_posts.','.$total_posts.','.$offset.','.get_bloginfo('url').','.$show_title.','.$show_excerpt.','.$loop.','.$post_type.','.$category.','.$tax_filter.'" class="apc_carousel_vars">
	</div>';
		
		return $output;
	}
	
	function shortcode($args){
		extract(shortcode_atts(array(
			'random' => 0,
			'visible_posts' => 3,
			'init_posts' => 9,
			'show_title' => 0,
			'show_excerpt' => 0,
			'loop' => 0,
			'post_type' => 'post',
			'category' => 'all',
			), $args));
						
		$taxonomies = get_taxonomies(array('_builtin' => false), 'objects');
		$tax_filter = '';
		foreach ($taxonomies as $tax){
			if (isset($args[$tax->query_var])){
				$tax_filter .= '&'.$tax->query_var.'='.$args[$tax->query_var];
			}
		}
		$tax_filter = substr($tax_filter, 1);
			
		return self::show_carousel($random, $visible_posts, $init_posts, $show_title, $show_excerpt, $loop, $post_type, $category, $tax_filter);
	}
	
	function widget($args, $instance) {
		extract($args);
		$title = apply_filters('widget_title', $instance['title'] );
		$random = isset($instance['random']) ? $instance['random'] : false;
		$visible_posts = $instance['visible_posts'];
		$init_posts = $instance['init_posts'];
		$show_title = isset($instance['show_title']) ? $instance['show_title'] : false;
		$show_excerpt = isset($instance['show_excerpt']) ? $instance['show_excerpt'] : false;
		$loop = isset($instance['loop']) ? $instance['loop'] : false;
		$post_type = $instance['post_type'];
		$category = $instance['category'];
		
		echo $before_widget;
		echo $before_title . $title . $after_title;
		
		$taxonomies = get_taxonomies(array('_builtin' => false), 'objects');
		$tax_filter = '';
		foreach ($taxonomies as $tax){
			if ($instance[$tax->query_var] != 'all'){
				$tax_filter .= '&'.$tax->query_var.'='.$instance[$tax->query_var];
			}
		}
		$tax_filter = substr($tax_filter, 1);
		
		echo $this->show_carousel($random, $visible_posts, $init_posts, $show_title, $show_excerpt, $loop, $post_type, $category, $tax_filter);
		
		echo $after_widget;
	}
	
	function __apc_count_posts($post_type, $category, $taxonomies_for_count){
		//categoy is treated as any other taxonomy
		if ($category != 'all'){
			$taxonomies_for_count[] = $category;
		}
		
		global $wpdb;
		$SQL = "SELECT COUNT(DISTINCT p.ID) FROM $wpdb->posts AS p";
		foreach($taxonomies_for_count as $key => $termslug){
			$SQL .= ", $wpdb->term_relationships AS rel$key, $wpdb->term_taxonomy AS tax$key, $wpdb->terms AS term$key";
		}
		if ( ! empty($taxonomies_for_count)){
			$SQL .= " WHERE p.ID=rel0.object_id";
		}
		foreach($taxonomies_for_count as $key => $termslug){
			if ($key > 0){
				$SQL .= " AND p.ID=rel$key.object_id";
			}
			$SQL .= " AND rel$key.term_taxonomy_id=tax$key.term_taxonomy_id AND tax$key.term_id=term$key.term_id AND term$key.slug='$termslug'";
		}
		if ( ! empty($taxonomies_for_count)){
			$SQL .= " AND p.post_status='publish'";
		}else{
			$SQL .= " WHERE p.post_status='publish'";
		}
		if ($post_type != 'all'){
			$SQL .= " AND p.post_type='$post_type'";
		}else{
			$SQL .= " AND (p.post_type='page' OR p.post_type='post'";
			$custom_types = get_post_types(array('_builtin' => false)); 
			foreach ($custom_types  as $type ) {
				$SQL .= " OR p.post_type='$type'";
			}
			$SQL .= ")";
		}
		//echo $SQL.'<br>';
		return $wpdb->get_var($SQL);		
	}
	
	function __display_items($posts, $show_title, $show_excerpt){
		$output = '';
		foreach ($posts as $post){
			$output .= '<li class="apc_item"><a title="'.$post->post_title.'" href="'.get_permalink($post->ID).'" class="apc_post_link">';
			if ( (function_exists('has_post_thumbnail')) && (has_post_thumbnail($post->ID)) ){
				$output .= get_the_post_thumbnail($post->ID, 'thumbnail', array('class' => 'apc_thumb', 'title' => $post->post_title, 'alt' => $post->post_excerpt));
			}else{
				$w = get_option('thumbnail_size_w');
				$h = get_option('thumbnail_size_h');
				$output .= '<img src="http://dummyimage.com/'.$w.'x'.$h.'/000/fff.jpg&text='.str_replace(' ', '+', $post->post_title).'" class="apc_thumb" title="'.$post->post_title.'" alt="'. $post->post_excerpt.'" width="'.$w.'" height="'.$h.'">';
			}
			$output .= '</a>';
			if ( $show_title ){
				$output .= '<h5><a title="'.$post->post_title.'" href="'.get_permalink($post->ID).'">'.$post->post_title.'</a></h5>';
			}
			if ( $show_excerpt ){
				if ( ! $post->post_excerpt){
					$excerpt_text = strip_shortcodes( $post->post_content );
					$excerpt_text = apply_filters('the_content', $excerpt_text);
					$excerpt_text = strip_tags(str_replace(']]>', ']]&gt;', $excerpt_text));
					$words = preg_split("/[\n\r\t ]+/", $excerpt_text, 56, PREG_SPLIT_NO_EMPTY);
					if ( count($words) > 55 ) {
						array_pop($words);
						$excerpt_text = implode(' ', $words);
						$excerpt_text = $excerpt_text . ' ...';
					} else {
						$excerpt_text = implode(' ', $words);
					}
				}else{
					$excerpt_text = $post->post_excerpt;
				}
				$output .= apply_filters('the_excerpt', $excerpt_text.' <a title="'.$post->post_title.'" href="'.get_permalink($post->ID).'" class="more-link">[+]</a>');
			}
		}
		return $output;
	}
	
	function update($new_instance, $old_instance){
		$val_int_options = array(
			'options' => array(
				'min_range' => 1
			)
		);
		
		$instance = $old_instance;
			
		$title = filter_var(strip_tags($new_instance['title']), FILTER_SANITIZE_STRING);
		if ($title !== false){
			$instance['title'] = $title;
		}
		$instance['random'] = filter_var($new_instance['random'], FILTER_VALIDATE_BOOLEAN);
		$visible_posts = filter_var(strip_tags($new_instance['visible_posts']), FILTER_VALIDATE_INT, $val_int_options);
		if ( $visible_posts !== false ){
			$instance['visible_posts'] = $visible_posts;
		}
		$init_posts = filter_var(strip_tags($new_instance['init_posts']), FILTER_VALIDATE_INT, $val_int_options);
		if ( $init_posts !== false ){
			$instance['init_posts'] = $init_posts;
		}
		$instance['show_title'] = filter_var($new_instance['show_title'], FILTER_VALIDATE_BOOLEAN);
		$instance['show_excerpt'] = filter_var($new_instance['show_excerpt'], FILTER_VALIDATE_BOOLEAN);
		$instance['loop'] = filter_var($new_instance['loop'], FILTER_VALIDATE_BOOLEAN);
		$instance['post_type'] = filter_var(strip_tags($new_instance['post_type']), FILTER_SANITIZE_STRING);
		$instance['category'] = filter_var(strip_tags($new_instance['category']), FILTER_SANITIZE_STRING);
		
		$taxonomies = get_taxonomies(array('_builtin' => false), 'objects');
		foreach ($taxonomies  as $tax ) {
			$instance[$tax->query_var] = filter_var(strip_tags($new_instance[$tax->query_var]), FILTER_SANITIZE_STRING);
		}
		
		return $instance;
	}
	
	function form($instance){
		$defaults = array('title' => 'Previous Posts', 'random' => false, 'visible_posts' => 3, 'init_posts' => 9, 'show_title' => false, 'show_excerpt' => false, 'loop' => false, 'post_type' => 'post', 'category' => 'all');
		$instance = wp_parse_args((array) $instance, $defaults);
		?>
		<p><label>Widget title <input name="<?=$this->get_field_name('title')?>" type="text" value="<?=$instance['title']?>" /></label></p>
		<p><label>Random order <input name="<?=$this->get_field_name('random')?>" type="checkbox" <?php echo ($instance['random'] == true) ? 'checked="checked" ' : ''; ?>/></label></p>
		<p><label>Number of visible posts <input name="<?=$this->get_field_name('visible_posts')?>" type="text" value="<?=$instance['visible_posts']?>" /></label></p>
		<p><label>Number of posts preloaded <input name="<?=$this->get_field_name('init_posts')?>" type="text" value="<?=$instance['init_posts']?>" /></label></p>
		<p><label>Show post title <input name="<?=$this->get_field_name('show_title')?>" type="checkbox" <?php echo ($instance['show_title'] == true) ? 'checked="checked" ' : ''; ?>/></label></p>
		<p><label>Show post excerpt <input name="<?=$this->get_field_name('show_excerpt')?>" type="checkbox" <?php echo ($instance['show_excerpt'] == true) ? 'checked="checked" ' : ''; ?>/></label></p>
		<p><label>Loop (circular carousel) <input name="<?=$this->get_field_name('loop')?>" type="checkbox" <?php echo ($instance['loop'] == true) ? 'checked="checked" ' : ''; ?>/></label></p>
		<p><label>Post type <select name="<?=$this->get_field_name('post_type')?>">
			<option value="all" <?php echo ($instance['post_type'] == 'all') ? 'selected="selected" ' : ''; ?>>all</option>
			<option value="post" <?php echo ($instance['post_type'] == 'post') ? 'selected="selected" ' : ''; ?>>post</option>
			<option value="page" <?php echo ($instance['post_type'] == 'page') ? 'selected="selected" ' : ''; ?>>page</option>
			<?php 
			$post_types = get_post_types(array('_builtin' => false)); 
			foreach ($post_types  as $post_type ) {
				$selected = ($instance['post_type'] == $post_type) ? 'selected="selected" ' : '';
				echo '<option value="' . $post_type . '"' . $selected . '>' . $post_type . '</option>';
			}
			?>
		</select></label></p>
		<p><label>Category <select name="<?=$this->get_field_name('category')?>">
			<option value="all" <?php echo ($instance['category'] == 'all') ? 'selected="selected" ' : ''; ?>>all</option>
			<?php 
			$categories = get_categories(); 
			foreach ($categories  as $cat ) {
				$selected = ($instance['category'] == $cat->cat_name) ? 'selected="selected" ' : '';
				echo '<option value="' . $cat->cat_name . '"' . $selected . '>' . $cat->cat_name . '</option>';
			}
			?>
		</select></label></p>
		<?php
		$taxonomies = get_taxonomies(array('_builtin' => false), 'objects');
		foreach ($taxonomies  as $tax ) {
			//print_r ($tax);
			$name = $this->get_field_name($tax->query_var);
			echo '<p><label>' . $tax->name . ' <select name="' . $name . '">';
			$selected = ($instance[$tax->query_var] == 'all') ? 'selected="selected" ' : '';
			echo '<option value="all"' . $selected . '>all</option>';
			$terms = get_terms( $tax->name );
			foreach ($terms  as $term_object ) {
				$selected = ($instance[$tax->query_var] == $term_object->slug) ? 'selected="selected" ' : '';
				echo '<option value="' . $term_object->slug . '"' . $selected . '>' . $term_object->name . '</option>';
			}
			echo '</select></label></p>';
		}
	}

	function register(){
		register_widget( 'Ajax_Post_Carousel' );
	}
	
	function add_scripts(){
		wp_enqueue_script('ajax_post_carousel_js', plugins_url('ajax_post_carousel.js', __FILE__), array('jquery'));
		
		//load css file from the theme folder or the plugin folder
		if ( file_exists( get_stylesheet_directory()."/ajax_post_carousel.css" ) ) {					
			wp_enqueue_style( 'ajax_post_carousel_style', get_stylesheet_directory_uri() . '/ajax_post_carousel.css' );					
		}elseif ( file_exists( get_template_directory()."/ajax_post_carousel.css" ) ) {								
			wp_enqueue_style( 'ajax_post_carousel_style', get_template_directory_uri() . '/ajax_post_carousel' );		
		}else{
			wp_enqueue_style('ajax_post_carousel_style', plugins_url('ajax_post_carousel.css', __FILE__));
		}
	}
	
	//admin page
	/*function admin_actions(){
		add_theme_page('Ajax Post Carousel', 'Ajax Post Carousel', 'edit_themes', 'ajax-post-carousel', array('Ajax_Post_Carousel', 'admin_page'));
	}
	
	function admin_page(){
		include('apc_admin.php');
	}*/
	
	//AJAX function
	function ajax_apc_get_posts() {
		$get_posts_args = array(
			'numberposts' => $_POST['num'],
			'offset' => $_POST['offset']
		);
		if ($_POST['post_type'] == 'all'){
			$get_posts_args['post_type'] = 'any';
		}else{
			$get_posts_args['post_type'] = $_POST['post_type'];
		}
		if ($_POST['category'] != 'all'){
			$get_posts_args['category_name'] = $_POST['category'];
		}
		foreach ($_POST as $key => $val){
			if (substr($key, 0, 4) == 'tax_'){
				$get_posts_args[substr($key, 4)] = $val;
			}
		}
		$posts = get_posts($get_posts_args);
		echo self::__display_items($posts, $_POST['title'], $_POST['excerpt']);
	
		// IMPORTANT: don't forget to "exit"
		exit;
	}
}
?>
