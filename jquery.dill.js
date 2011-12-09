/*
   jQuery Dynamic Internal Links Loader (DILL) Plugin
   --------------------------------------
   > This jQuery plugin allows reloadless surfing within a website.

   Author:  Seon-Wook Park
   Site:    http://www.swook.net/
   License: MIT License <http://www.opensource.org/licenses/mit-license.php>
 */

(function( $ ) {
	$.Dill = {};
	$.Dill.init = function () {
		$.Dill.current_url = $.Dill.parseUri(document.location.href);
		if ($.Dill.init_done) return;

		$.Dill.initialState.url = $.Dill.current_url;
		$.Dill.initialState.title = document.title;
		$.Dill.page_cache[$.Dill.current_url.full] = $('html').html();
		$.Dill.init_done = true;
		$.Dill.all();
	};
	$.Dill.initialState = {};
	$.Dill.page_cache = {};

	// Modified function from:
	//     http://blog.stevenlevithan.com/archives/parseuri
	//
	// License: MIT License <http://www.opensource.org/licenses/mit-license.php>
	$.Dill.parseUri = function (str) {
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

		if ($.Dill.current_url) {
			if ( uri.host == '' ) {
				uri.protocol = (uri.protocol != '') ? uri.protocol :
							(($.Dill.current_url.protocol == '') ? 'http' : $.Dill.current_url.protocol);
				uri.host = $.Dill.current_url.host;
				uri.port = (uri.port != '') ? uri.port :
						(($.Dill.current_url.port == '') ? '' : $.Dill.current_url.port);
				uri.path = (uri.path != '') ? uri.path :
						(($.Dill.current_url.path == '') ? '' : $.Dill.current_url.path);
			}
		}
		uri.full = uri.protocol+'://'+uri.host+((uri.port == '') ? '' : ':'+uri.port)+
					((uri.path == '') ? '/' : uri.path)+
					((uri.query == '') ? '' : '?'+uri.query);
		uri.full_anchor = uri.full;
		if ( uri.anchor > '' ) uri.full_anchor += '#'+uri.anchor;
		return uri;
	};

	$.Dill.applyTo = function () {
		var events = $.data($(this).get(0), 'events');
		if (events && !$(this).data('url') && events.click) return;
		$(this).unbind('click');

		var url = $.Dill.parseUri($(this).attr('href'));
		if (url.host != $.Dill.current_url.host) return;
		$(this).data('url', url);
		$(this).click(function(e) {
			if (($.browser.msie && e.button != 1) || (!$.browser.msie && e.button != 0) || (e.ctrlKey))
				return;

			e.preventDefault();
			$.Dill.loadURL($(this).data('url'));
		});
	};

	$.Dill.loadURL = function (url) {
		if (url.host != $.Dill.current_url.host) return;
		if ($.Dill.current_url.full == url.full) {
			$.Dill.gotoAnchor(url.anchor);
			return;
		}

		$.get(url.full, function(data) {
			$.Dill.page_cache[url.full] = data;
			$.Dill.updateHistory(url);
			$.Dill.applyData(url);
		}, 'html');
	};

	$.Dill.applyData = function (url) {
		var data = $.Dill.page_cache[url.full];
		if (!data) {
			$.get(url.full, function(data) {
				$.Dill.page_cache[url.full] = data;
				$.Dill.applyData(url);
			}, 'html');
			return;
		}
		if (!$.Dill.container)
			$('html').html(data);
		else {
			if (typeof $.Dill.container == 'string')
				$.Dill.container = [$.Dill.container];
			var cont, newdata, len = $.Dill.container.length;
			for (var i = 0; i < len; i++) {
				newdata = $($.Dill.container[i]+':first', data)
				cont = $($.Dill.container[i]+':first');
				cont.replaceWith(newdata);
				cont.height(cont.height());
				cont.height('auto');
			}
		}
		$.Dill.all();
 		$.Dill.pageChange_run();
		$.Dill.gotoAnchor(url.anchor);
	};

	$.Dill.updateHistory = function (url) {
		var data = $.Dill.page_cache[url.full];
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
		$.Dill.init();
	};

	$.Dill.gotoAnchor = function (anchor) {
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

	$.Dill.all = function () {
		$('a[target!=_blank]').each($.Dill.applyTo);
	};

	$.Dill.pageChange_run = function () {
		var len = $.Dill.pageChange_funcs.length;
		for (var i = 0; i < len; i++) {
			$.Dill.pageChange_funcs[i]();
		}
	};
	$.Dill.pageChange_funcs = [];
	$.Dill.pageChange = function (func) {
		$.Dill.pageChange_funcs.push(func);
	};

	$(document).ready($.Dill.init);

	$(window).bind('popstate', function (e) {
		if ($.browser.webkit && !$.Dill.init_pop) {
			$.Dill.init_pop = true;
			return;
		}

		var state = e.originalEvent.state;
		if (!state) state = $.Dill.initialState;
		if (state.url.full != $.Dill.current_url.full) {
			document.title = state.title;
			$.Dill.init();
			$.Dill.applyData(state.url);
		}
	});
})( jQuery );