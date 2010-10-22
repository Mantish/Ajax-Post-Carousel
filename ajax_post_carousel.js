var ajax_processing = new Array();
var visible_num = new Array();
var preload_num = new Array();
var total_items = new Array();
var initial_offset = new Array();
var blog_url = '';
var show_title = new Array();
var post_type = new Array();
var category = new Array();
var tax_filters = new Array();
var items = new Array();
var list = new Array();
var visible_container = new Array();
var list_offset = new Array();

jQuery(function()
{	
	setUpStyles();
	setUpContainers();
});

function setUpContainers()
{
	jQuery('.apc_out_container').each(function(i){
		var carousel_vars = jQuery(this).children('.apc_carousel_vars').val().split(',');
		visible_num[i] = Number(carousel_vars[0]);
		preload_num[i] = Number(carousel_vars[1]) - visible_num[i];
		total_items[i] = Number(carousel_vars[2]);
		initial_offset[i] = Number(carousel_vars[3]);
		blog_url = carousel_vars[4];
		show_title[i] = carousel_vars[5];
		post_type[i] = carousel_vars[6];
		category[i] = carousel_vars[7];
		
		//get the taxonomy filters if available
		saveTaxFilters(jQuery(this), i);
				
		//get jquery objects for container, ul and list items
		items[i] = jQuery(this).find('.apc_item');
		list[i] = jQuery(this).find('.apc_list');		
		visible_container[i] = jQuery(this).find('.apc_visible_container');
		
		//width of the list is just the number of items * width of each item(including margin) (all items should have the same width)
		var ul_width = items[i].length * items[i].outerWidth(true);
		list[i].width(ul_width);
		//list_offset is the number of items that are slided to the left
		list_offset[i] = 0;
		
		var visible_width = visible_num[i] * items[i].outerWidth(true);
		visible_container[i].width(visible_width);
		
		jQuery(this).width(visible_container[i].outerWidth(true));
		
		setUpArrows(i);
	});
}

function setUpStyles(){
	jQuery('.apc_visible_container').css({
		'overflow' : 'hidden'
	});
	jQuery('.apc_list').css({
		'margin' : 0,
		'padding' : 0,
		'position' : 'relative'
	});
}

function saveTaxFilters(out_container, i){
	out_container.find('.apc_tax_filter').each(function(){
		var input_classes = jQuery(this).attr('class').split(/\s+/);
		tax_filters[i] = new Array();
		tax_filters[i][input_classes[1]] = jQuery(this).val();
	});
}

function setUpArrows(i)
{
	visible_container[i].siblings(".apc_arrow.apc_next").bind("click", {direction: 'next', car_index: i}, slideCarousel);
	visible_container[i].siblings(".apc_arrow.apc_prev").bind("click", {direction: 'prev', car_index: i}, slideCarousel);
	updateArrows(i, 0);
}

function slideCarousel(e)
{
if ( ! jQuery(this).hasClass('apc_inactive')){
	e.preventDefault();
	var i = e.data.car_index;
	
	//get the new list offset based on direction
	if (e.data.direction == 'next'){
		var new_list_offset = list_offset[i] + visible_num[i];
	}else{
		var new_list_offset = list_offset[i] - visible_num[i];
	}
	
	//if there are items ready, animate and then bring more items if needed
	if (items[i].length > new_list_offset){
		
		//if more are needed: there are more posts available and the number of preloaded items has not been reached
		var total_needed = new_list_offset + visible_num[i] + preload_num[i];
		if (items[i].length < total_items[i] && items[i].length < total_needed && ! ajax_processing[i]){
			var offset = initial_offset[i] + items[i].length;
			//if we have already reached the end of the posts, then the offset is higher than the total
			if (offset >= total_items[i]){
				offset = offset - total_items[i];
				//in this case, we should not request more thant the total posts
				var req_num = Math.min(total_needed - items[i].length, total_items[i] - items[i].length);
			}else{
				var req_num = total_needed - items[i].length;
			}
			//before ajax, turn on the flag so only one ajax call can be made at one time
			ajax_processing[i] = true;
			//then perform the animation
			animateList(new_list_offset, i);
			//and perform the ajax request
			getNewItems(offset, req_num, i, false, new_list_offset);
		}else{
			//only animate the list, as no more items have to be loaded
			animateList(new_list_offset, i);
		}		
	}
	//if there are no items ready, disable arrows, do ajax and then animate
}
}

function getNewItems(offset, num, i, animate, new_list_offset)
{
	var data_query = 'action=ajax_apc_get_posts&offset=' + offset + '&num=' + num + '&title=' + show_title[i] + '&post_type=' + post_type[i] + '&category=' + category[i];
	for (j in tax_filters[i]){
		data_query += '&tax_' + j + '=' + tax_filters[i][j];
	}
	
	jQuery.ajax({
		type: 'POST',
		url: blog_url + '/wp-admin/admin-ajax.php',
		data: data_query,
		success: function(response){
			updateList(response, i, animate, new_list_offset, offset + num);
		},
		//this happens even if the function returns error
		complete: function(){
			completeAjax(i, new_list_offset);
		}
	});
}

function updateList(html, i, animate, new_list_offset, total_expected)
{
	//append the results of ajax to the list
	appendItems(html, i);
	//animation is performed if needed
	if (animate){
		animateList(new_list_offset, i);
	}
	
	var items_num = items[i].length;
	//if we didn't get enough posts, we have to make another ajax request
	if (total_expected > items_num && initial_offset[i] > 0){
		var new_req_num = Math.min(total_expected - items_num, initial_offset[i]);
		ajax_processing[i] = true;
		getNewItems(0, new_req_num, i, animate, new_list_offset);
	}
}

function completeAjax(i, new_list_offset)
{
	ajax_processing[i] = false;
	//the arrows are updated
	updateArrows(i, new_list_offset);
}

function appendItems(html, i)
{
	list[i].append(html);
	items[i] = list[i].find('.apc_item');
	
	var ul_width = items[i].length * items[i].outerWidth(true);
	list[i].width(ul_width);;
}

function animateList(new_list_offset, i)
{
	var new_left = -1 * items[i].outerWidth(true) * new_list_offset;
	//default animation is swing
	list[i].animate({left: new_left+'px'}, 600);
	list_offset[i] = new_list_offset;
	//the arrows are updated
	updateArrows(i, new_list_offset);
}

function updateArrows(i, new_list_offset)
{
	//first all the arrows are enabled
	enableArrow(visible_container[i].siblings('.apc_arrow'), i);
		
	//left arrow is only disabled at the beggining of the list
	if (new_list_offset == 0){
		disableArrow(visible_container[i].siblings(".apc_prev"), i);
	}
	//right arrow is disabled when there are no more items to the right
	/*
	Should it be available even if there are no items to the right? In that case a ajaxloader could be shown meanwhile
	*/
	if (items[i].length <= new_list_offset + visible_num[i]){
		disableArrow(visible_container[i].siblings(".apc_next"), i);
	}
}


//estas dos funciones hay que cambiarlas, hay que ponerle una clase a la flecha y mostrarla u ocultarla con css
function enableArrow(arrows, i)
{
	arrows.addClass('apc_active');
	arrows.removeClass('apc_inactive');
	arrows.removeClass('apc_ajax');
}

function disableArrow(arrows, i)
{
	if (ajax_processing[i]){
		arrows.removeClass('apc_inactive');
		arrows.addClass('apc_ajax');
	}else{
		arrows.addClass('apc_inactive');
		arrows.removeClass('apc_ajax');
	}
	arrows.removeClass('apc_active');
}