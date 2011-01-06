<?php 
	if($_POST['apc_hidden'] == 'Y') {
		//Form data sent
		$apc_default_style = isset($_POST['apc_default_style']) ? 'true' : 'false';
		update_option('apc_default_style', $apc_default_style);
		?>
		<div class="updated"><p><strong><?php _e('Options saved.'); ?></strong></p></div>
		<?php
	} else {
		//Normal page display
		$apc_default_style = get_option('apc_default_style', 'true');
	}	
?>
<div class="wrap">
<?php
	echo "<h2>Ajax Post Carousel Options</h2>";
?>
	<form name="oscimp_form" method="post" action="<?php echo str_replace( '%7E', '~', $_SERVER['REQUEST_URI']); ?>">
		<input type="hidden" name="apc_hidden" value="Y">
		<p><input type="checkbox" id="apc_default_style" name="apc_default_style" <?php echo ($apc_default_style == 'true') ? 'checked="checked"' : ''; ?> ><label for="apc_default_style">Use default styles included in the plugin</label></p>
		<p class="submit">
		<input type="submit" name="Submit" value="<?php _e('Update options &raquo;') ?>" />
		</p>
	</form>
</div>