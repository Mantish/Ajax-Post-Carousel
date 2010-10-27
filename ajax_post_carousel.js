(function($)
{
	$.fn.apc = function()
	{
		var opts = {
			ajax_processing: new Array(),
			visible_num: new Array(),
			preload_num: new Array(),
			total_items: new Array(),
			initial_offset: new Array(),
			blog_url: '',
			show_title: new Array(),
			post_type: new Array(),
			category: new Array(),
			tax_filters: new Array(),
			loop: new Array(),
			items: new Array(),
			list: new Array(),
			visible_container: new Array(),
			list_offset: new Array()
		};
		
		return $.fn.apc.setUpContainers(opts);
    };
	
	$.fn.apc.setUpStyles = function()
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
	
	$.fn.apc.setUpContainers = function(opts)
	{
		$.fn.apc.setUpStyles();
		
		$('.apc_out_container').each(function(i){
			var carousel_vars = $(this).children('.apc_carousel_vars').val().split(',');
			opts.visible_num[i] = Number(carousel_vars[0]);
			opts.preload_num[i] = Number(carousel_vars[1]) - opts.visible_num[i];
			opts.total_items[i] = Number(carousel_vars[2]);
			opts.initial_offset[i] = Number(carousel_vars[3]);
			opts.blog_url = carousel_vars[4];
			opts.show_title[i] = carousel_vars[5];		
			opts.loop[i] = carousel_vars[6];
			opts.post_type[i] = carousel_vars[7];
			opts.category[i] = carousel_vars[8];
			
			//get the taxonomy filters if available
			$.fn.apc.saveTaxFilters(opts, $(this), i);
					
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
			
			$.fn.apc.setUpArrows(opts, i);
		});
	}
	
	$.fn.apc.saveTaxFilters = function(opts, out_container, i)
	{
		out_container.find('.apc_tax_filter').each(function(){
			var input_classes = $(this).attr('class').split(/\s+/);
			opts.tax_filters[i] = new Array();
			opts.tax_filters[i][input_classes[1]] = $(this).val();
		});
	}
	
	$.fn.apc.setUpArrows = function(opts, i)
	{
		opts.visible_container[i].siblings(".apc_arrow.apc_next").bind("click", {direction: 'next', car_index: i, options: opts}, slideCarousel);
		opts.visible_container[i].siblings(".apc_arrow.apc_prev").bind("click", {direction: 'prev', car_index: i, options: opts}, slideCarousel);
		$.fn.apc.updateArrows(opts, i, 0);
	}
	
	slideCarousel = function(e)
	{
	if ( ! $(this).hasClass('apc_inactive')){
		e.preventDefault();
		var i = e.data.car_index;
		
		//get the new list offset based on direction
		if (e.data.direction == 'next'){
			var new_list_offset = e.data.options.list_offset[i] + e.data.options.visible_num[i];
		}else{
			var new_list_offset = e.data.options.list_offset[i] - e.data.options.visible_num[i];
		}
		
		//if there are items ready, animate and then bring more items if needed
		if (e.data.options.items[i].length > new_list_offset && new_list_offset >= 0){
			
			//if there are more posts available and the number of preloaded items has not been reached: items have to be loaded (with ajax)
			var total_needed = new_list_offset + e.data.options.visible_num[i] + e.data.options.preload_num[i];
			if (e.data.options.items[i].length < e.data.options.total_items[i] && e.data.options.items[i].length < total_needed && ! e.data.options.ajax_processing[i]){
				var offset = e.data.options.initial_offset[i] + e.data.options.items[i].length;
				//if the offset is higher than the total, it means that the post array in wordpress has reached the end
				if (offset >= e.data.options.total_items[i]){
					offset = offset - e.data.options.total_items[i];
					//in this case, we should not request more thant the total posts in wordpress (total_items)
					var req_num = Math.min(total_needed - e.data.options.items[i].length, e.data.options.total_items[i] - e.data.options.items[i].length);
				}else{
					var req_num = total_needed - e.data.options.items[i].length;
				}
				//before ajax, turn on the flag so only one ajax call can be made at one time
				e.data.options.ajax_processing[i] = true;
				//then perform the animation
				$.fn.apc.animateList(e.data.options, new_list_offset, i);
				//and perform the ajax request
				$.fn.apc.getNewItems(e.data.options, offset, req_num, i, false, new_list_offset);
			}else{
				//only animate the list, as no more items have to be loaded
				$.fn.apc.animateList(e.data.options, new_list_offset, i);
				//if loop is enabled, all items are loaded and the last view is not full (i.e. visible_num=3, total_items=7, new_list_offset=6 -> last view = 1 item)
				if (e.data.options.loop[i] && e.data.options.items[i].length == e.data.options.total_items[i] && (e.data.options.total_items[i] - new_list_offset < e.data.options.visible_num[i])){
					$.fn.apc.completeLastView(e.data.options, new_list_offset, i);
				}
			}		
		}
		//should get here only when loop is enabled
		else{
			//when left arrow clicked
			if (new_list_offset < 0){
				new_list_offset = e.data.options.total_items[i] + new_list_offset;
				$.fn.apc.animateLoopPrev(e.data.options, new_list_offset, i);
			}else{
				$.fn.apc.animateLoop(e.data.options, new_list_offset, i);
			}
		}
	}
	}
	
	$.fn.apc.getNewItems = function(opts, offset, num, i, animate, new_list_offset)
	{
		var data_query = 'action=ajax_apc_get_posts&offset=' + offset + '&num=' + num + '&title=' + opts.show_title[i] + '&post_type=' + opts.post_type[i] + '&category=' + opts.category[i];
		for (j in opts.tax_filters[i]){
			data_query += '&tax_' + j + '=' + opts.tax_filters[i][j];
		}
		
		$.ajax({
			type: 'POST',
			url: opts.blog_url + '/wp-admin/admin-ajax.php',
			data: data_query,
			success: function(response){
				$.fn.apc.updateList(opts, response, i, animate, new_list_offset, offset + num);
			},
			//this happens even if the function returns error
			complete: function(){
				$.fn.apc.completeAjax(opts, i, new_list_offset);
			}
		});
	}
	
	$.fn.apc.updateList = function(opts, html, i, animate, new_list_offset, total_expected)
	{
		//append the results of ajax to the list
		$.fn.apc.appendItems(opts, html, i);
		//animation is performed if needed
		//this is never reached, the ajax request always preloads items, animation is always made onclick
		if (animate){
			$.fn.apc.animateList(opts, new_list_offset, i);
		}
		
		var items_num = opts.items[i].length;
		//if we didn't get enough posts, we have to make another ajax request
		if (total_expected > items_num && opts.initial_offset[i] > 0){
			var new_req_num = Math.min(total_expected - items_num, opts.initial_offset[i]);
			opts.ajax_processing[i] = true;
			$.fn.apc.getNewItems(opts, 0, new_req_num, i, animate, new_list_offset);
		}
	}
	
	$.fn.apc.completeAjax = function(opts, i, new_list_offset)
	{
		opts.ajax_processing[i] = false;
		//the arrows are updated
		$.fn.apc.updateArrows(opts, i, new_list_offset);
	}
	
	$.fn.apc.appendItems = function(opts, html, i)
	{
		opts.list[i].append(html);
		opts.items[i] = opts.list[i].find('.apc_item');
		
		var ul_width = opts.items[i].length * opts.items[i].outerWidth(true);
		opts.list[i].width(ul_width);
	}
	
	$.fn.apc.animateList = function(opts, new_list_offset, i)
	{
		var new_left = -1 * opts.items[i].outerWidth(true) * new_list_offset;
		//default animation is swing
		opts.list[i].animate({left: new_left+'px'}, 600);
		opts.list_offset[i] = new_list_offset;
		//the arrows are updated
		$.fn.apc.updateArrows(opts, i, new_list_offset);
	}
	
	/*Loop functions*/
	$.fn.apc.completeLastView = function(opts, new_list_offset, i)
	{
		//last_view_items = items missing so the last view is full
		var last_view_items = opts.visible_num[i] - (opts.total_items[i] - new_list_offset);
		var first_items = opts.items[i].slice(0, last_view_items).clone();
		$.fn.apc.appendItems(opts, first_items, i);
	}
	
	$.fn.apc.animateLoop = function(opts, new_list_offset, i)
	{
		//put enough items from the beginning, in the end of the list
		$.fn.apc.cloneItemsAtRight(opts, new_list_offset, i);
		
		//animate as normally
		var new_left = -1 * opts.items[i].outerWidth(true) * new_list_offset;
		opts.list[i].animate({left: new_left+'px'}, 600, function(){
			//at the end of animation, the list is reduced to the original number of items
			$.fn.apc.resetList(opts, new_list_offset, i);
		});
		
		//the offset shouldn't be bigger than the number of items (i.e: total_items=7 -> new_offset=8 = offset=1)
		opts.list_offset[i] = new_list_offset - opts.total_items[i];
		$.fn.apc.updateArrows(opts, i, new_list_offset - opts.total_items[i]);
	}
	
	$.fn.apc.animateLoopPrev = function(opts, new_list_offset, i)
	{
		$.fn.apc.cloneItemsAtRight(opts, new_list_offset + opts.visible_num[i], i);
		
		//the list is moved to the right end, before animation
		var new_left = -1 * opts.items[i].outerWidth(true) * (new_list_offset + opts.visible_num[i]);
		opts.list[i].css({
			'left' : new_left
		});
		
		//animate as normally
		new_left = -1 * opts.items[i].outerWidth(true) * new_list_offset;
		opts.list[i].animate({left: new_left+'px'}, 600, function(){
			//at the end of animation, only the necessary items are left in the list (can be more than the total_items)
			$.fn.apc.adjustListSize(opts, new_list_offset, i);
		});
		
		opts.list_offset[i] = new_list_offset;
		$.fn.apc.updateArrows(opts, i, new_list_offset);
	}
	
	$.fn.apc.cloneItemsAtRight = function(opts, new_list_offset, i)
	{
		//offset_items = items in the last view, that are also in the beginning of the list
		var offset_items = opts.items[i].length - opts.total_items[i];
		var next_items = opts.items[i].slice(offset_items, opts.visible_num[i]+new_list_offset-opts.items[i].length+offset_items).clone();
		$.fn.apc.appendItems(opts, next_items, i);
	}
	
	$.fn.apc.resetList = function(opts, new_list_offset, i)
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
	
	$.fn.apc.adjustListSize = function(opts, new_list_offset, i)
	{
		//last_view_items = items missing so the last view is full
		var last_view_items = opts.visible_num[i] - (opts.total_items[i] - new_list_offset);
		
		opts.items[i].slice(opts.total_items[i] + last_view_items).remove();
		opts.items[i] = opts.items[i].slice(0, opts.total_items[i] + last_view_items);
		
		var ul_width = (opts.total_items[i] + last_view_items) * opts.items[i].outerWidth(true);
		opts.list[i].width(ul_width);
	}
	/*End of Loop functions*/
	
	$.fn.apc.updateArrows = function(opts, i, new_list_offset)
	{
		//first all the arrows are enabled
		$.fn.apc.enableArrow(opts.visible_container[i].siblings('.apc_arrow'));
			
		//left arrow is only disabled at the beggining of the list.
		//It isn't disabled if loop is on and all items have been loaded
		if (new_list_offset <= 0 && ( ! opts.loop[i] || opts.items[i].length < opts.total_items[i] )){
			$.fn.apc.disableArrow(opts.visible_container[i].siblings(".apc_prev"));
		}
		
		//right arrow is disabled when there are no more items to the right (if an ajax request is pending, then ajaxloader is shown meanwhile
		if (opts.items[i].length <= new_list_offset + opts.visible_num[i]){
			if (opts.ajax_processing[i]){
				$.fn.apc.ajaxArrow(opts.visible_container[i].siblings(".apc_next"));
			}else if ( ! opts.loop[i]){//right arrow is never disabled when loop is on
				$.fn.apc.disableArrow(opts.visible_container[i].siblings(".apc_next"));
			}
		}
	}
	
	$.fn.apc.enableArrow = function(arrows)
	{
		arrows.addClass('apc_active');
		arrows.removeClass('apc_inactive');
		arrows.removeClass('apc_ajax');
	}
	
	$.fn.apc.ajaxArrow = function(arrows)
	{	
		arrows.addClass('apc_ajax');
		arrows.removeClass('apc_inactive');
		arrows.removeClass('apc_active');
	}
	
	$.fn.apc.disableArrow = function(arrows)
	{
		arrows.addClass('apc_inactive');
		arrows.removeClass('apc_ajax');
		arrows.removeClass('apc_active');
	}
	
	$(function()
	{
		$.fn.apc();
	});
})(jQuery);