(function($)
{
	$.fn.apc = function()
	{
		var opts = {
			ajax_processing: new Array(),
			visible_num: new Array(),
			preloaded_num: new Array(),
			total_items: new Array(),
			initial_offset: new Array(),
			blog_url: '',
			show_title: new Array(),
			show_excerpt: new Array(),
			post_type: new Array(),
			category: new Array(),
			tax_filters: new Array(),
			loop: new Array(),
			items: new Array(),
			list: new Array(),
			visible_container: new Array(),
			list_offset: new Array()
		};
	
		var setUpStyles = function()
		{
			$('.apc_visible_container').css({
				'overflow' : 'hidden'
			});
			$('.apc_list').css({
				'margin' : 0,
				'padding' : 0,
				'position' : 'relative'
			});
		}
		
		var setUpContainers = function()
		{
			setUpStyles();
			
			$('.apc_out_container').each(function(i){				
				$(this).attr('id', 'apc_carousel_'+i);
				
				var carousel_vars = $(this).children('.apc_carousel_vars').val().split(',');
				opts.visible_num[i] = Number(carousel_vars[0]);
				opts.preloaded_num[i] = Number(carousel_vars[1])//number of items that should be available (includes the visible ones)
				opts.total_items[i] = Number(carousel_vars[2]);
				opts.initial_offset[i] = Number(carousel_vars[3]);
				opts.blog_url = carousel_vars[4];
				opts.show_title[i] = carousel_vars[5];	
				opts.show_excerpt[i] = carousel_vars[6];	
				opts.loop[i] = carousel_vars[7];
				opts.post_type[i] = carousel_vars[8];
				opts.category[i] = carousel_vars[9];
				
				//get the taxonomy filters if available
				saveTaxFilters(carousel_vars[10], i);
						
				//get jquery objects for container, ul and list items
				opts.items[i] = $(this).find('.apc_item');
				opts.list[i] = $(this).find('.apc_list');		
				opts.visible_container[i] = $(this).find('.apc_visible_container');
				
				//width of the list is just the number of items * width of each item(including margin) (all items should have the same width)
				var ul_width = opts.items[i].length * opts.items[i].outerWidth(true);
				opts.list[i].width(ul_width);
				
				//list_offset is the number of items that are slided to the left
				opts.list_offset[i] = 0;
				
				var visible_width = opts.visible_num[i] * opts.items[i].outerWidth(true);
				opts.visible_container[i].width(visible_width);
				
				$(this).width(visible_width);
				
				setUpArrows(i);
			});
		}
		
		var saveTaxFilters = function(tax_filter, i)
		{
			if (tax_filter){
				opts.tax_filters[i] = new Array();
				var tax_filter_array = tax_filter.split("&");
				
				for (x in tax_filter_array){
					tax_term_array = tax_filter_array[x].split("=");
					opts.tax_filters[i][tax_term_array[0]] = tax_term_array[1];
				}
			}
		}
		
		var setUpArrows = function(i)
		{
			opts.visible_container[i].siblings(".apc_arrow.apc_next").bind("click", {direction: 'next', car_index: i}, slideCarousel);
			opts.visible_container[i].siblings(".apc_arrow.apc_prev").bind("click", {direction: 'prev', car_index: i}, slideCarousel);
			updateArrows(i, 0);
		}
		
		var slideCarousel = function(e)
		{
		if ( ! $(this).hasClass('apc_inactive')){
			e.preventDefault();
			var i = e.data.car_index;
			
			//get the new list offset based on direction
			if (e.data.direction == 'next'){
				var new_list_offset = opts.list_offset[i] + opts.visible_num[i];
			}else{
				var new_list_offset = opts.list_offset[i] - opts.visible_num[i];
			}
			
			//if there are items ready, animate and then bring more items if needed
			if (opts.items[i].length > new_list_offset && new_list_offset >= 0){
				
				//if there are posts not loaded yet and the number of preloaded items has not been reached: load more items with ajax
				var total_needed = new_list_offset + opts.preloaded_num[i];
				if (opts.items[i].length < opts.total_items[i] && opts.items[i].length < total_needed && ! opts.ajax_processing[i]){
					
					//before ajax, turn on the flag so only one ajax call can be made at one time
					opts.ajax_processing[i] = true;
					
					var offset = opts.initial_offset[i] + opts.items[i].length;
					//if the offset is higher than the total, it means that the post array returned by wordpress has reached the end
					if (offset >= opts.total_items[i]){
						offset = offset - opts.total_items[i];
					}
					//we should request only as many as to complete the total_items
					var req_num = Math.min(total_needed - opts.items[i].length, opts.total_items[i] - opts.items[i].length);				
					
					//perform the animation
					animateList(new_list_offset, i);
					//and then perform the ajax request
					getNewItems(offset, req_num, i, false, new_list_offset);
				}else{
					//only animate the list, as no more items have to be loaded
					animateList(new_list_offset, i);
					//if loop is enabled, all items are loaded and the last view is not full (i.e. visible_num=3, total_items=7, new_list_offset=6 -> last view = 1 item)
					if (opts.loop[i] == 1 && opts.items[i].length == opts.total_items[i] && (opts.total_items[i] - new_list_offset < opts.visible_num[i])){
						completeLastView(new_list_offset, i);
					}
				}		
			}
			//only when loop is enabled
			else if(opts.loop[i] == 1){
				//when left arrow clicked
				if (new_list_offset < 0){
					new_list_offset = opts.total_items[i] + new_list_offset;
					animateLoopPrev(new_list_offset, i);
				}else{
					animateLoop(new_list_offset, i);
				}
			}
		}
		}
		
		var getNewItems = function(offset, num, i, animate, new_list_offset)
		{
			var data_query = 'action=ajax_apc_get_posts&offset=' + offset + '&num=' + num + '&title=' + opts.show_title[i] + '&excerpt=' + opts.show_excerpt[i] + '&post_type=' + opts.post_type[i] + '&category=' + opts.category[i];
			for (j in opts.tax_filters[i]){
				data_query += '&tax_' + j + '=' + opts.tax_filters[i][j];
			}
			
			$.ajax({
				type: 'POST',
				url: opts.blog_url + '/wp-admin/admin-ajax.php',
				data: data_query,
				success: function(response){
					updateList(response, i, animate, new_list_offset, opts.items[i].length + num);
				},
				//this happens even if the function returns error
				complete: function(){
					completeAjax(i, new_list_offset);
				}
			});
		}
		
		var updateList = function(html, i, animate, new_list_offset, total_expected)
		{
			//append the results of ajax to the list
			appendItems(html, i);
			//animation is performed if needed
			//this is never reached, the ajax request always preloads items, animation is always made onclick
			if (animate){
				animateList(new_list_offset, i);
			}
			
			var items_num = opts.items[i].length;
			//if we didn't get enough posts, we have to make another ajax request
			if (total_expected > items_num){
				opts.ajax_processing[i] = true;
				var new_req_num = total_expected - items_num;
				getNewItems(0, new_req_num, i, animate, new_list_offset);
			}
		}
		
		var completeAjax = function(i, new_list_offset)
		{
			opts.ajax_processing[i] = false;
			//the arrows are updated
			updateArrows(i, new_list_offset);
		}
		
		var appendItems = function(html, i)
		{
			opts.list[i].append(html);
			opts.items[i] = opts.list[i].find('.apc_item');
			
			var ul_width = opts.items[i].length * opts.items[i].outerWidth(true);
			opts.list[i].width(ul_width);
		}
		
		var animateList = function(new_list_offset, i)
		{
			var new_left = -1 * opts.items[i].outerWidth(true) * new_list_offset;
			//default animation is swing
			opts.list[i].animate({left: new_left+'px'}, 600);
			opts.list_offset[i] = new_list_offset;
			//the arrows are updated
			updateArrows(i, new_list_offset);
		}
		
		/*Loop functions*/
		var completeLastView = function(new_list_offset, i)
		{
			//last_view_items = items missing so the last view is full
			var last_view_items = opts.visible_num[i] - (opts.total_items[i] - new_list_offset);
			var first_items = opts.items[i].slice(0, last_view_items).clone();
			appendItems(first_items, i);
		}
		
		var animateLoop = function(new_list_offset, i)
		{
			//put enough items from the beginning, in the end of the list
			cloneItemsAtRight(new_list_offset, i);
			
			//animate as normally
			var new_left = -1 * opts.items[i].outerWidth(true) * new_list_offset;
			opts.list[i].animate({left: new_left+'px'}, 600, function(){
				//at the end of animation, the list is reduced to the original number of items
				resetList(new_list_offset, i);
			});
			
			//the offset shouldn't be bigger than the number of items (i.e: total_items=7 -> new_offset=8 = offset=1)
			opts.list_offset[i] = new_list_offset - opts.total_items[i];
			updateArrows(i, new_list_offset - opts.total_items[i]);
		}
		
		var animateLoopPrev = function(new_list_offset, i)
		{
			cloneItemsAtRight(new_list_offset + opts.visible_num[i], i);
			
			//the list is moved to the right end, before animation
			var new_left = -1 * opts.items[i].outerWidth(true) * (new_list_offset + opts.visible_num[i]);
			opts.list[i].css({
				'left' : new_left
			});
			
			//animate as normally
			new_left = -1 * opts.items[i].outerWidth(true) * new_list_offset;
			opts.list[i].animate({left: new_left+'px'}, 600, function(){
				//at the end of animation, only the necessary items are left in the list (can be more than the total_items)
				adjustListSize(new_list_offset, i);
			});
			
			opts.list_offset[i] = new_list_offset;
			updateArrows(i, new_list_offset);
		}
		
		var cloneItemsAtRight = function(new_list_offset, i)
		{
			//offset_items = items in the last view, that are also in the beginning of the list
			var offset_items = opts.items[i].length - opts.total_items[i];
			var next_items = opts.items[i].slice(offset_items, opts.visible_num[i]+new_list_offset-opts.items[i].length+offset_items).clone();
			appendItems(next_items, i);
		}
		
		var resetList = function(new_list_offset, i)
		{
			opts.items[i].slice(opts.total_items[i]).remove();
			opts.items[i] = opts.items[i].slice(0, opts.total_items[i]);
			
			var ul_width = opts.total_items[i] * opts.items[i].outerWidth(true);
			//
			var new_left = -1 * (new_list_offset - opts.total_items[i]) * opts.items[i].outerWidth(true);
			
			opts.list[i].css({
				'left' : new_left,
				'width' : ul_width+'px'
			});
		}
		
		var adjustListSize = function(new_list_offset, i)
		{
			//last_view_items = items missing so the last view is full
			var last_view_items = opts.visible_num[i] - (opts.total_items[i] - new_list_offset);
			
			opts.items[i].slice(opts.total_items[i] + last_view_items).remove();
			opts.items[i] = opts.items[i].slice(0, opts.total_items[i] + last_view_items);
			
			var ul_width = (opts.total_items[i] + last_view_items) * opts.items[i].outerWidth(true);
			opts.list[i].width(ul_width);
		}
		/*End of Loop functions*/
		
		var updateArrows = function(i, new_list_offset)
		{
			//first all the arrows are enabled
			enableArrow(opts.visible_container[i].siblings('.apc_arrow'));
				
			//left arrow is only disabled at the beggining of the list.
			//It isn't disabled if loop is on and all items have been loaded
			if (new_list_offset <= 0 && ( opts.loop[i] != 1 || opts.items[i].length < opts.total_items[i] )){
				disableArrow(opts.visible_container[i].siblings(".apc_prev"));
			}
			
			//right arrow is disabled when there are no more items to the right (if an ajax request is pending, then ajaxloader is shown meanwhile
			if (opts.items[i].length <= new_list_offset + opts.visible_num[i]){
				if (opts.ajax_processing[i]){
					ajaxArrow(opts.visible_container[i].siblings(".apc_next"));
				}else if ( opts.loop[i] != 1){//right arrow is never disabled when loop is on
					disableArrow(opts.visible_container[i].siblings(".apc_next"));
				}
			}
		}
		
		var enableArrow = function(arrows)
		{
			arrows.addClass('apc_active');
			arrows.removeClass('apc_inactive');
			arrows.removeClass('apc_ajax');
		}
		
		var ajaxArrow = function(arrows)
		{	
			arrows.addClass('apc_ajax');
			arrows.removeClass('apc_inactive');
			arrows.removeClass('apc_active');
		}
		
		var disableArrow = function(arrows)
		{
			arrows.addClass('apc_inactive');
			arrows.removeClass('apc_ajax');
			arrows.removeClass('apc_active');
		}		
		
		setUpContainers();
	};
	
	$(function()
	{
		new $.fn.apc();
	});
})(jQuery);