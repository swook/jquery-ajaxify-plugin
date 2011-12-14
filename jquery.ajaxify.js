/*
   jQuery Ajaxify Plugin
   --------------------------------------
   > This jQuery plugin allows reloadless surfing within a website.

   Author:  Seon-Wook Park
   Site:    http://www.swook.net/
   License: MIT License <http://www.opensource.org/licenses/mit-license.php>
 */

(function( $ ) {
	$.Ajaxify = {};
	$.Ajaxify.init = function () {
		$.Ajaxify.current_url = $.Ajaxify.parseUri(document.location.href);
		if ($.Ajaxify.init_done) return;

		$.Ajaxify.initialState.url = $.Ajaxify.current_url;
		$.Ajaxify.initialState.title = document.title;
		$.Ajaxify.page_cache[$.Ajaxify.current_url.full] = $('html').html();
		$.Ajaxify.init_done = true;
		$.Ajaxify.all();
	};
	$.Ajaxify.initialState = {};
	$.Ajaxify.page_cache = {};

	// Modified function from:
	//     http://blog.stevenlevithan.com/archives/parseuri
	//
	// License: MIT License <http://www.opensource.org/licenses/mit-license.php>
	$.Ajaxify.parseUri = function (str) {
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

		if ($.Ajaxify.current_url) {
			if ( uri.host == '' ) {
				uri.protocol = (uri.protocol != '') ? uri.protocol :
							(($.Ajaxify.current_url.protocol == '') ? 'http' : $.Ajaxify.current_url.protocol);
				uri.host = $.Ajaxify.current_url.host;
				uri.port = (uri.port != '') ? uri.port :
						(($.Ajaxify.current_url.port == '') ? '' : $.Ajaxify.current_url.port);
				uri.path = (uri.path != '') ? uri.path :
						(($.Ajaxify.current_url.path == '') ? '' : $.Ajaxify.current_url.path);
			}
		}
		uri.full = uri.protocol+'://'+uri.host+((uri.port == '') ? '' : ':'+uri.port)+
					((uri.path == '') ? '/' : uri.path)+
					((uri.query == '') ? '' : '?'+uri.query);
		uri.full_anchor = uri.full;
		if ( uri.anchor > '' ) uri.full_anchor += '#'+uri.anchor;
		return uri;
	};

	$.Ajaxify.applyTo = function () {
		var events = $.data($(this).get(0), 'events');
		if (events && !$(this).data('url') && events.click) return;
		$(this).unbind('click');

		var url = $.Ajaxify.parseUri($(this).attr('href'));
		if (url.host != $.Ajaxify.current_url.host) return;
		$(this).data('url', url);
		$(this).click(function(e) {
			if (($.browser.msie && e.button != 1) || (!$.browser.msie && e.button != 0) || (e.ctrlKey))
				return;

			e.preventDefault();
			$.Ajaxify.loadURL($(this).data('url'));
		});
	};

	$.Ajaxify.loadURL = function (url) {
		if (typeof url == 'string') url = $.Ajaxify.parseUri(url);
		if (url.host != $.Ajaxify.current_url.host) return;
		if ($.Ajaxify.current_url.full == url.full) {
			$.Ajaxify.gotoAnchor(url.anchor);
			return;
		}

		$.get(url.full, function(data) {
			$.Ajaxify.page_cache[url.full] = data;
			$.Ajaxify.updateHistory(url);
			$.Ajaxify.applyData(url);
		}, 'html').error(function() {
			document.location.href = url.full;
		});
	};

	$.Ajaxify.applyData = function (url) {
		var data = $.Ajaxify.page_cache[url.full];
		if (!data) {
			$.get(url.full, function(data) {
				$.Ajaxify.page_cache[url.full] = data;
				$.Ajaxify.applyData(url);
			}, 'html');
			return;
		}
		if (!$.Ajaxify.container)
			$('html').html(data);
		else {
			if (typeof $.Ajaxify.container == 'string')
				$.Ajaxify.container = [$.Ajaxify.container];
			var cont, newdata, len = $.Ajaxify.container.length;
			for (var i = 0; i < len; i++) {
				newdata = $($.Ajaxify.container[i]+':first', data)
				cont = $($.Ajaxify.container[i]+':first');
				cont.replaceWith(newdata);
				cont.height(cont.height());
				cont.height('auto');
			}
		}
		$.Ajaxify.all();
 		$.Ajaxify.pageChange_run();
		$.Ajaxify.gotoAnchor(url.anchor);
	};

	$.Ajaxify.updateHistory = function (url) {
		var data = $.Ajaxify.page_cache[url.full];
		var title  = data.match(/<title>(.*?)<\/title>/)[1];
		history.pushState(
			{
				url: url,
				title: title
			},
			title,
			url.relative
		);
		document.title = title;
		$.Ajaxify.init();
	};

	$.Ajaxify.gotoAnchor = function (anchor) {
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

	$.Ajaxify.all = function () {
		$('a[target!=_blank]').each($.Ajaxify.applyTo);
	};

	$.Ajaxify.pageChange_run = function () {
		var len = $.Ajaxify.pageChange_funcs.length;
		for (var i = 0; i < len; i++) {
			$.Ajaxify.pageChange_funcs[i]();
		}
	};
	$.Ajaxify.pageChange_funcs = [];
	$.Ajaxify.pageChange = function (func) {
		$.Ajaxify.pageChange_funcs.push(func);
	};

	$(document).ready($.Ajaxify.init);

	$(window).bind('popstate', function (e) {
		if ($.browser.webkit && !$.Ajaxify.init_pop) {
			$.Ajaxify.init_pop = true;
			return;
		}

		var state = e.originalEvent.state;
		if (!state) state = $.Ajaxify.initialState;
		if (state.url.full != $.Ajaxify.current_url.full) {
			document.title = state.title;
			$.Ajaxify.init();
			$.Ajaxify.applyData(state.url);
		}
	});
})( jQuery );