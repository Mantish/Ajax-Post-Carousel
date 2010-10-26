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
var loop = new Array();
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
		loop[i] = carousel_vars[6];
		post_type[i] = carousel_vars[7];
		category[i] = carousel_vars[8];
		
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
		
		jQuery(this).width(visible_width);
		
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
	if (items[i].length > new_list_offset && new_list_offset >= 0){
		
		//if there are more posts available and the number of preloaded items has not been reached: items have to be loaded (with ajax)
		var total_needed = new_list_offset + visible_num[i] + preload_num[i];
		if (items[i].length < total_items[i] && items[i].length < total_needed && ! ajax_processing[i]){
			var offset = initial_offset[i] + items[i].length;
			//if the offset is higher than the total, it means that the post array in wordpress has reached the end
			if (offset >= total_items[i]){
				offset = offset - total_items[i];
				//in this case, we should not request more thant the total posts in wordpress (total_items)
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
			//if loop is enabled, all items are loaded and the last view is not full (i.e. visible_num=3, total_items=7, new_list_offset=6 -> last view = 1 item)
			if (loop[i] && items[i].length == total_items[i] && (total_items[i] - new_list_offset < visible_num[i])){
				completeLastView(new_list_offset, i);
			}
		}		
	}
	//should get here only when loop is enabled
	else{
		//when left arrow clicked
		if (new_list_offset < 0){
			new_list_offset = total_items[i] + new_list_offset;
			animateLoopPrev(new_list_offset, i);
		}else{
			animateLoop(new_list_offset, i);
		}
	}
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
	//this is never reached, the ajax request always preloads items, animation is always made onclick
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
	list[i].width(ul_width);
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

/*Loop functions*/
function completeLastView(new_list_offset, i)
{
	//last_view_items = items missing so the last view is full
	var last_view_items = visible_num[i] - (total_items[i] - new_list_offset);
	var first_items = items[i].slice(0, last_view_items).clone();
	appendItems(first_items, i);
}

function animateLoop(new_list_offset, i)
{
	//put enough items from the beginning, in the end of the list
	cloneItemsAtRight(new_list_offset, i);
	
	//animate as normally
	var new_left = -1 * items[i].outerWidth(true) * new_list_offset;
	list[i].animate({left: new_left+'px'}, 600, function(){
		//at the end of animation, the list is reduced to the original number of items
		resetList(new_list_offset, i);
	});
	
	//the offset shouldn't be bigger than the number of items (i.e: total_items=7 -> new_offset=8 = offset=1)
	list_offset[i] = new_list_offset - total_items[i];
	updateArrows(i, new_list_offset - total_items[i]);
}

function animateLoopPrev(new_list_offset, i)
{
	cloneItemsAtRight(new_list_offset + visible_num[i], i);
	
	//the list is moved to the right end, before animation
	var new_left = -1 * items[i].outerWidth(true) * (new_list_offset + visible_num[i]);
	list[i].css({
		'left' : new_left
	});
	
	//animate as normally
	new_left = -1 * items[i].outerWidth(true) * new_list_offset;
	list[i].animate({left: new_left+'px'}, 600, function(){
		//at the end of animation, only the necessary items are left in the list (can be more than the total_items)
		adjustListSize(new_list_offset, i);
	});
	
	list_offset[i] = new_list_offset;
	updateArrows(i, new_list_offset);
}

function cloneItemsAtRight(new_list_offset, i)
{
	//offset_items = items in the last view, that are also in the beginning of the list
	var offset_items = items[i].length - total_items[i];
	var next_items = items[i].slice(offset_items, visible_num[i]+new_list_offset-items[i].length+offset_items).clone();
	appendItems(next_items, i);
}

function resetList(new_list_offset, i)
{
	items[i].slice(total_items[i]).remove();
	items[i] = items[i].slice(0, total_items[i]);
	
	var ul_width = total_items[i] * items[i].outerWidth(true);
	//
	var new_left = -1 * (new_list_offset - total_items[i]) * items[i].outerWidth(true);
	
	list[i].css({
		'left' : new_left,
		'width' : ul_width+'px'
	});
}

function adjustListSize(new_list_offset, i)
{
	//last_view_items = items missing so the last view is full
	var last_view_items = visible_num[i] - (total_items[i] - new_list_offset);
	
	items[i].slice(total_items[i] + last_view_items).remove();
	items[i] = items[i].slice(0, total_items[i] + last_view_items);
	
	var ul_width = (total_items[i] + last_view_items) * items[i].outerWidth(true);
	list[i].width(ul_width);
}
/*End of Loop functions*/

function updateArrows(i, new_list_offset)
{
	//first all the arrows are enabled
	enableArrow(visible_container[i].siblings('.apc_arrow'));
		
	//left arrow is only disabled at the beggining of the list.
	//It isn't disabled if loop is on and all items have been loaded
	if (new_list_offset <= 0 && ( ! loop[i] || items[i].length < total_items[i] )){
		disableArrow(visible_container[i].siblings(".apc_prev"));
	}
	
	//right arrow is disabled when there are no more items to the right (if an ajax request is pending, then ajaxloader is shown meanwhile
	if (items[i].length <= new_list_offset + visible_num[i]){
		if (ajax_processing[i]){
			ajaxArrow(visible_container[i].siblings(".apc_next"));
		}else if ( ! loop[i]){//right arrow is never disabled when loop is on
			disableArrow(visible_container[i].siblings(".apc_next"));
		}
	}
}


function enableArrow(arrows)
{
	arrows.addClass('apc_active');
	arrows.removeClass('apc_inactive');
	arrows.removeClass('apc_ajax');
}

function ajaxArrow(arrows)
{	
	arrows.addClass('apc_ajax');
	arrows.removeClass('apc_inactive');
	arrows.removeClass('apc_active');
}

function disableArrow(arrows)
{
	arrows.addClass('apc_inactive');
	arrows.removeClass('apc_ajax');
	arrows.removeClass('apc_active');
}