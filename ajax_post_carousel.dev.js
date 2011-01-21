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
		e.preventDefault();
			if ( $(this).hasClass('apc_active')){
				var i = e.data.car_index;
				
				//get the new list offset based on direction (starts at 0)
				if (e.data.direction == 'next'){
					var new_list_offset = opts.list_offset[i] + opts.visible_num[i];
				}else{
					var new_list_offset = opts.list_offset[i] - opts.visible_num[i];
				}
				
				//if there's an ajax request pending, no more can be made
				if ( ! opts.ajax_processing[i]){
					
					//total_needed is the posts thar should be loaded plus the ones hidden to the left
					var total_needed = new_list_offset + opts.preloaded_num[i];
					
					//to make an ajax call: only if we haven't reach the total items or the needed posts
					if(opts.items[i].length < Math.min(total_needed, opts.total_items[i])){
						getNewItems(i, total_needed, new_list_offset);
					}
				}
				
				//perform the animation
				processAnimation(i, new_list_offset);
			}
		}
				
		
		var getNewItems = function(i, total_needed, new_list_offset)
		{
			//before ajax, turn on the flag so only one ajax call can be made at one time
			opts.ajax_processing[i] = true;
			
			//this si the offset for thw wordpress function
			var offset = opts.initial_offset[i] + opts.items[i].length;
			
			//if the offset is higher than the total, it means that the post array returned by wordpress has reached the end
			if (offset >= opts.total_items[i]){
				offset = offset - opts.total_items[i];
			}
			//we should request only as many as to complete the total_items
			var req_num = Math.min(total_needed, opts.total_items[i]) - opts.items[i].length;
			
			makeAjaxRequest(i, offset, req_num, new_list_offset);
		}
		
		var makeAjaxRequest = function(i, offset, num, new_list_offset)
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
					updateList(response, i, new_list_offset, opts.items[i].length + num);
				},
				//this happens only if there was an error, clears the flag and updates the arrot
				error: function(){
					stopProcessing(i, new_list_offset);
				}
			});
		}
		
		var updateList = function(html, i, new_list_offset, total_expected)
		{
			//append the results of ajax to the list
			appendItems(html, i);
			
			var items_num = opts.items[i].length;
			//if we didn't get enough posts, we have to make another ajax request
			if (total_expected > items_num){
				var new_req_num = total_expected - items_num;
				makeAjaxRequest(i, 0, new_req_num, new_list_offset);
			}else{
				stopProcessing(i, new_list_offset);
			}
		}
		
		var stopProcessing = function(i, new_list_offset)
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
		
		var processAnimation = function(i, new_list_offset)
		{
			if(opts.loop[i] == 1){
								
				//when left arrow clicked offset is negative
				if (new_list_offset < 0){
					animateLoopPrev(i, new_list_offset);
				}else{
					//if all items are loaded, an extra view is added so the loop animation can be performed
					if (opts.items[i].length == opts.total_items[i]){
						addExtraView(i);
					}
					//if the new offset is higher than the total items
					if (new_list_offset >= opts.total_items[i]){
						animateLoop(i, new_list_offset);
					}else{
						animateList(i, new_list_offset);
					}
				}
			}else{
				animateList(i, new_list_offset);
			}
		}
		
		var animateList = function(i, new_list_offset)
		{
			opts.list_offset[i] = new_list_offset;
			//the arrows are updated
			updateArrows(i, new_list_offset);
			
			queueAmimation(i, new_list_offset);
		}
		
		var queueAmimation = function(i, new_list_offset)
		{
			var new_left = -1 * opts.items[i].outerWidth(true) * new_list_offset;
			opts.list[i].animate({left: new_left+'px'}, 600, 'linear');
		}
		
		/*Loop functions*/
		var addExtraView = function(i)
		{	/*
			items from the beggining of the list are added to the end.
			the number of items can be from visible_num to 2*visible_num - 1
			*/
			var last_view_items = opts.total_items[i] % opts.visible_num[i];
			if(last_view_items == 0){
				opts.visible_num[i];
			}
			var num_extra_items = 2*opts.visible_num[i] - last_view_items;
			var items_from_start = opts.items[i].slice(0, num_extra_items).clone();
			appendItems(items_from_start, i);
		}
		
		var animateLoop = function(i, new_list_offset)
		{
			//the offset shouldn't be bigger than the number of items (i.e: total_items=7 -> new_offset=8 => offset=1)
			opts.list_offset[i] = new_list_offset - opts.total_items[i];
			updateArrows(i, opts.list_offset[i]);
			
			queueAmimation(i, new_list_offset);
			
			//when the animation is finished, the list is moved to the beggining
			opts.list[i].queue(function () {
				resetList(i, new_list_offset);
				$(this).dequeue();
			});
		}
		
		var animateLoopPrev = function(i, new_list_offset)
		{
			//make the new offset a positive number (i.e: total_items=7 -> new_offset=-2 => new_offset=5)
			new_list_offset = opts.total_items[i] + new_list_offset;
			opts.list_offset[i] = new_list_offset;
			updateArrows(i, new_list_offset);
			
			//the list is moved to the right end, before doing the animation
			opts.list[i].queue(function () {
				var new_left = -1 * opts.items[i].outerWidth(true) * (new_list_offset + opts.visible_num[i]);
				opts.list[i].css({
					'left' : new_left
				});								
				$(this).dequeue();
			});
			
			queueAmimation(i, new_list_offset);
		}
		
		var resetList = function(i, new_list_offset)
		{
			var new_left = -1 * (new_list_offset - opts.total_items[i]) * opts.items[i].outerWidth(true);
			
			opts.list[i].css({
				'left' : new_left
			});
		}
		/*End of Loop functions*/
		
		var updateArrows = function(i, new_list_offset)
		{
			//first all the arrows are enabled
			enableArrow(opts.visible_container[i].siblings('.apc_arrow'));
				
			//left arrow is only disabled at the beggining of the list.
			//It isn't disabled if loop is on and all items have been loaded
			if (new_list_offset <= 0 && ! ( opts.loop[i] == 1 && opts.items[i].length >= opts.total_items[i] )){
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