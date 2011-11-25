/*
   jQuery Dynamic Loader for Links Plugin
   --------------------------------------
   > This jQuery plugin allows reloadless surfing within a website.

   Author:  Seon-Wook Park
   Site:    http://www.swook.net/
   License: MIT License <http://www.opensource.org/licenses/mit-license.php>
 */

(function( $ ) {
	$.dynload_link = {};
	$.dynload_link.init = function () {
		$.dynload_link.current_url = $.dynload_link.parseUri(document.location.href);
		if ($.dynload_link.init_done) return;

		$.dynload_link.initialState.url = $.dynload_link.current_url;
		$.dynload_link.initialState.title = document.title;
		$.dynload_link.page_cache[$.dynload_link.current_url.full] = $('html').html();
		$.dynload_link.init_done = true;
		$.dynload_link.all();
	};
	$(document).ready($.dynload_link.init);
	$.dynload_link.initialState = {};
	$.dynload_link.page_cache = {};

	// Modified function from:
	//     http://blog.stevenlevithan.com/archives/parseuri
	//
	// License: MIT License <http://www.opensource.org/licenses/mit-license.php>
	$.dynload_link.parseUri = function (str) {
		var o = {
			strictMode: false,
			key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
			q: {
				name:   "queryKey",
				parser: /(?:^|&)([^&=]*)=?([^&]*)/g
			},
			parser: {
				strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
				loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
			}
		},
		m   = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
		uri = {},
		i   = 14;

		while (i--) uri[o.key[i]] = m[i] || "";

		uri[o.q.name] = {};
		uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
			if ($1) uri[o.q.name][$1] = $2;
		});

		if ($.dynload_link.current_url) {
			if ( uri.host == '' ) {
				uri.protocol = (uri.protocol != '') ? uri.protocol :
							(($.dynload_link.current_url.protocol == '') ? 'http' : $.dynload_link.current_url.protocol);
				uri.host = $.dynload_link.current_url.host;
				uri.port = (uri.port != '') ? uri.port :
						(($.dynload_link.current_url.port == '') ? '' : $.dynload_link.current_url.port);
				uri.path = (uri.path != '') ? uri.path :
						(($.dynload_link.current_url.path == '') ? '' : $.dynload_link.current_url.path);
			}
		}
		uri.full = uri.protocol+'://'+uri.host+((uri.port == '') ? '' : ':'+uri.port)+
					((uri.path == '') ? '/' : uri.path)+uri.query;
		uri.full_anchor = uri.full;
		if ( uri.anchor > '' ) uri.full_anchor += '#'+uri.anchor;
		return uri;
	};

	$.dynload_link.applyTo = function (elem, current_url) {
		var events = $.data(elem.get(0), 'events');
		if (events && !elem.data('url') && events.click) return;
		elem.unbind('click');

		var url = $.dynload_link.parseUri(elem.attr('href'));
		if (url.host != current_url.host) return;
		elem.data('url', url);
		elem.click(function(e) {
			if (($.browser.msie && e.button != 1) || (!$.browser.msie && e.button != 0))
				return;

			e.preventDefault();
			var url = $(this).data('url');
			if ($.dynload_link.current_url.full == url.full) {
				$.dynload_link.gotoAnchor(url.anchor);
				return;
			}

			$.get(url.full, function(data) {
				$.dynload_link.page_cache[url.full] = data;
				$.dynload_link.updateWindow(url);
				$.dynload_link.applyData(url);
			}, 'html');
		});
	};

	$.dynload_link.applyData = function (url) {
		var data = $.dynload_link.page_cache[url.full];
		if ( !$.dynload_link.container )
			$('html body').html(data);
		else {
			if (typeof $.dynload_link.container == 'string')
				$.dynload_link.container = [$.dynload_link.container];
			var cont, newdata, len = $.dynload_link.container.length;
			for (var i = 0; i < len; i++) {
				newdata = $($.dynload_link.container[i]+':first', data)
				cont = $($.dynload_link.container[i]+':first');
				cont.replaceWith(newdata);
				cont.height(cont.height());
				cont.height('auto');
			}
		}
		document.title  = data.match(/<title>(.*?)<\/title>/)[1];
		$.dynload_link.all();
		$.dynload_link.pageChange_run();
		$.dynload_link.gotoAnchor(url.anchor);
	};

	$.dynload_link.updateWindow = function (url) {
		history.pushState(
			{
				url: url,
				title: document.title,
			},
			document.title,
			url.relative
		);
		$.dynload_link.init();
	};

	$(window).bind( 'popstate', function (e) {
		if (!$.dynload_link.init_pop) {
			$.dynload_link.init_pop = true;
			return;
		}

		var state = e.originalEvent.state;
		if (!state) state = $.dynload_link.initialState;
		$.dynload_link.applyData(state.url);
		$.dynload_link.init();
	});

	$.dynload_link.gotoAnchor = function (anchor) {
		if (anchor == '')
			anchor = 0;
		else {
			anchor = $('#'+anchor+':first, a[name='+anchor+']:first');
			if (anchor.length == 0) return;
			anchor = anchor.offset().top;
		}

		var page;
		if ($.browser.webkit) page = $('body');
		else page = $('html,body');

		if (page.scrollTop() != anchor)
			page.animate({ scrollTop: anchor }, 'fast');
	};

	$.dynload_link.all = function () {
		$('a[target!=_blank]').each( function() {
			$.dynload_link.applyTo($(this), $.dynload_link.current_url);
		});
	};

	$.dynload_link.pageChange_run = function () {
		var len = $.dynload_link.pageChange_funcs.length;
		for (var i = 0; i < len; i++) {
			$.dynload_link.pageChange_funcs[i]();
		}
	};
	$.dynload_link.pageChange_funcs = [];
	$.dynload_link.pageChange = function (func) {
		$.dynload_link.pageChange_funcs.push(func);
	};

})( jQuery );