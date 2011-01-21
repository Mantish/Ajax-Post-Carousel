=== Ajax Post Carousel ===
Contributors: mantish - anabelle
Donate link: http://8manos.com/
Tags: AJAX, slide, slider, carousel, jquery, post carousel, ajax carousel
Requires at least: 2.9
Tested up to: 3.0.4
Stable tag: 0.3.2

Widget that displays posts as a carousel, using jQuery. It preloads a few posts and Ajax is used to load more posts as the carousel advances.

== Description ==

With Ajax Post Carousel you can display posts as a carousel using jQuery for animations. The widget only preloads a few posts and Ajax is used to load more posts as the carousel advances (this is very useful when you have hundreds of posts).

The featured thumbnail of each post is used for the carousel, so at least Wordpress 2.9 is required. The widget can be totally customized using CSS. Only the basic styles are defined so the carousel works properly.

**Features**

* Posts can be selected from a category, a custom taxonomy or a post type.
* Configurable number of posts shown in the carousel and number of preloaded posts (visible posts + posts loaded in the background)
* Posts can be loaded in random order or using the default order (From most recent to oldest)
* Carousel can be an endless loop
* Title and excerpt can be shown. Thumbnail is always shown.
* Can be used as a widget, a shortcode or a php function.

== Installation ==

1. Upload `ajax-post-carousel` folder to the `/wp-content/plugins/` directory
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Create widgets anywhere, using the 'Widgets' menu in WordPress. Or use the shortcode in your posts. Or use the php function in your theme templates. 

== BETA ==

Be adviced we are releasing this software as beta software.
Our initial intention is to gather feedback and collaboration.

After testing and approval the plugin will launch oficially.

Send us your comments to plugins@8manos.com

== HOW TO ==

* Carousels can be added using Widgets, Shortcodes or a PHP function.
* You can use the default styles included in the plugin or use your own css. Explained below.

= Widget =

This is the easiest way to add carousels to your site. Just drag the "Ajax Post Carousel" widget to an available area and configure all settings.

= Shortcode =

You can use it to include carousels in your posts or pages. Add [apc-carousel] to use the default values.

All the options in the widget can also be used with the shortcode:

* random: Accepts 0 or 1. (default 0)
* visible_posts: Number of posts visible in the carousel. (default 3)
* init_posts: Number of preloaded posts. Equals number of visible posts + number of posts in the background. (default 9)
* show_title: Whether to show the title of the post. Accepts 0 or 1 (default 0)
* show_excerpt: Whether to show the excerpt of the post. Accepts 0 or 1 (default 0)
* loop: Accepts 0 or 1 (default 0)
* post_type: Slug of the post type. Accepts 'post', 'page', 'all' or any custom post type. (default 'post')
* category: Slug of the category. (default 'all')
* Posts can be filtered by taxonomy using: taxonomy-slug=term-slug

Example:

[apc-carousel visible_posts=2 init_posts=8 show_title=1 show_excerpt=1 my-taxonomy=my-taxonomy-term]

= PHP Function =

The PHP function can be used in a theme template. The options and defaults are the same as in the Shortcode:

Ajax_Post_Carousel::show_carousel($random=0, $visible_posts=3, $init_posts=9, $show_title=0, $show_excerpt=0, $loop=0, $post_type='post', $category='all', $tax_filter='')

$tax_filter uses this format: 'my-tax-1=my-term-1&my-tax-2=my-term-2'

Example that returns the same output as the Shortcode example:

<?php echo Ajax_Post_Carousel::show_carousel(0, 2, 8, 1, 1, 0, 'post', 'all', 'my-taxonomy=my-taxonomy-term'); ?>

= Use your own CSS =

There are to ways to style the carousels using your own css.

1. Copy the css file from wp-content/plugins/ajax-post-carousel/ajax_post_carousel.css into your theme directory and edit the copy.
2. Define your own styles in your theme stylesheet. Just use the carousel id, so your rules have a higher priority than the rules from the plugin (for example: #apc_carousel_0 .apc_thumb{border:none;})

== Frequently Asked Questions ==

= How can you not have FAQ? =

This is the first public release, we welcome you to send us your comments and feedback and don't encourage production use without testing.

= Where can I send you feedback =

plugins@8manos.com 

== Screenshots ==

1. This is default output of the plugin, you can customize it as much as you want using CSS. You will also find useful settings in the widget itself.

== Upgrade Notice ==

= 0.3.2 =

Small but nasty bugs fixed.

== Changelog ==

= 0.3.2 =

* Fixed bugs when clicking arrows too fast.

= 0.3.1 =

* Added ID to the carousels and improved the ways that custom styles can be defined.

= 0.3 =

* Carousels can be added using a Shortcode and/or a PHP function.
* Post excerpts can be included now.
* CSS styles improved so it looks better right out of the box.

= 0.2.6 =

* Fixed misscount when 'all' post types were selected.
* Commented error_reporting(ALL). No more ugly error messages.

= 0.2.5 =

* Javascript file rewritten so there are no conflicts with other plugins.

= 0.2.4 =

* New feature: loop
* Width bug in chrome resolved.

= 0.2.3 =

* Now has a good fallback when JS is disabled. Styles are more robust

= 0.2.2 =

* Fixed bug when all post types and all categories are selected.

= 0.2.1 =

* Fixed some bugs in Internet Explorer and Google Chrome.

= 0.2 =

* Posts can be selected from a category, a custom taxonomy or a post type.

= 0.1 =

* First working version.
